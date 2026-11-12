// Cotações para a estimativa "Hoje" da carteira (rota /cotacoes do Worker).
//
// O app manda só os códigos (HGLG11, bitcoin…) e a data da posição oficial; quantidades e valores
// nunca saem do celular. Para cada código o Worker devolve a cotação de agora e a da data oficial,
// mais o CDI diário e o dólar (PTAX) desde então. A conta (valor oficial × variação) é feita no app.
//
// Fontes gratuitas:
// - B3: brapi.dev (precisa da chave gratuita no segredo BRAPI_TOKEN; ~30 min de atraso no plano grátis)
// - CDI (série 12) e dólar PTAX venda (série 1): API SGS do Banco Central (sem chave)
// - Cripto: CoinGecko (sem chave; COINGECKO_KEY opcional, a chave "demo" gratuita)
// Respostas ficam guardadas por alguns minutos no Durable Object (o cache do Cloudflare não funciona
// em endereços workers.dev), para não gastar a cota das fontes a cada abertura do app.

const MIN = 60 * 1000;
const RE_TICKER = /^[A-Z0-9]{4,7}$/;
const RE_CRIPTO = /^[a-z0-9-]{2,40}$/;
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

const urls = env => ({
  brapi: env.BRAPI_URL || 'https://brapi.dev/api',
  bcb: env.BCB_URL || 'https://api.bcb.gov.br/dados/serie',
  coingecko: env.COINGECKO_URL || 'https://api.coingecko.com/api/v3',
});

const br = iso => iso.split('-').reverse().join('/'); // 2026-10-21 -> 21/10/2026
const iso = br => br.split('/').reverse().join('-');
const somaDias = (dataIso, n) => new Date(Date.parse(`${dataIso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const hojeBrasil = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10);
const dataBrasil = ms => new Date(ms - 3 * 3600000).toISOString().slice(0, 10);

// Busca JSON com cache no Durable Object (guarda, chave = endereço sem a chave de acesso)
async function buscar(cache, url, { validade, chave = url, headers = {} }) {
  const guardado = await cache.lerCache(chave);
  if (guardado && Date.now() - guardado.em < validade) return guardado.valor;
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Lastro (app da familia)', ...headers } });
  if (!r.ok) {
    if (guardado) return guardado.valor; // fonte fora do ar: usa o último que deu certo
    throw new Error(`HTTP ${r.status}`);
  }
  const valor = await r.json();
  await cache.gravarCache(chave, valor);
  return valor;
}

// Último valor de uma lista [{data, valor}] com data <= limite
const ateData = (lista, limite) => lista.filter(p => p.data <= limite).pop() || null;

// Pregão da B3 (seg–sex, ~10h–18h de Brasília): cotação nova a cada 15 min; fora dele o preço não muda.
// Assim a cota grátis da brapi (15 mil consultas/mês, 1 código por consulta) sobra mesmo com uso diário.
function validadeB3(agora = Date.now()) {
  const d = new Date(agora - 3 * 3600000);
  const min = d.getUTCHours() * 60 + d.getUTCMinutes();
  const pregao = d.getUTCDay() >= 1 && d.getUTCDay() <= 5 && min >= 9 * 60 + 45 && min <= 18 * 60 + 30;
  return pregao ? 15 * MIN : 3 * 60 * MIN;
}

async function b3(cache, env, ticker, ref) {
  if (!env.BRAPI_TOKEN) return { erro: 'sem-chave' };
  const dias = (Date.parse(hojeBrasil()) - Date.parse(ref)) / 86400000;
  const range = dias <= 25 ? '1mo' : '3mo';
  const base = `${urls(env).brapi}/quote/${ticker}?range=${range}&interval=1d`;
  const d = await buscar(cache, `${base}&token=${env.BRAPI_TOKEN}`, { validade: validadeB3(), chave: base });
  const r = d?.results?.[0];
  if (!r || typeof r.regularMarketPrice !== 'number') return { erro: 'sem-cotacao' };
  const hist = (r.historicalDataPrice || [])
    .filter(h => typeof h.close === 'number')
    .map(h => ({ data: dataBrasil(h.date * 1000), valor: h.close }))
    .sort((a, b) => a.data.localeCompare(b.data));
  const naRef = ateData(hist, ref);
  return {
    agora: r.regularMarketPrice,
    hora: r.regularMarketTime || null,
    ref: naRef?.valor ?? null,
    refData: naRef?.data ?? null,
  };
}

async function serieBcb(cache, env, codigo, desde, validade) {
  const url = `${urls(env).bcb}/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${br(desde)}&dataFinal=${br(hojeBrasil())}`;
  try {
    const d = await buscar(cache, url, { validade });
    return (Array.isArray(d) ? d : []).map(p => ({ data: iso(p.data), valor: Number(p.valor) })).filter(p => Number.isFinite(p.valor));
  } catch {
    return []; // o SGS responde erro quando não há dado no período (ex.: a posição é de hoje)
  }
}

async function cripto(cache, env, ids, ref) {
  if (!ids.length) return {};
  const base = urls(env).coingecko;
  const headers = env.COINGECKO_KEY ? { 'x-cg-demo-api-key': env.COINGECKO_KEY } : {};
  const out = {};
  const agora = await buscar(cache, `${base}/simple/price?ids=${ids.join(',')}&vs_currencies=usd`, { validade: 10 * MIN, headers });
  const dias = Math.min(90, Math.max(2, Math.ceil((Date.now() - Date.parse(`${ref}T00:00:00Z`)) / 86400000) + 2));
  for (const id of ids) {
    try {
      const h = await buscar(cache, `${base}/coins/${id}/market_chart?vs_currency=usd&days=${dias}&interval=daily`, { validade: 6 * 60 * MIN, headers });
      const pontos = (h?.prices || []).map(([ms, v]) => ({ data: dataBrasil(ms), valor: v }));
      out[id] = { agora: agora?.[id]?.usd ?? null, ref: ateData(pontos, ref)?.valor ?? null };
    } catch {
      out[id] = { agora: agora?.[id]?.usd ?? null, ref: null };
    }
  }
  return out;
}

export async function cotacoes(request, env, cache) {
  const q = new URL(request.url).searchParams;
  const ref = q.get('ref') || '';
  if (!RE_DATA.test(ref)) throw new Error('data de referência inválida');
  const tickers = (q.get('b3') || '').split(',').filter(Boolean).slice(0, 20);
  const ids = (q.get('cripto') || '').split(',').filter(Boolean).slice(0, 10);
  if (!tickers.every(t => RE_TICKER.test(t)) || !ids.every(i => RE_CRIPTO.test(i))) throw new Error('código inválido');

  const resultado = { geradoEm: new Date().toISOString(), ref, b3: {}, cdi: [], ptax: null, cripto: {} };
  await Promise.all([
    ...tickers.map(async t => {
      try {
        resultado.b3[t] = await b3(cache, env, t, ref);
      } catch (e) {
        resultado.b3[t] = { erro: String(e.message || e) };
      }
    }),
    (async () => {
      // CDI de cada dia útil depois da data oficial
      resultado.cdi = await serieBcb(cache, env, 12, somaDias(ref, 1), 2 * 60 * MIN);
    })(),
    (async () => {
      const ptax = await serieBcb(cache, env, 1, somaDias(ref, -10), 2 * 60 * MIN);
      const naRef = ateData(ptax, ref), ultima = ptax[ptax.length - 1];
      resultado.ptax = ultima ? { agora: ultima.valor, agoraData: ultima.data, ref: naRef?.valor ?? null, refData: naRef?.data ?? null } : null;
    })(),
    (async () => {
      try {
        resultado.cripto = await cripto(cache, env, ids, ref);
      } catch (e) {
        resultado.cripto = { erro: String(e.message || e) };
      }
    })(),
  ]);
  return resultado;
}
