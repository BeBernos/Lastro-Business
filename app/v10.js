// v9.18 — repaginação, etapa 1 (docs/superpowers/specs/2026-11-15-repaginacao-360-design.md): a casca "Carvão".
// Funções puras: os destinos da barra, os números do topo de cada tela e o HTML do topo e da barra. A chave fica no
// aparelho ('lastro-v10'); desligada, o app é o de antes. As telas por dentro mudam nas etapas 2–5.
import { brl, brl0, esc } from './graficos.js';
import { posicao, reserva } from './carteira.js';
import { alocacaoVsAlvo } from './estrategia.js';
import { resultadoDoMes } from './investimentos.js';
import { contexto } from './resumo.js';

const CHAVE = 'lastro-v10';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pad = n => String(n).padStart(2, '0');

export const DESTINOS = [
  { id: 'hoje', aba: 'inicio', nome: 'Hoje', icone: '<path d="M4 10.5 12 4l8 6.5V20H4z"/>' },
  { id: 'invest', aba: 'carteira', nome: 'Investimentos', icone: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>' },
  { id: 'cartao', aba: 'cartao', nome: 'Cartão', icone: '<rect x="3" y="5.5" width="18" height="13" rx="3"/><path d="M3 10h18M7 15h4"/>' },
  { id: 'mais', aba: null, nome: 'Mais', icone: '<circle cx="5.5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18.5" cy="12" r="1.4"/>' },
];

export function v10Ligada() {
  try { return localStorage.getItem(CHAVE) === '1'; } catch { return false; }
}
export function ligarV10(on) {
  try { if (on) localStorage.setItem(CHAVE, '1'); else localStorage.removeItem(CHAVE); } catch { /* fica só nesta abertura */ }
}

function saudacao(agora) {
  const h = Number(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }));
  return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite'; // madrugada é "Boa noite"
}

// { titulo, sub, eyebrow, valor (número ou null), pilulas }
export function numerosDoTopo(aba, m, dados, cart, agora = new Date()) {
  const ctx = contexto(dados, agora);
  const c = m?.c || {};
  const sub = `${MESES[ctx.mes - 1].slice(0, 3)} · ${c.diasRest ?? ctx.dias - ctx.diaHoje} dias`;
  const base = { titulo: saudacao(agora), sub, eyebrow: '', valor: null, pilulas: [] };
  if (aba === 'inicio') {
    if (ctx.mesPassou) return { ...base, eyebrow: `Falta fechar ${MESES[ctx.mes - 1]}` };
    const porDia = c.diasRest > 0 ? c.saldo / c.diasRest : c.saldo;
    return { ...base, eyebrow: 'Dá para gastar até o fim do mês', valor: c.saldo, pilulas: [`Hoje ${brl0(porDia)}`, `Semana ${brl0(porDia * Math.min(7, Math.max(1, c.diasRest)))}`] };
  }
  if (aba === 'carteira') {
    if (!cart) return { ...base, eyebrow: 'Carteira ainda não carregada' };
    const p = posicao(cart), r = resultadoDoMes(cart);
    const mercado = Number(r?.mercado) || 0;
    let s = { estado: null, fiel: null };
    try { s = saudeCarteira(alocacaoVsAlvo(cart), reserva(cart)); } catch { /* carteira sem estratégia */ }
    return { ...base, eyebrow: `Patrimônio investido${s.estado ? ` · ${s.estado}` : ''}`, valor: p.total,
      pilulas: [`${mercado < 0 ? '▼' : '▲'} ${brl0(Math.abs(mercado))} no mês`, ...(s.fiel != null ? [`Estratégia ${s.fiel}% fiel`] : []), `posição ${p.data.slice(8, 10)}/${p.data.slice(5, 7)}`] };
  }
  if (aba === 'cartao') {
    const limite = dados.regras?.limiteSaudavelItau || 0;
    const dia = dados.calendario?.faturaCartao;
    const prox = ctx.mes === 12 ? 1 : ctx.mes + 1;
    return { ...base, eyebrow: `Fatura de ${MESES[ctx.mes - 1]} até agora`, valor: c.itau,
      pilulas: [`Cabem ${brl0(Math.max(0, limite - c.itau))}`, ...(dia ? [`Vence ${pad(dia)}/${pad(prox)}`] : [])] };
  }
  if (aba === 'mes' && Array.isArray(m?.tl?.porDia) && m.tl.porDia.length && Number.isFinite(c.caixa)) {
    // v9.25: o Caixa também responde no topo — o saldo de hoje, o pior ponto daqui em diante e como o mês fecha
    const futuro = m.tl.porDia.filter(p => p.dia >= ctx.diaHoje);
    const min = (futuro.length ? futuro : m.tl.porDia).reduce((a, p) => (p.saldo < a.saldo ? p : a));
    const fim = m.tl.porDia[m.tl.porDia.length - 1];
    return { ...base, titulo: 'Caixa', eyebrow: 'Saldo da conta hoje', valor: c.caixa,
      pilulas: [`${min.saldo < 0 ? 'Pior momento' : 'Mínimo'} ${brl0(min.saldo)} · dia ${min.dia}`, `Fecha com ${brl0(fim.saldo)}`] };
  }
  const nomes = { mes: 'Caixa', analises: 'Análises' };
  return { ...base, titulo: nomes[aba] || base.titulo, sub: '' };
}

const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

export function htmlTopoCarvao(info, { esconder = false } = {}) {
  let numero = '';
  if (info.valor != null) {
    const [inteiro, cent] = brl(info.valor).split(',');
    numero = `<b class="hero-valor topo-num num">${esc(inteiro)}${esconder || !cent ? '' : `<span class="cent">,${esc(cent)}</span>`}</b>`;
  }
  return `<header class="topo-carvao">
    <img class="topo-assinatura" src="icons/logo.svg" alt="">
    <div class="topo-linha">
      <div class="topo-oi"><b>${esc(info.titulo)}</b>${info.sub ? `<span>${esc(info.sub)}</span>` : ''}</div>
      <div class="topo-botoes">
        <button type="button" class="topo-btn" id="appBusca" aria-label="Buscar no app">${ic('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}</button>
        <button type="button" class="topo-btn" data-olho aria-label="Esconder os valores" aria-pressed="false">${ic('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>')}</button>
      </div>
    </div>
    ${info.eyebrow ? `<p class="topo-eyebrow">${esc(info.eyebrow)}</p>` : ''}
    ${numero}
    ${info.pilulas.length ? `<div class="topo-pilulas">${info.pilulas.map(p => `<span>${esc(p)}</span>`).join('')}</div>` : ''}
  </header>
  <!-- v9.21: fora do header (o overflow dele escondia o cabeçalho fixo) -->
  <div class="topo-mini" aria-hidden="true"><span>${esc(info.eyebrow || info.titulo)}</span>${info.valor != null ? `<b class="num">${esc(brl0(info.valor))}</b>` : ''}</div>`;
}

// Mais abre o menu de hoje (#appMenu); o ＋ (#appLancar) só no celular de quem publica
export function htmlNavV10(abaAtual, { lancar = false } = {}) {
  const botao = d => (d.aba
    ? `<button type="button" class="aba v10-aba ${d.aba === abaAtual ? 'on' : ''}" data-aba="${d.aba}" aria-current="${d.aba === abaAtual ? 'page' : 'false'}" aria-label="${d.nome}">${ic(d.icone)}</button>`
    : `<button type="button" class="aba v10-aba" id="appMenu" aria-label="${d.nome}">${ic(d.icone)}</button>`);
  const [hoje, invest, cartao, mais] = DESTINOS;
  const meio = lancar ? `<button type="button" class="v10-mais" id="appLancar" aria-label="Lançar" aria-haspopup="dialog">${ic('<path d="M12 5v14M5 12h14"/>')}</button>` : '';
  return `<nav class="abas v10-nav" aria-label="Seções">${botao(hoje)}${botao(invest)}${meio}${botao(cartao)}${botao(mais)}</nav>`;
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
const TOM_ICONE = { ruim: '<path d="M12 7v6m0 3.5v.01"/>', atencao: '<path d="M12 7v6m0 3.5v.01"/>', bom: '<path d="M6.5 12.5l3.5 3.5 7.5-8"/>', info: '<path d="M12 11v6m0-9.5v.01"/>' };

export function htmlHojeV10({ c = {}, limite = 0, venceDia = null, mesProx = null, investido = null, faixas = [], github = false }) {
  const cabe = Math.max(0, limite - (c.itau || 0));
  const pctCabe = limite > 0 ? Math.min(100, Math.round((cabe / limite) * 100)) : 0;
  const bloco = (attr, icone, rotulo, valor, rodape) => `<button type="button" class="bloco-v10" ${attr}>
      <span class="bloco-cab">${ic(icone)}${esc(rotulo)}</span><b class="num">${valor}</b>${rodape}</button>`;
  const invest = investido
    ? bloco('data-aba="carteira"', ICONES_HOJE.sobe, 'Investido', esc(brl0(investido.total)), `<small class="${investido.mercado < 0 ? 'cai' : 'sobe'}">${investido.mercado < 0 ? '▼' : '▲'} ${esc(brl0(Math.abs(investido.mercado)))} no mês</small>`)
    : `<div class="bloco-v10 vazio"><span class="bloco-cab">${ic(ICONES_HOJE.sobe)}Investido</span><small>Carteira ainda não carregada</small></div>`;
  const faixa = f => `<div class="faixa-v10 tom-${f.tom}">
      <button type="button" class="faixa-texto" ${f.attr || `data-ir-aba="${esc(f.ir || 'inicio')}"`}>${ic(TOM_ICONE[f.tom] || TOM_ICONE.info)}<span>${esc(f.texto)}</span></button>
      ${f.acao && github ? `<button type="button" class="faixa-acao-v10" ${f.acao.attr}>${esc(f.acao.rotulo)}</button>` : ''}</div>`;
  return `<div class="hoje-v10">
    <div class="blocos-v10">
      ${bloco('data-aba="cartao"', ICONES_HOJE.cartao, 'Fatura', esc(brl0(c.itau || 0)), venceDia ? `<small>vence ${pad(venceDia)}/${pad(mesProx)}</small>` : '')}
      ${bloco('data-aba="cartao"', ICONES_HOJE.folga, 'Cabe no cartão', esc(brl0(cabe)), `<i class="barra-v10"><i style="width:${pctCabe}%"></i></i>`)}
      ${bloco('data-ir-aba="mes/geral"', ICONES_HOJE.banco, 'No banco', esc(brl0(c.caixa || 0)), '<small>agora</small>')}
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
  const fim = limite ? (acima
    ? `<li class="cai"><i class="estouro"></i>Acima do limite<b>${esc(brl0(itau - limite))}</b></li>`
    : `<li><i class="livre"></i>Ainda cabe<b>${esc(brl0(livre))}</b></li>`) : '';
  const proj = c.itauProjetado, estoura = limite && proj > limite;
  const ritmo = limite && Number.isFinite(proj) ? `<p class="ritmo-v10${estoura ? ' cai' : ''}">No ritmo atual fecha em ${esc(brl0(proj))}${estoura && c.diaEstouro && !c.limiteJaRompido ? ` — passa do limite por volta do dia ${c.diaEstouro}` : ''}${!acima && c.diasRest > 0 && c.tetoPorDia > 0 ? `<small>Cabem ${esc(brl(c.tetoPorDia))} por dia até o fim do mês</small>` : ''}</p>` : '';
  return `<section class="comp-v10">
    <div class="comp-barra-v10" role="img" aria-label="Composição da fatura">${partes.map(([k, , v]) => `<i class="${k}" style="width:${pct(v)}%"></i>`).join('')}${livre > 0 ? `<i class="livre" style="width:${pct(livre)}%"></i>` : ''}${acima ? `<b class="marca-v10" style="left:${pct(limite)}%"></b>` : ''}</div>
    <ul class="comp-legenda-v10">${partes.map(([k, n, v]) => `<li><i class="${k}"></i>${n}<b>${esc(brl0(v))}</b></li>`).join('')}${fim}</ul>
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
  return `<div class="abertura-v10">
    <div class="abertura-marca">
      <i class="anel-v10 a1"></i><i class="anel-v10 a2"></i><i class="anel-v10 a3"></i>
      <img src="icons/logo.svg" alt="">
    </div>
    <h1>${esc(saudacao(agora))}</h1>
    <p class="abertura-sub">${soSenha ? 'Digite a senha da família para abrir.' : 'O Lastro está trancado.'}</p>
    <div class="abertura-acoes">
      ${soSenha ? '' : `<button type="button" class="abertura-digital" id="destravar" aria-label="Destrancar com a digital">${ic(DIGITAL)}</button><span class="abertura-dica">Toque para abrir</span>`}
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
