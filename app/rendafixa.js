// v9.8 — Renda fixa: simulador de troca e escada (pedidos do Bruno, 05/11/2026). Funções puras.
//
// Simulador: "se eu tirar R$ X do fundo A e puser em B, quanto tenho daqui a N meses?" — conta aproximada, sempre
// marcada como simulação.
// - Origem: rende o que rendeu DE VERDADE (% do CDI real, de rendimentoRendaFixa). As posições são líquidas de IR, como o
//   banco mostra: o resgate entrega ≈ o valor da tela (o IR já está descontado nele) e o crescimento já vem líquido.
// - Destino: rentabilidade bruta (% do CDI, IPCA + X% ou prefixado) − taxa de administração; IR pela tabela regressiva
//   (22,5% até 180 dias, 20% até 360, 17,5% até 720, 15% depois), ou isento (LCI, LCA, debênture incentivada).
// - Entre pedir o resgate e o dinheiro cair (D+X úteis), ele não rende em lugar nenhum: o destino começa atrasado.
// - IPCA+ e prefixado oscilam de preço antes do vencimento (marcação a mercado): vender antes pode dar mais ou menos.

export const aliquotaIR = dias => (dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15);
export const cdiAnualDe = cdi => { // série diária (% ao dia) → % ao ano, pelo último dia
  const u = cdi?.[cdi.length - 1]?.valor;
  return Number.isFinite(u) ? (Math.pow(1 + u / 100, 252) - 1) * 100 : null;
};

// { valor, meses, cdiAnual (%), ipcaAnual (%), origem: { pctCdi (real, líquido), du }, destino: { tipo: 'cdi'|'ipca'|'pre',
//   taxa (%), adm (% a.a.), isento, du } } → números em R$ e o resumo
export function simularTroca({ valor, meses = 12, cdiAnual, ipcaAnual = 4.5, origem, destino }) {
  if (!(valor > 0) || !(meses > 0) || !(cdiAnual > 0)) return null;
  const anos = meses / 12;
  const gO = (cdiAnual / 100) * ((origem?.pctCdi ?? 100) / 100);
  const fica = valor * Math.pow(1 + gO, anos);
  const bruta = destino.tipo === 'cdi' ? (cdiAnual / 100) * (destino.taxa / 100)
    : destino.tipo === 'ipca' ? (1 + ipcaAnual / 100) * (1 + destino.taxa / 100) - 1
      : destino.taxa / 100;
  const g = (1 + bruta) / (1 + (destino.adm || 0) / 100) - 1;
  const parado = Math.max(0, destino.du ?? 0) + Math.max(0, origem?.du ?? 0); // dias úteis sem render
  const tempo = Math.max(0, anos - parado / 252);
  const ganho = valor * (Math.pow(1 + g, tempo) - 1);
  const dias = Math.round(meses * 30.44);
  const ir = destino.isento ? 0 : ganho * aliquotaIR(dias);
  const troca = valor + ganho - ir;
  const r = v => Math.round(v * 100) / 100;
  return {
    fica: r(fica), troca: r(troca), diferenca: r(troca - fica), ir: r(ir), ganhoBruto: r(ganho), parado,
    aliquota: destino.isento ? 0 : aliquotaIR(dias), brutaAnual: bruta * 100, liquidaOrigemAnual: gO * 100,
    melhor: troca - fica > 0.5 ? 'troca' : fica - troca > 0.5 ? 'fica' : 'empate',
    marcacao: destino.tipo !== 'cdi',
  };
}

// Escada: quando cada parte do dinheiro investido fica disponível.
// ativos: [{ chave, nome, classe, valor }]; prazo(chave, classe) → { du } (liquidez.js); vencimentos de
// fichas_ativos[k].vencimento ou fundos_renda_fixa[k].vencimento ('AAAA-MM-DD').
// Devolve { degraus: [{ id, nome, total, itens }], vencimentos: [{ ano, total, itens: [{nome, valor, vencimento}] }],
//   proximos: itens que vencem em até 60 dias }
const DEGRAUS = [['hoje', 'Cai hoje (D+0)', 0, 0], ['curto', 'Em 1 a 2 dias úteis', 1, 2], ['medio', 'Em 3 a 6 dias úteis', 3, 6], ['longo', 'Mais de 6 dias úteis', 7, Infinity]];
export function escada(cart, ativos, prazo, hoje) {
  const venc = k => cart?.fichas_ativos?.[k]?.vencimento || cart?.fundos_renda_fixa?.[k]?.vencimento || null;
  const degraus = DEGRAUS.map(([id, nome]) => ({ id, nome, total: 0, itens: [] }));
  const semPrazo = { id: 'sem', nome: 'Sem prazo conhecido', total: 0, itens: [] };
  const comVenc = [];
  for (const a of ativos.filter(x => x.valor > 0)) {
    const v = venc(a.chave);
    if (v) { comVenc.push({ ...a, vencimento: v }); continue; }
    const du = prazo(a.chave, a.classe)?.du;
    const d = du == null ? semPrazo : degraus[DEGRAUS.findIndex(([, , de, ate]) => du >= de && du <= ate)];
    d.itens.push({ ...a, du });
    d.total += a.valor;
  }
  const anos = {};
  for (const a of comVenc.sort((x, y) => x.vencimento.localeCompare(y.vencimento))) {
    const ano = a.vencimento.slice(0, 4);
    (anos[ano] ||= { ano, total: 0, itens: [] }).itens.push(a);
    anos[ano].total += a.valor;
  }
  const limite = new Date(`${hoje}T12:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() + 60);
  const ate60 = limite.toISOString().slice(0, 10);
  const r = v => Math.round(v * 100) / 100;
  return {
    degraus: [...degraus, semPrazo].filter(d => d.itens.length).map(d => ({ ...d, total: r(d.total), itens: d.itens.sort((x, y) => y.valor - x.valor) })),
    vencimentos: Object.values(anos).map(a => ({ ...a, total: r(a.total) })),
    proximos: comVenc.filter(a => a.vencimento >= hoje && a.vencimento <= ate60),
  };
}
