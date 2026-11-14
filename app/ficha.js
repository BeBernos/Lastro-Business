// v9.13 — A ficha da estratégia (ideia do Bruno de 09/11/2026: "o app mais inteligente e dinâmico quando a estratégia
// muda"). `estrategia` (na carteira) é a fonte única: o Claude escreve no PLANO e o app tira dela o `target_allocation`
// do painel, o que mudou a cada gravação, os gatilhos que dá para vigiar e as ordens de aporte e resgate. Antes eram três
// cópias (estrategia.alvos, target_allocation, meta_dolarizacao) que o Claude mantinha à mão e que saíam do lugar.
// Funções puras, sem imports: o Worker (conector) usa via parcial.js.

// classe do alvo → classe do painel da carteira (5 grupos). Um alvo que cai em mais de um grupo traz `painel`
// (ex.: dólar 17 = { etfs_fiis: 15, dolar: 2 }, porque o VWRA11 e o IVVB11 são ETFs no painel).
export const PAINEL = { reserva: 'renda_fixa', renda_fixa: 'renda_fixa', fiis: 'etfs_fiis', etfs: 'etfs_fiis', acoes_br: 'etfs_fiis', etfs_fiis: 'etfs_fiis', dolar: 'dolar', ouro: 'ouro', cripto: 'cripto' };
const GRUPOS_PAINEL = new Set(Object.values(PAINEL));
export const NOME_CLASSE = { reserva: 'Reserva', renda_fixa: 'Renda fixa', fiis: 'FIIs', etfs: 'ETFs', acoes_br: 'Ações BR', etfs_fiis: 'ETFs e FIIs', dolar: 'Dólar', ouro: 'Ouro', cripto: 'Cripto' };
const num = Number;
const r1 = v => Math.round(v * 10) / 10;
const pct = v => `${String(r1(v)).replace('.', ',')}%`;

// O que quebraria o dado (o painel ou a conta da alocação) — a mensagem diz ao Claude o que corrigir.
export function conferirAlvos(alvos) {
  if (alvos == null) return;
  if (!Array.isArray(alvos) || !alvos.length) throw new Error('Na estratégia, "alvos" tem de ser uma lista [{classe, pct}].');
  if (!alvos.every(a => a?.classe && Number.isFinite(num(a.pct)))) throw new Error('Na estratégia, cada alvo precisa de "classe" e "pct" (número).');
  const soma = alvos.reduce((t, a) => t + num(a.pct), 0);
  if (Math.abs(soma - 100) > 0.5) throw new Error(`Na estratégia, os alvos somam ${pct(soma)} — precisam somar 100%.`);
  for (const a of alvos) {
    if (!a.painel && !PAINEL[a.classe]) throw new Error(`Na estratégia, a classe "${a.classe}" não existe no painel: use ${Object.keys(PAINEL).join(', ')} ou mande "painel" no alvo.`);
    if (!a.painel) continue;
    const ruins = Object.keys(a.painel).filter(k => !GRUPOS_PAINEL.has(k));
    if (ruins.length) throw new Error(`Na estratégia, o "painel" do alvo ${a.classe} usa ${ruins.join(', ')}; os grupos do painel são ${[...GRUPOS_PAINEL].join(', ')}.`);
    const s = Object.values(a.painel).reduce((t, v) => t + num(v), 0);
    if (!(Math.abs(s - num(a.pct)) <= 0.5)) throw new Error(`Na estratégia, o "painel" do alvo ${a.classe} soma ${pct(s)}, mas o alvo é ${pct(num(a.pct))}.`);
  }
}

// estrategia.alvos → target_allocation (o que o painel da carteira compara)
export function derivarTarget(est) {
  if (!est?.alvos?.length) return null;
  const t = {};
  const soma = (k, v) => { t[k] = r1((t[k] || 0) + num(v)); };
  for (const a of est.alvos) {
    if (a.painel && typeof a.painel === 'object') for (const [k, v] of Object.entries(a.painel)) soma(k, v);
    else soma(PAINEL[a.classe], a.pct);
  }
  return t;
}

const norm = s => ` ${String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
// item da estratégia: texto ("Ouro (GLDI11)") ou objeto ({ ativo, nome } nas ordens, { texto, se } nos gatilhos)
export const textoItem = x => (typeof x === 'string' ? x : x?.nome || x?.texto || x?.ativo || '');
const CLASSE_DE = { fiis: 'fiis', fii: 'fiis', etfs: 'etfs', etf: 'etfs', ouro: 'ouro', dolar: 'dolar', cripto: 'cripto', 'renda fixa': 'renda_fixa' };

// item → chaves dos ativos (ativos = [{ chave, nome, classe }] da carteira). Ticker no texto manda (vale mesmo que a
// carteira ainda não tenha o ativo: VWRA11 antes da primeira compra); senão, classe por extenso; senão, nome ou chave
// como palavras inteiras (sem isso "ouro" casava dentro de "Tesouro").
export function ativosDoItem(item, ativos = []) {
  if (item && typeof item === 'object' && item.ativo) return [item.ativo];
  const t = norm(textoItem(item));
  if (!t.trim()) return [];
  const tickers = t.match(/(?<= )[a-z]{4}\d{2}(?= )/g);
  if (tickers) return [...new Set(tickers)];
  const classe = CLASSE_DE[t.trim()];
  if (classe) return ativos.filter(a => a.classe === classe).map(a => a.chave);
  return ativos.filter(a => t.includes(norm(a.chave.replace(/_/g, ' '))) || (a.nome && t.includes(norm(a.nome)))).map(a => a.chave);
}

// ---------- pausas (a única parte da estratégia que o app escreve: "pausar" um item da ordem de aportes) ----------
export const pausa = (est, item) => (est?.pausados || []).find(p => p?.item === textoItem(item)) || null;
export function alternarPausa(est, item, hoje) {
  const texto = textoItem(item);
  const pausados = (est?.pausados || []).filter(p => p?.item !== texto);
  if (!pausa(est, item)) pausados.push({ item: texto, em: hoje });
  return { ...est, pausados };
}

// ordem dos aportes sem o que está pausado: [{ item, texto, chaves }]
export function ordemAportes(est, ativos) {
  return (est?.prioridade_aporte || []).filter(i => !pausa(est, i)).map(i => ({ item: i, texto: textoItem(i), chaves: ativosDoItem(i, ativos) }));
}

// O que a estratégia diz sobre pôr dinheiro neste ativo (ou tirar dele). null = nada a dizer.
export function conselhoAtivo(est, chave, tipo, ativos) {
  if (!est || !chave) return null;
  if (tipo === 'aporte') {
    const parado = (est.prioridade_aporte || []).find(i => pausa(est, i) && ativosDoItem(i, ativos).includes(chave));
    if (parado) return { tom: 'atencao', texto: `Você pausou "${textoItem(parado)}" na estratégia em ${pausa(est, parado).em.split('-').reverse().join('/')}.` };
    const ordem = ordemAportes(est, ativos);
    if (!ordem.length || ordem.some(o => o.chaves.includes(chave))) return null;
    return { tom: 'info', texto: `Fora da ordem de aportes da estratégia: ${ordem.map(o => o.texto).join(' → ')}.` };
  }
  if (tipo === 'resgate') {
    const evitar = (est.evitar_retirar_de || []).find(i => ativosDoItem(i, ativos).includes(chave));
    if (evitar) return { tom: 'atencao', texto: `A estratégia pede para evitar resgatar daqui (${textoItem(evitar)}).` };
    const ordem = (est.prioridade_resgate || []).map(i => ({ texto: textoItem(i), chaves: ativosDoItem(i, ativos) }));
    if (!ordem.length || ordem.some(o => o.chaves.includes(chave))) return null;
    return { tom: 'info', texto: `A estratégia resgata primeiro de: ${ordem.map(o => o.texto).join(' → ')}.` };
  }
  return null;
}

// ---------- gatilhos que o app vigia ----------
// gatilho = texto (só o Bruno sabe quando acontece) ou { texto, se: { indicador, op: ">"|"<", valor } }
export const INDICADORES = { dolar: 'dólar (PTAX, R$)', cdi: 'CDI (% ao ano)', salario: 'salário do mês no caixa (R$)' };
export function gatilhos(est, valores = {}) {
  return (est?.gatilhos || []).map(g => {
    const texto = textoItem(g);
    const se = g && typeof g === 'object' ? g.se : null;
    if (!se || !(se.indicador in INDICADORES) || !['>', '<'].includes(se.op) || !Number.isFinite(num(se.valor))) return { texto, vigiado: false, disparou: false };
    const agora = valores[se.indicador];
    if (!Number.isFinite(agora)) return { texto, vigiado: true, se, agora: null, disparou: false };
    return { texto, vigiado: true, se, agora, disparou: se.op === '>' ? agora > num(se.valor) : agora < num(se.valor) };
  });
}

// ---------- o que mudou entre duas versões da estratégia (aviso no app e resposta do conector) ----------
export function mudancasEstrategia(a, d, meta = null) {
  a ||= {};
  d ||= {};
  const out = [];
  const pa = Object.fromEntries((a.alvos || []).map(x => [x.classe, num(x.pct)]));
  const pd = Object.fromEntries((d.alvos || []).map(x => [x.classe, num(x.pct)]));
  for (const k of new Set([...Object.keys(pa), ...Object.keys(pd)])) {
    const n = NOME_CLASSE[k] || k;
    if (!(k in pa)) out.push(`${n} entrou nos alvos com ${pct(pd[k])}`);
    else if (!(k in pd)) out.push(`${n} saiu dos alvos (era ${pct(pa[k])})`);
    else if (pa[k] !== pd[k]) out.push(`${n}: ${pct(pa[k])} → ${pct(pd[k])}`);
  }
  const ordem = (k, rotulo) => {
    const x = (a[k] || []).map(textoItem), y = (d[k] || []).map(textoItem);
    if (x.join('|') !== y.join('|')) out.push(y.length ? `${rotulo}: ${y.join(' → ')}` : `${rotulo}: saiu`);
  };
  ordem('prioridade_aporte', 'Ordem dos aportes');
  ordem('prioridade_resgate', 'Ordem dos resgates');
  const conjunto = (k, rotulo) => {
    const x = new Set((a[k] || []).map(textoItem)), y = new Set((d[k] || []).map(textoItem));
    const mais = [...y].filter(v => !x.has(v)), menos = [...x].filter(v => !y.has(v));
    if (mais.length) out.push(`${rotulo}, novo: ${mais.join('; ')}`);
    if (menos.length) out.push(`${rotulo}, saiu: ${menos.join('; ')}`);
  };
  conjunto('evitar_retirar_de', 'Evitar resgatar de');
  conjunto('gatilhos', 'Gatilho');
  if ((a.tese || '') !== (d.tese || '')) out.push(a.tese ? 'Tese reescrita' : 'Tese nova');
  if ((a.prazo || '') !== (d.prazo || '')) out.push(`Prazo: ${a.prazo || '—'} → ${d.prazo || '—'}`);
  const vistos = new Set(['alvos', 'prioridade_aporte', 'prioridade_resgate', 'evitar_retirar_de', 'gatilhos', 'tese', 'prazo', 'pausados', 'revisada_em']);
  const outros = [...new Set([...Object.keys(a), ...Object.keys(d)])].filter(k => !vistos.has(k) && JSON.stringify(a[k]) !== JSON.stringify(d[k]));
  if (outros.length) out.push(`Também mudou: ${outros.join(', ')}`);
  // a meta de dólar mora em meta_dolarizacao; o dólar dos alvos (dólar + cripto) tem de bater com ela
  if (out.length && meta?.alvo_pct != null && 'dolar' in pd) {
    const s = pd.dolar + (!meta.conta_como_dolar || meta.conta_como_dolar.includes('cripto') ? pd.cripto || 0 : 0); // como dolarizacao() conta
    if (Math.abs(s - num(meta.alvo_pct)) > 0.5) out.push(`Atenção: a meta de dólar é ${pct(num(meta.alvo_pct))}, mas o dólar dos alvos soma ${pct(s)}`);
  }
  return out;
}
