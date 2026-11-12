// v9.9.14 — listas de escolha do próprio app no lugar da caixa nativa do Android (cinza, cobre a tela, fora do
// desenho Brasa; Bruno, 11/11/2026). Vale para todo <select class="campo"> e <select class="pn-select">, onde quer que
// apareça (folhas e telas), sem mexer em quem os usa: o <select> fica no lugar, invisível por baixo do botão — o código
// que lê `.value` e ouve "change" continua igual, e o `required` do formulário segue avisando.
const SELETOR = 'select.campo, select.pn-select';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CERTO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// "Dólar (Index Cambial) · R$ 2.197,77" → nome à esquerda, valor miúdo à direita
const partes = t => { const [n, ...r] = t.split(' · '); return `<span>${esc(n)}</span>${r.length ? `<small>${esc(r.join(' · '))}</small>` : ''}`; };

function opcao(o) {
  if (o.disabled || o.value === '') return ''; // "Escolha…" fica só no botão
  return `<button type="button" role="option" class="escolha-op" data-v="${esc(o.value)}" aria-selected="${o.selected}">${partes(o.textContent)}${o.selected ? CERTO : ''}</button>`;
}

function montar(sel) {
  if (sel.dataset.escolha) return;
  sel.dataset.escolha = '1';
  const caixa = document.createElement('div');
  caixa.className = `lista-esc ${sel.classList.contains('campo') ? 'e-campo' : 'e-painel'}`;
  sel.before(caixa);
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = `${sel.classList.contains('campo') ? 'campo' : 'pn-select'} escolha-botao`;
  botao.setAttribute('aria-haspopup', 'listbox');
  botao.setAttribute('aria-expanded', 'false');
  const rotulo = sel.id && document.querySelector(`label[for="${CSS.escape(sel.id)}"]`)?.textContent;
  const lista = document.createElement('div');
  lista.className = 'escolha-opcoes';
  lista.setAttribute('role', 'listbox');
  if (rotulo || sel.getAttribute('aria-label')) lista.setAttribute('aria-label', rotulo || sel.getAttribute('aria-label'));
  lista.hidden = true;
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  caixa.append(botao, sel, lista);

  const atualizar = () => {
    botao.innerHTML = `<span>${esc(sel.selectedOptions[0]?.textContent || '')}</span>${SETA}`;
    botao.disabled = sel.disabled;
  };
  const fechar = () => { lista.hidden = true; botao.setAttribute('aria-expanded', 'false'); };
  const abrir = () => {
    lista.innerHTML = [...sel.children].map(n => (n.tagName === 'OPTGROUP'
      ? `<p class="escolha-grupo">${esc(n.label)}</p>${[...n.children].map(opcao).join('')}`
      : opcao(n))).join('');
    lista.hidden = false;
    botao.setAttribute('aria-expanded', 'true');
    lista.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    requestAnimationFrame(() => lista.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  };
  botao.addEventListener('click', () => (lista.hidden ? abrir() : fechar()));
  lista.addEventListener('click', e => {
    const b = e.target.closest('.escolha-op');
    if (!b) return;
    fechar();
    if (sel.value === b.dataset.v) return;
    sel.value = b.dataset.v;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    botao.focus({ preventScroll: true });
  });
  caixa.addEventListener('keydown', e => { if (e.key === 'Escape' && !lista.hidden) { e.stopPropagation(); fechar(); botao.focus(); } });
  sel.addEventListener('change', atualizar);
  sel.addEventListener('invalid', () => botao.classList.add('escolha-invalida'));
  sel.addEventListener('change', () => botao.classList.remove('escolha-invalida'));
  caixa.fechar = fechar;
  atualizar();
}

const varrer = raiz => {
  if (raiz.matches?.(SELETOR)) montar(raiz);
  raiz.querySelectorAll?.(SELETOR).forEach(montar);
};

export function ligarEscolhas(raiz = document.body) {
  varrer(raiz);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) varrer(n); })))
    .observe(raiz, { childList: true, subtree: true });
  // tocar fora fecha a lista aberta
  document.addEventListener('pointerdown', e => {
    document.querySelectorAll('.lista-esc').forEach(c => { if (!c.contains(e.target)) c.fechar?.(); });
  }, true);
}
