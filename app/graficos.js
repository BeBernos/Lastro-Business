// Gráficos do app: SVG/HTML puros, sem bibliotecas.
//
// Regras (diretriz de visualização): marcas finas, linha de 2px, colunas até 24px com ponta
// arredondada de 4px e base reta, grade em traço fino e discreto, rótulos só nos pontos que
// contam a história, texto sempre nas cores de texto (nunca na cor da série). Toda marca
// tocável leva `data-dica` — o app mostra o valor ao tocar (ver ligarDicas).

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// "−R$ 1.234,56" — sinal de menos tipográfico e espaço fixo, nunca quebra no meio
export const brl = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace('-', '−').replace(/\s/g, ' ');
export const brl0 = v => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).replace('-', '−').replace(/\s/g, ' ');
// eixo: 0 · 2 mil · 1,5 mil · −3,6 mil
export function compacto(v) {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: a >= 10000 ? 0 : 1 })} mil` : a.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  return (v < 0 ? '−' : '') + s;
}

// Ícones de estado (bom/atenção/ruim sempre com ícone + texto, nunca só cor)
const ICONES = {
  bom: '<path d="M8 12.5l2.7 2.7L16 9.8"/><circle cx="12" cy="12" r="9"/>',
  atencao: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  ruim: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.2v.3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
  ideia: '<path d="M9 18h6M10 21h4M8 14.5a5.5 5.5 0 1 1 8 0c-.9.9-1.4 1.7-1.4 2.7H9.4c0-1-.5-1.8-1.4-2.7z"/>',
};
export const svgIcone = (nome, cls = '') => `<svg viewBox="0 0 24 24" class="ic ${cls}" aria-hidden="true">${ICONES[nome] || nome}</svg>`;
export const icTom = tom => svgIcone(ICONES[tom] ? tom : 'info', `tom-${tom}`);

// Escala "bonita": 3 a 5 marcas redondas cobrindo [min, max]
function marcas(min, max, alvo = 4) {
  if (min === max) max = min + 1;
  const passoBruto = (max - min) / alvo;
  const pot = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 2.5, 5, 10].map(m => m * pot).find(p => p >= passoBruto);
  const ini = Math.floor(min / passo) * passo;
  const fim = Math.ceil(max / passo) * passo;
  const out = [];
  for (let v = ini; v <= fim + passo / 2; v += passo) out.push(Math.round(v * 100) / 100);
  return out;
}

const n = x => Math.round(x * 10) / 10;

// Coluna com ponta arredondada (4px) e base reta, crescendo a partir de `base`.
function coluna(x, w, yBase, yTopo) {
  const r = Math.min(4, w / 2, Math.abs(yBase - yTopo));
  if (yTopo <= yBase) { // positiva: arredonda em cima
    return `M${n(x)},${n(yBase)}V${n(yTopo + r)}Q${n(x)},${n(yTopo)} ${n(x + r)},${n(yTopo)}H${n(x + w - r)}Q${n(x + w)},${n(yTopo)} ${n(x + w)},${n(yTopo + r)}V${n(yBase)}Z`;
  }
  return `M${n(x)},${n(yBase)}V${n(yTopo - r)}Q${n(x)},${n(yTopo)} ${n(x + r)},${n(yTopo)}H${n(x + w - r)}Q${n(x + w)},${n(yTopo)} ${n(x + w)},${n(yTopo - r)}V${n(yBase)}Z`;
}

let seq = 0;
const novoId = p => `${p}${++seq}`;

// Linha do saldo ao longo do tempo. Acima de zero na cor de destaque, abaixo de zero em
// vermelho (polaridade), com uma lavagem de 10% sob a linha. Marca "hoje" e o ponto mínimo.
// pontos: [{ x (número), y, rotuloX, dica }]
// incluirZero: false para séries sempre positivas e grandes (patrimônio), para a linha não ficar achatada no topo
export function linhaSaldo(pontos, { altura = 180, hojeX = null, destaqueMin = true, rotulosX = [], rotuloFim = false, formatoY = compacto, incluirZero = true } = {}) {
  if (!pontos.length) return '';
  const W = 340, H = altura, L = 44, R = 14, T = 16, B = 26;
  const xs = pontos.map(p => p.x), ys = pontos.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const ticks = incluirZero ? marcas(Math.min(0, ...ys), Math.max(0, ...ys)) : marcas(Math.min(...ys), Math.max(...ys));
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const X = x => L + ((x - xMin) / (xMax - xMin || 1)) * (W - L - R);
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const y0 = Y(incluirZero ? 0 : yMin);
  const caminho = pontos.map((p, i) => `${i ? 'L' : 'M'}${n(X(p.x))},${n(Y(p.y))}`).join('');
  const area = `${caminho}L${n(X(xMax))},${n(y0)}L${n(X(xMin))},${n(y0)}Z`;
  const cima = novoId('c'), baixo = novoId('b');
  const grade = ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${n(Y(t))}" y2="${n(Y(t))}" class="${t === 0 ? 'g-zero' : 'g-grade'}"/>
    <text x="${L - 8}" y="${n(Y(t) + 4)}" class="g-eixo" text-anchor="end">${esc(formatoY(t))}</text>`).join('');
  const rotX = rotulosX.map(r => `<text x="${n(X(r.x))}" y="${H - 6}" class="g-eixo" text-anchor="middle">${esc(r.texto)}</text>`).join('');
  let extras = '';
  if (hojeX !== null && hojeX >= xMin && hojeX <= xMax) {
    const p = pontos.reduce((a, b) => (Math.abs(b.x - hojeX) < Math.abs(a.x - hojeX) ? b : a));
    extras += `<line x1="${n(X(hojeX))}" x2="${n(X(hojeX))}" y1="${T}" y2="${H - B}" class="g-hoje"/>
      <circle cx="${n(X(p.x))}" cy="${n(Y(p.y))}" r="5" class="g-ponto-hoje"/>`;
  }
  if (destaqueMin) {
    const m = pontos.reduce((a, b) => (b.y < a.y ? b : a));
    if (m.y < 0) {
      const xm = X(m.x), ym = Y(m.y);
      const cabeEmbaixo = ym + 20 <= H - B;
      const lado = xm > W - 90 ? -1 : 1;
      const tx = cabeEmbaixo ? xm : xm + lado * 10;
      const ty = cabeEmbaixo ? ym + 18 : ym - 8;
      const anc = cabeEmbaixo ? (xm > W - 80 ? 'end' : xm < L + 40 ? 'start' : 'middle') : lado < 0 ? 'end' : 'start';
      extras += `<circle cx="${n(xm)}" cy="${n(ym)}" r="4.5" class="g-ponto-min"/>
        <text x="${n(tx)}" y="${n(ty)}" class="g-rotulo com-fundo" text-anchor="${anc}">${esc(brl0(m.y))}</text>`;
    }
  }
  if (rotuloFim) {
    const f = pontos[pontos.length - 1];
    extras += `<circle cx="${n(X(f.x))}" cy="${n(Y(f.y))}" r="4.5" class="g-ponto-fim"/>`;
  }
  // áreas tocáveis: uma faixa vertical por ponto
  const larg = (W - L - R) / Math.max(1, pontos.length - 1);
  const toques = pontos.map(p => `<rect x="${n(X(p.x) - larg / 2)}" y="${T}" width="${n(larg)}" height="${H - T - B}" class="g-toque" data-dica="${esc(p.dica || '')}" data-x="${n(X(p.x))}" data-y="${n(Y(p.y))}"/>`).join('');
  // v8.7: cursor que segue o dedo ao arrastar (linha vertical + ponto no saldo do dia; ligarDicas move os dois)
  const cursor = `<g class="g-cursor" aria-hidden="true"><line x1="0" x2="0" y1="${T}" y2="${H - B}"/><circle cx="0" cy="0" r="5"/></g>`;
  const ult = pontos[pontos.length - 1];
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico arrastavel" role="img" aria-label="Saldo dia a dia: de ${esc(brl0(pontos[0].y))} a ${esc(brl0(ult.y))}; menor ${esc(brl0(Math.min(...ys)))}. Toque ou arraste para ver cada dia.">
    <defs>
      <clipPath id="${cima}"><rect x="0" y="0" width="${W}" height="${n(y0)}"/></clipPath>
      <clipPath id="${baixo}"><rect x="0" y="${n(y0)}" width="${W}" height="${n(H - y0)}"/></clipPath>
    </defs>
    ${grade}${rotX}
    <path d="${area}" class="g-area" clip-path="url(#${cima})"/>
    <path d="${area}" class="g-area neg" clip-path="url(#${baixo})"/>
    <path d="${caminho}" class="g-linha" clip-path="url(#${cima})"/>
    <path d="${caminho}" class="g-linha neg" clip-path="url(#${baixo})"/>
    ${extras}${cursor}${toques}
  </svg>`;
}

// Mini linha para cartões pequenos (sem eixos)
export function minilinha(valores, { altura = 44 } = {}) {
  if (valores.length < 2) return '';
  const W = 140, H = altura, P = 4;
  const ys = valores;
  const min = Math.min(0, ...ys), max = Math.max(0, ...ys);
  const X = i => P + (i / (ys.length - 1)) * (W - 2 * P);
  const Y = y => P + (1 - (y - min) / (max - min || 1)) * (H - 2 * P);
  const y0 = Y(0);
  const d = ys.map((y, i) => `${i ? 'L' : 'M'}${n(X(i))},${n(Y(y))}`).join('');
  const cima = novoId('mc'), baixo = novoId('mb');
  return `<svg viewBox="0 0 ${W} ${H}" class="minigrafico" aria-hidden="true" preserveAspectRatio="none">
    <defs><clipPath id="${cima}"><rect width="${W}" height="${n(y0)}"/></clipPath><clipPath id="${baixo}"><rect y="${n(y0)}" width="${W}" height="${n(H - y0)}"/></clipPath></defs>
    <line x1="0" x2="${W}" y1="${n(y0)}" y2="${n(y0)}" class="g-zero"/>
    <path d="${d}" class="g-linha" clip-path="url(#${cima})" vector-effect="non-scaling-stroke"/>
    <path d="${d}" class="g-linha neg" clip-path="url(#${baixo})" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

// Colunas a partir de uma linha de base (aceita negativos).
// itens: [{ rotulo, valor, classe ('pos'|'neg'|'suave'|'destaque'), dica, marcador (bool) }]
export function colunas(itens, { altura = 170, rotularValores = [], formatoY = compacto, referencia = null } = {}) {
  if (!itens.length) return '';
  const negRotulada = rotularValores.some(i => itens[i]?.valor < 0);
  const W = 340, H = altura, L = 44, R = 8, T = 18, B = negRotulada ? 42 : 26;
  const vals = itens.map(i => i.valor).concat(referencia ? [referencia.valor] : []);
  const ticks = marcas(Math.min(0, ...vals), Math.max(0, ...vals));
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const banda = (W - L - R) / itens.length;
  const w = Math.min(24, banda * 0.62);
  const grade = ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${n(Y(t))}" y2="${n(Y(t))}" class="${t === 0 ? 'g-zero' : 'g-grade'}"/>
    <text x="${L - 8}" y="${n(Y(t) + 4)}" class="g-eixo" text-anchor="end">${esc(formatoY(t))}</text>`).join('');
  const passoRotulo = itens.length > 8 ? 2 : 1;
  const cols = itens.map((it, i) => {
    const x = L + i * banda + (banda - w) / 2;
    const cx = x + w / 2;
    const yv = Y(it.valor), yb = Y(0);
    const rot = i % passoRotulo === 0 || it.classe === 'destaque' ? `<text x="${n(cx)}" y="${H - 7}" class="g-eixo" text-anchor="middle">${esc(it.rotulo)}</text>` : '';
    const val = rotularValores.includes(i) ? `<text x="${n(cx)}" y="${n(it.valor >= 0 ? yv - 6 : yv + 14)}" class="g-rotulo" text-anchor="middle">${esc(compacto(it.valor))}</text>` : '';
    const marcador = it.marcador ? `<circle cx="${n(cx)}" cy="${n(Math.max(yb, yv) + 9)}" r="3.5" class="g-marcador"/>` : '';
    return `<path d="${coluna(x, w, yb, Math.abs(yv - yb) < 1 ? yb - (it.valor >= 0 ? 1 : -1) : yv)}" class="g-col ${it.classe || (it.valor < 0 ? 'neg' : 'pos')}"/>${marcador}${rot}${val}
      <rect x="${n(L + i * banda)}" y="${T}" width="${n(banda)}" height="${H - T - B}" class="g-toque" data-dica="${esc(it.dica || '')}" data-x="${n(cx)}"/>`;
  }).join('');
  // linha de referência sem texto dentro do gráfico (o nome vai na legenda, para não colidir com rótulos)
  const ref = referencia ? `<line x1="${L}" x2="${W - R}" y1="${n(Y(referencia.valor))}" y2="${n(Y(referencia.valor))}" class="g-ref"/>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img">${grade}${cols}${ref}</svg>`;
}

// Colunas agrupadas (ex.: receitas × despesas por mês), séries s1/s2 lado a lado no mesmo eixo.
// grupos: [{ rotulo, valores: [{ nome, valor }] }]. Sempre acompanhado de legenda.
export function colunasDuplas(grupos, { altura = 170, formatoY = compacto } = {}) {
  if (!grupos.length) return '';
  const W = 340, H = altura, L = 44, R = 8, T = 14, B = 26;
  const todos = grupos.flatMap(g => g.valores.map(v => v.valor));
  const ticks = marcas(Math.min(0, ...todos), Math.max(0, ...todos));
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const banda = (W - L - R) / grupos.length;
  const qtd = Math.max(...grupos.map(g => g.valores.length));
  const w = Math.min(16, (banda * 0.7 - (qtd - 1) * 2) / qtd);
  const grade = ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${n(Y(t))}" y2="${n(Y(t))}" class="${t === 0 ? 'g-zero' : 'g-grade'}"/>
    <text x="${L - 8}" y="${n(Y(t) + 4)}" class="g-eixo" text-anchor="end">${esc(formatoY(t))}</text>`).join('');
  const cols = grupos.map((g, i) => {
    const larguraGrupo = qtd * w + (qtd - 1) * 2;
    const x0 = L + i * banda + (banda - larguraGrupo) / 2;
    const barras = g.valores.map((v, j) => `<path d="${coluna(x0 + j * (w + 2), w, Y(0), Y(v.valor))}" class="g-col s${j + 1}"/>`).join('');
    const dica = `${g.rotulo}: ${g.valores.map(v => `${v.nome} ${brl0(v.valor)}`).join(' · ')}`;
    return `${barras}<text x="${n(L + i * banda + banda / 2)}" y="${H - 7}" class="g-eixo" text-anchor="middle">${esc(g.rotulo)}</text>
      <rect x="${n(L + i * banda)}" y="${T}" width="${n(banda)}" height="${H - T - B}" class="g-toque" data-dica="${esc(dica)}" data-x="${n(L + i * banda + banda / 2)}"/>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img">${grade}${cols}</svg>`;
}

// Várias linhas no mesmo eixo (mesma unidade). series: [{ nome, classe: 's1'|'s2', valores: [] }]
// dicas[i] = texto ao tocar no ponto i. Sempre acompanhado de legenda (ver telas.js).
export function linhas(series, { altura = 190, rotulosX = [], dicas = [], formatoY = compacto } = {}) {
  const qtd = series[0]?.valores.length || 0;
  if (qtd < 2) return '';
  const W = 340, H = altura, L = 44, R = 14, T = 16, B = 26;
  const todos = series.flatMap(s => s.valores);
  const ticks = marcas(Math.min(0, ...todos), Math.max(0, ...todos));
  const yMin = ticks[0], yMax = ticks[ticks.length - 1];
  const X = i => L + (i / (qtd - 1)) * (W - L - R);
  const Y = y => T + (1 - (y - yMin) / (yMax - yMin || 1)) * (H - T - B);
  const grade = ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${n(Y(t))}" y2="${n(Y(t))}" class="${t === 0 ? 'g-zero' : 'g-grade'}"/>
    <text x="${L - 8}" y="${n(Y(t) + 4)}" class="g-eixo" text-anchor="end">${esc(formatoY(t))}</text>`).join('');
  const rotX = rotulosX.map(r => `<text x="${n(X(r.i))}" y="${H - 6}" class="g-eixo" text-anchor="middle">${esc(r.texto)}</text>`).join('');
  const traços = series.map(s => {
    const d = s.valores.map((v, i) => `${i ? 'L' : 'M'}${n(X(i))},${n(Y(v))}`).join('');
    const pontosNeg = s.marcarNegativos ? s.valores.map((v, i) => (v < 0 ? `<circle cx="${n(X(i))}" cy="${n(Y(v))}" r="4" class="g-ponto ${s.classe}"/>` : '')).join('') : '';
    const fim = `<circle cx="${n(X(qtd - 1))}" cy="${n(Y(s.valores[qtd - 1]))}" r="4" class="g-ponto ${s.classe}"/>`;
    return `<path d="${d}" class="g-serie ${s.classe}"/>${pontosNeg}${fim}`;
  }).join('');
  const larg = (W - L - R) / (qtd - 1);
  const toques = Array.from({ length: qtd }, (_, i) => `<rect x="${n(X(i) - larg / 2)}" y="${T}" width="${n(larg)}" height="${H - T - B}" class="g-toque" data-dica="${esc(dicas[i] || '')}" data-x="${n(X(i))}"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="grafico" role="img">${grade}${rotX}${traços}${toques}</svg>`;
}

// Anel de progresso (0–1) com conteúdo no centro
export function anel(fracao, { tamanho = 116, espessura = 10, classe = '' } = {}) {
  const r = (tamanho - espessura) / 2, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, fracao));
  return `<svg viewBox="0 0 ${tamanho} ${tamanho}" class="anel ${classe}" aria-hidden="true">
    <circle cx="${tamanho / 2}" cy="${tamanho / 2}" r="${r}" class="anel-trilho" stroke-width="${espessura}"/>
    <circle cx="${tamanho / 2}" cy="${tamanho / 2}" r="${r}" class="anel-valor" stroke-width="${espessura}"
      stroke-dasharray="${n(c * f)} ${n(c)}" transform="rotate(-90 ${tamanho / 2} ${tamanho / 2})"/>
  </svg>`;
}

// Medidor horizontal: preenchimento sobre um trilho mais claro do mesmo tom
export function medidor(fracao, { classe = '', marca = null } = {}) {
  const f = Math.max(0, Math.min(1, fracao));
  return `<div class="medidor ${classe}"><i style="width:${(f * 100).toFixed(1)}%"></i>${marca !== null ? `<b style="left:${(Math.min(1, marca) * 100).toFixed(1)}%"></b>` : ''}</div>`;
}

// Barra empilhada com vão de 2px entre os segmentos. segmentos: [{ valor, classe, dica }]
export function empilhada(segmentos, total) {
  const t = total || segmentos.reduce((s, x) => s + x.valor, 0) || 1;
  return `<div class="empilhada">${segmentos.filter(s => s.valor > 0).map(s =>
    `<i class="${s.classe}" style="flex-basis:${((s.valor / t) * 100).toFixed(2)}%" data-dica="${esc(s.dica || '')}"></i>`).join('')}</div>`;
}

// Barras horizontais em HTML (rótulo à esquerda, valor à direita, barra embaixo)
export function barrasH(itens, { classe = '' } = {}) {
  const max = Math.max(...itens.map(i => i.valor), 1);
  return `<ul class="barrash ${classe}">${itens.map(i => `
    <li data-dica="${esc(i.dica || `${i.rotulo}: ${brl(i.valor)}`)}">
      <div class="bh-topo"><span>${esc(i.rotulo)}</span><b>${brl0(i.valor)}</b></div>
      <div class="bh-trilho"><i style="width:${((i.valor / max) * 100).toFixed(1)}%" class="${i.classe || ''}"></i></div>
    </li>`).join('')}</ul>`;
}

// Dica flutuante: tocar/arrastar sobre qualquer [data-dica] mostra o valor.
export function ligarDicas(raiz) {
  // a bolha fica fora do contêiner, que é redesenhado a cada troca de aba
  let bolha = document.querySelector('body > .dica');
  if (!bolha) {
    bolha = document.createElement('div');
    bolha.className = 'dica';
    bolha.hidden = true;
    document.body.append(bolha);
  }
  let timer;
  const mostrar = (alvo, x, y) => {
    const texto = alvo?.getAttribute('data-dica');
    if (!texto) return;
    clearTimeout(timer);
    bolha.textContent = texto;
    bolha.hidden = false;
    const caixa = bolha.getBoundingClientRect();
    const svg = alvo.closest('svg');
    let px = x;
    if (svg && alvo.dataset.x) { // alinha no ponto/coluna, não no dedo
      const r = svg.getBoundingClientRect();
      px = r.left + (Number(alvo.dataset.x) / svg.viewBox.baseVal.width) * r.width;
    }
    bolha.style.left = `${Math.max(8, Math.min(innerWidth - caixa.width - 8, px - caixa.width / 2))}px`;
    bolha.style.top = `${Math.max(8, y - caixa.height - 18)}px`;
    raiz.querySelectorAll('.tocado').forEach(e => e.classList.remove('tocado'));
    alvo.classList.add('tocado');
    // gráfico do saldo: a linha e o ponto vão para o dia tocado
    const cur = svg?.querySelector('.g-cursor');
    if (cur && alvo.dataset.y) {
      cur.querySelector('line').setAttribute('x1', alvo.dataset.x);
      cur.querySelector('line').setAttribute('x2', alvo.dataset.x);
      cur.querySelector('circle').setAttribute('cx', alvo.dataset.x);
      cur.querySelector('circle').setAttribute('cy', alvo.dataset.y);
      svg.classList.add('com-cursor');
    }
  };
  const esconder = () => {
    timer = setTimeout(() => {
      bolha.hidden = true;
      raiz.querySelectorAll('.tocado').forEach(e => e.classList.remove('tocado'));
      raiz.querySelectorAll('.com-cursor').forEach(e => e.classList.remove('com-cursor'));
    }, 1800);
  };
  raiz.addEventListener('pointerdown', e => mostrar(e.target.closest('[data-dica]'), e.clientX, e.clientY));
  raiz.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse' || e.buttons) {
      const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-dica]');
      if (alvo && raiz.contains(alvo)) mostrar(alvo, e.clientX, e.clientY);
    }
  });
  raiz.addEventListener('pointerup', esconder);
  raiz.addEventListener('pointerleave', esconder);
  raiz.addEventListener('scroll', () => { bolha.hidden = true; }, { passive: true, capture: true });
}
