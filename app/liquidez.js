// v9.7 — Em quanto tempo o dinheiro de um resgate cai na conta, e a "ficha" de cada ativo (pedido do Bruno, 05/11/2026:
// "se eu sacar de um ativo, quanto tempo demora para cair na conta… tem fundo D+6").
// De onde vem o prazo, do mais confiável para o menos:
//   1. cart.fichas_ativos[chave] — a ficha que o Claude pesquisa (MODO PESQUISA fichas, com fonte e data):
//      { liquidez_resgate: 'D+6', cotizacao_resgate: 'D+5', liquidacao: 'D+1', horario_limite: '14:00',
//        cotizacao_aplicacao: 'D+1', aplicacao_minima, taxa_adm, taxa_performance, ir, iof, come_cotas, fgc, risco,
//        carencia, observacao, fonte, atualizado_em }
//   2. fundos_renda_fixa / fundos_protecao (campo `liquidez` que o gestor já grava);
//   3. o padrão do tipo: B3 (FIIs, ETFs, GLDI11) liquida em D+2; cripto na Binance sai na hora.
// Dias úteis: sem sábado, domingo e os feriados do caixa (`feriados.datas`). Funções puras.

const PROTECAO = { itau_index_gold: 'index_gold', dolar: 'index_cambial_dolar' }; // chave do ativo → fundos_protecao
const B3 = new Set(['fiis', 'etfs']);

const lerD = t => { const m = String(t || '').match(/D\s*\+\s*(\d+)/i); return m ? Number(m[1]) : /D\s*\+?\s*0|imediat|na hora/i.test(String(t || '')) ? 0 : null; };

export function prazoResgate(cart, chave, classe = '') {
  const ficha = cart?.fichas_ativos?.[chave];
  const d1 = lerD(ficha?.liquidez_resgate);
  if (d1 != null) return { du: d1, texto: `D+${d1}`, fonte: 'ficha', ficha, horario: ficha.horario_limite || null };
  const fundo = cart?.fundos_renda_fixa?.[chave] || cart?.fundos_protecao?.[PROTECAO[chave] || chave];
  const d2 = lerD(fundo?.liquidez);
  if (d2 != null) return { du: d2, texto: `D+${d2}`, fonte: 'fundo', ficha: ficha || null, horario: null };
  if (B3.has(classe) || /^gldi11$/i.test(chave)) return { du: 2, texto: 'D+2', fonte: 'b3', ficha: ficha || null, horario: null };
  if (classe === 'cripto') return { du: 0, texto: 'na hora', fonte: 'cripto', ficha: ficha || null, horario: null };
  return { du: null, texto: 'sem informação', fonte: null, ficha: ficha || null, horario: null };
}

const iso = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
export function diaUtil(dataISO, feriados = {}) {
  const d = new Date(`${dataISO}T12:00:00Z`);
  const dia = d.getUTCDay();
  return dia !== 0 && dia !== 6 && !(dataISO in (feriados || {}));
}
// dataISO + du dias úteis (pedido feito em dia não útil conta a partir do próximo dia útil)
export function somarDiasUteis(dataISO, du, feriados = {}) {
  const d = new Date(`${dataISO}T12:00:00Z`);
  while (!diaUtil(iso(d), feriados)) d.setUTCDate(d.getUTCDate() + 1);
  for (let n = 0; n < du;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (diaUtil(iso(d), feriados)) n++;
  }
  return iso(d);
}

// Pedido de resgate hoje (`hoje` AAAA-MM-DD, `hora` HH:MM) → { ...prazo, data (AAAA-MM-DD) | null, depoisDoHorario }
export function creditoResgate(cart, chave, classe, hoje, { feriados = {}, hora = '' } = {}) {
  const p = prazoResgate(cart, chave, classe);
  if (p.du == null) return { ...p, data: null, depoisDoHorario: false };
  const depoisDoHorario = !!(p.horario && hora && hora > p.horario);
  const pedido = depoisDoHorario ? somarDiasUteis(hoje, 1, feriados) : hoje;
  return { ...p, data: somarDiasUteis(pedido, p.du, feriados), depoisDoHorario };
}

// Itens da ficha para a tela, na ordem que importa para decidir
const CAMPOS = [
  ['liquidez_resgate', 'Resgate cai na conta'], ['cotizacao_resgate', 'Rende até (cotização do resgate)'], ['horario_limite', 'Horário limite do pedido'],
  ['cotizacao_aplicacao', 'Aplicar de novo (cotização)'], ['aplicacao_minima', 'Aplicação mínima'], ['taxa_adm', 'Taxa de administração'],
  ['taxa_performance', 'Taxa de performance'], ['ir', 'Imposto de renda'], ['iof', 'IOF'], ['come_cotas', 'Come-cotas'], ['fgc', 'FGC'],
  ['carencia', 'Carência'], ['vencimento', 'Vencimento'], ['indexador', 'Rentabilidade'], ['risco', 'Risco'], ['observacao', 'Observação'],
];
export function linhasFicha(ficha) {
  if (!ficha) return [];
  return CAMPOS.filter(([k]) => ficha[k] != null && ficha[k] !== '').map(([k, nome]) => [nome, typeof ficha[k] === 'boolean' ? (ficha[k] ? 'sim' : 'não') : String(ficha[k])]);
}

// Texto para o Claude pesquisar a ficha de todos os ativos (MODO PESQUISA fichas) e devolver a resposta pequena
export function textoFichas(ativos, nomeArquivo) {
  return [
    'MODO PESQUISA fichas — todos os meus ativos',
    '',
    `Arquivo anexado: ${nomeArquivo} (carteira).`,
    'Para CADA ativo abaixo, pesquise na internet (lâmina, regulamento, site do banco ou da gestora, B3) e preencha a ficha, com fonte e data:',
    ...ativos.map(a => `- ${a.chave} (${a.nome}, ${a.rotulo})`),
    '',
    'Campos de cada ficha: liquidez_resgate (em quantos dias úteis o dinheiro cai na conta, "D+6"), cotizacao_resgate (até quando rende depois de pedir), horario_limite ("14:00"), cotizacao_aplicacao, aplicacao_minima, taxa_adm, taxa_performance, ir (tabela e alíquota de hoje), iof, come_cotas, fgc (true/false), carencia, vencimento ("AAAA-MM-DD", só títulos com data), indexador (ex.: "IPCA + 7,1%", "102% do CDI"), risco (uma frase), observacao, fonte, atualizado_em.',
    'Se não achar um campo, deixe de fora (não invente). Diga em uma linha o que ficou sem fonte.',
    'Devolva só um JSON PEQUENO: {"lastro_parcial": "carteira", "data": "AAAA-MM-DD", "fichas_ativos": {"<chave>": {…}}} — o Lastro junta à carteira e usa o prazo para dizer quando cada resgate cai na conta.',
  ].join('\n');
}
