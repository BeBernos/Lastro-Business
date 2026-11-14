// Resposta parcial do Claude (v9.6) — usada pelo app (importar) e pelo conector MCP (worker/mcp.js).
// v9.6: resposta parcial do Claude — em vez do arquivo inteiro (a carteira tem ~75 KB e o caixa ~200 KB; escrever tudo
// de novo é o que mais demora), só os campos que mudaram: {"lastro_parcial": "carteira"|"caixa", "data", ...campos}.
// Só os campos da lista entram (nunca posições, valores ou o mês); análises novas somam às de antes (mesmo título troca).
export const CAMPOS_PARCIAIS = {
  // v9.10: meta de alocação e análise de mercado também (o PLANO não conseguia corrigi-las fora do fechamento)
  carteira: { plano_aportes: 'lista', meta_dolarizacao: 'objeto', estrategia: 'objeto', analises: 'lista', metas: 'lista', fichas_ativos: 'objeto', plano_acao: 'objeto', target_allocation: 'objeto', analise_mercado: 'objeto' },
  caixa: { analises: 'lista', orcamentos: 'lista', capacidadeAporte: 'objeto', valoresConhecidos: 'lista' },
};
export const NOME_CAMPO = { fichas_ativos: 'fichas dos ativos', plano_aportes: 'plano de aportes', meta_dolarizacao: 'meta de dólar', estrategia: 'estratégia', analises: 'análises', metas: 'metas', orcamentos: 'orçamentos', capacidadeAporte: 'capacidade de aporte', valoresConhecidos: 'valores conhecidos', plano_acao: 'plano de ação', target_allocation: 'meta de alocação', analise_mercado: 'análise de mercado' };

export function lerParcial(texto) {
  if (!/^\s*\{/.test(texto)) return null;
  try {
    const o = JSON.parse(texto);
    return o && typeof o === 'object' && o.lastro_parcial in CAMPOS_PARCIAIS ? o : null;
  } catch {
    return null;
  }
}
export function juntarParcial(base, parcial) {
  const campos = CAMPOS_PARCIAIS[parcial?.lastro_parcial];
  if (!campos || !base) throw new Error('Este arquivo não é uma resposta parcial que o Lastro entenda.');
  const dados = { ...base };
  const mudou = [];
  for (const [k, tipo] of Object.entries(campos)) {
    if (!(k in parcial)) continue;
    const v = parcial[k];
    const certo = tipo === 'lista' ? Array.isArray(v) : v && typeof v === 'object' && !Array.isArray(v);
    if (!certo) throw new Error(`O campo "${k}" veio num formato errado — peça ao Claude para corrigir.`);
    // v9.12.4: o painel da carteira quebra (Visão pela metade) com ativo urgente sem variação nenhuma — o PLANO de 13/11
    // gravou os Tesouros novos assim. Recusa com o motivo, para o Claude corrigir.
    if (k === 'analise_mercado') {
      const sem = (v.ativos || []).filter(a => a?.urgencia === 'alta' && a.d7 == null && a.dm == null).map(a => a.n);
      if (sem.length) throw new Error(`Na análise de mercado, ativo com urgência "alta" precisa de "d7" ou "dm" com número (use 0 se ainda não há histórico): ${sem.join(', ')}.`);
    }
    if (k === 'fichas_ativos') dados.fichas_ativos = { ...(base.fichas_ativos || {}), ...v }; // ficha nova troca só a daquele ativo
    else if (k === 'analises') {
      const titulos = new Set(v.map(a => a?.titulo));
      dados.analises = [...(base.analises || []).filter(a => !titulos.has(a?.titulo)), ...v];
    } else dados[k] = v;
    mudou.push(k);
  }
  if (!mudou.length) throw new Error('O arquivo não trouxe nada que o Lastro saiba juntar.');
  const ignorados = Object.keys(parcial).filter(k => !(k in campos) && k !== 'lastro_parcial' && k !== 'data');
  return { dados, mudou, ignorados };
}
