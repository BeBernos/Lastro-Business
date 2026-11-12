// Carteira editada pelo app (v7): valores dos investimentos, aportes, resgates e dividendos.
//
// Funções puras JSON -> JSON novo, no formato que o gestor de carteira (Claude) já usa, para o painel da
// carteira recalcular tudo sozinho:
// - o mês aberto é `historico_mensal[AAAA-MM]` com `status: "em_andamento"`; o painel tira o resultado de
//   mercado de `patrimonio_parcial` − mês anterior − aportes + resgates, e soma aportes/resgates de `fluxos`.
//   Por isso o app grava valores, `fluxos` e totais, e deixa `resultado_mercado` vazio (é do fechamento);
// - ganho ou perda de valor NÃO é receita do caixa: só o patrimônio muda. O caixa só muda quando o dinheiro
//   se move (aporte, resgate, dividendo) — esses nascem no caixa (lancamentos.js) e `sincronizar` leva o
//   efeito para a carteira, ligando os dois pelo id do item (`fluxos[].idCaixa`);
// - cada "Atualizar valores" fica em `atualizacoesApp` do mês (antes/depois de cada ativo), para o histórico de
//   ganhos e perdas e para o Claude conferir no fechamento.
// O cashflow guarda uma cópia do patrimônio por classe (`patrimonio`); `copiarPatrimonio` a mantém igual.

import { posicao } from './carteira.js';
import { tickerDividendo } from './lancamentos.js';

const centavos = v => Math.round(v * 100) / 100;
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES[m - 1]}/${a}`; };
const dataBR = iso => iso.split('-').reverse().join('/');

const NOMES = {
  active_fix_all: 'Active Fix All', index_simples_selic: 'Index Simples Selic', credito_bancario_rf: 'Crédito Bancário RF',
  optimus_rf: 'Optimus RF', lumina_soberano: 'Lumina Soberano', itau_index_gold: 'Itaú Index Gold', ouro: 'Ouro',
  dolar: 'Dólar (Index Cambial)', cripto: 'Cripto',
};
export const nomeAtivo = k => NOMES[k] || (/^[a-z]{4}\d{2}$/.test(k) ? k.toUpperCase() : k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()));

export const CLASSES_NOVO = ['renda_fixa', 'fiis', 'etfs'];
const CLASSES = [['renda_fixa', 'Renda fixa'], ['fiis', 'FIIs'], ['etfs', 'ETFs'], ['ouro', 'Ouro'], ['dolar', 'Dólar'], ['cripto', 'Cripto']];

// Ativos do mês, na ordem do painel: [{ chave, nome, classe, rotulo, valor }]. Fundo eliminado e zerado fica de fora.
export function listaAtivos(cart, h = posicao(cart).h) {
  const a = h.ativos || {};
  const out = [];
  for (const [classe, rotulo] of CLASSES) {
    const v = a[classe];
    if (classe === 'ouro' && h.ativos_ouro_detalhe) {
      for (const [k, x] of Object.entries(h.ativos_ouro_detalhe)) out.push({ chave: k, nome: nomeAtivo(k), classe, rotulo, valor: x });
    } else if (typeof v === 'number') out.push({ chave: classe, nome: nomeAtivo(classe), classe, rotulo, valor: v });
    else if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v)) {
        if (!x && /eliminad/i.test(cart.fundos_renda_fixa?.[k]?.status || '')) continue;
        out.push({ chave: k, nome: nomeAtivo(k), classe, rotulo, valor: x });
      }
    }
  }
  return out;
}

function valorDe(h, chave) {
  const a = h.ativos || {};
  if (h.ativos_ouro_detalhe && chave in h.ativos_ouro_detalhe) return h.ativos_ouro_detalhe[chave];
  if (typeof a[chave] === 'number') return a[chave];
  for (const grupo of Object.values(a)) if (grupo && typeof grupo === 'object' && chave in grupo) return grupo[chave];
  return undefined;
}

function definir(h, chave, valor) {
  const a = h.ativos || {};
  const v = centavos(valor);
  if (h.ativos_ouro_detalhe && chave in h.ativos_ouro_detalhe) h.ativos_ouro_detalhe[chave] = v;
  else if (typeof a[chave] === 'number') a[chave] = v;
  else {
    const grupo = Object.values(a).find(g => g && typeof g === 'object' && chave in g);
    if (!grupo) throw new Error(`${nomeAtivo(chave)} não está na carteira.`);
    grupo[chave] = v;
  }
}

function ajustar(h, chave, delta) {
  const antes = valorDe(h, chave);
  if (antes === undefined) throw new Error(`${nomeAtivo(chave)} não está na carteira deste mês.`);
  if (antes + delta < -0.004) throw new Error(`${nomeAtivo(chave)} tem só ${brl(antes)} na carteira.`);
  definir(h, chave, Math.max(0, antes + delta));
}

const soma = o => Object.values(o || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

// Refaz o que o gestor de carteira guarda somado: ouro (detalhe), composição e patrimônio do mês
function recalcular(h) {
  const a = h.ativos;
  if (h.ativos_ouro_detalhe) a.ouro = centavos(soma(h.ativos_ouro_detalhe));
  const cls = { renda_fixa: soma(a.renda_fixa), etfs_fiis: soma(a.fiis) + soma(a.etfs), ouro: a.ouro || 0, dolar: a.dolar || 0, cripto: a.cripto || 0 };
  const total = Object.values(cls).reduce((s, v) => s + v, 0);
  h.composicao = Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, { valor: centavos(v), percentual: total ? Math.round((v / total) * 10000) / 100 : 0 }]));
  h.patrimonio_parcial = centavos(total);
  const fl = h.fluxos || [];
  h.aportes = centavos(fl.filter(f => f.tipo === 'aporte').reduce((s, f) => s + f.valor, 0));
  h.resgates = centavos(fl.filter(f => f.tipo === 'resgate').reduce((s, f) => s + f.valor, 0));
  // sem dividendo no mês, sem o campo: o painel da carteira pega o último mês que TEM dividendos_detalhe para o yield on
  // cost e quebrava com {} vazio (era o caso de novembro/2026, aberto pelo app)
  if (h.dividendos_detalhe && !Object.keys(h.dividendos_detalhe).length) { delete h.dividendos_detalhe; h.dividendos = 0; }
  else if (h.dividendos_detalhe) h.dividendos = centavos(soma(h.dividendos_detalhe));
}

// Mês em que o app pode mexer (o de hoje). Se o último mês está fechado e é o anterior, abre o novo a partir
// dele (como o gestor faz); mês anterior ainda aberto = falta o fechamento com o Claude.
export function mesAberto(cart, hoje) {
  const mes = hoje.slice(0, 7);
  const hm = cart.historico_mensal;
  if (!hm || typeof hm !== 'object') throw new Error('A carteira está num formato que o app não conhece.');
  const meses = Object.keys(hm).sort();
  const ult = meses.at(-1);
  if (ult === mes) {
    if (hm[ult].status !== 'em_andamento') throw new Error(`A carteira de ${nomeMes(mes)} já foi fechada pelo Claude.`);
    return mes;
  }
  if (ult > mes) throw new Error('A carteira já está num mês depois de hoje: confira a data do celular.');
  if (hm[ult].status === 'em_andamento') throw new Error(`A carteira de ${nomeMes(ult)} ainda não foi fechada: feche o mês com o Claude (menu → Levar para o Claude).`);
  const base = hm[ult];
  hm[mes] = {
    status: 'em_andamento',
    atualizado_em: hoje,
    patrimonio_parcial: 0,
    dividendos: 0,
    aportes: 0,
    resgates: 0,
    resultado_mercado: null,
    fluxos: [],
    composicao: structuredClone(base.composicao || {}),
    ativos: structuredClone(base.ativos || {}),
    ...(base.ativos_ouro_detalhe ? { ativos_ouro_detalhe: structuredClone(base.ativos_ouro_detalhe) } : {}),
    ...(base.ativos_atualizado_em ? { ativos_atualizado_em: structuredClone(base.ativos_atualizado_em) } : {}),
    ...(base.cripto_detalhe_usd ? { cripto_detalhe_usd: structuredClone(base.cripto_detalhe_usd) } : {}),
    nota: `Mês aberto pelo app Lastro em ${dataBR(hoje)}, com os valores do fechamento de ${nomeMes(ult)}.`,
  };
  recalcular(hm[mes]);
  return mes;
}

// Efeitos de cada item do caixa na carteira: id -> { tipo, ativo, valor, dia, motivo }
export function efeitos(cf) {
  const out = new Map();
  for (const r of cf.receitas || []) {
    const t = tickerDividendo(r.descricao);
    if (t && r.status === 'confirmado') out.set(r.id, { tipo: 'dividendo', ativo: t, valor: r.valor, dia: r.dia });
  }
  for (const a of cf.ajustesCaixa || []) {
    if (a.ativo && a.categoria === 'investimento' && a.valor < 0) out.set(a.id, { tipo: 'aporte', ativo: a.ativo, valor: -a.valor, dia: a.dia, cotas: a.cotas || 0, ...(a.classe ? { classe: a.classe } : {}) });
  }
  for (const r of cf.resgates || []) if (r.ativo) out.set(r.id, { tipo: 'resgate', ativo: r.ativo, valor: r.valor, dia: r.dia, motivo: r.motivo, cotas: r.cotas || 0, ...(r.jaNaCarteira ? { jaNaCarteira: true } : {}) });
  return out;
}
const igual = (a, b) => (!a && !b) || (!!a && !!b && a.tipo === b.tipo && a.ativo === b.ativo && Math.abs(a.valor - b.valor) < 0.005 && a.dia === b.dia && a.motivo === b.motivo && (a.cotas || 0) === (b.cotas || 0));

// Ativos negociados em cotas (FIIs, ETFs, GLDI11): o painel da carteira tira o preço da cota de valor ÷ `custo_medio.qtd`.
// Comprar ou vender sem mudar a quantidade faria a cota "pular" — por isso aporte/resgate neles pede o número de cotas.
export const cotasDe = (cart, ativo) => cart?.custo_medio?.ativos?.[ativo] || null;

// Preço médio: comprar n cotas por v muda o médio; vender só tira cotas (sinal −1 desfaz)
function ajustarCotas(cart, e, sinal) {
  const cm = cotasDe(cart, e.ativo);
  if (!cm || !e.cotas) return;
  const n = e.cotas * sinal;
  const q0 = cm.qtd || 0;
  if (e.tipo === 'aporte') {
    const q = q0 + n;
    if (q < 0) throw new Error(`${nomeAtivo(e.ativo)} tem só ${q0} cotas.`);
    for (const k of ['pm', 'pm_prov']) if (typeof cm[k] === 'number') cm[k] = q > 0 ? centavos((cm[k] * q0 + sinal * e.valor) / q) : cm[k];
    cm.qtd = q;
  } else {
    if (q0 - n < 0) throw new Error(`${nomeAtivo(e.ativo)} tem só ${q0} cotas.`);
    cm.qtd = q0 - n;
  }
}

// Aporte e resgate: o valor do ativo e o fluxo ligado ao item do caixa (sinal −1 desfaz)
function aplicar(cart, h, mes, id, e, sinal) {
  // ativo novo (v9.9.13: Tesouro, VWRA11…): o aporte cria o ativo na classe; desfazer o aporte o tira de novo
  const novo = e.classe && sinal > 0 && valorDe(h, e.ativo) === undefined;
  if (novo) {
    if (!CLASSES_NOVO.includes(e.classe)) throw new Error('Classe de investimento desconhecida.');
    (h.ativos[e.classe] ||= {})[e.ativo] = 0;
    if (e.cotas && e.classe !== 'renda_fixa') ((cart.custo_medio ||= {}).ativos ||= {})[e.ativo] = { qtd: 0, pm: 0, pm_prov: 0 };
  }
  if (!e.jaNaCarteira) { // o valor do ativo já está sem esse dinheiro (o banco descontou antes): só o fluxo entra
    ajustar(h, e.ativo, (e.tipo === 'aporte' ? 1 : -1) * sinal * e.valor);
    ajustarCotas(cart, e, sinal);
  }
  if (e.classe && sinal < 0 && !valorDe(h, e.ativo) && h.ativos[e.classe]) {
    delete h.ativos[e.classe][e.ativo];
    if (!cotasDe(cart, e.ativo)?.qtd) delete cart.custo_medio?.ativos?.[e.ativo];
  }
  h.fluxos ||= [];
  if (sinal < 0) h.fluxos = h.fluxos.filter(f => f.idCaixa !== id);
  else h.fluxos.push({ tipo: e.tipo, ativo: e.ativo, valor: centavos(e.valor), data: `${mes}-${String(e.dia ?? 1).padStart(2, '0')}`, ...(e.tipo === 'aporte' ? { origem: 'caixa' } : { motivo: e.motivo || 'necessidade_caixa' }), ...(e.cotas ? { cotas: e.cotas } : {}), idCaixa: id });
}

// Dividendo: o da carteira passa a ser o que está recebido no caixa (um pagamento por FII/ETF no mês).
// Igualar em vez de somar: o gestor às vezes registra na carteira antes de o caixa marcar como recebido.
function igualarDividendo(cart, h, mes, ativo, cf) {
  const det = (h.dividendos_detalhe ||= {});
  const v = centavos([...efeitos(cf).values()].filter(e => e.tipo === 'dividendo' && e.ativo === ativo).reduce((s, e) => s + e.valor, 0));
  if (v > 0) det[ativo] = v;
  else delete det[ativo];
  const pjMes = cart.projecao_dividendos?.[mes];
  const pj = pjMes?.ativos?.[ativo];
  if (pj) {
    pj.pago = v > 0;
    const r = (cf.receitas || []).find(x => tickerDividendo(x.descricao) === ativo && x.status === 'confirmado');
    if (v > 0 && r) pj.pagamento = `PAGO em ${String(r.dia).padStart(2, '0')}/${mes.slice(5)}/${mes.slice(0, 4)} (Lastro)`;
    // o painel só mostra os dividendos do mês aberto (Renda) quando o mês inteiro está "pago"
    const todos = Object.values(pjMes.ativos).every(x => x.pago);
    if (todos) pjMes.status = 'pago';
    else if (pjMes.status === 'pago') pjMes.status = 'parcial';
  }
}

// O que mudou na carteira, em uma linha (aviso depois do lançamento)
// O que mudou na carteira, numa frase curta (vai no aviso depois do lançamento): dividendos > ativo > patrimônio
function resumoMudanca(antes, depois, mes) {
  const h0 = antes.historico_mensal?.[mes] || {};
  const h1 = depois.historico_mensal[mes];
  if (Math.abs((h1.dividendos || 0) - (h0.dividendos || 0)) >= 0.005) return `Carteira: dividendos do mês ${brl(h1.dividendos || 0)}`;
  const v0 = valoresDe(h0), v1 = valoresDe(h1);
  const k = Object.keys(v1).find(x => Math.abs((v1[x] || 0) - (v0[x] || 0)) >= 0.005);
  if (k) return `Carteira: ${nomeAtivo(k)} agora ${brl(v1[k])}`;
  if (Math.abs((h1.patrimonio_parcial || 0) - (h0.patrimonio_parcial ?? h0.patrimonio_total ?? 0)) >= 0.005) return `Carteira: patrimônio ${brl(h1.patrimonio_parcial)}`;
  return '';
}
const valoresDe = h => {
  const out = {};
  for (const [k, v] of Object.entries(h.ativos || {})) {
    if (typeof v === 'number') { if (!(k === 'ouro' && h.ativos_ouro_detalhe)) out[k] = v; } else if (v && typeof v === 'object') Object.assign(out, v);
  }
  return Object.assign(out, h.ativos_ouro_detalhe || {});
};

// Leva para a carteira o que mudou no caixa (cfAntes -> cfDepois). Devolve { cart, mudou, aviso }.
export function sincronizar(cfAntes, cfDepois, cart, hoje) {
  const a = efeitos(cfAntes);
  const b = efeitos(cfDepois);
  const ids = [...new Set([...a.keys(), ...b.keys()])].filter(id => !igual(a.get(id), b.get(id)));
  if (!ids.length) return { cart, mudou: false };
  const soDividendo = ids.every(id => (a.get(id) || b.get(id)).tipo === 'dividendo');
  const pular = msg => {
    if (soDividendo) return { cart, mudou: false, aviso: msg };
    throw new Error(msg);
  };
  if (!cart) return pular('Importe a carteira antes de lançar aporte ou resgate (menu → Importar).');
  const c = structuredClone(cart);
  let mes;
  try {
    mes = mesAberto(c, hoje);
  } catch (e) {
    return pular(e.message);
  }
  if (mes !== cfDepois.periodo) return pular('O caixa e a carteira estão em meses diferentes — feche o mês com o Claude antes.');
  const h = c.historico_mensal[mes];
  const dividendos = new Set();
  for (const id of ids) {
    for (const [e, sinal] of [[a.get(id), -1], [b.get(id), 1]]) {
      if (!e) continue;
      if (e.tipo === 'dividendo') dividendos.add(e.ativo);
      else aplicar(c, h, mes, id, e, sinal);
    }
  }
  for (const t of dividendos) igualarDividendo(c, h, mes, t, cfDepois);
  recalcular(h);
  (c.meta_arquivo ||= {}).alterado_app = hoje;
  return { cart: c, mudou: true, resumo: resumoMudanca(cart, c, mes) };
}

// "Atualizar valores": valores = { chave: valor de hoje }. ptax (opcional): dólar de hoje, para a estimativa
// "Hoje" continuar certa (cotacao_usd_brl e cripto em dólar acompanham o valor novo).
// Devolve { cart, itens: [{ chave, nome, antes, depois, dif }], total }.
export function atualizarValores(cart, { valores, ptax = null }, hoje, agora = new Date()) {
  const c = structuredClone(cart);
  const mes = mesAberto(c, hoje);
  const h = c.historico_mensal[mes];
  const itens = [];
  for (const [chave, novo] of Object.entries(valores || {})) {
    if (!Number.isFinite(novo) || novo < 0 || novo >= 1e8) throw new Error(`Confira o valor de ${nomeAtivo(chave)}.`);
    const antes = valorDe(h, chave);
    if (antes === undefined) throw new Error(`${nomeAtivo(chave)} não está na carteira deste mês.`);
    if (Math.abs(novo - antes) < 0.005) continue;
    definir(h, chave, novo);
    itens.push({ chave, nome: nomeAtivo(chave), antes, depois: centavos(novo), dif: centavos(novo - antes) });
    (h.ativos_atualizado_em ||= {})[chave] = hoje;
  }
  if (!itens.length) throw new Error('Nenhum valor mudou.');
  const det = h.cripto_detalhe_usd;
  if (ptax > 0 && det && itens.some(i => i.chave === 'cripto' || i.chave === 'dolar')) {
    const cr = itens.find(i => i.chave === 'cripto');
    if (cr) {
      const moedas = Object.entries(det).filter(([k, v]) => k !== 'cotacao_usd_brl' && typeof v === 'number');
      const usd = moedas.reduce((s, [, v]) => s + v, 0);
      if (usd > 0) for (const [k, v] of moedas) det[k] = centavos((v / usd) * (cr.depois / ptax));
    }
    det.cotacao_usd_brl = Math.round(ptax * 10000) / 10000;
  }
  h.atualizado_em = hoje;
  const total = centavos(itens.reduce((s, i) => s + i.dif, 0));
  (h.atualizacoesApp ||= []).push({ data: hoje, hora: agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }), total, itens: itens.map(({ chave, antes, depois }) => ({ ativo: chave, antes, depois })) });
  recalcular(h);
  (c.meta_arquivo ||= {}).alterado_app = hoje;
  return { cart: c, itens, total };
}

// Cópia do patrimônio por classe que o cashflow guarda (o app confere uma contra a outra)
export function copiarPatrimonio(cf, cart, hoje) {
  if (!cf.patrimonio || typeof cf.patrimonio !== 'object') return cf;
  const { h } = posicao(cart);
  const a = h.ativos || {};
  const novo = { fundos: soma(a.renda_fixa), fiis: soma(a.fiis), etfs: soma(a.etfs), ouro: a.ouro || 0, dolar: a.dolar || 0, cripto: a.cripto || 0 };
  const mudou = Object.entries(novo).some(([k, v]) => Math.abs((cf.patrimonio[k] || 0) - v) > 0.004);
  if (!mudou) return cf;
  for (const [k, v] of Object.entries(novo)) cf.patrimonio[k] = centavos(v);
  const total = Object.values(novo).reduce((s, v) => s + v, 0);
  cf.patrimonioNota = `Copiado da carteira pelo app Lastro em ${dataBR(hoje)}: patrimônio investido ${brl(total)}.`;
  return cf;
}

// Resumo do mês da carteira para "Ganhos e perdas": mercado como o painel calcula (variação − aportes + resgates)
export function resultadoDoMes(cart) {
  const hm = cart.historico_mensal || {};
  const meses = Object.keys(hm).sort();
  const mes = meses.at(-1);
  const h = hm[mes] || {};
  const ant = hm[meses.at(-2)] || null;
  const pat = h.patrimonio_total ?? h.patrimonio_parcial;
  const base = ant ? ant.patrimonio_total ?? ant.patrimonio_parcial : null;
  const fl = h.fluxos || [];
  const aportes = fl.length ? fl.filter(f => f.tipo === 'aporte').reduce((s, f) => s + f.valor, 0) : h.aportes || 0;
  const resgates = fl.length ? fl.filter(f => f.tipo === 'resgate').reduce((s, f) => s + f.valor, 0) : h.resgates || 0;
  const mercado = h.resultado_mercado ?? (base != null && pat != null ? pat - base - aportes + resgates : null);
  return {
    mes, emAndamento: h.status === 'em_andamento', patrimonio: pat, base, mercado, aportes, resgates,
    dividendos: h.dividendos || 0, dividendosDetalhe: h.dividendos_detalhe || {}, fluxos: fl, atualizacoes: h.atualizacoesApp || [],
  };
}

// ---------- v8.1: integração caixa × carteira (dolarização e plano de aportes; contrato no docs/PROJETO-CLAUDE.md) ----------
// Parte do patrimônio com exposição ao dólar. O que conta como dólar vem de `meta_dolarizacao.conta_como_dolar`
// (chaves de ativo ou classes, definidas no modo PLANO); sem isso, as classes Dólar e Cripto.
const EM_DOLAR = ['dolar', 'cripto'];
export function dolarizacao(cart, h) {
  const lista = h ? listaAtivos(cart, h) : listaAtivos(cart);
  const total = lista.reduce((s, a) => s + (a.valor || 0), 0);
  if (!total) return null;
  const meta = cart.meta_dolarizacao || {};
  const conta = Array.isArray(meta.conta_como_dolar) && meta.conta_como_dolar.length ? meta.conta_como_dolar : EM_DOLAR;
  const valor = lista.filter(a => conta.includes(a.chave) || conta.includes(a.classe)).reduce((s, a) => s + (a.valor || 0), 0);
  return { pct: (valor / total) * 100, valor: centavos(valor), total: centavos(total), alvo: meta.alvo_pct ?? null, prazo: meta.prazo ?? null, ritmo: meta.ritmo_mensal ?? null, revisado: meta.revisado_em ?? null };
}

// Aportes planejados para o mês (`plano_aportes`) × feitos (fluxos de aporte do mês no mesmo ativo)
export function planoDoMes(cart, mes) {
  const plano = (cart.plano_aportes || []).filter(p => p.mes === mes && p.valor > 0);
  if (!plano.length) return null;
  const fluxos = (cart.historico_mensal?.[mes]?.fluxos || []).filter(f => f.tipo === 'aporte');
  const itens = plano.map(p => {
    const feito = fluxos.filter(f => f.ativo === p.ativo).reduce((s, f) => s + (f.valor || 0), 0);
    return { ativo: p.ativo, nome: nomeAtivo(p.ativo), planejado: p.valor, feito: centavos(feito), motivo: p.motivo || '' };
  });
  return { itens, planejado: centavos(itens.reduce((s, i) => s + i.planejado, 0)), feito: centavos(itens.reduce((s, i) => s + Math.min(i.feito, i.planejado), 0)) };
}
