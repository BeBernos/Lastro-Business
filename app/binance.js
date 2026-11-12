// v9.3 — Saldo da Binance (chave só de leitura) para atualizar a cripto da carteira sozinho.
// O celular assina cada pedido (HMAC-SHA256 com o segredo, que fica cifrado no aparelho); o Worker só repassa
// (/binance/…), sem guardar nada. Valor em reais = quantidade × preço em USDT × USDT/BRL (pares da própria Binance).
const enc = new TextEncoder();
const ESTAVEIS = new Set(['USDT', 'USDC', 'FDUSD', 'BUSD', 'DAI']);

export async function assinar(segredo, texto) {
  const k = await crypto.subtle.importKey('raw', enc.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(texto)))].map(b => b.toString(16).padStart(2, '0')).join('');
}

// saldos: { BTC: 0.001, … } (Earn flexível somado: "LDBTC" vira BTC); precos: [{symbol, price}] de /ticker/price
export function valorar(saldos, precos) {
  const p = Object.fromEntries(precos.map(x => [x.symbol, Number(x.price)]));
  const usdtbrl = p.USDTBRL || (p.BRLUSDT ? 1 / p.BRLUSDT : null);
  if (!usdtbrl) throw new Error('A Binance não devolveu a cotação USDT/BRL.');
  const moedas = {};
  let usd = 0;
  for (const [ativo, qtd] of Object.entries(saldos)) {
    if (!(qtd > 0)) continue;
    const emUsd = ESTAVEIS.has(ativo) ? qtd : ativo === 'BRL' ? qtd / usdtbrl : p[`${ativo}USDT`] ? qtd * p[`${ativo}USDT`] : null;
    if (emUsd == null) continue; // moeda sem par em USDT (poeira): fica de fora
    moedas[ativo.toLowerCase()] = Math.round(emUsd * 100) / 100;
    usd += emUsd;
  }
  return { usd: Math.round(usd * 100) / 100, brl: Math.round(usd * usdtbrl * 100) / 100, usdtbrl, moedas };
}

export async function lerSaldoBinance({ chave, segredo }, { base = 'binance', agora = Date.now() } = {}) {
  const assinado = async caminho => {
    const q = `timestamp=${agora}&recvWindow=15000${caminho.includes('account') ? '&omitZeroBalances=true' : '&size=100'}`;
    const r = await fetch(`${base}${caminho}?${q}&signature=${await assinar(segredo, q)}`, { headers: { 'X-MBX-APIKEY': chave } });
    const texto = await r.text();
    let j = {};
    try { j = JSON.parse(texto); } catch { /* página de bloqueio, não JSON */ }
    if (!r.ok) {
      if (r.status === 401 || [-2014, -2015, -1022].includes(j.code)) throw new Error('a chave da Binance não vale (confira a chave, o segredo e a permissão de leitura)');
      if (r.status === 451) throw new Error('a Binance bloqueia o país de onde o pedido saiu (451)');
      if (r.status === 403) throw new Error(`o firewall da Binance barrou o pedido (403)${j.msg ? `: ${j.msg}` : texto ? `: ${texto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)}` : ''}`);
      throw new Error(`a Binance respondeu ${r.status}${j.msg ? `: ${j.msg}` : ''}`);
    }
    return j;
  };
  const conta = (await assinado('/api/v3/account')).balances || [];
  let earn = null;
  try { earn = (await assinado('/sapi/v1/simple-earn/flexible/position')).rows || []; } catch { /* sem Earn: o "LD…" da conta vale */ }
  const precos = await (await fetch(`${base}/api/v3/ticker/price`)).json();
  return valorar(juntarSaldos(conta, earn), precos);
}

// A conta à vista já mostra o Earn flexível como "LDBTC" etc. — com a posição do Earn em mãos, o LD da conta sai
// (senão o Earn conta duas vezes: v9.4.1, o Bruno viu R$ 2.879 para ~US$ 266).
export function juntarSaldos(conta, earn) {
  const saldos = {};
  const soma = (a, q) => { saldos[a] = (saldos[a] || 0) + q; };
  for (const b of conta) {
    const ld = /^LD(?=[A-Z]{2,})/.test(b.asset);
    if (ld && earn) continue;
    soma(ld ? b.asset.slice(2) : b.asset, Number(b.free) + Number(b.locked));
  }
  for (const x of earn || []) soma(x.asset, Number(x.totalAmount));
  return saldos;
}
