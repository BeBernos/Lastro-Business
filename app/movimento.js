// Movimento do app (nasceu na v8, 28/10/2026; era o v8.js até a v11.5): números que contam até o valor novo, o esqueleto
// de carregando, folhas que fecham arrastando para baixo, puxar para atualizar, troca de aba com View Transition e vibração
// curta ao salvar. Nada de número ou de lançamento depende daqui.

const calmo = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || { matches: true };
const vistos = new Map(); // último valor mostrado de cada número grande ("aba/sub#posição")

// carregando: esqueleto com a forma da tela no lugar do círculo girando
export const ESQUELETO = '<div class="app-conteudo v8-esqueleto" role="status" aria-label="Carregando"><i></i><i></i><i></i><i></i></div>';

export function vibrar(ms = 12) {
  try { navigator.vibrate?.(ms); } catch { /* aparelho sem vibração */ }
}

// "R$ 1.240,00", "−R$ 98,50", "R$ 312.500" → número e o jeito de escrever de volta
const RE_VALOR = /(R\$\s?)(\d{1,3}(?:\.\d{3})*)(?:,(\d{2}))?/;
export function lerNumero(texto) {
  const m = String(texto).match(RE_VALOR);
  if (!m) return null;
  return { valor: Number(m[2].replace(/\./g, '') + (m[3] ? `.${m[3]}` : '')), casas: m[3] ? 2 : 0 };
}
export function escreverNumero(texto, valor, casas) {
  const n = Math.abs(valor).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  return String(texto).replace(RE_VALOR, (_, rs) => `${rs}${n}`);
}

// Números grandes contam do valor anterior até o novo (lançou R$ 50 → o "Dá para gastar" desce na frente).
// Na primeira vez que aparecem nesta abertura, contam a partir de zero.
export function animarNumeros(raiz, chave) {
  raiz.querySelectorAll('.hero-valor').forEach((el, i) => {
    const id = `${chave}#${i}`;
    const final = el.textContent;
    const lido = lerNumero(final);
    if (!lido) return;
    const de = vistos.has(id) ? vistos.get(id) : 0;
    vistos.set(id, lido.valor);
    if (calmo.matches || Math.abs(de - lido.valor) < 0.005) return;
    const t0 = performance.now();
    const dur = de ? 650 : 800;
    const passo = agora => {
      if (!el.isConnected) return;
      const k = Math.min(1, (agora - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? escreverNumero(final, de + (lido.valor - de) * e, lido.casas) : final;
      if (k < 1) requestAnimationFrame(passo);
    };
    el.classList.add('v8-conta');
    requestAnimationFrame(passo);
    setTimeout(() => el.classList.remove('v8-conta'), dur + 300);
  });
}

// Folha: arrastar pela alça (ou pelo topo, com a folha rolada para cima) fecha
export function ligarArrastarFolha(folha, fechar) {
  let y0 = null, dy = 0;
  folha.addEventListener('pointerdown', e => {
    if (folha.scrollTop > 0 || e.target.closest('input,select,textarea,button,a')) return;
    if (e.clientY - folha.getBoundingClientRect().top > 64) return;
    y0 = e.clientY; dy = 0;
    folha.classList.add('v8-arrastando');
    folha.setPointerCapture(e.pointerId);
  });
  folha.addEventListener('pointermove', e => {
    if (y0 === null) return;
    dy = Math.max(0, e.clientY - y0);
    folha.style.transform = `translateY(${dy}px)`;
  });
  const soltar = () => {
    if (y0 === null) return;
    y0 = null;
    folha.classList.remove('v8-arrastando');
    folha.style.transform = '';
    if (dy > 90) fechar();
  };
  folha.addEventListener('pointerup', soltar);
  folha.addEventListener('pointercancel', soltar);
}

// Puxar a tela para baixo (no topo) busca a versão publicada mais nova — o mesmo que menu → Buscar atualização
const IC_PUXAR = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/></svg>';
export function ligarPuxar(resumo, haFolha, buscar) {
  let y0 = null, d = 0, el = null;
  const marca = () => {
    if (!el) {
      el = document.createElement('div');
      el.className = 'v8-puxar';
      el.innerHTML = IC_PUXAR;
      document.body.appendChild(el);
    }
    return el;
  };
  resumo.addEventListener('touchstart', e => {
    d = 0;
    y0 = resumo.scrollTop <= 0 && e.touches.length === 1 && !haFolha() && !el?.classList.contains('buscando') ? e.touches[0].clientY : null;
  }, { passive: true });
  resumo.addEventListener('touchmove', e => {
    if (y0 === null) return;
    if (resumo.scrollTop > 0) { y0 = null; return; }
    d = Math.max(0, Math.min(110, (e.touches[0].clientY - y0) * 0.5));
    const m = marca();
    m.classList.remove('solto');
    m.style.setProperty('--puxar', d);
  }, { passive: true });
  resumo.addEventListener('touchend', () => {
    if (y0 === null) return;
    y0 = null;
    if (!el) return;
    el.classList.add('solto');
    if (d < 70) return el.style.setProperty('--puxar', 0);
    el.style.setProperty('--puxar', 70);
    el.classList.add('buscando');
    vibrar();
    Promise.resolve().then(buscar).catch(() => {}).finally(() => {
      el.classList.remove('buscando');
      el.style.setProperty('--puxar', 0);
    });
  }, { passive: true });
}

// Troca de aba com View Transition: o destaque e o título "viajam" de uma tela para a outra (estilo.css)
export function comTransicao(desenhar) {
  if (calmo.matches || !document.startViewTransition) return desenhar();
  document.startViewTransition(desenhar);
}
