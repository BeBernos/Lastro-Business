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

// ---------- v9.28: gráficos no Carvão — sem grade nem números no eixo; uma linha âmbar com degradê, o ponto que
// importa aceso e rótulos só onde dizem algo. Os toques são os de sempre (g-toque + g-cursor → ligarDicas). ----------
let seqId = 0;
const n1 = v => Math.round(v * 10) / 10;
// pontos: [{ x, y, dica }]; hojeX: dia de hoje (ponto aceso + linha); rotulosX: [{ x, texto }]; fim: rotular o último;
// zero: a linha de base no zero (quando há negativos); formato: texto dos valores rotulados
export function areaCv(pontos, { altura = 150, hojeX = null, rotulosX = [], fim = false, marcas = false, formato = v => brl0(v), rotulo = 'Gráfico' } = {}) {
  if (pontos.length < 2) return '';
  const W = 340, H = altura, L = 6, R = 10, T = 22, B = 22;
  const ys = pontos.map(p => p.y), xs = pontos.map(p => p.x);
  const temNeg = Math.min(...ys) < 0;
  const yMin = temNeg ? Math.min(...ys) * 1.08 : Math.min(...ys) - (Math.max(...ys) - Math.min(...ys)) * 0.15;
  const yMax = Math.max(...ys, temNeg ? 0 : -Infinity) * 1.04 || 1;
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const X = x => L + ((x - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const base = Y(temNeg ? 0 : yMin);
  const linha = pontos.map((p, i) => `${i ? 'L' : 'M'}${n1(X(p.x))},${n1(Y(p.y))}`).join('');
  const area = `${linha}L${n1(X(xMax))},${n1(base)}L${n1(X(xMin))},${n1(base)}Z`;
  const id = `cv${++seqId}`;
  let extras = '';
  if (temNeg) extras += `<line x1="${L}" x2="${W - R}" y1="${n1(base)}" y2="${n1(base)}" class="gcv-zero"/>`;
  const mn = pontos.reduce((a, b) => (b.y < a.y ? b : a));
  if (mn.y < 0) extras += `<circle cx="${n1(X(mn.x))}" cy="${n1(Y(mn.y))}" r="4" class="gcv-min"/><text x="${n1(X(mn.x))}" y="${n1(Math.min(H - B + 14, Y(mn.y) + 16))}" text-anchor="middle" class="gcv-val cai">${esc(formato(mn.y))}</text>`;
  if (hojeX !== null && hojeX >= xMin && hojeX <= xMax) {
    const p = pontos.reduce((a, b) => (Math.abs(b.x - hojeX) < Math.abs(a.x - hojeX) ? b : a));
    extras += `<line x1="${n1(X(p.x))}" x2="${n1(X(p.x))}" y1="${T - 6}" y2="${n1(base)}" class="gcv-hoje"/><circle cx="${n1(X(p.x))}" cy="${n1(Y(p.y))}" r="10" class="gcv-halo"/><circle cx="${n1(X(p.x))}" cy="${n1(Y(p.y))}" r="4.5" class="gcv-ponto"/>`;
  }
  if (marcas) extras += pontos.slice(0, -1).map(p => `<circle cx="${n1(X(p.x))}" cy="${n1(Y(p.y))}" r="2.5" class="gcv-marca"/>`).join(''); // um ponto por mês
  if (fim) {
    const f = pontos[pontos.length - 1];
    extras += `<circle cx="${n1(X(f.x))}" cy="${n1(Y(f.y))}" r="10" class="gcv-halo"/><circle cx="${n1(X(f.x))}" cy="${n1(Y(f.y))}" r="4.5" class="gcv-ponto"/><text x="${n1(X(f.x) - 8)}" y="${n1(Math.max(13, Y(f.y) - 12))}" text-anchor="end" class="gcv-val">${esc(formato(f.y))}</text>`;
  }
  const rot = rotulosX.map(r => `<text x="${n1(Math.min(W - R - 6, Math.max(L + 6, X(r.x))))}" y="${H - 4}" text-anchor="middle" class="gcv-eixo">${esc(r.texto)}</text>`).join('');
  const larg = (W - L - R) / Math.max(1, pontos.length - 1);
  const toques = pontos.map(p => `<rect x="${n1(X(p.x) - larg / 2)}" y="0" width="${n1(larg)}" height="${H - B}" class="g-toque" data-dica="${esc(p.dica || '')}" data-x="${n1(X(p.x))}" data-y="${n1(Y(p.y))}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico grafico-cv arrastavel" role="img" aria-label="${esc(rotulo)}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cv-ambar)" stop-opacity=".32"/><stop offset="1" style="stop-color:var(--cv-ambar)" stop-opacity="0"/></linearGradient>
      <clipPath id="${id}n"><rect x="0" y="${n1(base)}" width="${W}" height="${H}"/></clipPath></defs>
    <path d="${area}" fill="url(#${id})" class="gcv-area"/>
    <path d="${linha}" pathLength="1" class="gcv-linha"/>
    ${temNeg ? `<path d="${linha}" class="gcv-linha neg" clip-path="url(#${id}n)"/>` : ''}
    ${extras}${rot}
    <g class="g-cursor" aria-hidden="true"><line x1="0" x2="0" y1="${T}" y2="${n1(base)}"/><circle cx="0" cy="0" r="5"/></g>${toques}
  </svg>`;
}

// Colunas: [{ rotulo, valor, dica, destaque }] — barras arredondadas (âmbar; negativas em coral), valor em cima, sem eixo
export function colunasCv(itens, { altura = 140, formato = v => brl0(v), rotulo = 'Gráfico' } = {}) {
  if (!itens.length) return '';
  const vals = itens.map(i => i.valor);
  const yMax = Math.max(0, ...vals), yMin = Math.min(0, ...vals);
  // v9.28: com negativos, espaço para o valor embaixo da barra antes do mês (não encavalam)
  const W = 340, H = altura + (yMin < 0 ? 16 : 0), T = 20, B = yMin < 0 ? 38 : 22;
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const banda = W / itens.length, w = Math.min(26, banda * 0.58), y0 = Y(0);
  const cols = itens.map((it, i) => {
    const x = i * banda + (banda - w) / 2, cx = x + w / 2, yv = Y(it.valor);
    const topo = Math.min(yv, y0), alt = Math.max(6, Math.abs(yv - y0)), raio = Math.min(7, w / 2, alt / 2);
    const mostrar = itens.length <= 8 || it.destaque || i === itens.length - 1;
    return `<rect x="${n1(x)}" y="${n1(it.valor < 0 ? y0 : y0 - alt)}" width="${n1(w)}" height="${n1(alt)}" rx="${n1(raio)}" class="gcv-col${it.valor < 0 ? ' neg' : ''}${it.destaque ? ' destaque' : ''}" style="--i:${i}"/>
      ${mostrar ? `<text x="${n1(cx)}" y="${n1(it.valor < 0 ? topo + alt + 13 : topo - 6)}" text-anchor="middle" class="gcv-val${it.valor < 0 ? ' cai' : ''}">${esc(formato(it.valor))}</text>` : ''}
      <text x="${n1(cx)}" y="${H - 4}" text-anchor="middle" class="gcv-eixo">${esc(it.rotulo)}</text>
      <rect x="${n1(i * banda)}" y="0" width="${n1(banda)}" height="${H - B}" class="g-toque" data-dica="${esc(it.dica || '')}" data-x="${n1(cx)}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico grafico-cv" role="img" aria-label="${esc(rotulo)}"><line x1="0" x2="${W}" y1="${n1(y0)}" y2="${n1(y0)}" class="gcv-zero"/>${cols}</svg>`;
}

// v11.2: mapa em retângulos (treemap "squarified"): itens já em ordem decrescente de valor → um retângulo por item, do
// tamanho do que vale, dentro de w × h, o mais quadrado possível. Puro: [{ v }] → [{ x, y, w, h }] na mesma ordem.
export function treemap(itens, w, h) {
  const total = itens.reduce((s, i) => s + Math.max(0, i.v), 0);
  if (!total) return itens.map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
  const areas = itens.map(i => (Math.max(0, i.v) / total) * w * h);
  const out = [];
  let x = 0, y = 0, W = w, H = h, fila = [];
  const pior = (f, lado) => { const s = f.reduce((a, b) => a + b, 0), mx = Math.max(...f), mn = Math.min(...f); return Math.max((lado * lado * mx) / (s * s), (s * s) / (lado * lado * mn)); };
  const coloca = f => {
    const s = f.reduce((a, b) => a + b, 0);
    if (W >= H) { const cw = s / H; let yy = y; for (const a of f) { out.push({ x, y: yy, w: cw, h: a / cw }); yy += a / cw; } x += cw; W -= cw; }
    else { const rh = s / W; let xx = x; for (const a of f) { out.push({ x: xx, y, w: a / rh, h: rh }); xx += a / rh; } y += rh; H -= rh; }
  };
  for (let i = 0; i < areas.length;) {
    const lado = Math.min(W, H), a = areas[i];
    if (!fila.length || pior([...fila, a], lado) <= pior(fila, lado)) { fila.push(a); i++; } else { coloca(fila); fila = []; }
  }
  if (fila.length) coloca(fila);
  return out;
}
