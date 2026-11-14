// Peças de tela usadas no app inteiro (saíram do app.js em 14/11/2026): formatação, ícones do menu, aviso flutuante,
// esconder os valores, folha inferior, confirmação e a pergunta "de quando vale". Não importa nada do app.js: o que a
// folha precisa saber do app (estado do histórico e o menu) chega por configurarFolha, chamado uma vez pelo app.js.
import { vibrar } from './v8.js';

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- formatação ----------
export const dataCurta = iso => (iso ? iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/') : '?');
export const dataHora = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às');

export const ICONES = {
  engrenagem: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  atualizar: '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  importar: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  publicar: '<path d="M7 17.5h-.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.5 8a4 4 0 0 1 .5 8M12 20v-8m0 0-3 3m3-3 3 3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  instalar: '<rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M12 7v7m0 0-2.5-2.5M12 14l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  github: '<path d="M9 19c-4 1.3-4-2-5.5-2.5M14.5 21v-3.4c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.1 2.9 5.1 3.2 5.1 3.2a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 3.7 9.6c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  sair: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  chave: '<circle cx="8" cy="15" r="4.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M11.3 11.7 20 3m-3.5 3.5 2.5 2.5M14 9l2 2" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  resumo: '<path d="M4 12h4l2.5-6 3 12 2.5-6H20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  sino: '<path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  cadeado: '<rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  mais: '<path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  olho: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.9"/>',
  documento: '<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z M14 3.5V8h4M9.5 12.5h5M9.5 16h5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>',
  ordem: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ajuda: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.3-.9.8-.9 1.4v.6M12 16.8v.01" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  subir: '<path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  descer: '<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  ideia: '<path d="M9 18h6M10 21h4M8 14.5a5.5 5.5 0 1 1 8 0c-.9.9-1.4 1.7-1.4 2.7H9.4c0-1-.5-1.8-1.4-2.7z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  novidade: '<path d="M12 3.5l2.3 5.2 5.2 2.3-5.2 2.3L12 18.5l-2.3-5.2L4.5 11l5.2-2.3z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/>',
  enviar: '<path d="M20.5 3.5 3.5 10.5l7 3m10-10-7 17-3-7m10-10-10 10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  avisos: '<path d="M20 11.5V15a2.5 2.5 0 0 1-2.5 2.5H9.5L5 21V7a2.5 2.5 0 0 1 2.5-2.5H13" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18.5" cy="5.5" r="2.6" fill="currentColor"/>',
  lupa: '<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="m15 15 5 5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>',
  etiqueta: '<path d="M3.5 12V4.5a1 1 0 0 1 1-1H12l8.4 8.4a1.5 1.5 0 0 1 0 2.1l-6.4 6.4a1.5 1.5 0 0 1-2.1 0Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8" cy="8" r="1.4" fill="currentColor"/>',
  menu: '<circle cx="12" cy="5.5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="18.5" r="1.7"/>',
};
export const icone = nome => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome]}</svg>`;

// ---------- aviso flutuante ----------
let timerAviso;
// texto: frase simples ou { titulo, detalhe }. tom: '' (neutro) | 'ok' | 'erro' | 'carregando'.
// Trocar o aviso já aberto (carregando → ok) atualiza no lugar, sem piscar.
const IC_AVISO = {
  ok: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".18"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  erro: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor" opacity=".22"/><path d="M12 7v6m0 3.5v.01" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  carregando: '<span class="gira-p" aria-hidden="true"></span>',
};
export function aviso(texto, { acao, erro = false, fixo = false, duracao = 4500, tom = '' } = {}) {
  const el = $('aviso');
  clearTimeout(timerAviso);
  const t = erro ? 'erro' : tom;
  const continua = !el.hidden && el.dataset.tom === 'carregando';
  el.className = `aviso${t ? ` ${t}` : ''}${continua ? ' sem-anim' : ''}`;
  el.dataset.tom = t;
  const corpo = typeof texto === 'object' && texto
    ? `<span class="aviso-txt"><b>${esc(texto.titulo)}</b>${texto.detalhe ? `<small>${esc(texto.detalhe)}</small>` : ''}</span>`
    : `<span class="aviso-txt">${esc(texto)}</span>`;
  el.innerHTML = `${IC_AVISO[t] || ''}${corpo}${acao ? `<button type="button" data-acao>${esc(acao.rotulo)}</button>` : ''}${t === 'carregando' ? '' : '<button type="button" class="x" aria-label="Fechar">×</button>'}`;
  mascarar(el);
  el.hidden = false;
  if (t === 'ok') vibrar();
  el.querySelector('.x')?.addEventListener('click', () => { el.hidden = true; });
  if (acao) el.querySelector('[data-acao]').onclick = () => { el.hidden = true; acao.fn(); };
  if (!fixo && t !== 'carregando') timerAviso = setTimeout(() => { el.hidden = true; }, duracao);
}
// ---------- v8.7: esconder os valores (olho no destaque do Início e no menu; vale para este celular) ----------
let esconderValores = (() => { try { return localStorage.getItem('lastro-esconder') === '1'; } catch { return false; } })();
document.documentElement.classList.toggle('esconder', esconderValores);
const RE_VALOR_BRL = /(R\$\s?)\d[\d.]*(?:,\d{2})?/g;
export function mascarar(raiz) {
  if (!raiz) return;
  raiz.querySelectorAll('[data-olho]').forEach(b => {
    b.setAttribute('aria-pressed', String(esconderValores));
    b.setAttribute('aria-label', esconderValores ? 'Mostrar os valores' : 'Esconder os valores');
  });
  if (!esconderValores) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue.includes('R$')) n.nodeValue = n.nodeValue.replace(RE_VALOR_BRL, '$1•••');
}
export const valoresEscondidos = () => esconderValores;
export function trocarEsconder() {
  esconderValores = !esconderValores;
  try { localStorage.setItem('lastro-esconder', esconderValores ? '1' : '0'); } catch { /* fica só nesta abertura */ }
  document.documentElement.classList.toggle('esconder', esconderValores);
}
export const fecharAvisoCarregando = () => { if ($('aviso').dataset.tom === 'carregando') $('aviso').hidden = true; };

// Confirmação no visual do app (a caixa padrão do navegador mostra o endereço do site e destoa de tudo).
// Devolve true/false. perigo: botão vermelho (excluir, apagar).
// manter: no "Cancelar" a folha fica aberta para quem chamou redesenhar a anterior (fechar e reabrir na hora brigaria
// com o "voltar" do histórico).
export function confirmar({ titulo, texto = '', sim = 'Confirmar', nao = 'Cancelar', perigo = false, manter = false }) {
  return new Promise(resolve => {
    let respondeu = false;
    const responder = v => { if (respondeu) return; respondeu = true; resolve(v); };
    const folha = abrirFolha(`
      <div class="confirmar">
        <h2>${esc(titulo)}</h2>
        ${texto ? `<p class="meta">${esc(texto)}</p>` : ''}
        <button type="button" class="btn ${perigo ? 'perigo-cheio' : 'prim'}" id="confSim">${esc(sim)}</button>
        <button type="button" class="btn" id="confNao">${esc(nao)}</button>
      </div>`);
    folha.querySelector('#confSim').onclick = () => { responder(true); fecharFolha(); };
    folha.querySelector('#confNao').onclick = () => { responder(false); if (!manter) fecharFolha(); };
    // fechou de outro jeito (voltar do Android, toque fora): é "não"
    const vigia = new MutationObserver(() => { if ($('veu').hidden || !folha.contains(folha.querySelector('#confSim'))) { vigia.disconnect(); responder(false); } });
    vigia.observe($('veu'), { attributes: true, attributeFilter: ['hidden'] });
    vigia.observe(folha, { childList: true });
  });
}

// v9.8.2: tirar algo que se repete pergunta SEMPRE de quando (pedido do Bruno: "só desse mês ou desse e dos próximos").
// Devolve a chave escolhida ('mes' | 'todos' | 'proximos') ou null.
export const ALCANCES_TIRAR = {
  mes: ['Só deste mês', 'Volta no mês que vem, como sempre.'],
  todos: ['Deste mês e dos próximos', 'Sai agora e não volta mais.'],
  proximos: ['Só dos próximos', 'Este mês fica como está; a partir do mês que vem, não volta.'],
};
export const ALCANCES_EDITAR = {
  mes: ['Só este mês', 'No mês que vem volta ao de antes.'],
  todos: ['Este mês e os próximos', 'Vale daqui para a frente.'],
  proximos: ['Só dos próximos', 'Este mês fica como estava.'],
};
export const ALCANCES_PARCELA = {
  mes: ['Só esta parcela', 'As próximas continuam como estavam.'],
  todos: ['Esta e as próximas parcelas', 'Vale para todas daqui para a frente.'],
  proximos: ['Só as próximas parcelas', 'Esta fica como estava.'],
};
export function escolherAlcance({ titulo, texto = '', opcoes = ['mes', 'todos', 'proximos'], detalhes = {}, manter = true, rotulos = ALCANCES_TIRAR }) {
  return new Promise(resolve => {
    let respondeu = false;
    const responder = v => { if (respondeu) return; respondeu = true; resolve(v); };
    const folha = abrirFolha(`
      <div class="confirmar alcance-tirar">
        <h2>${esc(titulo)}</h2>
        ${texto ? `<p class="meta">${esc(texto)}</p>` : ''}
        ${opcoes.map(k => `<button type="button" class="btn opcao-alcance${k === 'todos' && rotulos === ALCANCES_TIRAR ? ' perigo' : ''}" data-alcance="${k}"><b>${esc(rotulos[k][0])}</b><small>${esc(detalhes[k] || rotulos[k][1])}</small></button>`).join('')}
        <button type="button" class="btn" id="alcNao">Cancelar</button>
      </div>`);
    folha.querySelectorAll('[data-alcance]').forEach(b => { b.onclick = () => { responder(b.dataset.alcance); fecharFolha(); }; });
    folha.querySelector('#alcNao').onclick = () => { responder(null); if (!manter) fecharFolha(); };
    const vigia = new MutationObserver(() => { if ($('veu').hidden || !folha.contains(folha.querySelector('#alcNao'))) { vigia.disconnect(); responder(null); } });
    vigia.observe($('veu'), { attributes: true, attributeFilter: ['hidden'] });
    vigia.observe(folha, { childList: true });
  });
}

// ---------- folha inferior ----------
const ganchos = { historico: () => ({}), menu: { html: () => '', ligar: () => {} } };
export function configurarFolha({ historico, menu }) {
  if (historico) ganchos.historico = historico;
  if (menu) ganchos.menu = menu;
}
export function abrirFolha(conteudo, { classe = '' } = {}) {
  const veu = $('veu');
  const folha = $('folha');
  folha.className = `folha ${classe}`.trim();
  veu.classList.remove('saindo');
  folha.innerHTML = `<div class="alca"></div>${typeof conteudo === 'string' ? conteudo : ganchos.menu.html()}`;
  if (veu.hidden) {
    veu.hidden = false;
    history.pushState({ folha: true, ...ganchos.historico() }, ''); // "voltar" do Android fecha o menu
  }
  if (typeof conteudo !== 'string') ganchos.menu.ligar(folha);
  // v8.7 (acessibilidade): a folha se chama pelo título dela e o leitor de tela começa por ela, sem abrir o teclado
  const titulo = folha.querySelector('h2');
  if (titulo) {
    titulo.id = 'folhaTitulo';
    folha.setAttribute('aria-labelledby', 'folhaTitulo');
  }
  folha.tabIndex = -1;
  mascarar(folha);
  requestAnimationFrame(() => { if (!folha.contains(document.activeElement)) folha.focus({ preventScroll: true }); });
  return folha;
}

export function fecharFolha() {
  if ($('veu').hidden) return;
  // v9.9.12: o menu do "+" também sai com movimento (as opções descem e somem), como entra
  const f = $('folha');
  if (f.classList.contains('folha-discar') && !f.classList.contains('saindo') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    f.classList.add('saindo'); $('veu').classList.add('saindo');
    return void setTimeout(() => { if (f.classList.contains('saindo')) fecharFolha(); else $('veu').classList.remove('saindo'); }, 190);
  }
  $('veu').classList.remove('saindo');
  $('veu').hidden = true;
  if (history.state?.folha) history.back();
}
