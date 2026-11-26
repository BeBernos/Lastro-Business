// v9.18 — repaginação, etapa 1 (docs/superpowers/specs/2026-11-15-repaginacao-360-design.md): a casca "Carvão".
// Funções puras: os destinos da barra, os números do topo de cada tela e o HTML do topo e da barra. A chave fica no
// aparelho ('lastro-v10'); desligada, o app é o de antes. As telas por dentro mudam nas etapas 2–5.
import { brl, esc } from './graficos.js';
import { posicao, reserva } from './carteira.js';
import { alocacaoVsAlvo } from './estrategia.js';
import { resultadoDoMes, valorPorFonte } from './investimentos.js';
import { contexto } from './resumo.js';
import { livreDeVerdade } from './indicadores.js';

const CHAVE = 'lastro-v10';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = n => String(n).padStart(2, '0');

// v9.27 (pedido do Bruno): a barra na ordem de prioridade — Hoje, Caixa, ＋, Cartão e Investimentos por último;
// o "Mais" (⋯, o menu) foi para o topo, ao lado da busca e do olho
export const DESTINOS = [
  { id: 'hoje', aba: 'inicio', nome: 'Hoje', icone: '<path d="M4 10.5 12 4l8 6.5V20H4z"/>' },
  { id: 'caixa', aba: 'mes', nome: 'Caixa', icone: '<path d="M5 8.5V7a2 2 0 0 1 2-2h10"/><rect x="4" y="8.5" width="16" height="10.5" rx="2.5"/><path d="M16 13.75h.01"/>' },
  { id: 'cartao', aba: 'cartao', nome: 'Cartão', icone: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>' },
  { id: 'invest', aba: 'carteira', nome: 'Carteira', icone: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>' },
];
const MAIS = '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>';

// v10.0 (etapa 8, aprovada pelo Bruno em 18/11/2026): o Carvão é o padrão — no celular e no computador, na família e na
// demo. Só '0' (a chave desligada em Configurações) volta à interface anterior, que fica por pouco tempo.
export function v10Ligada() {
  try { return localStorage.getItem(CHAVE) !== '0'; } catch { return true; }
}
export function ligarV10(on) {
  try { localStorage.setItem(CHAVE, on ? '1' : '0'); } catch { /* fica só nesta abertura */ }
}
// v11.0 (Repaginação 360, 25/11/2026): a Meia-noite, sobre o Carvão. Padrão desde a v11.4 (ok do Bruno em 26/11/2026):
// só '0' (chave desligada em Configurações) volta ao Carvão
export const v11Ligada = () => { try { return v10Ligada() && localStorage.getItem('lastro-v11') !== '0'; } catch { return v10Ligada(); } };
export const ligarV11 = on => { try { localStorage.setItem('lastro-v11', on ? '1' : '0'); } catch { /* fica só nesta abertura */ } };

function saudacao(agora) {
  const h = Number(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }));
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'; // madrugada é "Boa noite"
}

// { titulo, sub, eyebrow, valor (número ou null), pilulas }
export function numerosDoTopo(aba, m, dados, cart, agora = new Date(), { v11 = false } = {}) {
  const ctx = contexto(dados, agora);
  const c = m?.c || {};
  const sub = `${MESES[ctx.mes - 1].slice(0, 3)} · ${c.diasRest ?? ctx.dias - ctx.diaHoje} dias`;
  const base = { titulo: saudacao(agora), sub, eyebrow: '', valor: null, pilulas: [] };
  if (aba === 'inicio') {
    if (ctx.mesPassou) return { ...base, eyebrow: `Falta fechar ${MESES[ctx.mes - 1]}` };
    // v11.0: o "Livre de verdade" — a sobra do mês já tem dono (os aportes do plano); livre é o que cabe no cartão
    if (v11 && m?.c) {
      const l = livreDeVerdade(m, dados, cart, ctx);
      if (l.cartao) return { ...base, eyebrow: l.cartao.passou ? 'O cartão passou do limite' : 'Livre para gastar até a fatura fechar', valor: l.cartao.passou ? -l.cartao.passou : l.valor, detalhe: 'det-livre',
        pilulas: [...(l.cartao.passou ? [] : [`${brl(l.cartao.porDia)} por dia`]), l.planoPassa ? { texto: `O plano passa ${brl(l.planoPassa)} do caixa de ${l.mesProx.toLowerCase()}`, tom: 'ruim' } : 'O resto do mês já tem destino'] };
      return { ...base, eyebrow: 'Livre para gastar', valor: l.valor, detalhe: 'det-livre', pilulas: l.aportes ? ['Já sem os aportes do plano'] : [] };
    }
    const porDia = c.diasRest > 0 ? c.saldo / c.diasRest : c.saldo;
    return { ...base, eyebrow: 'Dá para gastar até o fim do mês', valor: c.saldo, pilulas: [`Hoje ${brl(porDia)}`, `Semana ${brl(porDia * Math.min(7, Math.max(1, c.diasRest)))}`] };
  }
  if (aba === 'carteira') {
    if (!cart) return { ...base, eyebrow: 'Carteira ainda não carregada' };
    const p = posicao(cart), r = resultadoDoMes(cart);
    const mercado = Number(r?.mercado) || 0;
    let s = { estado: null, fiel: null };
    try { s = saudeCarteira(alocacaoVsAlvo(cart), reserva(cart)); } catch { /* carteira sem estratégia */ }
    const tom = { Saudável: 'bom', Atenção: 'atencao', 'Fora do plano': 'ruim' }[s.estado];
    // v10.0.1: a data dos valores (as atualizações automáticas), não a última data oficial do Claude — "posição de 13/11"
    // com valores de 19/11 confundia
    const dv = [p.data, ...Object.values(p.h?.ativos_atualizado_em || {})].filter(d => /^\d{4}-\d{2}-\d{2}/.test(d || '')).sort().pop() || p.data;
    return { ...base, titulo: v11 ? 'Patrimônio' : 'Carteira', sub: `valores de ${dv.slice(8, 10)}/${dv.slice(5, 7)}`, eyebrow: 'Patrimônio investido', valor: p.total,
      fontes: valorPorFonte(cart), // v9.30: Itaú e Binance logo embaixo do total
      pilulas: [...(s.estado ? [{ texto: s.estado, tom }] : []), { texto: `${brl(Math.abs(mercado))} no mês`, seta: mercado < 0 ? 'cai' : 'sobe' }, ...(s.fiel != null ? [`${s.fiel}% fiel`] : [])] };
  }
  if (aba === 'cartao') {
    const limite = dados.regras?.limiteSaudavelItau || 0;
    const dia = dados.calendario?.faturaCartao;
    const prox = ctx.mes === 12 ? 1 : ctx.mes + 1;
    return { ...base, titulo: 'Cartão', eyebrow: `Fatura de ${MESES[ctx.mes - 1]} até agora`, valor: c.itau,
      pilulas: [limite && c.itau > limite ? { texto: `${brl(c.itau - limite)} acima do limite`, tom: 'ruim' } : `Cabem ${brl(Math.max(0, limite - c.itau))}`, ...(dia ? [`Vence ${pad(dia)}/${pad(prox)}`] : [])] };
  }
  if (aba === 'mes' && Array.isArray(m?.tl?.porDia) && m.tl.porDia.length && Number.isFinite(c.caixa)) {
    // v9.25: o Caixa também responde no topo — o saldo de hoje, o pior ponto daqui em diante e como o mês fecha
    const futuro = m.tl.porDia.filter(p => p.dia >= ctx.diaHoje);
    const min = (futuro.length ? futuro : m.tl.porDia).reduce((a, p) => (p.saldo < a.saldo ? p : a));
    const fim = m.tl.porDia[m.tl.porDia.length - 1];
    // v11.1: o saldo de hoje pela agenda do mês (c.caixa é o último saldo lançado, que pode ser de dias atrás)
    const hojeTl = m.tl.porDia[Math.min(Math.max(1, ctx.diaHoje), m.tl.porDia.length) - 1];
    return { ...base, titulo: v11 ? 'Mês' : 'Caixa', eyebrow: v11 ? 'Na conta hoje' : 'Saldo da conta hoje', valor: v11 && !ctx.mesPassou && hojeTl ? hojeTl.saldo : c.caixa,
      pilulas: [`${min.saldo < 0 ? 'Pior momento' : 'Mínimo'} ${brl(min.saldo)} · dia ${min.dia}`, `Fecha com ${brl(fim.saldo)}`] };
  }
  if (aba === 'analises' && v11) {
    // v11.3: o Plano responde no topo com os passos feitos do plano; a nota de saúde saiu
    const ps = cart?.plano_acao?.passos || [], hj = `${ctx.ano}-${pad(ctx.mes)}-${pad(Math.max(1, ctx.diaHoje))}`;
    const total = ps.filter(p => !/cancel/i.test(p.status || '')).length, feitos = ps.filter(p => /conclu/i.test(p.status || '')).length;
    const pend = ps.filter(p => !/conclu|decidid|cancel/i.test(p.status || '')), atras = pend.filter(p => String(p.quando || '').slice(0, 10) && String(p.quando).slice(0, 10) < hj).length;
    const prox = pend.map(p => String(p.quando || '').slice(0, 10)).filter(q => q >= hj).sort()[0];
    return { ...base, titulo: 'Plano', eyebrow: total ? 'Passos do plano feitos' : 'Plano', valor: null, numeroTexto: total ? String(feitos) : '', numeroSufixo: total ? ` de ${total}` : '',
      pilulas: [atras ? { texto: `${atras} ${atras === 1 ? 'atrasado' : 'atrasados'}`, tom: 'ruim' } : '', prox ? `Próximo: ${prox.slice(8, 10)}/${prox.slice(5, 7)}` : ''].filter(Boolean) };
  }
  if (aba === 'analises' && typeof m?.sc?.total === 'number') {
    // v9.26: as Análises respondem no topo com a nota de saúde do mês (um número que não é dinheiro)
    const n = [...(dados?.analises || []), ...(cart?.analises || [])].filter(a => a && (a.titulo || a.texto)).length;
    const st = String(m.sc.status || '').toLowerCase();
    return { ...base, titulo: 'Análises', eyebrow: 'Saúde financeira do mês', valor: null, numeroTexto: String(m.sc.total), numeroSufixo: ' de 100',
      pilulas: [st ? st.charAt(0).toUpperCase() + st.slice(1) : '', n ? `${n} ${n === 1 ? 'análise' : 'análises'} do Claude` : ''].filter(Boolean) };
  }
  const nomes = { mes: 'Caixa', analises: 'Análises' };
  return { ...base, titulo: nomes[aba] || base.titulo, sub: '' };
}

const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// pílula do topo: texto, ou { texto, seta: 'sobe'|'cai' } (seta desenhada) ou { texto, tom } (estado: ícone + texto)
const ESTADOS = {
  ruim: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M12 7.6v5.2M12 16.4v.01" style="stroke:var(--cv-tinta)" stroke-width="2.6"/>',
  atencao: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M12 7.6v5.2M12 16.4v.01" style="stroke:var(--cv-tinta)" stroke-width="2.6"/>',
  bom: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="m8 12.3 2.8 2.8L16.2 9.6" style="stroke:var(--cv-tinta)" stroke-width="2.4"/>',
};
const SETAS = { sobe: '<path d="M12 18V6M7 11l5-5 5 5"/>', cai: '<path d="M12 6v12M7 13l5 5 5-5"/>' };
const pilula = p => (typeof p === 'string' ? `<span>${esc(p)}</span>`
  : `<span class="${p.seta || (p.tom ? `tom-${p.tom}` : '')}">${p.seta ? ic(SETAS[p.seta]) : p.tom ? ic(ESTADOS[p.tom] || ESTADOS.atencao) : ''}${esc(p.texto)}</span>`);

export function htmlTopoCarvao(info, { esconder = false } = {}) {
  let numero = '';
  if (info.valor != null) {
    const [inteiro, cent] = brl(info.valor).split(',');
    numero = `<b class="hero-valor topo-num num">${esc(inteiro)}${esconder || !cent ? '' : `<span class="cent">,${esc(cent)}</span>`}</b>`;
  } else if (info.numeroTexto) {
    numero = `<b class="topo-num num">${esc(info.numeroTexto)}${info.numeroSufixo ? `<span class="cent">${esc(info.numeroSufixo)}</span>` : ''}</b>`;
  }
  return `<header class="topo-carvao">
    <img class="topo-assinatura" src="icons/logo.svg" alt="">
    <div class="topo-linha">
      <div class="topo-oi"><b>${esc(info.titulo)}</b>${info.sub ? `<span>${esc(info.sub)}</span>` : ''}</div>
      <div class="topo-botoes">
        <button type="button" class="topo-btn" id="appBusca" aria-label="Buscar no app">${ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}</button>
        <button type="button" class="topo-btn" data-olho aria-label="Esconder os valores" aria-pressed="false">${ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>')}</button>
        <button type="button" class="topo-btn" id="appMenu" aria-label="Mais: menu, contas, análises e configurações">${ic(MAIS)}</button>
      </div>
    </div>
    ${info.eyebrow ? `<p class="topo-eyebrow">${esc(info.eyebrow)}</p>` : ''}
    ${info.detalhe && numero ? `<button type="button" class="topo-num-btn" data-detalhe="${esc(info.detalhe)}" aria-label="Por que este número">${numero}</button>` : numero}
    ${info.fontes?.length ? `<p class="topo-fontes">${info.fontes.map(f => `<span>${esc(f.nome)} <b class="num">${esc(brl(f.valor))}</b></span>`).join('')}</p>` : ''}
    ${info.pilulas.length ? `<div class="topo-pilulas">${info.pilulas.map(pilula).join('')}</div>` : ''}
  </header>
  <!-- v9.21: fora do header (o overflow dele escondia o cabeçalho fixo) -->
  <div class="topo-mini" aria-hidden="true"><span>${esc(info.eyebrow || info.titulo)}</span>${info.valor != null ? `<b class="num">${esc(brl(info.valor))}</b>` : info.numeroTexto ? `<b class="num">${esc(info.numeroTexto)}${esc(info.numeroSufixo || '')}</b>` : ''}</div>`;
}

// Mais abre o menu de hoje (#appMenu); o ＋ (#appLancar) só no celular de quem publica
// v11.0: na Meia-noite o Caixa já se chama Mês e a Carteira, Patrimônio (o Cartão entra no Mês na v11.1)
const NOMES_V11 = { mes: 'Mês', carteira: 'Patrimônio' };
const PLANO_V11 = { id: 'plano', aba: 'analises', nome: 'Plano', icone: '<path d="M10 6h10M10 12h10M10 18h10M4 6l1.2 1.2L7.5 5M4 12l1.2 1.2L7.5 11M4 18l1.2 1.2L7.5 17"/>' };
export function htmlNavV10(abaAtual, { lancar = false, v11 = false } = {}) {
  const botao = d => `<button type="button" class="aba v10-aba ${d.aba === abaAtual ? 'on' : ''}" data-aba="${d.aba}" aria-current="${d.aba === abaAtual ? 'page' : 'false'}">${ic(d.icone)}<span>${(v11 && NOMES_V11[d.aba]) || d.nome}</span></button>`; // v9.28: o nome à vista
  const [hoje, caixa, cartao, invest] = DESTINOS;
  const meio = lancar ? `<button type="button" class="v10-mais" id="appLancar" aria-label="Lançar" aria-haspopup="dialog">${ic('<path d="M12 5v14M5 12h14"/>')}</button>` : '';
  return `<nav class="abas v10-nav" aria-label="Seções">${botao(hoje)}${botao(caixa)}${meio}${v11 ? '' : botao(cartao)}${botao(invest)}${v11 ? botao(PLANO_V11) : ''}</nav>`; // v11.1: o Cartão mora no Mês; v11.3: o Plano (as Análises)
}

// ---------- v9.19 (etapa 2): o Hoje — quatro blocos e, só quando há o que fazer, até 3 faixas de ação ----------
const pesoDaLinha = l => (l.tom === 'ruim' ? 0 : l.tom === 'atencao' ? 1 : l.acao ? 2 : 3); // a mesma regra de linhasDoHoje
export function faixasDoHoje(linhas, extras = []) {
  return [...extras, ...linhas].map((l, i) => ({ l, i })).sort((a, b) => pesoDaLinha(a.l) - pesoDaLinha(b.l) || a.i - b.i).slice(0, 3).map(x => x.l);
}

const ICONES_HOJE = {
  cartao: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>',
  folga: '<path d="M4 16a8 8 0 0 1 16 0"/><path d="M12 16l4-5"/>',
  banco: '<path d="M4 10l8-5 8 5M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16"/>',
  sobe: '<path d="M4 16l5-5 4 3 7-7M15 7h5v5"/>',
};
// v10.0 (revisão): ícones com o círculo, como nas Análises (o "!" solto parecia um caractere)
const TOM_ICONE = { ruim: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5m0 3v.01"/>', atencao: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5m0 3v.01"/>', bom: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 3 3 5-6"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5m0-8.5v.01"/>' };

// v9.30: valores exatos, com os centavos menores (o Bruno: "falta mostrar o valor exato")
const exato = v => { const t = brl(v), i = t.lastIndexOf(','); return i < 0 ? esc(t) : `${esc(t.slice(0, i))}<small class="cent">${esc(t.slice(i))}</small>`; };
export function htmlHojeV10({ c = {}, limite = 0, venceDia = null, mesProx = null, investido = null, faixas = [], github = false }) {
  const cabe = Math.max(0, limite - (c.itau || 0));
  const passou = limite > 0 && (c.itau || 0) > limite;
  const pctCabe = limite > 0 ? Math.min(100, Math.round((cabe / limite) * 100)) : 0;
  const bloco = (attr, icone, rotulo, valor, rodape) => `<button type="button" class="bloco-v10" ${attr}>
      <span class="bloco-cab">${ic(icone)}${esc(rotulo)}</span><b class="num">${valor}</b>${rodape}</button>`;
  const invest = investido
    ? bloco('data-aba="carteira"', ICONES_HOJE.sobe, 'Investido', exato(investido.total), `<small class="${investido.mercado < 0 ? 'cai' : 'sobe'}">${ic(SETAS[investido.mercado < 0 ? 'cai' : 'sobe'])}${esc(brl(Math.abs(investido.mercado)))} no mês</small>`)
    : `<div class="bloco-v10 vazio"><span class="bloco-cab">${ic(ICONES_HOJE.sobe)}Investido</span><small>Carteira ainda não carregada</small></div>`;
  const faixa = f => `<div class="faixa-v10 tom-${f.tom}">
      <button type="button" class="faixa-texto" ${f.attr || `data-ir-aba="${esc(f.ir || 'inicio')}"`}>${ic(TOM_ICONE[f.tom] || TOM_ICONE.info)}<span>${esc(f.texto)}</span></button>
      ${f.acao && github ? `<button type="button" class="faixa-acao-v10" ${f.acao.attr}>${esc(f.acao.rotulo)}</button>` : ''}</div>`;
  return `<div class="hoje-v10">
    <div class="blocos-v10">
      ${bloco('data-ir-aba="mes/geral"', ICONES_HOJE.banco, 'No banco', exato(c.caixa || 0), '<small>saldo de hoje</small>')}
      ${bloco('data-aba="cartao"', ICONES_HOJE.cartao, 'Fatura', exato(c.itau || 0), venceDia ? `<small>vence ${pad(venceDia)}/${pad(mesProx)}</small>` : '')}
      ${passou
        ? bloco('data-aba="cartao"', ICONES_HOJE.folga, 'Passou do limite', `<span class="cai">+${exato(c.itau - limite)}</span>`, `<small class="cai">fatura ${esc(brl(c.itau))} · limite ${esc(brl(limite))}</small><i class="barra-v10 cheia"><i style="width:100%"></i></i>`)
        : bloco('data-aba="cartao"', ICONES_HOJE.folga, 'Cabe no cartão', exato(cabe), `<i class="barra-v10"><i style="width:${pctCabe}%"></i></i>`)}
      ${invest}
    </div>
    ${faixas.length ? `<div class="faixas-v10">${faixas.map(faixa).join('')}</div>` : ''}
  </div>`;
}

// ---------- v9.20 (etapa 3): o Cartão — composição da fatura e o ritmo até o limite saudável ----------
// Junta o que eram o destaque da Fatura (barra) e o cartão "Até o limite saudável" (o topo já mostra o valor da fatura).
export function htmlComposicaoV10({ c = {}, limite = 0 }) {
  const itau = c.itau || 0, total = Math.max(limite, itau);
  if (!total) return '';
  const livre = Math.max(0, limite - itau);
  const pct = v => +((Math.max(0, v) / total) * 100).toFixed(1);
  const partes = [['p1', 'Parcelas', c.parcelas || 0], ['p2', 'Fixos', c.agendado || 0], ['p3', 'Gastos do mês', c.gastoLivre || 0]];
  const acima = limite && itau > limite;
  // v9.28: "Ainda cabe" saiu da legenda (o topo já diz "Cabem R$ X"); só o estouro aparece aqui
  const fim = acima ? `<li class="cai"><i class="estouro"></i>Acima do limite<b>${esc(brl(itau - limite))}</b></li>` : '';
  const proj = c.itauProjetado, estoura = limite && proj > limite;
  const ritmo = limite && Number.isFinite(proj) ? `<p class="ritmo-v10${estoura ? ' cai' : ''}">No ritmo atual fecha em ${esc(brl(proj))}${estoura && c.diaEstouro && !c.limiteJaRompido ? ` — passa do limite por volta do dia ${c.diaEstouro}` : ''}${!acima && c.diasRest > 0 && c.tetoPorDia > 0 ? `<small>Cabem ${esc(brl(c.tetoPorDia))} por dia até o fim do mês</small>` : ''}</p>` : '';
  return `<section class="comp-v10">
    <div class="comp-barra-v10" role="img" aria-label="Composição da fatura">${partes.map(([k, , v]) => `<i class="${k}" style="width:${pct(v)}%"></i>`).join('')}${livre > 0 ? `<i class="livre" style="width:${pct(livre)}%"></i>` : ''}${acima ? `<b class="marca-v10" style="left:${pct(limite)}%"></b>` : ''}</div>
    <ul class="comp-legenda-v10">${partes.map(([k, n, v]) => `<li><i class="${k}"></i>${n}<b>${esc(brl(v))}</b></li>`).join('')}${fim}</ul>
    ${ritmo}
  </section>`;
}

// ---------- v9.21 (etapa 4): "os investimentos vão bem?" — o quanto a carteira segue a estratégia ----------
// fiel = 100 − metade da soma das distâncias entre o % de cada classe e o alvo (0 = tudo no lugar errado, 100 = no alvo).
// Saudável ≥ 90; Atenção ≥ 75 (ou reserva de emergência incompleta); abaixo disso, Fora do plano.
export function saudeCarteira(aloc, res) {
  if (!aloc?.linhas?.length) return { estado: null, fiel: null };
  const fora = aloc.linhas.reduce((t, l) => t + Math.abs((Number(l.pct) || 0) - (Number(l.alvo) || 0)), 0) / 2;
  const fiel = Math.max(0, Math.min(100, Math.round(100 - fora)));
  const reservaCheia = !res || !(res.alvo > 0) || res.atual >= res.alvo;
  const estado = fiel >= 90 && reservaCheia ? 'Saudável' : fiel >= 75 ? 'Atenção' : 'Fora do plano';
  return { estado, fiel };
}

// ---------- v9.23 (etapa 6): a abertura — a marca acesa (anéis que acendem um por um), a saudação e a digital embaixo ----------
// Os ids são os da trava de sempre (mostrarTrava liga os mesmos eventos): destravar, usarSenha, formTrava, senhaTrava, erroTrava.
const DIGITAL = '<path d="M7.5 18.5c1.3-1.7 2-3.9 2-6.5a2.5 2.5 0 0 1 5 0c0 1-.1 2-.3 3"/><path d="M5 15.5c.6-1.1 1-2.3 1-3.5a6 6 0 0 1 10.6-3.9"/><path d="M18.4 10.5c.1.5.1 1 .1 1.5 0 2.8-.7 5.3-1.9 7.4"/><path d="M12 12c0 3.3-1 6.2-2.6 8.3"/><path d="M14.6 17.5c-.4 1.3-1 2.5-1.7 3.5"/>';
export function htmlAberturaV10({ soSenha = false, agora = new Date(), usuario = '' } = {}) {
  // v9.27 (pedido do Bruno): sem o pedido automático da digital e sem o botão dela — a tela inteira (marca, anéis,
  // saudação) é o botão; tocar chama a digital. Só a senha da família continua como link.
  const marca = `<span class="abertura-marca">
      <i class="anel-v10 a1"></i><i class="anel-v10 a2"></i><i class="anel-v10 a3"></i>
      <img src="icons/logo.svg" alt="">
    </span>
    <span class="abertura-oi">${esc(saudacao(agora))}</span>`;
  return `<div class="abertura-v10">
    ${soSenha ? `<div class="abertura-toque">${marca}<span class="abertura-sub">Digite a senha da família para abrir.</span></div>`
      : `<button type="button" class="abertura-toque" id="destravar" aria-label="Abrir o Lastro com a digital">${marca}<span class="abertura-dica">${ic(DIGITAL)}</span></button>`}
    <div class="abertura-acoes">
      <form id="formTrava"${soSenha ? '' : ' hidden'}>
        ${usuario}
        <label for="senhaTrava">Senha da família</label>
        <input class="campo mono" id="senhaTrava" name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required>
        <p class="erro" id="erroTrava"></p>
        <button class="btn prim">Destrancar com a senha</button>
      </form>
      ${soSenha ? '' : '<button type="button" class="link" id="usarSenha">Usar a senha da família</button>'}
    </div>
  </div>`;
}
