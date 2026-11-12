// Estimativa "Hoje" da carteira: valor oficial (do gestor de carteira) × quanto cada ativo variou
// desde a data oficial. As cotações vêm do Worker (/cotacoes); aqui só se monta o pedido e se faz a conta.
// O valor oficial continua sendo o do agente — a estimativa aparece sempre separada e marcada como tal.

import { posicao } from './carteira.js';

// cripto_detalhe_usd usa siglas; a CoinGecko usa nomes
export const CRIPTO_IDS = { btc: 'bitcoin', eth: 'ethereum', bnb: 'binancecoin', sol: 'solana', ada: 'cardano', xrp: 'ripple', dot: 'polkadot', usdt: 'tether' };

const NOMES_RF = n => n.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// O que pedir ao Worker: códigos da B3 (FIIs, ETFs, GLDI11) e moedas cripto da posição oficial
export function pedidoCotacoes(cart) {
  const p = posicao(cart);
  const a = p.h.ativos || {};
  const b3 = new Set([...Object.keys(a.fiis || {}), ...Object.keys(a.etfs || {})].map(t => t.toUpperCase()));
  if (p.h.ativos_ouro_detalhe?.gldi11 !== undefined) b3.add('GLDI11');
  const cripto = Object.keys(p.h.cripto_detalhe_usd || {}).filter(k => CRIPTO_IDS[k]).map(k => CRIPTO_IDS[k]);
  return { ref: String(p.data).slice(0, 10), b3: [...b3].sort(), cripto };
}

export function urlCotacoes(pedido) {
  const q = new URLSearchParams({ ref: pedido.ref });
  if (pedido.b3.length) q.set('b3', pedido.b3.join(','));
  if (pedido.cripto.length) q.set('cripto', pedido.cripto.join(','));
  return `cotacoes?${q}`;
}

const razao = q => (q && q.agora > 0 && q.ref > 0 ? q.agora / q.ref : null);

// Resultado: { total, oficial, variacao, cobertura (parte do oficial que tem cotação), itens, faltaChaveB3, cotadoEm }
export function estimar(cart, cot) {
  const p = posicao(cart);
  const h = p.h;
  const a = h.ativos || {};
  const itens = [];
  // valor que veio do banco depois da posição oficial (Itaú/Binance automáticos) já é o de hoje: não se estima por cima
  const doBanco = chave => chave && (h.ativos_atualizado_em?.[chave] || '') > p.data;
  const add = (nome, classe, oficial, fator, fonte, chave) => {
    if (!(oficial > 0)) return;
    if (doBanco(chave)) return void itens.push({ chave, nome, classe, oficial, hoje: oficial, variacao: 0, fonte: 'saldo do banco' });
    itens.push({ chave, nome, classe, oficial, hoje: fator ? oficial * fator : oficial, variacao: fator ? fator - 1 : null, fonte: fator ? fonte : 'sem cotação' });
  };
  // Renda fixa: CDI de cada dia útil desde a data oficial × % do CDI do fundo (últimos 12 meses)
  const cdi = Array.isArray(cot.cdi) ? cot.cdi : [];
  for (const [k, v] of Object.entries(a.renda_fixa || {})) {
    const pct = (cart.fundos_renda_fixa?.[k]?.pct_cdi_12m ?? 100) / 100;
    const fator = cdi.reduce((f, d) => f * (1 + (d.valor / 100) * pct), 1);
    add(NOMES_RF(k), 'Renda fixa', v, fator, cdi.length ? `${Math.round(pct * 100)}% do CDI` : 'sem CDI novo ainda', k);
  }
  // FIIs e ETFs: variação da cota desde a data oficial
  for (const [classe, grupo] of [['FII', a.fiis], ['ETF', a.etfs]]) {
    for (const [t, v] of Object.entries(grupo || {})) add(t.toUpperCase(), classe, v, razao(cot.b3?.[t.toUpperCase()]), 'B3', t);
  }
  // Ouro: GLDI11 pela própria cota; o fundo de ouro acompanha a variação do GLDI11
  const ouro = h.ativos_ouro_detalhe;
  const gldi = razao(cot.b3?.GLDI11);
  if (ouro) {
    add('GLDI11', 'Ouro', ouro.gldi11, gldi, 'B3', 'gldi11');
    add('Itaú Index Gold', 'Ouro', ouro.itau_index_gold, gldi, 'variação do GLDI11', 'itau_index_gold');
  } else add('Ouro', 'Ouro', a.ouro, gldi, 'variação do GLDI11', 'ouro');
  // Dólar: variação da PTAX
  const ptaxRef = h.cripto_detalhe_usd?.cotacao_usd_brl || cot.ptax?.ref;
  const fDolar = cot.ptax?.agora && ptaxRef ? cot.ptax.agora / ptaxRef : null;
  add('Dólar', 'Dólar', a.dolar, fDolar, 'PTAX', 'dolar');
  // Cripto: cada moeda em dólar × variação dela × dólar de hoje
  const det = h.cripto_detalhe_usd;
  if (det && cot.cripto && !cot.cripto.erro && fDolar) {
    let usdHoje = 0, usdRef = 0, todas = true;
    for (const [k, usd] of Object.entries(det)) {
      if (k === 'cotacao_usd_brl' || typeof usd !== 'number') continue;
      const r = razao(cot.cripto[CRIPTO_IDS[k]]);
      usdRef += usd;
      if (r) usdHoje += usd * r;
      else { usdHoje += usd; todas = false; }
    }
    add('Cripto', 'Cripto', a.cripto, usdRef ? (usdHoje / usdRef) * fDolar : null, todas ? 'CoinGecko × PTAX' : 'parcial', 'cripto');
  } else add('Cripto', 'Cripto', a.cripto, null, '', 'cripto');

  const oficial = itens.reduce((s, i) => s + i.oficial, 0);
  const total = itens.reduce((s, i) => s + i.hoje, 0);
  const cobertos = itens.filter(i => i.variacao !== null).reduce((s, i) => s + i.oficial, 0);
  const horas = Object.values(cot.b3 || {}).map(q => q.hora).filter(Boolean).sort();
  return {
    oficial,
    total,
    variacao: total - oficial,
    cobertura: oficial ? cobertos / oficial : 0,
    itens,
    faltaChaveB3: Object.values(cot.b3 || {}).some(q => q.erro === 'sem-chave'),
    ref: p.data,
    cotadoEm: horas[horas.length - 1] || cot.geradoEm,
  };
}
