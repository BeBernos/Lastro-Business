// v8 — interface nova (direção "Brasa", escolhida pelo Bruno em 28/10/2026). Padrão desde a v8.2; a anterior
// continua em menu → Avançado → "Interface nova" (desligar). Só muda aparência e movimento: as telas continuam as mesmas
// (telas.js/traduzir.js), então nada de número ou de lançamento depende daqui.
// Movimento: números que contam até o valor novo, telas que entram em cascata, deslizar o dedo entre
// as sub-abas, folhas com mola que fecham arrastando para baixo e vibração curta ao salvar.

const CHAVE = 'lastro-ui';
const calmo = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || { matches: true };
const vistos = new Map(); // último valor mostrado de cada número grande ("aba/sub#posição")

export const v8Ligada = () => document.documentElement.dataset.ui === 'v8';

// v9.4: a interface anterior (v7) saiu do app — a v8 vale sempre, mesmo com a chave antiga 'v7' salva
export function lerChaveV8() {
  try { localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ }
  document.documentElement.dataset.ui = 'v8';
  return true;
}

// carregando: esqueleto com a forma da tela no lugar do círculo girando
export const ESQUELETO = '<div class="app-conteudo v8-esqueleto" role="status" aria-label="Carregando"><i></i><i></i><i></i><i></i></div>';

export function vibrar(ms = 12) {
  if (!v8Ligada()) return;
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
  if (!v8Ligada()) return;
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
  setTimeout(() => document.documentElement.style.removeProperty('--v8-lado'), 450); // só a troca pelo dedo vem do lado
}

// Deslizar o dedo entre as sub-abas (Visão geral ↔ Agenda ↔ Contas…). Não atrapalha o que rola para o lado
// (meses da projeção, tabelas largas) nem campos e controles.
export function ligarDeslizar(resumo, haFolha) {
  let x0 = null, y0 = 0;
  resumo.addEventListener('touchstart', e => {
    x0 = null;
    if (!v8Ligada() || haFolha() || e.touches.length !== 1) return;
    for (let el = e.target; el && el !== resumo; el = el.parentElement) {
      if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.classList?.contains('arrastavel') || el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible') return;
    }
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
  }, { passive: true });
  resumo.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
    const subs = [...resumo.querySelectorAll('.subabas [data-sub]')];
    const atual = subs.findIndex(b => b.classList.contains('on'));
    const alvo = subs[atual + (dx < 0 ? 1 : -1)];
    if (!alvo) return;
    document.documentElement.style.setProperty('--v8-lado', dx < 0 ? '1' : '-1');
    alvo.click();
  }, { passive: true });
}

// Folha: arrastar pela alça (ou pelo topo, com a folha rolada para cima) fecha
export function ligarArrastarFolha(folha, fechar) {
  let y0 = null, dy = 0;
  folha.addEventListener('pointerdown', e => {
    if (!v8Ligada() || folha.scrollTop > 0 || e.target.closest('input,select,textarea,button,a')) return;
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
    y0 = v8Ligada() && resumo.scrollTop <= 0 && e.touches.length === 1 && !haFolha() && !el?.classList.contains('buscando') ? e.touches[0].clientY : null;
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

// Troca de aba com View Transition: o destaque e o título "viajam" de uma tela para a outra (v8.css)
export function comTransicao(desenhar) {
  if (!v8Ligada() || calmo.matches || !document.startViewTransition) return desenhar();
  document.startViewTransition(desenhar);
}
