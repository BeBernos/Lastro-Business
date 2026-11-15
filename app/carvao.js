// v9.26 — os componentes do redesenho "Carteira de cartões" (interface nova, Carvão). Puros: recebem dados prontos e
// devolvem HTML. O que importa vira um cartão que se desliza (carrossel com encaixe); o resto são barras "agora × alvo",
// listas com ícone e linhas de ação. Os toques reusam os atributos que o app já trata (data-ativo-abrir, data-pagar…).
// Não importa nada do app.js. Estilos em v10.css (classes *-cv).
import { brl0, esc } from './graficos.js';

export const ic = (d, cls = '') => `<svg class="ic-cv${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const SOBE = '<path d="M12 18V6M7 11l5-5 5 5"/>';
const CAI = '<path d="M12 6v12M7 13l5 5 5-5"/>';
const SETA = '<path d="m9 6 6 6-6 6"/>';

const pct1 = v => `${(Math.round(v * 10) / 10).toLocaleString('pt-BR')}%`;

// ▲/▼ desenhados, com o texto ao lado (subiu = âmbar, caiu = coral — nada de verde)
export function variacaoCv(v, texto) {
  if (v == null || !Number.isFinite(v)) return '';
  return `<span class="var-cv ${v < 0 ? 'cai' : 'sobe'}">${ic(v < 0 ? CAI : SOBE)}${esc(texto)}</span>`;
}

// título de seção (é o próprio título, não um rótulo em cima dele); "id" vira âncora para os links "aba/sub"
export function secaoCv(titulo, { id = '', link = '', contagem = null } = {}) {
  return `<div class="secao-cv"${id ? ` id="${esc(id)}"` : ''}><h2>${esc(titulo)}${contagem != null ? `<small>${contagem}</small>` : ''}</h2>${link}</div>`;
}
export const linkCv = (texto, attr) => `<button type="button" class="link-cv" ${attr}>${esc(texto)}</button>`;

// Código curto e grande do cartão: o ticker quando há; senão uma abreviação do nome
export function codigoAtivo(nome = '') {
  const s = String(nome);
  const t = s.match(/\b([A-Z]{4}\d{1,2})\b/);
  if (t) return t[1];
  if (/selic/i.test(s)) return 'SELIC';
  const ipca = s.match(/ipca\+?\s*(\d{4})/i);
  if (ipca) return `IPCA+${ipca[1].slice(2)}`;
  if (/prefixado/i.test(s)) return 'PRÉ';
  if (/\bcdb\b/i.test(s)) return 'CDB';
  if (/\b(lci|lca)\b/i.test(s)) return s.match(/\b(lci|lca)\b/i)[1].toUpperCase();
  if (/bitcoin|\bbtc\b/i.test(s)) return 'BTC';
  if (/ether|\beth\b/i.test(s)) return 'ETH';
  if (/cripto/i.test(s)) return 'CRIPTO';
  if (/ouro|gold/i.test(s)) return 'OURO';
  if (/d[oó]lar|usd|cambial/i.test(s)) return 'USD';
  const p = s.replace(/^(tesouro|fundo|fii|etf)\s+/i, '').split(/\s+/)[0] || s;
  return p.slice(0, 7).toUpperCase();
}

// Um cartão do carrossel. destaque = o cartão em brasa (um por carrossel). attr = o toque (botão); sem ele, só leitura.
export function cartaoCv({ codigo, nome = '', valor = '', rodape = '', topo = '', destaque = false, attr = '', classe = '' }) {
  const tag = attr ? 'button' : 'div';
  return `<${tag}${attr ? ' type="button"' : ''} class="cartao-cv${destaque ? ' brasa' : ''}${classe ? ` ${classe}` : ''}" ${attr}>
    ${topo ? `<span class="cv-topo">${topo}</span>` : ''}
    <b class="cv-codigo">${esc(codigo)}</b>
    ${nome ? `<span class="cv-nome">${esc(nome)}</span>` : ''}
    <span class="cv-valor num">${valor}</span>
    ${rodape ? `<span class="cv-rodape">${rodape}</span>` : ''}
  </${tag}>`;
}

export function carrosselCv(cartoes, rotulo) {
  if (!cartoes.length) return '';
  return `<div class="carrossel-cv" role="list" aria-label="${esc(rotulo)}">${cartoes.map(c => `<div role="listitem">${c}</div>`).join('')}</div>`;
}

// Barras "agora × alvo": { rotulo, icone?, valor (texto), atual, alvo (null = sem alvo), nota?, tom? ('atencao'|'ruim') }
// Escala comum (padrão): o maior entre atual e alvo vira ~90% do trilho, e o alvo é um traço. porLinha: cada linha
// na sua escala (atual ÷ alvo; cheio = no máximo, sem traço) — para notas de critérios com máximos diferentes.
// compacto: rótulo, barra e valor numa linha só (a nota só aparece quando a linha traz uma).
export function barrasAlvoCv(linhas, { porLinha = false, compacto = false } = {}) {
  if (!linhas.length) return '';
  const max = Math.max(...linhas.map(l => Math.max(l.atual || 0, l.alvo || 0)), 1) / 0.9;
  const w = (v, l) => Math.max(0, Math.min(100, porLinha ? ((v || 0) / (l.alvo || 1)) * 100 : ((v || 0) / max) * 100)).toFixed(1);
  return `<ul class="barras-cv${compacto ? ' compacto' : ''}">${linhas.map(l => `<li class="${l.tom ? `tom-${l.tom}` : ''}">
      <span class="ba-rot">${l.icone || ''}<span>${esc(l.rotulo)}</span></span>
      <b class="ba-val num">${esc(l.valor)}</b>
      <i class="ba-trilho"><i style="width:${w(l.atual, l)}%"></i>${l.alvo != null && !porLinha ? `<em style="left:${w(l.alvo, l)}%" title="alvo"></em>` : ''}</i>
      ${l.nota ? `<small class="ba-nota">${esc(l.nota)}</small>` : ''}
    </li>`).join('')}</ul>`;
}

// A assinatura da "Carteira de cartões": o cartão que encaixa à esquerda acende em brasa; os vizinhos ficam escuros.
// Chamado depois de cada desenho da tela (app.js); só mexe em carrosséis de .cartao-cv.
export function ligarCarrosseis(raiz) {
  raiz?.querySelectorAll('.carrossel-cv').forEach(c => {
    if (c.dataset.ligado) return;
    c.dataset.ligado = '1';
    const cartoes = [...c.children].map(d => d.firstElementChild).filter(e => e?.classList.contains('cartao-cv'));
    if (cartoes.length < 2) return;
    let pedido = 0;
    const acender = () => {
      pedido = 0;
      const base = c.getBoundingClientRect().left + (parseFloat(getComputedStyle(c).paddingLeft) || 0);
      let melhor = cartoes[0], dist = Infinity;
      for (const k of cartoes) { const d = Math.abs(k.getBoundingClientRect().left - base); if (d < dist) { dist = d; melhor = k; } }
      if (c.scrollLeft + c.clientWidth >= c.scrollWidth - 2) melhor = cartoes[cartoes.length - 1]; // no fim, o último (ele nunca chega à borda)
      for (const k of cartoes) k.classList.toggle('brasa', k === melhor);
    };
    c.addEventListener('scroll', () => { if (!pedido) pedido = requestAnimationFrame(acender); }, { passive: true });
  });
}

// Linha de lista: { icone (HTML), titulo, sub, valor, valorSub (HTML), attr (toque), acao: { rotulo, attr, principal } }
export function linhaCv({ icone = '', titulo, sub = '', valor = '', valorSub = '', attr = '', acao = null, classe = '' }) {
  const dentro = `${icone}<span class="li-txt"><b>${esc(titulo)}</b>${sub ? `<small>${sub}</small>` : ''}</span>${valor || valorSub ? `<span class="li-val"><b class="num">${valor}</b>${valorSub ? `<small>${valorSub}</small>` : ''}</span>` : ''}`;
  const corpo = attr ? `<button type="button" class="li-corpo" ${attr}>${dentro}${acao ? '' : ic(SETA, 'li-seta')}</button>` : `<span class="li-corpo">${dentro}</span>`;
  return `<li class="linha-cv${classe ? ` ${classe}` : ''}">${corpo}${acao ? (acao.icone ? `<button type="button" class="li-acao redondo" aria-label="${esc(acao.rotulo)}" title="${esc(acao.rotulo)}" ${acao.attr}>${ic(acao.icone)}</button>` : `<button type="button" class="li-acao${acao.principal ? ' principal' : ''}" ${acao.attr}>${esc(acao.rotulo)}</button>`) : ''}</li>`;
}
export const CHECK = '<path d="m5 12.5 4.5 4.5L19 7.5"/>';
export const listaCv = linhas => (linhas.length ? `<ul class="lista-cv">${linhas.join('')}</ul>` : '');

// Bloco escuro (um painel, nunca dentro de outro)
export const blocoCv = (html, classe = '') => (html ? `<section class="bloco-cv${classe ? ` ${classe}` : ''}">${html}</section>` : '');

// Fileira de botões em pílula: [{ rotulo, attr, principal }]
export const acoesCv = (botoes, classe = '') => (botoes.length ? `<div class="acoes-cv${classe ? ` ${classe}` : ''}">${botoes.map(b => `<button type="button" class="${b.principal ? 'principal' : ''}" ${b.attr}>${esc(b.rotulo)}</button>`).join('')}</div>` : '');

// Dia num quadrado escuro (agenda, contas); hoje com contorno de brasa
export const diaCv = (dia, semana = '', hoje = false) => `<span class="dia-cv${hoje ? ' hoje' : ''}"><b>${esc(String(dia).padStart(2, '0'))}</b>${semana ? `<small>${esc(semana)}</small>` : ''}</span>`;

// Dois números lado a lado (renda, resultado…): [{ rotulo, valor, sub }]
export const numerosCv = itens => (itens.length ? `<div class="numeros-cv">${itens.map(i => `<div><span>${esc(i.rotulo)}</span><b class="num">${i.valor}</b>${i.sub ? `<small>${i.sub}</small>` : ''}</div>`).join('')}</div>` : '');

// O fim de cada tela: tudo o que o painel do Claude mostra sobre o assunto, no desenho de antes (nada some)
export const tudoDoPainelCv = (aba, assunto) => `<button type="button" class="tudo-cv" data-tudo="${esc(aba)}">${ic('<path d="M4 6h16M4 12h16M4 18h10"/>')}<span><b>Tudo do painel</b><small>${esc(assunto)}, como o Claude escreveu</small></span>${ic(SETA, 'li-seta')}</button>`;

export { brl0, pct1 };
