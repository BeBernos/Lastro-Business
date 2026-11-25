// v8.8 — Acompanhamento: orçamento por categoria, renda passiva × custo de vida, % em dólar mês a mês, assinaturas
// que sobem ou esquecidas, metas e o pacote do Imposto de Renda. Funções puras sobre os JSONs (caixa e carteira);
// as telas ficam em telas.js/app.js. Nada aqui recalcula o caixa: os totais do mês vêm do motor do painel (calc).
//
// Campos novos no contrato (o Claude mantém; o app guarda cópia no aparelho se um painel chegar sem eles):
//   caixa:    orcamentos: [{ cat, limite }]
//   carteira: metas: [{ id, nome, alvo, prazo (AAAA-MM), ativos: [chave] | null, guardado (R$, quando não liga a ativos) }]

import { mesmaCategoria, nomeCategoria, norm } from './categorias.js';
import { dolarizacao, listaAtivos, nomeAtivo, planoDoMes } from './investimentos.js';
import { posicao } from './carteira.js';

const centavos = v => Math.round(v * 100) / 100;
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const mesCurto = ym => { const [a, m] = String(ym).split('-').map(Number); return `${MESES[m - 1]}/${String(a).slice(2)}`; };
const mesesEntre = (de, ate) => { const [a1, m1] = de.split('-').map(Number); const [a2, m2] = ate.split('-').map(Number); return (a2 - a1) * 12 + (m2 - m1); };

// ---------- orçamento por categoria ----------
// Gasto do mês por categoria = fatura do cartão (var-itau.categorias) + contas de Pix/débito com a mesma categoria.
// ritmo: projeção para o fim do mês no passo atual (só para o que é gasto livre; recorrentes já entram inteiras).
export function orcamentoDoMes(dados, { diaHoje, dias }) {
  const lista = (dados.orcamentos || []).filter(o => o && o.cat && o.limite > 0);
  if (!lista.length) return [];
  const cartao = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const contas = [...(dados.despesasVariaveis || []), ...(dados.despesasFixas || [])].filter(x => x.id !== 'var-itau' && x.categoria);
  return lista.map(o => {
    const noCartao = (cartao?.categorias || []).filter(c => mesmaCategoria(c.cat, o.cat)).reduce((s, c) => s + c.valor, 0);
    const emConta = contas.filter(x => mesmaCategoria(x.categoria, o.cat) && x.status === 'confirmado').reduce((s, x) => s + Math.abs(x.valor), 0);
    const gasto = centavos(noCartao + emConta);
    const ritmo = diaHoje > 0 && dias ? centavos((gasto / diaHoje) * dias) : gasto;
    const pct = gasto / o.limite;
    return { cat: o.cat, nome: nomeCategoria(o.cat), limite: o.limite, gasto, pct, ritmo, sobra: centavos(o.limite - gasto), tom: pct >= 1 ? 'ruim' : pct >= 0.8 ? 'atencao' : 'bom' };
  }).sort((a, b) => b.pct - a.pct);
}

// Sugestão de limite: a média do que a categoria gastou nos meses fechados que têm detalhe (historicoItau), arredondada
export function sugestaoOrcamento(dados, cat) {
  const meses = (dados.historicoItau || []).filter(h => Array.isArray(h.categorias));
  const valores = meses.map(h => h.categorias.filter(c => mesmaCategoria(c.cat, cat)).reduce((s, c) => s + c.valor, 0)).filter(v => v > 0);
  if (!valores.length) return null;
  const media = valores.reduce((s, v) => s + v, 0) / valores.length;
  return Math.ceil(media / 50) * 50;
}

export function definirOrcamentos(dados, lista) {
  const d = structuredClone(dados);
  const limpos = lista.filter(o => o.cat && Number.isFinite(o.limite) && o.limite > 0).map(o => ({ cat: o.cat, limite: centavos(o.limite) }));
  if (limpos.length) d.orcamentos = limpos;
  else delete d.orcamentos;
  return d;
}

// ---------- renda passiva × custo de vida ----------
// Por mês: dividendos da carteira (historico_mensal[mes].dividendos) ÷ despesas do caixa (fixas + variáveis dos meses
// fechados; o mês aberto vem do motor). Rendimento de renda fixa fica de fora: ele não cai no caixa, se reinveste.
export function rendaPassiva(cf, cart, custoMesAberto = null) {
  const hm = cart?.historico_mensal || {};
  const custo = {};
  for (const m of cf.mesesFechados || []) {
    const r = m.resultado || {};
    if (Number.isFinite(r.fixasTotal) && Number.isFinite(r.variaveisTotal)) custo[m.periodo] = r.fixasTotal + r.variaveisTotal;
  }
  if (custoMesAberto && cf.periodo) custo[cf.periodo] = custoMesAberto;
  const meses = Object.keys(custo).filter(m => hm[m] && Number.isFinite(hm[m].dividendos)).sort();
  const serie = meses.map(m => ({ mes: m, dividendos: centavos(hm[m].dividendos), custo: centavos(custo[m]), pct: hm[m].dividendos / custo[m] }));
  if (!serie.length) return null;
  const atual = serie[serie.length - 1];
  // quanto investido seria preciso para os dividendos pagarem o mês inteiro, no rendimento médio dos últimos 3 meses
  const p = posicao(cart);
  const ult = serie.slice(-3);
  const divMedio = ult.reduce((s, x) => s + x.dividendos, 0) / ult.length;
  const yieldMes = p.total ? divMedio / p.total : 0;
  const necessario = yieldMes > 0 ? centavos(atual.custo / yieldMes) : null;
  return { serie, atual, divMedio: centavos(divMedio), yieldMes, necessario };
}

// ---------- % em dólar mês a mês ----------
export function dolarMesAMes(cart) {
  const hm = cart?.historico_mensal || {};
  const pontos = Object.keys(hm).sort().filter(m => hm[m]?.ativos && typeof hm[m].ativos === 'object').map(m => {
    const d = dolarizacao(cart, hm[m]);
    return d ? { mes: m, pct: d.pct, valor: d.valor } : null;
  }).filter(Boolean);
  if (!pontos.length) return null;
  const meta = cart.meta_dolarizacao || {};
  return { pontos, alvo: meta.alvo_pct ?? null, prazo: meta.prazo ?? null };
}

// ---------- assinaturas que sobem ou esquecidas ----------
// historico (guardado no aparelho): { chave: [{ mes, valor }] }, atualizado a cada abertura com as recorrentes do mês.
// revisoes: { chave: 'AAAA-MM-DD' } — quando o Bruno confirmou que ainda usa.
export const chaveAssinatura = nome => norm(nome).replace(/[^a-z0-9]+/g, ' ').trim();
export function registrarAssinaturas(historico, dados) {
  const h = structuredClone(historico || {});
  const cartao = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  for (const s of cartao?.assinaturas || []) {
    if (!s?.nome || !(s.valor > 0)) continue;
    const k = chaveAssinatura(s.nome);
    const lista = (h[k] ||= []);
    const i = lista.findIndex(x => x.mes === dados.periodo);
    if (i >= 0) lista[i].valor = s.valor;
    else lista.push({ mes: dados.periodo, valor: s.valor });
    lista.sort((a, b) => a.mes.localeCompare(b.mes));
    h[k] = lista.slice(-24);
  }
  return h;
}
export function revisarAssinaturas(dados, historico = {}, revisoes = {}, hoje) {
  const cartao = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  return (cartao?.assinaturas || []).filter(s => s?.nome && s.valor > 0).map((s, indice) => {
    const k = chaveAssinatura(s.nome);
    const hist = (historico[k] || []).filter(x => x.mes < dados.periodo);
    const antes = hist[hist.length - 1];
    const subiu = antes && s.valor - antes.valor > 0.009 ? { de: antes.valor, mes: antes.mes, diferenca: centavos(s.valor - antes.valor) } : null;
    const revisada = revisoes[k] || null;
    const semRevisao = !revisada || (hoje && (Date.parse(hoje) - Date.parse(revisada)) / 86400000 > 90);
    return { indice, nome: s.nome, valor: s.valor, porAno: centavos(s.valor * 12), cat: s.cat || '', subiu, revisada, semRevisao, chave: k };
  }).sort((a, b) => (b.subiu ? 1 : 0) - (a.subiu ? 1 : 0) || (b.semRevisao - a.semRevisao) || b.porAno - a.porAno);
}

// ---------- metas ----------
export function progressoMetas(cart, hoje) {
  const metas = (cart?.metas || []).filter(m => m && m.nome && m.alvo > 0);
  if (!metas.length) return [];
  const ativos = listaAtivos(cart);
  const mesHoje = String(hoje).slice(0, 7);
  return metas.map(m => {
    const ligados = Array.isArray(m.ativos) && m.ativos.length ? ativos.filter(a => m.ativos.includes(a.chave) || m.ativos.includes(a.classe)) : null;
    const atual = centavos(ligados ? ligados.reduce((s, a) => s + (a.valor || 0), 0) : m.guardado || 0);
    const falta = centavos(Math.max(0, m.alvo - atual));
    const meses = m.prazo ? Math.max(0, mesesEntre(mesHoje, m.prazo)) : null;
    const porMes = meses ? centavos(falta / meses) : null;
    return { ...m, atual, falta, pct: Math.min(1, atual / m.alvo), meses, porMes, ligadosA: ligados ? ligados.map(a => a.nome) : null, concluida: atual >= m.alvo };
  });
}
export function salvarMeta(cart, meta) {
  const c = structuredClone(cart);
  if (!meta.nome?.trim()) throw new Error('Dê um nome para a meta.');
  if (!(meta.alvo > 0)) throw new Error('Informe o valor da meta.');
  if (meta.prazo && !/^\d{4}-\d{2}$/.test(meta.prazo)) throw new Error('Prazo inválido.');
  const lista = (c.metas ||= []);
  const limpa = { id: meta.id || `meta-${Date.now().toString(36)}`, nome: meta.nome.trim(), alvo: centavos(meta.alvo), prazo: meta.prazo || null, ativos: meta.ativos?.length ? meta.ativos : null, ...(meta.ativos?.length ? {} : { guardado: centavos(meta.guardado || 0) }) };
  const i = lista.findIndex(x => x.id === limpa.id);
  if (i >= 0) lista[i] = limpa;
  else lista.push(limpa);
  return c;
}
export function excluirMeta(cart, id) {
  const c = structuredClone(cart);
  c.metas = (c.metas || []).filter(m => m.id !== id);
  if (!c.metas.length) delete c.metas;
  return c;
}

// ---------- pacote do Imposto de Renda ----------
// Do que o app sabe (carteira): dividendos por ativo no ano, aportes e resgates, posição no fim do ano (ou a mais
// recente). É um rascunho para levar ao Claude ou ao contador: os informes dos bancos continuam sendo a fonte oficial.
export function pacoteIR(cart, ano) {
  const hm = cart?.historico_mensal || {};
  const meses = Object.keys(hm).filter(m => m.startsWith(`${ano}-`)).sort();
  const dividendos = {};
  let aportes = 0, resgates = 0;
  const fluxos = [];
  for (const m of meses) {
    const h = hm[m];
    for (const [t, v] of Object.entries(h.dividendos_detalhe || {})) if (Number.isFinite(v)) dividendos[t] = centavos((dividendos[t] || 0) + v);
    if (Array.isArray(h.fluxos) && h.fluxos.length) {
      for (const f of h.fluxos) {
        if (f.tipo === 'aporte') aportes += f.valor || 0;
        if (f.tipo === 'resgate') resgates += f.valor || 0;
        fluxos.push({ mes: m, tipo: f.tipo, ativo: nomeAtivo(f.ativo || ''), valor: f.valor || 0, data: f.data || '' });
      }
    } else {
      aportes += Number(h.aportes) || 0;
      resgates += Number(h.resgates) || 0;
    }
  }
  const fim = meses.filter(m => hm[m].ativos).at(-1);
  const posicaoFim = fim ? listaAtivos(cart, hm[fim]).filter(a => a.valor) : [];
  const totalDiv = centavos(Object.values(dividendos).reduce((s, v) => s + v, 0));
  // v9.9.11: Excel (.xlsx, xlsx.js) com uma aba por assunto, uma linha por item — antes era um CSV com tudo junto
  const v = c => ({ titulo: c, tipo: 'valor', largura: 16 }), t = (c, l = 24) => ({ titulo: c, tipo: 'texto', largura: l });
  const abas = [
    { nome: 'Resumo', colunas: [t('Item', 30), v('Valor (R$)')], linhas: [['Dividendos e rendimentos recebidos', totalDiv], ['Aportes no ano', centavos(aportes)], ['Resgates no ano', centavos(resgates)]] },
    { nome: 'Dividendos', total: 'Total', colunas: [t('Ativo', 14), v('Recebido no ano (R$)'), t('Observação', 50)],
      linhas: Object.entries(dividendos).sort().map(([k, x]) => [k.toUpperCase(), x, 'FIIs: rendimento isento (pessoa física); conferir no informe']) },
    { nome: 'Aportes e resgates', colunas: [{ titulo: 'Data', tipo: 'data', largura: 12 }, t('Mês', 10), t('Tipo', 10), t('Ativo'), v('Valor (R$)')],
      linhas: fluxos.map(f => [f.data || '', mesCurto(f.mes), f.tipo, f.ativo, f.valor]) },
    { nome: `Posição ${fim ? mesCurto(fim).replace('/', '-') : ''}`.trim(), total: 'Total', colunas: [t('Ativo'), t('Classe', 16), v('Valor (R$)')], linhas: posicaoFim.map(a => [a.nome, a.rotulo, a.valor]) },
  ];
  return { ano, meses, dividendos, totalDiv, aportes: centavos(aportes), resgates: centavos(resgates), fluxos, posicaoFim, mesFim: fim || null, abas, nome: `lastro_imposto_de_renda_${ano}.xlsx` };
}

// ---------- dia do aporte planejado (v8.9) ----------
// O dia é do app, não do Projeto: muda a cada lançamento. Regra: o primeiro dia, de hoje em diante, em que dá para tirar
// o aporte sem o saldo ficar abaixo da reserva (regras.bufferCaixaDesejado) em nenhum dia até o horizonte da sobra
// segura do painel (~dia 10 do mês que vem). As contas do começo do mês seguinte só tiram dinheiro, então o pior ponto
// delas é o saldo final − ss.reserva. Não é sobre rendimento (dias de CDI são centavos), é sobre não faltar na conta.
export function diaDoAporte({ tl, ss }, valor, { diaHoje, buffer = 0 }) {
  const dias = tl.porDia;
  const prox = ss && Number.isFinite(ss.reserva) ? { saldo: tl.final - ss.reserva, dia: null } : null; // dia null = mês que vem
  const minDe = []; // pior saldo de cada dia até o horizonte, e quando
  let pior = prox || { saldo: Infinity, dia: null };
  for (let i = dias.length - 1; i >= 0; i--) {
    if (dias[i].saldo <= pior.saldo) pior = { saldo: dias[i].saldo, dia: dias[i].dia };
    minDe[i] = pior;
  }
  const futuro = dias.map((d, i) => ({ dia: d.dia, pior: minDe[i] })).filter(d => d.dia >= diaHoje);
  if (!futuro.length) return { dia: null, cabe: 0 };
  const ok = futuro.find(d => d.pior.saldo - buffer >= valor - 0.005);
  if (ok) return { dia: ok.dia, folga: centavos(ok.pior.saldo - buffer - valor), apertoDia: ok.pior.dia, apertoSaldo: centavos(ok.pior.saldo - valor), buffer };
  const melhor = futuro.reduce((a, b) => (b.pior.saldo > a.pior.saldo ? b : a));
  return { dia: null, cabe: centavos(Math.max(0, melhor.pior.saldo - buffer)), cabeDia: melhor.dia, apertoDia: melhor.pior.dia, apertoSaldo: centavos(melhor.pior.saldo), buffer };
}

// O que falta do plano do mês (carteira.plano_aportes) e o dia seguro para fazer. null = sem plano pendente.
export function aportePlanejado(m, dados, cart, { diaHoje, mesPassou }) {
  const pl = cart && !mesPassou && m?.tl ? planoDoMes(cart, dados.periodo) : null;
  if (!pl) return null;
  const itens = pl.itens.map(i => ({ ...i, falta: centavos(Math.max(0, i.planejado - i.feito)) })).filter(i => i.falta >= 0.5);
  if (!itens.length) return null;
  const valor = centavos(itens.reduce((s, i) => s + i.falta, 0));
  return { itens, valor, ...diaDoAporte(m, valor, { diaHoje, buffer: dados.regras?.bufferCaixaDesejado || 0 }) };
}

// ---------- v9.9.7: Caixa › 12 meses que dá para entender ----------
// Lê só o motor (projecao12 do painel): por mês, a SOBRA (o que entra − o que sai; um mês não soma no outro, porque a
// sobra vira aporte), o COLCHÃO (quanto a conta desce abaixo de onde o mês começou — é o mínimo para começar o mês sem
// ficar no vermelho) e o que foge do comum (lançamento ≥ R$ 300 que aparece em poucos meses: 13º, PPR, IR, IPVA…).
const chaveEvento = d => String(d).toLowerCase().replace(/\([^)]*\)/g, '').replace(/\d+(?![º°])[/.,]?\d*/g, '').replace(/\s+/g, ' ').trim(); // "IR — parcela 7/8" = "IR — parcela 8/8"; "13º" fica
export function resumoMeses(meses = []) {
  const freq = new Map();
  for (const m of meses) for (const k of new Set((m.evs || []).map(e => chaveEvento(e.desc)))) freq.set(k, (freq.get(k) || 0) + 1);
  const raro = Math.max(2, Math.floor(meses.length / 4));
  return meses.map(m => {
    const evs = m.evs || [];
    const soma = f => centavos(evs.filter(f).reduce((s, e) => s + Math.abs(e.valor), 0));
    return {
      label: m.label, labelLongo: m.labelLongo || m.label, evs,
      entra: soma(e => e.valor > 0), sai: soma(e => e.valor < 0),
      sobra: centavos(m.final - m.abertura),
      colchao: Math.max(0, centavos(m.abertura - m.min)), minDia: m.minDia, vermelho: m.min < 0,
      fora: evs.filter(e => Math.abs(e.valor) >= 300 && (freq.get(chaveEvento(e.desc)) || 0) <= raro).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)),
    };
  });
}

// ---------- v9.9.12: quando rodar o Claude (Carteira, Caixa e Plano) ----------
// Regra simples e honesta: os três rodam 1× por mês, juntos, no fechamento (último dia). Fora disso só o PLANO, e só
// quando o cenário mudou desde a última revisão: um passo do plano descartado, ou um aporte/resgate de R$ 1.000 ou mais
// que não estava no plano de aportes. Rodar mais do que isso não melhora a decisão — só dá trabalho.
const ultimoDia = ym => { const [a, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`; };
const maisNova = (...ds) => ds.filter(Boolean).map(String).sort().at(-1) || null;
export function agendaClaude(cf, cart, hoje) {
  const fim = ultimoDia(cf.periodo), fechar = hoje >= fim;
  const dAnalises = l => maisNova(...(l || []).map(a => a?.data));
  const uPlano = cart ? maisNova(cart.meta_dolarizacao?.revisado_em, cart.estrategia?.revisada_em) : null;
  const motivos = [];
  if (cart) {
    const desde = uPlano || '0000';
    const cancelados = (cart.plano_acao?.passos || []).filter(p => (p.cancelado_em || '') > desde);
    if (cancelados.length) motivos.push(cancelados.length === 1 ? `você descartou o passo "${cancelados[0].titulo}"` : `você descartou ${cancelados.length} passos do plano`);
    const h = posicao(cart).h, noPlano = new Set((cart.plano_aportes || []).filter(x => x.mes === cf.periodo).map(x => x.ativo));
    const fora = (h.fluxos || []).filter(f => (f.data || '') > desde && f.valor >= 1000 && !(f.tipo === 'aporte' && noPlano.has(f.ativo)));
    if (fora.length) motivos.push(`${fora.length === 1 ? 'houve um movimento' : `houve ${fora.length} movimentos`} de R$ 1.000 ou mais fora do plano (${fora.map(f => `${f.tipo} ${nomeAtivo(f.ativo || '')}`).slice(0, 2).join(', ')})`);
    if (!uPlano) motivos.push('a carteira ainda não tem plano');
  }
  const linha = (qual, nome, ultima, agora, motivo) => ({ qual, nome, frequencia: qual === 'plano' ? '1× por mês, no fechamento — e antes disso se o cenário mudar' : '1× por mês, no fechamento', ultima, proxima: fim, agora, motivo });
  return [
    linha('carteira', 'Carteira', cart ? dAnalises(cart.analises) : null, fechar, fechar ? 'é o fechamento do mês' : ''),
    linha('caixa', 'Caixa', dAnalises(cf.analises), fechar, fechar ? 'é o fechamento do mês' : ''),
    linha('plano', 'Plano', uPlano, fechar || motivos.length > 0, motivos.join('; ') || (fechar ? 'é o fechamento do mês' : '')),
  ];
}

// ---------- v11.0 (Repaginação 360): o "Livre de verdade" ----------
// O número de cima do Hoje na Meia-noite, no lugar do "dá para gastar" (que somava a sobra que já tem dono). Como o
// "seguro para gastar" dos bancos digitais: o que dá para gastar no cartão até o limite saudável e, no caixa, o pior dia
// daqui até o fim do mês que vem menos os aportes do plano que ainda não saíram. m: motor (c, tl, p12); ctx: contexto().
export function livreDeVerdade(m, dados, cart, ctx) {
  const c = m?.c || {}, limite = dados?.regras?.limiteSaudavelItau || 0;
  const passos = (cart?.plano_acao?.passos || []).filter(p => !/conclu|decidid|cancel/i.test(p.status || '') && Number(p.valor) > 0);
  // shortcut: o sentido do passo vem do título (resgate e venda entram no caixa); trocar por um campo de tipo se o plano ganhar um
  const aportes = centavos(passos.filter(p => !/resgat|vend/i.test(p.titulo || '')).reduce((s, p) => s + Number(p.valor), 0));
  const porDia = m?.tl?.porDia || [];
  const daqui = porDia.filter(p => p.dia >= (ctx?.diaHoje || 1));
  const prox = m?.p12?.meses?.[0];
  // o pior dia do mês que vem (os aportes saem até o fim deste mês, depois que o salário entra); sem projeção, o deste mês
  const pisos = (prox?.porDia?.length ? prox.porDia : ctx?.mesPassou ? [] : daqui).map(p => p.saldo).filter(Number.isFinite);
  const piso = pisos.length ? Math.min(...pisos) : null;
  const caixa = piso == null ? null : centavos(piso - aportes);
  const cartao = limite ? { cabe: centavos(Math.max(0, limite - (c.itau || 0))), passou: centavos(Math.max(0, (c.itau || 0) - limite)), porDia: centavos(c.tetoPorDia || 0) } : null;
  // o número: o que cabe no cartão (o gasto do dia a dia passa por ele); sem limite cadastrado, o que sobra no caixa
  const valor = cartao ? cartao.cabe : Math.max(0, caixa ?? 0);
  return { valor, cartao, aportes, piso, caixa, mesProx: prox?.label || '', planoPassa: caixa != null && caixa < 0 ? centavos(-caixa) : 0 };
}

// ---------- v11.1: o cheque especial pelo calendário (o "bancário" da Repaginação 360) ----------
// Os dias do mês com a conta negativa e, quando a fatura vence logo antes do buraco, o dia em que o dinheiro volta e um
// vencimento sugerido (o dia seguinte). m: motor (tl.porDia); null quando a conta não fica negativa.
export function descasamento(m, dados) {
  const porDia = m?.tl?.porDia || [];
  const neg = porDia.filter(p => p.saldo < 0);
  if (!neg.length) return null;
  const pior = neg.reduce((a, b) => (b.saldo < a.saldo ? b : a));
  const venc = Number(dados?.calendario?.faturaCartao) || null;
  const volta = porDia.find(p => p.dia > neg[neg.length - 1].dia && p.saldo >= 0)?.dia || null;
  const culpaDaFatura = !!venc && venc <= neg[0].dia && neg[0].dia - venc <= 2;
  return { dias: neg.map(p => p.dia), pior: { dia: pior.dia, saldo: centavos(pior.saldo) }, venc, volta, sugestao: culpaDaFatura && volta ? Math.min(28, volta + 1) : null };
}
