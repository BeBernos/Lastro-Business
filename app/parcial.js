// Resposta parcial do Claude (v9.6) — usada pelo app (importar) e pelo conector MCP (worker/mcp.js).
// v9.6: resposta parcial do Claude — em vez do arquivo inteiro (a carteira tem ~75 KB e o caixa ~200 KB; escrever tudo
// de novo é o que mais demora), só os campos que mudaram: {"lastro_parcial": "carteira"|"caixa", "data", ...campos}.
// Só os campos da lista entram (nunca posições, valores ou o mês); análises novas somam às de antes (mesmo título troca).
import { conferirAlvos, derivarTarget, mudancasEstrategia } from './ficha.js';
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
    if (k === 'estrategia') conferirAlvos(v.alvos); // v9.13: alvos que não somam 100% quebrariam a meta do painel
    if (k === 'fichas_ativos') dados.fichas_ativos = { ...(base.fichas_ativos || {}), ...v }; // ficha nova troca só a daquele ativo
    else if (k === 'analises') {
      const titulos = new Set(v.map(a => a?.titulo));
      dados.analises = [...(base.analises || []).filter(a => !titulos.has(a?.titulo)), ...v];
    } else if (k === 'estrategia') dados.estrategia = 'pausados' in v || !base.estrategia?.pausados ? v : { ...v, pausados: base.estrategia.pausados }; // as pausas são do Bruno
    else dados[k] = v;
    mudou.push(k);
  }
  if (!mudou.length) throw new Error('O arquivo não trouxe nada que o Lastro saiba juntar.');
  const ignorados = Object.keys(parcial).filter(k => !(k in campos) && k !== 'lastro_parcial' && k !== 'data');
  // v9.13: com alvos na estratégia, a meta do painel (target_allocation) é sempre calculada deles — uma fonte só
  const alvo = parcial.lastro_parcial === 'carteira' && (mudou.includes('estrategia') || mudou.includes('target_allocation')) && derivarTarget(dados.estrategia);
  if (alvo) {
    const igual = (x, y) => JSON.stringify(Object.entries(x || {}).sort()) === JSON.stringify(Object.entries(y || {}).sort());
    if ('target_allocation' in parcial && !igual(parcial.target_allocation, alvo)) ignorados.push('target_allocation (calculado da estratégia)');
    dados.target_allocation = alvo;
    const i = mudou.indexOf('target_allocation'), difere = !igual(base.target_allocation, alvo);
    if (difere && i < 0) mudou.push('target_allocation');
    if (!difere && i >= 0) mudou.splice(i, 1);
  }
  if (!mudou.length) throw new Error(alvo ? 'A meta de alocação (target_allocation) é calculada da estratégia: para mudá-la, mude estrategia.alvos.' : 'O arquivo não trouxe nada que o Lastro saiba juntar.');
  const estrategia = mudou.includes('estrategia') ? mudancasEstrategia(base.estrategia, dados.estrategia, dados.meta_dolarizacao) : [];
  return { dados, mudou, ignorados, estrategia };
}

// ---------- v9.17: fechamento pelo conector ----------
// O Claude grava o fechamento como rascunho (worker/mcp.js) e o Bruno aplica no app. Antes de guardar, o conector confere
// que o JSON novo não perde nada do publicado: meses fechados, histórico da carteira, aportes ligados ao caixa e os campos
// do Lastro que atravessam os meses (a lista "não podem sumir" do projeto.txt; os de cada mês, como lancamentosApp, podem
// recomeçar ao abrir o mês novo).
export const CAMPOS_PROTEGIDOS = {
  caixa: ['categoriasApp', 'orcamentos', 'capacidadeAporte', 'valoresConhecidos'],
  carteira: ['meta_dolarizacao', 'plano_aportes', 'metas', 'fichas_ativos', 'estrategia'],
};

export function conferirFechamento(atual, novo, arquivo) {
  const erros = [];
  let dados = novo;
  if (typeof novo === 'string') {
    try { dados = JSON.parse(novo); } catch { return { erros: ['o JSON veio cortado ou inválido'], resumo: null, dados: null }; }
  }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return { erros: ['os dados têm de ser um objeto JSON'], resumo: null, dados: null };
  for (const k of CAMPOS_PROTEGIDOS[arquivo] || []) if (k in atual && !(k in dados)) erros.push(`sumiu o campo ${k}`);
  let resumo;
  if (arquivo === 'caixa') {
    if (!/^\d{4}-\d{2}$/.test(dados.periodo || '')) erros.push('periodo tem de ser AAAA-MM');
    else if (dados.periodo < atual.periodo) erros.push(`o período voltou de ${atual.periodo} para ${dados.periodo}`);
    const tem = new Set((dados.mesesFechados || []).map(m => m?.periodo));
    for (const m of atual.mesesFechados || []) if (!tem.has(m.periodo)) erros.push(`sumiu o mês fechado ${m.periodo}`);
    resumo = { periodo: [atual.periodo, dados.periodo], mesesFechados: [(atual.mesesFechados || []).length, (dados.mesesFechados || []).length], caixaInicial: dados.caixaInicial };
  } else {
    const ha = atual.historico_mensal || {}, hn = dados.historico_mensal || {};
    const comCaixa = h => (h?.fluxos || []).filter(f => f?.idCaixa).length;
    for (const mes of Object.keys(ha)) {
      if (!(mes in hn)) erros.push(`sumiu o mês ${mes} do histórico`);
      else if (comCaixa(hn[mes]) < comCaixa(ha[mes])) erros.push(`sumiram aportes/resgates do caixa em ${mes}`);
    }
    const ultimo = h => { const k = Object.keys(h).sort().at(-1); return [k, k ? h[k].patrimonio_total ?? h[k].patrimonio_parcial : null]; };
    const [ma, pa] = ultimo(ha), [mn, pn] = ultimo(hn);
    resumo = { mes: [ma, mn], patrimonio: [pa, pn] };
  }
  return { erros, resumo, dados };
}

// Mudanças por partes: o caixa real tem ~200 KB, grande demais para uma chamada só. {dados} troca tudo; {mudancas} troca o
// valor em cada caminho ("receitas/0/valor", "historico_mensal/2026-12"); {acrescentar} soma itens no fim de uma lista.
export function aplicarMudancas(base, { dados, mudancas, acrescentar } = {}) {
  const r = JSON.parse(JSON.stringify(dados ?? base));
  const ir = (caminho, criar) => {
    const partes = String(caminho).split('/').filter(Boolean);
    if (!partes.length) throw new Error('caminho vazio');
    let o = r;
    for (const p of partes.slice(0, -1)) {
      if (o[p] == null && criar) o[p] = {};
      o = o[p];
      if (o == null || typeof o !== 'object') throw new Error(`o caminho ${caminho} não existe`);
    }
    return [o, partes.at(-1)];
  };
  for (const [c, v] of Object.entries(mudancas || {})) { const [o, k] = ir(c, true); o[k] = v; }
  for (const [c, itens] of Object.entries(acrescentar || {})) {
    const [o, k] = ir(c, false);
    if (!Array.isArray(o[k])) throw new Error(`${c} não é uma lista`);
    o[k].push(...(Array.isArray(itens) ? itens : [itens]));
  }
  return r;
}
