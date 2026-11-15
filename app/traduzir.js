// Tradutor do painel: converte os blocos que o painel do agente desenha em componentes do app.
//
// O painel (HTML do agente) roda escondido num iframe — ele é o motor. Aqui cada bloco dele
// (cartões, KPIs, alertas, tabelas, barras, agenda, simuladores) vira HTML no visual do app.
// Nada é recalculado: textos e números são os do painel. Um bloco novo que o agente criar
// aparece sozinho, traduzido pelo mesmo caminho genérico (classes conhecidas viram componentes
// do app; o resto vira texto).
//
// Controles interativos (botões, seletores, campos) levam `data-proxy` = seletor CSS do
// elemento original no painel; o app repassa o toque para lá e redesenha (app.js → proxy).
// Gráficos SVG do painel não são copiados: quem chama passa `trocas` (id → gráfico do app).

import { colunasDuplas, esc, icTom, svgIcone } from './graficos.js';

const tomDaClasse = cl => (cl.contains('crit') || cl.contains('red') || cl.contains('bad') ? 'ruim'
  : cl.contains('warn') || cl.contains('yellow') ? 'atencao'
    : cl.contains('ok') || cl.contains('green') || cl.contains('good') ? 'bom' : 'info');

// cor de texto do painel (classe red/green/yellow/dim ou style com var(--red)…) → classe do app
function corTexto(el) {
  const cl = el.classList;
  if (cl.contains('red')) return 'ruim';
  if (cl.contains('green')) return 'bom';
  if (cl.contains('yellow')) return 'atencao';
  if (cl.contains('dim') || cl.contains('muted')) return 'suave';
  const st = el.getAttribute('style') || '';
  if (/--red|--neg/.test(st)) return 'ruim';
  if (/--green|--pos/.test(st)) return 'bom';
  if (/--yellow|--amber|--warn/.test(st)) return 'atencao';
  if (/--muted|--dim/.test(st)) return 'suave';
  return '';
}

const limpo = s => s.replace(/\s+/g, ' ').trim();
// "- 1.598,21" (o painel tira o "R$" e sobra o espaço) → "−1.598,21"
const sinal = s => s.replace(/(^|>|\s)[-−]\s*(?=(R\$\s?)?\d)/g, '$1−'); // "- 1.598,21" e "-R$ 679,86" → sinal de menos
const soEmoji = el => el && el.tagName === 'DIV' && !el.children.length && /^[^\p{L}\p{N}]{1,4}$/u.test(el.textContent.trim());

// Seletor estável do elemento no painel: id; senão atributos data-* dentro do dono com id;
// senão o caminho por posição a partir do dono.
export function seletor(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const doc = el.ownerDocument;
  const dono = el.parentElement?.closest('[id]');
  const base = dono ? `#${CSS.escape(dono.id)} ` : '';
  const datas = [...el.attributes].filter(a => a.name.startsWith('data-')).map(a => `[${a.name}="${CSS.escape(a.value)}"]`).join('');
  if (datas) {
    const s = `${base}${el.tagName.toLowerCase()}${datas}`;
    if (doc.querySelectorAll(s).length === 1) return s;
  }
  const partes = [];
  for (let e = el; e && e !== dono && e.parentElement; e = e.parentElement) {
    partes.unshift(`${e.tagName.toLowerCase()}:nth-child(${[...e.parentElement.children].indexOf(e) + 1})`);
  }
  return (dono ? `#${CSS.escape(dono.id)} > ` : '') + partes.join(' > ');
}

function visivel(el, ctx) {
  if (el.hidden) return false;
  try {
    return ctx.win.getComputedStyle(el).display !== 'none';
  } catch {
    return true;
  }
}

function filhos(el, ctx) {
  return filhosDe(el.childNodes, ctx);
}
function filhosDe(nos, ctx) {
  let s = '';
  for (const no of nos) {
    if (no.nodeType === 3) s += esc(no.textContent);
    else if (no.nodeType === 1) s += tr(no, ctx);
  }
  return s;
}

// Texto longo: 3 linhas e "Ler mais" (o estado fica em ctx.abertos, como o das dobras).
const LIMITE_TEXTO = 170;
function texto(el, ctx, classe) {
  // texto com uma tabela dentro ("Leitura: … " + tabela mês a mês): só o texto antes da tabela é encurtado
  const nos = [...el.childNodes];
  const corte = nos.findIndex(n => n.nodeType === 1 && (n.matches('table, .tscroll') || n.querySelector('table')));
  const antes = corte > 0 ? nos.slice(0, corte) : nos;
  const depois = corte > 0 ? filhosDe(nos.slice(corte), ctx) : '';
  const html = filhosDe(antes, ctx).replace(/(\s*<br\s*\/?>\s*)+$/, '');
  const curto = limpo(antes.map(n => n.textContent).join('')).length <= LIMITE_TEXTO;
  if (curto || el.querySelector('button, input, select')) return corte > 0 ? `<p class="${classe}">${html}</p>${depois}` : `<p class="${classe}">${filhos(el, ctx)}</p>`;
  const chave = `txt:${seletor(el)}`;
  return `<div class="pn-longo${ctx.abertos.has(chave) ? ' aberto' : ''}" data-alternar="${esc(chave)}"><p class="${classe}">${html}</p><span class="pn-ler">Ler mais</span></div>${depois}`;
}

// Lista longa: mostra os primeiros itens e "Ver todos (N)". `extra` = linhas que não contam (cabeçalho).
function limitar(html, n, el, ctx, limite = 5, extra = 0) {
  if (n <= limite + 1 || temVerMaisDoPainel(el)) return html;
  const chave = `lista:${seletor(el)}`;
  return `<div class="pn-limite lim${limite + extra}${ctx.abertos.has(chave) ? ' aberto' : ''}">${html}
    <button type="button" class="pn-ver-mais" data-alternar="${esc(chave)}"><span class="mais">Ver todos (${n})</span><span class="menos">Mostrar menos</span></button></div>`;
}

// o próprio painel já corta a lista e traz um botão "ver as outras…" logo depois dela
const temVerMaisDoPainel = el => {
  for (let e = el; e && !e.matches('.card, section'); e = e.parentElement) {
    if (e.nextElementSibling?.tagName === 'BUTTON') return true;
  }
  return false;
};

function tr(el, ctx) {
  if (!visivel(el, ctx) || (ctx.pular && el.matches(ctx.pular))) return '';
  const troca = el.id && ctx.trocas[el.id];
  if (troca) {
    try {
      const html = troca(() => traduzirElemento(el, ctx), el);
      if (html !== null && html !== undefined) return html;
    } catch (e) {
      console.warn(`Gráfico do app indisponível (${el.id}):`, e);
    }
  }
  return traduzirElemento(el, ctx);
}

function traduzirElemento(el, ctx) {
  const t = el.tagName.toUpperCase();
  const cl = el.classList;
  if (/^(SCRIPT|STYLE|SVG|TEMPLATE|CANVAS|NOSCRIPT|IFRAME|IMG|H1)$/.test(t)) return '';
  if (cl.contains('legend') || cl.contains('section-heading') || cl.contains('dayhead') || cl.contains('collabels') || cl.contains('app-menu')) return '';
  if (cl.contains('card-title')) return `<div class="cartao-topo"><h2>${filhos(el, ctx)}</h2></div>`;
  if (cl.contains('card-sub')) return texto(el, ctx, 'cartao-sub');
  // destaque do painel da carteira (Renda: "Dividendo médio mensal"): rótulo, número, rodapé e etiquetas
  if (cl.contains('hero-eyebrow')) return `<p class="rotulo">${filhos(el, ctx)}</p>`;
  if (cl.contains('hero-big')) return `<p class="pn-grande">${esc(limpo(el.textContent))}</p>`;
  if (cl.contains('hero-foot')) return `<p class="cartao-sub">${filhos(el, ctx)}</p>`;
  if (cl.contains('hero-chips')) return `<div class="pn-etiquetas">${[...el.children].map(c => `<span class="pn-pill${c.classList.contains('good') ? ' bom' : ''}">${filhos(c, ctx)}</span>`).join('')}</div>`;
  if (cl.contains('note')) return texto(el, ctx, 'nota');
  if (cl.contains('kpis')) {
    // dentro de um cartão, até 6 indicadores ficam todos à vista (ex.: o mês escolhido na projeção)
    const n = el.querySelectorAll(':scope > .kpi').length;
    const html = `<div class="tiles">${filhos(el, ctx)}</div>`;
    return el.closest('.card') && n <= 6 ? html : limitar(html, n, el, ctx, 4);
  }
  if (cl.contains('minstrip') || cl.contains('simgrid')) return `<div class="tiles">${filhos(el, ctx)}</div>`;
  // grade solta de indicadores (sem o contêiner .kpis): também vira a grade de tiles do app
  if (el.children.length && [...el.children].every(c => c.classList.contains('kpi'))) return `<div class="tiles">${filhos(el, ctx)}</div>`;
  if (cl.contains('kpi')) return kpi(el, ctx);
  if (cl.contains('minstat') || cl.contains('simcell')) return celula(el, ctx);
  if (cl.contains('alerts') || (el.children.length > 2 && [...el.children].every(c => c.classList.contains('alert')))) {
    return limitar(`<div class="pn-alertas">${filhos(el, ctx)}</div>`, el.children.length, el, ctx, 4);
  }
  if (cl.contains('alert')) return alerta(el, ctx);
  if (cl.contains('callout')) return callout(el, ctx);
  if (cl.contains('acao')) return acao(el, ctx);
  if (t === 'TABLE') return tabela(el, ctx);
  if (cl.contains('barchart')) return barras(el, ctx);
  // linha numerada solta ("1º · Index Simples Selic…", ordem de saque): número à esquerda, texto à direita
  if (cl.contains('barrow') && !el.querySelector('.bartrack')) return `<div class="pn-ordem">${[...el.children].map(c => `<div>${tr(c, ctx)}</div>`).join('')}</div>`;
  if (cl.contains('pctlabel')) { // no meio de uma frase fica na mesma linha ("Out/26 83 (atual). Subiu…")
    const emFrase = [...(el.parentElement?.childNodes || [])].some(n => n.nodeType === 3 && n.textContent.trim());
    return `<small class="pn-sub${emFrase ? ' em-linha' : ''}">${filhos(el, ctx)}</small>`;
  }
  if (cl.contains('cols')) return colunasDoPainel(el);
  if (el.id === 'dayList' || (ctx.secao === 'calendario' && el.querySelector(':scope > .dayrow'))) return agenda(el, ctx);
  if (cl.contains('dayrow')) return diaDaAgenda(el, ctx);
  if (cl.contains('pill')) return `<span class="pn-pill">${filhos(el, ctx)}</span>`;
  if (t === 'DETAILS') return dobra(el, ctx);
  if (el.children.length > 6 && [...el.children].every(c => c.tagName === 'DETAILS')) { // ex.: registro de mudanças
    return limitar(`<div class="pn-dobras">${filhos(el, ctx)}</div>`, el.children.length, el, ctx, 5);
  }
  if (t === 'SUMMARY') return '';
  if (cl.contains('secttl') || /^H[2-6]$/.test(t)) return `<p class="rotulo espaco">${filhos(el, ctx)}</p>`;
  if (cl.contains('p12scenario') || el.getAttribute('role') === 'tablist') {
    return `<div class="${el.children.length > 3 ? 'pn-rolagem' : 'segmento'}">${filhos(el, ctx)}</div>`;
  }
  if (t === 'BUTTON') return botao(el, ctx);
  if (t === 'SELECT') return seletorCampo(el);
  if (t === 'INPUT') return campo(el);
  if (t === 'TEXTAREA') return caixaTexto(el);
  if (t === 'LABEL') return `<label class="pn-campo">${filhos(el, ctx)}</label>`;
  if (cl.contains('simrow')) return `<div class="pn-campos">${filhos(el, ctx)}</div>`;
  if (cl.contains('desc')) return `<p>${filhos(el, ctx)}</p>`;
  if (t === 'BR') return '<br>';
  if (t === 'B' || t === 'STRONG') {
    const cor = corTexto(el);
    return `<b${cor ? ` class="${cor}"` : ''}>${filhos(el, ctx)}</b>`;
  }
  if (t === 'P') return texto(el, ctx, 'pn-p');
  if (t === 'UL' || t === 'OL') return `<${t.toLowerCase()} class="pn-lista">${filhos(el, ctx)}</${t.toLowerCase()}>`;
  if (t === 'LI') return `<li>${filhos(el, ctx)}</li>`;
  const cor = corTexto(el);
  if (t === 'DIV' || t === 'SECTION' || t === 'ARTICLE') return `<div${cor ? ` class="${cor}"` : ''}>${filhos(el, ctx)}</div>`;
  return cor ? `<span class="${cor}">${filhos(el, ctx)}</span>` : filhos(el, ctx);
}

function kpi(el, ctx) {
  const parte = c => el.querySelector(`:scope > .${c}`);
  const valor = parte('value');
  const crit = el.classList.contains('kpi-crit');
  return `<div class="tile${crit ? ' tom-ruim critico' : ''}">
    ${parte('label') ? `<p class="rotulo">${filhos(parte('label'), ctx)}</p>` : ''}
    ${valor ? `<p class="tile-valor ${corTexto(valor)}">${esc(sinal(limpo(valor.textContent)))}</p>` : ''}
    ${parte('foot') ? `<p class="tile-pe">${filhos(parte('foot'), ctx)}</p>` : ''}
  </div>`;
}

function celula(el, ctx) {
  const l = el.querySelector(':scope > .l'), v = el.querySelector(':scope > .v');
  const crit = el.classList.contains('crit');
  return `<div class="tile${crit ? ' tom-ruim critico' : ''}">
    ${l ? `<p class="rotulo">${filhos(l, ctx)}</p>` : ''}
    ${v ? `<p class="tile-valor ${corTexto(v)}">${esc(sinal(limpo(v.textContent)))}</p>` : ''}
  </div>`;
}

function alerta(el, ctx) {
  const tom = tomDaClasse(el.classList);
  const partes = [...el.children].filter(c => !soEmoji(c));
  const corpo = partes.length === 1 && partes[0].tagName === 'DIV' ? filhos(partes[0], ctx) : partes.map(p => tr(p, ctx)).join('');
  return `<div class="pn-alerta tom-${tom}">${icTom(tom)}<div>${corpo}</div></div>`;
}

function callout(el, ctx) {
  const tom = tomDaClasse(el.classList);
  let corpo = '';
  for (const no of el.childNodes) {
    if (no.nodeType === 3) corpo += esc(no.textContent);
    else if (no.nodeType === 1) corpo += no.classList.contains('h') ? `<b class="pn-h">${filhos(no, ctx)}</b>` : tr(no, ctx);
  }
  return `<div class="pn-callout tom-${tom}">${icTom(tom === 'info' ? 'ideia' : tom)}<div>${corpo}</div></div>`;
}

function acao(el, ctx) {
  const tom = tomDaClasse(el.classList);
  const parte = c => el.querySelector(`.${c}`);
  return `<div class="cartao acao tom-${tom === 'info' ? 'bom' : tom}">
    <div class="acao-ic">${svgIcone('ideia')}</div>
    <div class="acao-txt">
      <p class="rotulo">${parte('acao-eyebrow') ? esc(limpo(parte('acao-eyebrow').textContent)) : 'Próxima ação'}</p>
      ${parte('acao-title') ? `<h3>${filhos(parte('acao-title'), ctx)}</h3>` : ''}
      ${parte('acao-body') ? `<p>${filhos(parte('acao-body'), ctx)}</p>` : ''}
    </div>
  </div>`;
}

// Tabela: 2 colunas viram linhas "rótulo … valor"; mais colunas viram um cartãozinho por linha
// (primeira célula como título, as outras em pares rótulo/valor) — cabe na tela do celular.
function tabela(el, ctx) {
  const cab = [...el.querySelectorAll('thead th')].map(th => limpo(th.textContent));
  const linhas = [...el.querySelectorAll('tr')].filter(tr => !tr.closest('thead') && tr.querySelector('td'));
  if (!linhas.length) return '';
  const ncol = Math.max(...linhas.map(l => l.children.length));
  const celula = td => {
    const cor = corTexto(td);
    return { html: sinal(filhos(td, ctx)), cor };
  };
  if (ncol <= 2) {
    return limitar(`<ul class="linhas pn-tabela">${linhas.map(l => {
      const [a, b] = [...l.children].map(celula);
      return `<li class="${l.classList.contains('total') ? 'total' : ''}"><span class="${a.cor}">${a.html}</span>${b ? `<b class="${b.cor}">${b.html}</b>` : ''}</li>`;
    }).join('')}</ul>`, linhas.length, el, ctx, 6);
  }
  // tabela compacta só quando as colunas de valor são curtas (números); texto longo vira cartãozinho
  const larguraValores = Array.from({ length: ncol - 1 }, (_, i) => Math.max(...linhas.map(l => limpo(l.children[i + 1]?.textContent || '').length)));
  const compacta = larguraValores.every(n => n <= 16) && larguraValores.reduce((a, b) => a + b, 0) <= 40;
  // v9.28: na interface nova não há tabela estreita — cada linha vira um item de lista (título + rótulo: valor), que cabe
  // no celular sem quebrar palavra ("CATEGORI / A") nem espremer números
  const v10 = typeof document !== 'undefined' && document.documentElement.classList.contains('v10');
  if (ncol <= 4 && compacta && !v10) { // tabela compacta: nome à esquerda, números alinhados à direita
    const colunas = `grid-template-columns:minmax(5.5em,1fr)${' auto'.repeat(ncol - 1)}`;
    // v9.9.6: com 3 colunas de valor, o "R$" repetido não cabia no celular com a fonte do Android maior (as colunas
    // encostavam e a última saía do cartão) — tira o "R$" das células e diminui um pouco a letra
    const larga = ncol >= 4, semRS = h => (larga ? h.replace(/R\$\s?/g, '') : h);
    // uma grade só para a tabela (as linhas usam subgrid): cabeçalho e números ficam nas mesmas colunas
    const cabeca = cab.length ? `<div class="pn-tab-l pn-tab-cab">${cab.slice(0, ncol).map(c => `<span>${esc(c)}</span>`).join('')}</div>` : '';
    return limitar(`<div class="pn-tab${larga ? ' pn-tab-larga' : ''}" style="${colunas}">${cabeca}${linhas.map(l => `<div class="pn-tab-l${l.classList.contains('total') ? ' total' : ''}">${[...l.children].map(celula).map(c => `<span class="${c.cor}">${semRS(c.html)}</span>`).join('')}</div>`).join('')}</div>`, linhas.length, el, ctx, 5, cabeca ? 1 : 0);
  }
  return limitar(`<ul class="pn-registros${ncol <= 4 ? ' poucas' : ''}">${linhas.map(l => {
    const tds = [...l.children];
    const [primeira, ...resto] = tds.map(celula);
    const rotulo = (td, i) => td.getAttribute('data-l') || cab[i] || '';
    return `<li class="${l.classList.contains('total') ? 'total' : ''}">
      <p class="pn-reg-titulo ${primeira.cor}">${primeira.html}</p>
      <dl>${resto.map((c, i) => c.html.trim() ? `<div><dt>${esc(rotulo(tds[i + 1], i + 1))}</dt><dd class="${c.cor}">${c.html}</dd></div>` : '').join('')}</dl>
    </li>`;
  }).join('')}</ul>`, linhas.length, el, ctx, 3);
}

// o painel mostra o código da categoria quando não tem nome para ela ("familia", "transporte")
const NOMES_CODIGO = { familia: 'Família', educacao: 'Educação', alimentacao: 'Alimentação', saude: 'Saúde', juridico: 'Jurídico', bonus: 'Bônus', extraordinaria: 'Extraordinária', investimento: 'Investimento', pet: 'Pet' };
const nomeBonito = s => (/^[a-z][a-z_]*$/.test(s) ? NOMES_CODIGO[s] || s[0].toUpperCase() + s.slice(1).replace(/_/g, ' ') : s);

function barras(el, ctx) {
  // uma cor só por gráfico (as cores do painel variam sem significado fixo); cinza para o que o painel apaga
  const corBarra = f => (f.classList.contains('dim') ? 'suave' : '');
  const linhas = [...el.querySelectorAll(':scope > .barrow')];
  return limitar(`<ul class="barrash">${linhas.map(l => {
    const [rot, , val] = l.children;
    const fill = l.querySelector('.barfill');
    const largura = parseFloat(fill?.style.width) || 0;
    const pct = val?.querySelector('.pctlabel');
    const valor = val ? sinal(limpo([...val.childNodes].filter(n => n !== pct).map(n => n.textContent).join(''))) : '';
    const rotulo = rot ? nomeBonito(limpo(rot.textContent)) : '';
    const dica = l.getAttribute('title') || `${rotulo}: ${valor}${pct ? ` (${limpo(pct.textContent)})` : ''}`;
    return `<li data-dica="${esc(dica)}">
      <div class="bh-topo"><span>${esc(rotulo)}</span><b>${esc(valor)}${pct ? ` <small>${esc(limpo(pct.textContent))}</small>` : ''}</b></div>
      <div class="bh-trilho"><i class="${fill ? corBarra(fill) : ''}" style="width:${Math.max(1, Math.min(100, largura)).toFixed(1)}%"></i></div>
    </li>`;
  }).join('')}</ul>`, linhas.length, el, ctx, 6);
}

// Colunas agrupadas do painel (receitas × despesas): lê os valores do title de cada barra
// ("Receitas R$ 11.541,74") e os nomes dos meses do bloco de rótulos ao lado.
const numeroBR = s => Number(String(s).replace(/[^\d,-]/g, '').replace(',', '.'));
function colunasDoPainel(el) {
  const rotulos = [...(el.nextElementSibling?.classList.contains('collabels') ? el.nextElementSibling.querySelectorAll('.collabel') : [])].map(r => limpo(r.textContent));
  const grupos = [...el.querySelectorAll('.colgroup')].map((g, i) => ({
    rotulo: rotulos[i] || String(i + 1),
    valores: [...g.querySelectorAll('.colbar')].map(b => ({ nome: limpo((b.title || '').replace(/R\$.*$/, '')), valor: numeroBR((b.title || '').replace(/^[^R]*/, '')) })),
  }));
  if (!grupos.length) return '';
  const nomes = grupos[0].valores.map(v => v.nome || '');
  return `${colunasDuplas(grupos)}
    <ul class="legenda horizontal">${nomes.map((nm, i) => `<li><i class="s${i + 1}"></i>${esc(nm)}</li>`).join('')}</ul>`;
}

// Agenda do mês: começa em hoje; os dias que já passaram ficam numa dobra no topo.
function agenda(el, ctx) {
  let dia = 0;
  const passados = [], proximos = [];
  for (const linha of el.children) {
    if (!linha.classList.contains('dayrow')) {
      (dia && dia >= (ctx.diaHoje || 0) ? proximos : passados).push(tr(linha, ctx));
      continue;
    }
    const n = parseInt(linha.querySelector('.daynum')?.textContent, 10);
    if (n) dia = n;
    (ctx.diaHoje && dia < ctx.diaHoje ? passados : proximos).push(diaDaAgenda(linha, ctx));
  }
  if (!passados.length || !proximos.length) return `<div class="pn-agenda">${passados.join('')}${proximos.join('')}</div>`;
  const chave = `agenda:${seletor(el)}`;
  return `<div class="pn-agenda">
    <details class="pn-passados" data-chave="${esc(chave)}"${ctx.abertos.has(chave) ? ' open' : ''}>
      <summary>Dias anteriores · ${passados.length} ${passados.length === 1 ? 'lançamento' : 'lançamentos'}</summary>
      ${passados.join('')}
    </details>
    <p class="rotulo pn-hoje">De hoje em diante</p>
    ${proximos.join('')}
  </div>`;
}

function diaDaAgenda(el, ctx) {
  const num = el.querySelector('.daynum');
  const dow = num?.querySelector('.dow');
  const numero = num ? limpo([...num.childNodes].filter(n => n !== dow).map(n => n.textContent).join('')) : '';
  const dsc = el.querySelector('.dsc'), amt = el.querySelector('.amt'), bal = el.querySelector('.bal');
  const saldo = bal ? limpo(bal.textContent) : '';
  const cls = ['pn-dia', numero ? '' : 'cont', el.classList.contains('ispaid') ? 'pago' : '', el.classList.contains('isneg') ? 'neg' : ''].join(' ');
  const valor = amt ? limpo(amt.textContent) : '';
  // nome à esquerda; o botão pago/a pagar vai para a coluna do valor (entrada: "recebido/a receber")
  let nome = '', botoes = '';
  for (const no of dsc ? dsc.childNodes : []) {
    if (no.nodeType === 3) nome += esc(no.textContent);
    else if (no.nodeType === 1 && no.tagName === 'BUTTON') botoes += tr(no, ctx);
    else if (no.nodeType === 1) nome += `<small>${tr(no, ctx)}</small>`;
  }
  if (valor.startsWith('+')) botoes = botoes.replace(/>a pagar</g, '>a receber<').replace(/>pago</g, '>recebido<');
  // v7.7: tocar no nome abre a conta guardada (lista|posição do botão pago/a pagar); sem botão = o painel calcula sozinho
  const tg = dsc?.querySelector('.tg[data-k]');
  const texto = limpo([...(dsc?.childNodes || [])].filter(n => n.nodeType === 3).map(n => n.textContent).join(''));
  const alvo = tg ? ` data-agenda-item="${esc(tg.dataset.k)}|${esc(tg.dataset.i)}"` : valor && texto ? ` data-agenda-calc="${esc(texto)}"` : '';
  return `<div class="${cls}">
    <div class="pn-dia-n">${numero ? `<b>${esc(numero)}</b><span>${dow ? esc(limpo(dow.textContent)) : ''}</span>` : ''}</div>
    ${alvo ? `<button type="button" class="pn-dia-d pn-dia-abrir"${alvo}>${nome}</button>` : `<div class="pn-dia-d">${nome}</div>`}
    <div class="pn-dia-v">${valor ? `<b class="${corTexto(amt) === 'bom' ? 'bom' : ''}">${esc(valor)}</b>` : ''}${botoes}${saldo ? `<small class="${corTexto(bal.querySelector('span') || bal)}">saldo ${esc(saldo)}</small>` : ''}</div>
  </div>`;
}

function dobra(el, ctx) {
  const chave = seletor(el);
  const sum = el.querySelector(':scope > summary');
  let titulo = '', extra = '';
  if (sum) {
    const partes = [...sum.children].filter(c => !c.classList.contains('arw-wrap') && !/^(ver|ver mais|abrir)$/i.test(limpo(c.textContent)));
    if (!partes.length) titulo = esc(limpo(sum.textContent));
    else {
      titulo = filhos(partes[0], ctx);
      extra = partes.slice(1).map(p => filhos(p, ctx)).join(' ');
    }
  }
  let corpo = '';
  for (const no of el.childNodes) {
    if (no === sum) continue;
    if (no.nodeType === 3) corpo += esc(no.textContent);
    else if (no.nodeType === 1) corpo += tr(no, ctx);
  }
  return `<details class="dobra pn-dobra" data-chave="${esc(chave)}"${ctx.abertos.has(chave) ? ' open' : ''}>
    <summary><span class="pn-dobra-t">${titulo}${extra.trim() ? `<small>${extra}</small>` : ''}</span></summary>
    <div class="pn-dobra-c">${corpo}</div>
  </details>`;
}

function botao(el, ctx) {
  const cl = el.classList;
  const ligado = cl.contains('on') || el.getAttribute('aria-selected') === 'true';
  let classe = 'botao-sec pn-botao';
  // agenda pago/a pagar: o app transforma o toque em lançamento de verdade (lista e posição do item no painel)
  let conta = '';
  if (cl.contains('tg')) {
    classe = `pn-tg ${cl.contains('pago') ? 'pago' : 'aberto'}`;
    if (el.dataset.k) conta = ` data-agenda="${esc(el.dataset.k)}|${esc(el.dataset.i)}"`;
  }
  else if (el.closest('.p12scenario,[role="tablist"]')) classe = `pn-opcao${ligado ? ' on' : ''}${cl.contains('neg') ? ' neg' : ''}`;
  const rotulo = el.getAttribute('aria-label');
  return `<button type="button" class="${classe}" data-proxy="${esc(seletor(el))}"${conta}${rotulo ? ` aria-label="${esc(rotulo)}"` : ''}${ligado ? ' aria-pressed="true"' : ''}>${filhos(el, ctx)}</button>`;
}

function seletorCampo(el) {
  const opcoes = [...el.options].map(o => `<option value="${esc(o.value)}"${o.selected ? ' selected' : ''}>${esc(limpo(o.textContent))}</option>`).join('');
  const rotulo = el.getAttribute('aria-label');
  return `<select class="pn-select" data-proxy="${esc(seletor(el))}"${rotulo ? ` aria-label="${esc(rotulo)}"` : ''}>${opcoes}</select>`;
}

function campo(el) {
  const tipo = ['number', 'text', 'search', 'tel'].includes(el.type) ? el.type : 'text';
  const attrs = ['inputmode', 'placeholder', 'min', 'max', 'step', 'aria-label']
    .filter(a => el.hasAttribute(a)).map(a => ` ${a}="${esc(el.getAttribute(a))}"`).join('');
  return `<input class="campo pn-input" type="${tipo}"${attrs} value="${esc(el.value)}" data-proxy="${esc(seletor(el))}">`;
}

function caixaTexto(el) {
  return `<div class="pn-exportar">
    <textarea class="pn-exp" readonly aria-label="${esc(el.getAttribute('aria-label') || 'Texto')}">${esc(el.value)}</textarea>
    <div class="pn-acoes"><button type="button" class="botao-sec" data-copiar>Copiar</button><button type="button" class="botao-sec" data-baixar>Baixar arquivo</button></div>
  </div>`;
}

// ---------- blocos ----------
// Cada bloco de primeiro nível de cada seção do painel: { secao, titulo, tipo, html }.
const BLOCO = '.card,.kpis,.callout,.acao,details,.alerts,table';

// Explicações fixas (não mudam de um mês para o outro) vão para o "Entenda", no fim da sub-aba.
// (avisos com título "Como …" e o cartão de regras da agenda)
const ehExplicacao = (tipo, titulo) => (tipo === 'callout' && /^(como |por que isto existe)/i.test(titulo)) || (tipo === 'card' && /^padrão de vencimentos/i.test(titulo));

function bloco(el, secao, ctx) {
  ctx.secao = secao;
  const tipo = el.matches('.card') ? 'card' : el.matches('.kpis') ? 'kpis' : el.matches('.callout') ? 'callout' : el.matches('.acao') ? 'acao' : 'outro';
  const titulo = limpo(el.querySelector(':scope > .card-title')?.textContent || (tipo === 'callout' ? el.querySelector('.h')?.textContent || '' : ''));
  let html;
  if (tipo === 'card') html = `<section class="cartao pn-cartao">${filhos(el, ctx)}</section>`;
  else if (tipo === 'kpis') html = `<section class="pn-solto">${tr(el, ctx)}</section>`;
  else if (tipo === 'callout' || tipo === 'acao') html = tr(el, ctx);
  else html = `<section class="cartao pn-cartao">${tr(el, ctx)}</section>`;
  const explicacao = ehExplicacao(tipo, titulo);
  let corpo = '';
  if (explicacao) {
    for (const no of el.childNodes) {
      if (no.nodeType === 3) corpo += esc(no.textContent);
      else if (no.nodeType === 1 && !no.matches('.card-title, .h')) corpo += tr(no, ctx);
    }
  }
  return { secao, titulo, tipo, html, explicacao, corpo };
}

// Peças soltas (fora de cartões) vizinhas viram um cartão só; um título solto ("Por ativo",
// "Mês a mês") vira o título do cartão que vem logo depois dele.
const pareceTitulo = els => els.length <= 2 && limpo(els.map(e => e.textContent).join(' ')).length <= 60
  && !els.some(e => e.querySelector('table, ul, ol, .kpi, button, input, select'));

function grupo(els, secao, ctx) {
  ctx.secao = secao;
  const html = els.map(e => tr(e, ctx)).join('');
  const titulo = els[0].matches('.card-title, .eyebrow, .secttl, h3') ? limpo(els[0].textContent) : '';
  return { secao, titulo, tipo: 'grupo', html: `<section class="cartao pn-cartao">${html}</section>`, explicacao: false, corpo: '' };
}

function comTitulo(b, titulo, legenda = '') {
  if (!titulo || /class="cartao-topo"/.test(b.html.slice(0, 200))) return b;
  const sub = legenda ? `<p class="cartao-sub">${esc(legenda)}</p>` : '';
  return { ...b, titulo: b.titulo || titulo, html: b.html.replace(/^(\s*<section[^>]*>)/, `$1<div class="cartao-topo"><h2>${esc(titulo)}</h2></div>${sub}`) };
}

// prefixo: separa as seções de painéis diferentes (a carteira usa "c-": c-visao, c-aloc…).
// fonte: marca os blocos com data-fonte, para o app repassar os toques ao painel certo.
// pular: seletor de peças que o app já mostra do jeito dele (não entram na tradução).
export function blocosDoPainel(doc, { trocas = {}, abertos = new Set(), diaHoje = 0, prefixo = '', fonte = '', pular = '' } = {}) {
  const ctx = { win: doc.defaultView, trocas, abertos, diaHoje, pular };
  const out = [];
  for (const sec of doc.querySelectorAll('section.panel')) {
    const secao = prefixo + sec.id.replace(/^panel-/, '');
    const visitar = pai => {
      let soltos = [];
      let titulo = '';
      let legenda = '';
      let esperando = null; // título + legenda ("Fonte: …") à espera do cartão seguinte
      const soltarEsperando = () => { if (esperando) out.push(grupo(esperando, secao, ctx)); esperando = null; legenda = ''; };
      const fechar = () => {
        if (!soltos.length) return;
        soltarEsperando();
        // título + uma linha de legenda logo antes de um cartão: os dois vão para o cartão
        if (soltos.length === 2 && soltos[0].matches('.card-title, .eyebrow, .secttl, h3') && soltos[1].matches('.pill, .note, .sub')
          && limpo(soltos[0].textContent).length <= 60 && !soltos[1].querySelector('table, ul, ol, button, input, select')) {
          titulo = limpo(soltos[0].textContent); legenda = limpo(soltos[1].textContent); esperando = soltos; soltos = [];
          return;
        }
        // o último solto curto ("Mês a mês") é o título do bloco seguinte, não do grupo anterior
        let proximoTitulo = '';
        if (soltos.length > 1 && pareceTitulo(soltos.slice(-1))) proximoTitulo = limpo(soltos.pop().textContent);
        if (pareceTitulo(soltos)) titulo = limpo(soltos.map(e => e.textContent).join(' '));
        else {
          out.push(grupo(soltos, secao, ctx));
          titulo = '';
        }
        if (proximoTitulo) titulo = proximoTitulo;
        soltos = [];
      };
      for (const el of pai.children) {
        if (!visivel(el, ctx) || el.matches('h1,h2,summary,script,style,svg') || (pular && el.matches(pular))) continue;
        try {
          const temBloco = !el.matches(BLOCO) && !!el.querySelector(BLOCO);
          // dobra que só agrupa cartões ("Histórico de faturas"…): cada cartão vira um bloco
          if ((el.matches('details') && el.querySelector('.card')) || (temBloco && !el.matches('p'))) {
            fechar();
            soltarEsperando();
            titulo = '';
            visitar(el); // contêineres (grid2, #acaoBox…)
          } else if (el.matches(BLOCO)) {
            fechar();
            const b = bloco(el, secao, ctx);
            if (esperando && /class="cartao-topo"/.test(b.html.slice(0, 200))) { soltarEsperando(); titulo = ''; } // cartão já tem título: a legenda fica no próprio cartão
            out.push(comTitulo(b, titulo, legenda));
            titulo = ''; legenda = ''; esperando = null;
          } else if (el.textContent.trim() || (el.id && ctx.trocas[el.id])) soltos.push(el);
        } catch (e) {
          console.warn('Bloco do painel não traduzido:', e);
        }
      }
      fechar();
      soltarEsperando();
    };
    visitar(sec);
  }
  const marcados = fonte ? out.map(b => ({ ...b, html: b.html.replace(/^\s*<(\w+)/, `<$1 data-fonte="${fonte}"`) })) : out;
  return marcados.filter(b => b.html.replace(/<[^>]*>/g, '').trim());
}

// Um trecho solto do painel (ex.: a checagem do documento de atualização da carteira)
export function traduzirFragmento(el) {
  return filhos(el, { win: el.ownerDocument.defaultView, trocas: {}, abertos: new Set(), diaHoje: 0 });
}
