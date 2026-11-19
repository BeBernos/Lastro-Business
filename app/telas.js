// Telas do app (Início, Mês, Cartão, Futuro, Análises), montadas a partir do motor (resumo.js).
// Funções puras: recebem os números e devolvem HTML. Cada seção é isolada — se faltar algum
// dado nesta versão do painel, a seção simplesmente não aparece.

import { anel, barrasH, brl, brl0, colunas, compacto, empilhada, esc, icTom, linhaSaldo, linhas, medidor, minilinha, svgIcone } from './graficos.js';
import { contexto, proximasContas } from './resumo.js';
import { faixasDoHoje, htmlComposicaoV10, htmlHojeV10, saudeCarteira } from './v10.js';
import { acoesCv, areaCv, barrasAlvoCv, blocoCv, carrosselCv, CHECK, colunasCv, cartaoCv, codigoAtivo, diaCv, linhaCv, linkCv, listaCv, numerosCv, secaoCv, tudoDoPainelCv, variacaoCv } from './carvao.js';
import { blocosDoPainel } from './traduzir.js';
import { mesBonito } from './painel.js';
import { posicao, proximoPasso, reserva } from './carteira.js';
import { adivinharCategoria, categoriaDoItem, iconeCategoria, nomeCategoria } from './categorias.js';
import { dolarizacao, listaAtivos, nomeAtivo, planoDoMes, resultadoDoMes } from './investimentos.js';
import { CATEGORIAS_RECEITA, hojeBrasil, LISTAS_CAIXA, tickerDividendo } from './lancamentos.js';
import { composicaoFatura, gastoDoDia, resumoSemana } from './extrato.js';
import { alertasPlano, alocacaoVsAlvo, rendimentoRendaFixa } from './estrategia.js';
import { gatilhos, INDICADORES, pausa, textoItem } from './ficha.js';
import { prazoResgate } from './liquidez.js';
import { escada } from './rendafixa.js';
import { agendaClaude, aportePlanejado, dolarMesAMes, mesCurto, orcamentoDoMes, progressoMetas, rendaPassiva, resumoMeses } from './indicadores.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES3 = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad = n => String(n).padStart(2, '0');
const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
// "Salário — 1ª parcela (adiantamento)" -> "Salário — 1ª parcela"
const nomeCurto = d => String(d).replace(/\s*\([^)]*\)/g, '').trim();
const tomValor = v => (v < 0 ? 'ruim' : '');

export const ABAS = [
  { id: 'inicio', nome: 'Início', icone: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>' },
  { id: 'mes', nome: 'Caixa', icone: '<path d="M5 7.5V6.5A2 2 0 0 1 7 4.5h10"/><rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M15.5 13.5h2"/>' },
  { id: 'cartao', nome: 'Cartão', icone: '<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>' },
  { id: 'carteira', nome: 'Carteira', icone: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.6a8.5 8.5 0 0 1 5.4 5.4H15z"/>' },
  { id: 'analises', nome: 'Análises', icone: '<path d="M12 3.5l2.3 5.2 5.2 2.3-5.2 2.3L12 18.5l-2.3-5.2L4.5 11l5.2-2.3z"/>' },
];

const ICONE_IDEIA = '<path d="M9 18h6M10 21h4M8 14.5a5.5 5.5 0 1 1 8 0c-.9.9-1.4 1.7-1.4 2.7H9.4c0-1-.5-1.8-1.4-2.7z"/>';
const svg = (d, cls = '') => svgIcone(d, cls);

const secao = fn => {
  try {
    return fn() || '';
  } catch (e) {
    console.warn('Seção do app indisponível:', e);
    return '';
  }
};
const linha = (rotulo, valor, cls = '') => `<li><span>${rotulo}</span><b class="${cls}">${valor}</b></li>`;
const chip = (tom, texto) => `<span class="chip tom-${tom}">${icTom(tom)}${texto}</span>`;

// ---------- topo e navegação ----------
export function frescor(dados, agora = new Date()) {
  const ctx = contexto(dados, agora);
  const [a, m, d] = (dados.ultimaAtualizacao || '').split('-').map(Number);
  if (ctx.mesPassou) return { texto: `Dados de ${MESES[ctx.mes - 1]} — falta atualizar o mês novo`, alerta: true };
  const dias = Math.floor((agora - new Date(a, m - 1, d)) / 86400000);
  const quando = dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`;
  return { texto: `Atualizado ${quando} · ${pad(d)}/${pad(m)}`, alerta: dias > 3 };
}

// lancar: botão "+" (lançar gasto) no celular de quem publica (Fase 1)
export function htmlTopo(aba, dados, { lancar = false, agora = new Date() } = {}) {
  const ctx = contexto(dados, agora);
  const f = frescor(dados, agora);
  const titulo = aba === 'inicio' ? maiuscula(MESES[ctx.mes - 1]) : ABAS.find(a => a.id === aba).nome;
  // v8.5: topo compacto; o "+" vai para o meio da barra e, no celular de quem publica, Análises sobe para cá
  const analises = ABAS.find(a => a.id === 'analises');
  return `<header class="topo">
  <div class="topo-marca">
    <img class="topo-logo" src="icons/logo.svg" alt="">
    <div>
      <h1>${esc(titulo)}</h1>
      <p class="topo-sup ${f.alerta ? 'alerta' : ''}">${f.alerta ? icTom('atencao') : ''}${esc(f.texto)}</p>
    </div>
  </div>
  <div class="topo-acoes">
    <button type="button" class="topo-menu" id="appBusca" aria-label="Buscar no app">${svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}</button>
    ${lancar ? `<button type="button" class="aba topo-menu topo-analises ${aba === 'analises' ? 'on' : ''}" data-aba="analises" aria-label="Análises" aria-current="${aba === 'analises' ? 'page' : 'false'}">${svg(analises.icone)}</button>` : ''}
    <button type="button" class="topo-menu" id="appMenu" aria-label="Menu do app">${svg('<circle cx="12" cy="6" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="18" r="1.6"/>', 'cheio')}</button>
  </div>
</header>`;
}

export function htmlNav(aba, { lancar = false } = {}) {
  const botao = a => `
    <button type="button" class="aba ${a.id === aba ? 'on' : ''}" data-aba="${a.id}" aria-current="${a.id === aba ? 'page' : 'false'}">
      ${svg(a.icone)}<span>${a.nome}</span>
    </button>`;
  if (!lancar) return `<nav class="abas" aria-label="Seções">${ABAS.map(botao).join('')}</nav>`;
  // v8.5, quem publica: Início · Caixa · [+] · Cartão · Carteira (Análises fica no topo)
  const [inicio, mes, cartao, carteira] = ABAS;
  return `<nav class="abas com-mais" aria-label="Seções">${botao(inicio)}${botao(mes)}
    <button type="button" class="aba-mais" id="appLancar" aria-label="Lançar" aria-haspopup="dialog">${svg('<path d="M12 5v14M5 12h14"/>')}</button>
    ${botao(cartao)}${botao(carteira)}</nav>`;
}

// ---------- INÍCIO ----------
function heroGastar({ c }, hoje = null) {
  const dias = c.diasRest;
  const porDia = dias > 0 ? c.saldo / dias : c.saldo;
  const ritmo = c.taxaAtualLivre || 0;
  const tom = c.saldo <= 0 ? 'ruim' : ritmo > porDia ? 'atencao' : 'bom';
  // v9.6: uma barra só (o seu ritmo dentro do que cabe por dia) — antes "cabe por dia" repetia a linha de cima e a
  // barra dele ficava sempre cheia; os dois números de rodapé ficam lado a lado em vez de pílulas de tamanhos diferentes
  const acima = ritmo > porDia;
  const comparacao = ritmo > 0 && c.saldo > 0 ? `
    <div class="ritmo">
      <div class="ritmo-item"><div class="ritmo-topo"><span>Seu ritmo no cartão</span><b>${brl0(ritmo)} <small>de ${brl0(porDia)} por dia</small></b></div>${medidor(ritmo / Math.max(porDia, 1), { classe: acima ? 'ruim' : 'bom' })}
      ${acima ? `<p class="ritmo-alerta">${icTom('atencao')} Acima do que cabe: ${brl0(ritmo - porDia)} por dia a mais.</p>` : ''}</div>
    </div>` : '';
  const gastoHoje = hoje?.n ? `${brl0(hoje.total)}<small> · ${hoje.n} ${hoje.n === 1 ? 'gasto' : 'gastos'}</small>` : brl0(0);
  return `<section class="cartao hero tom-${tom}">
    <button type="button" class="olho" data-olho aria-label="Esconder os valores" aria-pressed="false">${svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>')}</button>
    <p class="rotulo">Dá para gastar até o fim do mês</p>
    <p class="hero-valor">${brl(Math.max(0, c.saldo))}</p>
    <p class="hero-sub">${c.saldo <= 0
      ? `O mês já está <b class="ruim">${brl(-c.saldo)}</b> no vermelho com o que foi lançado.`
      : dias > 0 ? `<b>${brl0(porDia)} por dia</b> · faltam ${dias} dias` : 'Último dia do mês'}</p>
    ${comparacao}
    <div class="hero-grade">
      <div><span>Fim do mês, no seu ritmo</span><b class="${c.saldoProj < 0 ? 'ruim' : 'bom'}">${brl0(c.saldoProj)}</b></div>
      <div><span>Gasto hoje</span><b>${gastoHoje}</b></div>
    </div>
    <details class="explica">
      <summary>Como chega nesse número</summary>
      <ul class="linhas">
        ${linha('Receitas do mês', brl(c.receitas))}
        ${linha('− Contas fixas', brl(c.fixas))}
        ${linha('− Já gasto (cartão e outros)', brl(c.variaveis))}
        ${linha('= Dá para gastar', brl(c.saldo), tomValor(c.saldo))}
      </ul>
      <p class="nota">Conta as receitas previstas até o fim do mês (algumas estimadas). Compras no cartão contam no mês em que são feitas, mesmo pagas na fatura seguinte.</p>
    </details>
  </section>`;
}

function cartaoAcao({ acao }) {
  if (!acao?.titulo) return '';
  return `<section class="cartao acao tom-${acao.tom}">
    <div class="acao-ic">${svg(ICONE_IDEIA)}</div>
    <div class="acao-txt">
      <p class="rotulo">Próxima ação</p>
      <h3>${esc(acao.titulo)}</h3>
      ${acao.corpo ? `<p class="recolhido" data-expandir>${acao.corpo}</p>` : ''}
    </div>
  </section>`;
}

function duplaContaCartao({ c, tl }, dados, ctx) {
  const futuro = tl.porDia.filter(p => p.dia >= ctx.diaHoje);
  const negativos = futuro.filter(p => p.saldo < 0);
  let subConta = 'Positiva até o fim do mês';
  if (negativos.length) {
    const ultimo = negativos[negativos.length - 1].dia;
    const volta = futuro.find(p => p.dia > ultimo && p.saldo >= 0);
    subConta = volta ? `Volta ao azul dia ${volta.dia}` : 'Negativa até o fim do mês';
  }
  const limite = dados.regras?.limiteSaudavelItau || 0;
  const uso = limite ? c.itau / limite : 0;
  return `<div class="dupla">
    <button type="button" class="cartao mini" data-ir-aba="mes/geral">
      <p class="rotulo">Conta hoje</p>
      <p class="mini-valor ${tomValor(c.caixa)}">${brl0(c.caixa)}</p>
      ${minilinha(tl.porDia.map(p => p.saldo))}
      <p class="mini-sub">${esc(subConta)}</p>
    </button>
    <button type="button" class="cartao mini" data-ir-aba="cartao/fatura">
      <p class="rotulo">Cartão no mês</p>
      <p class="mini-valor">${brl0(c.itau)}</p>
      ${limite ? medidor(uso, { classe: uso > 1 ? 'ruim' : uso > 0.85 ? 'atencao' : 'destaque' }) : ''}
      <p class="mini-sub">${limite ? `${Math.round(uso * 100)}% do limite de ${brl0(limite)}` : ''}</p>
    </button>
  </div>`;
}

// editavel: no celular de quem publica, cada conta ganha "Paguei"/"Recebi" (Fase 1, lancamentos.js)
function listaContas(itens, ctx, editavel = false) {
  return `<ul class="contas">${itens.map(i => {
    const data = new Date(ctx.ano, ctx.mes - 1, i.dia);
    const hoje = i.dia === ctx.diaHoje;
    const valor = `<b class="conta-valor ${i.valor > 0 ? 'bom' : ''}">${i.valor > 0 ? '+' : ''}${brl(i.valor)}</b>`;
    return `<li>
      <div class="dia ${hoje ? 'hoje' : ''}"><b>${pad(i.dia)}</b><span>${hoje ? 'hoje' : SEMANA[data.getDay()]}</span></div>
      ${editavel && i.lista && i.item
        // v9.6: valor embaixo do nome e o botão sozinho à direita (antes valor e botão empilhados deixavam a linha alta)
        ? `<span class="conta-nome conta-com-valor">${esc(nomeCurto(i.desc))}${valor}</span><button type="button" class="conta-pagar" data-pagar="${esc(i.lista)}|${esc(i.item)}">${i.valor > 0 ? 'Recebi' : 'Paguei'}</button>`
        : `<span class="conta-nome">${esc(nomeCurto(i.desc))}</span>${valor}`}
    </li>`;
  }).join('')}</ul>`;
}

function proximas(m, dados, ctx, opcoes = {}) {
  const itens = proximasContas(m, dados);
  if (!itens.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Próximas contas</h2><button type="button" class="link" data-ir-aba="mes/agenda">Ver a agenda</button></div>
    ${listaContas(itens.slice(0, 3), ctx, !!opcoes.github)}
  </section>`;
}

function alertasCompactos({ alertas }) {
  if (!alertas?.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Atenção</h2><button type="button" class="link" data-ir-aba="analises/saude">Análises</button></div>
    <ul class="alertas compactos">${alertas.slice(0, 3).map(a => `<li>${icTom(a.tom)}<span>${esc(a.titulo)}</span></li>`).join('')}</ul>
  </section>`;
}

// ---------- MÊS ----------
function graficoCurva({ tl }, ctx) {
  const pontos = tl.porDia.map(p => {
    const sem = SEMANA[new Date(ctx.ano, ctx.mes - 1, p.dia).getDay()];
    const evs = p.eventos.filter(e => Math.abs(e.valor) >= 1).slice(0, 3).map(e => `${nomeCurto(e.desc)} ${e.valor > 0 ? '+' : ''}${brl0(e.valor)}`);
    return { x: p.dia, y: p.saldo, dica: `${pad(p.dia)}/${pad(ctx.mes)} (${sem}) · saldo ${brl(p.saldo)}${evs.length ? ` · ${evs.join(' · ')}` : ''}` };
  });
  const rotulos = [1, 8, 15, 22, ctx.dias].map(d => ({ x: d, texto: String(d) }));
  return linhaSaldo(pontos, { hojeX: ctx.diaHoje, rotulosX: rotulos });
}

// v9.15: o mínimo que importa é o de hoje em diante (o de dias passados contradizia o "Saldo mínimo" do painel)
function minimoDaqui(tl, ctx) {
  const futuro = tl.porDia.filter(p => p.dia >= ctx.diaHoje);
  return (futuro.length ? futuro : tl.porDia).reduce((a, b) => (b.saldo < a.saldo ? b : a));
}

// v9.15: o gráfico conta o previsto; o destaque, só o confirmado. O que ficou para trás sem confirmar explica a diferença.
export function pendentesAteHoje(tl, diaHoje) {
  return tl.porDia.filter(p => p.dia <= diaHoje)
    .flatMap(p => p.eventos.filter(e => e.status !== 'confirmado' && Math.abs(e.valor) >= 0.5).map(e => ({ dia: p.dia, desc: e.desc, valor: e.valor })));
}

function curvaMes(m, ctx) {
  const { tl } = m;
  const minimo = minimoDaqui(tl, ctx);
  const final = tl.porDia[tl.porDia.length - 1];
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Saldo da conta, dia a dia</h2></div>
    <p class="cartao-sub">Toque no gráfico para ver cada dia. Abaixo de zero fica em vermelho.</p>
    ${graficoCurva(m, ctx)}
    <div class="chips">
      ${minimo.saldo < 0 ? chip('ruim', `Pior momento ${brl0(minimo.saldo)} · dia ${minimo.dia}`) : chip('bom', `Mínimo ${brl0(minimo.saldo)} · dia ${minimo.dia}`)}
      ${chip(final.saldo < 0 ? 'ruim' : 'bom', `Fecha o mês com ${brl0(final.saldo)}`)}
    </div>
  </section>`;
}

// Destaque de Mês › Visão geral: saldo de hoje + curva do mês
function heroSaldo(m, ctx, opcoes = {}) {
  const { c, tl } = m;
  const minimo = minimoDaqui(tl, ctx);
  const final = tl.porDia[tl.porDia.length - 1];
  const futuro = tl.porDia.filter(p => p.dia >= ctx.diaHoje);
  const pend = pendentesAteHoje(tl, ctx.diaHoje);
  const somaPend = pend.reduce((s, e) => s + e.valor, 0);
  const aviso = Math.abs(somaPend) >= 1
    ? `<p class="hero-sub hero-pendente">${icTom('atencao')}<span>O gráfico já conta <b>${somaPend > 0 ? '+' : ''}${brl(somaPend)}</b> que ainda não foi confirmado (${pend.slice(0, 2).map(e => `${esc(nomeCurto(e.desc))}, dia ${e.dia}`).join('; ')}${pend.length > 2 ? '…' : ''}). <button type="button" class="link" data-ir-aba="mes/agenda">Confirmar na agenda</button></span></p>`
    : '';
  const negativos = futuro.filter(p => p.saldo < 0);
  let sub = 'A conta fica positiva até o fim do mês.';
  if (negativos.length) {
    const ultimo = negativos[negativos.length - 1].dia;
    const volta = futuro.find(p => p.dia > ultimo && p.saldo >= 0);
    sub = volta ? `Fica no vermelho até o dia ${ultimo} e <b>volta ao azul no dia ${volta.dia}</b>.` : 'Fica no vermelho até o fim do mês.';
  }
  // v9.25: na interface nova o saldo de hoje está no topo — aqui só o resto
  return `<section class="cartao${opcoes.v10 ? '' : ' hero'}">
    ${opcoes.v10 ? '' : `<p class="rotulo">Saldo da conta hoje</p>
    <p class="hero-valor ${tomValor(c.caixa)}">${brl(c.caixa)}</p>`}
    <p class="hero-sub">${sub}</p>
    ${aviso}
    <div class="hero-grafico">${graficoCurva(m, ctx)}</div>
    ${opcoes.v10 ? '' : `<div class="chips">
      ${minimo.saldo < 0 ? chip('ruim', `Pior momento ${brl0(minimo.saldo)} · dia ${minimo.dia}`) : chip('bom', `Mínimo daqui em diante ${brl0(minimo.saldo)} · dia ${minimo.dia}`)}
      ${chip(final.saldo < 0 ? 'ruim' : 'bom', `Fecha o mês com ${brl0(final.saldo)}`)}
    </div>`}
    ${opcoes.github ? '<button type="button" class="botao-sec hero-acao" data-conferir-banco>Conferir com o saldo do banco</button>' : ''}
  </section>`;
}

// Destaque de Mês › Agenda: quanto ainda sai e entra até o fim do mês
function heroAgenda(m, dados, ctx) {
  const itens = proximasContas(m, dados);
  const contas = itens.filter(i => i.valor < 0);
  const entradas = itens.filter(i => i.valor > 0);
  const aPagar = contas.reduce((s, i) => s - i.valor, 0);
  const entra = entradas.reduce((s, i) => s + i.valor, 0);
  const prox = contas[0];
  return `<section class="cartao hero">
    <p class="rotulo">Ainda a pagar neste mês</p>
    <p class="hero-valor">${brl(aPagar)}</p>
    <p class="hero-sub">${contas.length ? `${contas.length} ${contas.length === 1 ? 'conta' : 'contas'} · próxima: <b>${esc(nomeCurto(prox.desc))}</b> dia ${prox.dia} (${brl0(-prox.valor)})` : 'Nenhuma conta pendente até o fim do mês.'}</p>
    ${entra ? `<div class="chips">${chip('bom', `Entram ${brl0(entra)} até o fim do mês`)}</div>` : ''}
  </section>`;
}

function balanco({ c }) {
  const tile = (rotulo, valor, cls = '') => `<div class="tile"><p class="rotulo">${rotulo}</p><p class="tile-valor ${cls}">${brl0(valor)}</p></div>`;
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Balanço do mês</h2></div>
    <div class="tiles">
      ${tile('Receitas', c.receitas)}
      ${tile('Contas fixas', c.fixas)}
      ${tile('Já gasto', c.variaveis)}
      ${tile('Resultado projetado', c.saldoProj, tomValor(c.saldoProj))}
    </div>
  </section>`;
}

function agendaMes({ tl }, ctx) {
  const dias = tl.porDia.filter(p => p.eventos.some(e => Math.abs(e.valor) >= 0.5));
  if (!dias.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Agenda do mês</h2></div>
    <ul class="agenda">${dias.map(p => {
      const data = new Date(ctx.ano, ctx.mes - 1, p.dia);
      const passado = p.dia < ctx.diaHoje;
      return `<li class="${passado ? 'passado' : ''} ${p.dia === ctx.diaHoje ? 'hoje' : ''}">
        <div class="agenda-dia"><b>${pad(p.dia)}</b><span>${p.dia === ctx.diaHoje ? 'hoje' : SEMANA[data.getDay()]}</span></div>
        <ul>${p.eventos.filter(e => Math.abs(e.valor) >= 0.5).map(e => `<li>
          <span class="ev-nome">${esc(nomeCurto(e.desc))}${e.status === 'confirmado' ? '<i class="ok">pago</i>' : ''}</span>
          <b class="${e.valor > 0 ? 'bom' : ''}">${e.valor > 0 ? '+' : ''}${brl(e.valor)}</b>
        </li>`).join('')}</ul>
      </li>`;
    }).join('')}</ul>`;
}

function alocacao(dados) {
  const g = graficoAlocacao(dados);
  return g ? `<section class="cartao">
    <div class="cartao-topo"><h2>Alocação × alvo</h2></div>
    <p class="cartao-sub">A barra é a fatia atual; o traço marca o alvo.</p>
    ${g}
  </section>` : '';
}

function abaMes(m, dados, ctx) {
  return [secao(() => curvaMes(m, ctx)), secao(() => balanco(m)), secao(() => agendaMes(m, ctx))].join('');
}

// ---------- CARTÃO ----------
function faturaHero({ c }, dados, ctx) {
  const limite = dados.regras?.limiteSaudavelItau || 0;
  const total = Math.max(limite, c.itau);
  const livre = Math.max(0, limite - c.itau);
  const segs = [
    { valor: c.parcelas, classe: 's1', dica: `Parcelas de compras antigas: ${brl(c.parcelas)}` },
    { valor: c.agendado, classe: 's2', dica: `Assinaturas e fixos: ${brl(c.agendado)}` },
    { valor: c.gastoLivre, classe: 's3', dica: `Gastos do mês: ${brl(c.gastoLivre)}` },
    { valor: livre, classe: 'trilho', dica: `Ainda cabe no limite: ${brl(livre)}` },
  ];
  const diaPaga = dados.calendario?.faturaCartao;
  return `<section class="cartao hero">
    <p class="rotulo">Fatura de ${MESES[ctx.mes - 1]} até agora</p>
    <p class="hero-valor">${brl(c.itau)}</p>
    <p class="hero-sub">${limite ? `Limite saudável ${brl0(limite)}` : ''}${diaPaga ? ` · paga dia ${diaPaga}/${pad(ctx.mes === 12 ? 1 : ctx.mes + 1)}` : ''}</p>
    ${limite ? `<div class="empilhada-box">${empilhada(segs, total)}${c.itau > limite ? `<b class="marca-limite" style="left:${((limite / total) * 100).toFixed(1)}%"></b>` : ''}</div>` : ''}
    <ul class="legenda">
      <li><i class="s1"></i>Parcelas antigas<b>${brl0(c.parcelas)}</b></li>
      <li><i class="s2"></i>Assinaturas e fixos<b>${brl0(c.agendado)}</b></li>
      <li><i class="s3"></i>Gastos do mês<b>${brl0(c.gastoLivre)}</b></li>
      ${limite ? (livre > 0 ? `<li><i class="trilho"></i>Ainda cabe<b>${brl0(livre)}</b></li>` : `<li><i class="estouro"></i>Acima do limite<b class="ruim">${brl0(c.itau - limite)}</b></li>`) : ''}
    </ul>
  </section>`;
}

// v7.5: compras do cartão lançadas pelo app (as do agente existem só como total por categoria)
// v8.12: o que compõe a fatura do mês, item a item (pedido do Bruno, 31/10: "o que tem nessa fatura… valor por valor")
function composicaoCartao(dados, opcoes = {}) {
  const { grupos, total } = composicaoFatura(dados);
  if (!grupos.length) return '';
  const abertos = opcoes.abertos || new Set();
  const dobra = g => {
    const chave = `comp:${g.k}`, todos = abertos.has(`${chave}:todos`);
    const lista = todos ? g.itens : g.itens.slice(0, 8);
    const linhaI = i => {
      const ic = iconeCategoria(i.categoria || 'Others', 'peq');
      const dd = i.data ? `${i.data.slice(8, 10)}/${i.data.slice(5, 7)}` : '';
      const dentro = `${ic}<span class="rec-nome">${esc(i.descricao)}<small>${esc([dd, i.categoria, i.detalhe].filter(Boolean).join(' · '))}</small></span><b class="${i.valor > 0 ? 'bom' : ''}">${i.valor > 0 ? '−' : ''}${brl(Math.abs(i.valor))}</b>`;
      // v9.5: tudo editável — compra do app, compra lida da fatura, parcela e recorrente abrem o editor de cada um
      const [k, v] = Object.entries(i.abrir || {})[0] || [];
      const attr = { compra: 'data-compra', compraFatura: 'data-compra-fatura', parcelamento: 'data-parcelamento', assinatura: 'data-assinatura' }[k];
      return opcoes.github && attr ? `<li><button type="button" class="rec-linha" ${attr}="${v}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
    };
    const aberto = abertos.has(chave) || (g.k === 'compra' && !abertos.has(`${chave}:fechado`));
    return `<details class="dobra comp-grupo" data-chave="${chave}"${aberto ? ' open' : ''}>
      <summary><span>${esc(g.nome)} <small class="suave">${g.itens.length}</small></span><b>${brl(g.total)}</b></summary>
      <ul class="recorrentes lista-rec">${lista.map(linhaI).join('')}</ul>
      ${g.itens.length > lista.length ? `<button type="button" class="link" data-abrir="${chave}:todos">Ver todos (${g.itens.length})</button>` : ''}
    </details>`;
  };
  const so = grupos.find(g => g.k === 'semdetalhe');
  return `<section class="cartao">
    <div class="cartao-topo"><h2>O que compõe a fatura</h2><b>${brl(total)}</b></div>
    ${grupos.map(dobra).join('')}
    ${grupos.length ? '<button type="button" class="link" data-planilha-fatura>Planilha (Excel) para conferir com o Itaú</button>' : ''}
    ${so ? `<p class="nota">${brl(so.total)} foram registrados pelo Claude só como total por categoria. Para ver item a item: cole os SMS das compras (+ → Colar SMS) ou, no fechamento, mande a fatura do Itaú (PDF) para o Claude.</p>` : ''}
  </section>`;
}

function projecaoCartao({ c }, dados) {
  const limite = dados.regras?.limiteSaudavelItau || 0;
  if (!limite) return '';
  const proj = c.itauProjetado;
  const cabe = c.limiteJaRompido
    ? `<p class="destaque-txt ruim">Já passou ${brl(-c.margemAteLimite)} do limite saudável.</p>`
    : `<p class="destaque-txt">Cabem mais <b>${brl(c.margemAteLimite)}</b>${c.diasRest > 0 ? ` — <b>${brl(c.tetoPorDia)} por dia</b>` : ''}</p>`;
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Até o limite saudável</h2></div>
    ${cabe}
    <div class="chips">
      ${proj > limite ? chip('ruim', `No ritmo atual fecha em ${brl0(proj)}`) : chip('bom', `No ritmo atual fecha em ${brl0(proj)}`)}
      ${proj > limite && c.diaEstouro && !c.limiteJaRompido ? chip('atencao', `Passa do limite por volta do dia ${c.diaEstouro}`) : ''}
    </div>
  </section>`;
}

function categoriasCartao(dados) {
  const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const cats = ((it && it.categorias) || []).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
  if (!cats.length) return '';
  const top = cats.slice(0, 7).map(x => ({ rotulo: x.cat, valor: x.valor }));
  const resto = cats.slice(7).reduce((s, x) => s + x.valor, 0);
  if (resto > 0) top.push({ rotulo: `Outras (${cats.length - 7})`, valor: resto, classe: 'suave' });
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Onde foi o dinheiro</h2></div>
    ${barrasH(top)}
  </section>`;
}

function graficoFaturas({ c }, dados, ctx) {
  const hist = (dados.historicoItau || []).slice(-6);
  if (!hist.length) return '';
  const limite = dados.regras?.limiteSaudavelItau || 0;
  const abrev = nome => MES3[MESES.indexOf(String(nome).toLowerCase())] || String(nome).slice(0, 3);
  const itens = hist.map(h => ({ rotulo: abrev(h.mes), valor: h.valor, classe: 'suave', dica: `${h.mes}: ${brl(h.valor)}${limite ? ` · ${h.valor > limite ? 'acima' : 'dentro'} do limite` : ''}` }));
  itens.push({ rotulo: MES3[ctx.mes - 1], valor: c.itau, classe: 'destaque', dica: `${maiuscula(MESES[ctx.mes - 1])} até agora: ${brl(c.itau)} · projeção ${brl(c.itauProjetado)}` });
  return `${colunas(itens, { rotularValores: [itens.length - 1], referencia: limite ? { valor: limite } : null })}
    ${limite ? `<ul class="legenda horizontal"><li><i class="ref"></i>Limite saudável ${brl0(limite)}</li><li><i class="destaque"></i>${maiuscula(MESES[ctx.mes - 1])} (aberto)</li></ul>` : ''}`;
}

function historicoFaturas(m, dados, ctx) {
  const hist = (dados.historicoItau || []).slice(-6);
  if (!hist.length) return '';
  const limite = dados.regras?.limiteSaudavelItau || 0;
  const acima = hist.filter(h => limite && h.valor > limite).length;
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Faturas dos últimos meses</h2></div>
    <p class="cartao-sub">${limite ? `${acima} de ${hist.length} meses acima do limite de ${brl0(limite)}. ` : ''}A última coluna é o mês atual, ainda aberto.</p>
    ${graficoFaturas(m, dados, ctx)}
  </section>`;
}

function graficoParcelas({ cf }) {
  if (!cf?.meses?.length) return '';
  const itens = cf.meses.map(m => ({ rotulo: MES3[m.mes - 1], valor: m.totalParcelas, classe: 'suave', dica: `${MES3[m.mes - 1]}/${String(m.ano).slice(2)}: parcelas ${brl(m.totalParcelas)}${m.queSaem?.length ? ` · ${m.queSaem.length} saem depois` : ''}` }));
  return colunas(itens, { altura: 150, rotularValores: [0, itens.length - 1] });
}

function parcelasFuturas(m, dados) {
  if (!m.cf?.meses?.length) return '';
  const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const saindo = ((it && it.parcelamentos) || [])
    .filter(p => p.saiDaFaturaA_partir_de)
    .sort((a, b) => a.saiDaFaturaA_partir_de.localeCompare(b.saiDaFaturaA_partir_de))
    .slice(0, 4);
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Parcelas nos próximos meses</h2></div>
    <p class="cartao-sub">Quanto da fatura de cada mês já está comprometido com parcelas.</p>
    ${graficoParcelas(m)}
    ${saindo.length ? `<p class="rotulo espaco">Próximas a sair da fatura</p><ul class="linhas">${saindo.map(p => {
      const [a, mm] = p.saiDaFaturaA_partir_de.split('-').map(Number);
      return linha(esc(nomeCurto(p.item)), `sai em ${MES3[mm - 1]}/${String(a).slice(2)}`);
    }).join('')}</ul>` : ''}
  </section>`;
}

// ---------- Próximas faturas (v6.2): o que já está comprometido no cartão nos próximos meses ----------
// Vem do painel (compromissosFuturos): parcelas ativas em cada mês, assinaturas que se repetem e compras já feitas
// para a fatura seguinte (depois do fechamento, em faturaProximoCiclo). O gasto do dia a dia ainda vai somar.
// v9.30: o número da parcela num mês futuro (o painel manda o "atual" de hoje, que não muda de mês para mês)
export function parcelaNoMes(p, chave) {
  const [, tot] = String(p.atual || '').split('/').map(Number);
  return tot && p.ultimaParcela ? { num: tot - mesesEntre(chave, p.ultimaParcela), tot } : null;
}
const mesesEntre = (a, b) => { const [a1, m1] = a.split('-').map(Number), [a2, m2] = b.split('-').map(Number); return (a2 - a1) * 12 + (m2 - m1); };
// v9.5: Carteira › Ativos — cada investimento é uma linha tocável (abre o ativo: aporte, resgate, dividendo, valor).
// Substitui a tabela do painel (Ativo · valor · % · Δ), que só dava para ler.
// v9.9.8: variação = valor de agora × fechamento do mês anterior (o Bruno: "o bom é comparar com o fechamento do mês
// anterior"), sem os aportes e resgates do mês — senão um aporte pareceria alta e um resgate, queda.
export function baseMesAnterior(cart) {
  const pos = posicao(cart);
  const meses = Object.keys(cart.historico_mensal || {}).sort();
  const ant = meses[meses.indexOf(pos.mes) - 1];
  if (!ant) return null;
  const antes = Object.fromEntries(listaAtivos(cart, cart.historico_mensal[ant]).map(a => [a.chave, a.valor]));
  const fluxo = {};
  for (const f of pos.h.fluxos || []) if (f.ativo) fluxo[f.ativo] = (fluxo[f.ativo] || 0) + (f.tipo === 'resgate' ? -1 : 1) * (f.valor || 0);
  const totalAntes = Object.values(antes).reduce((t, v) => t + (v || 0), 0);
  return {
    mes: ant,
    var: (k, hoje) => (antes[k] > 0 ? (hoje - (fluxo[k] || 0)) / antes[k] - 1 : null),
    // total: aportes e resgates do mês inteiro (os sem ativo também)
    noMes: hoje => (totalAntes > 0 ? { valor: hoje - ((pos.h.aportes || 0) - (pos.h.resgates || 0)) - totalAntes, base: totalAntes } : null),
  };
}
export function variacaoAtivos(cart) {
  const base = baseMesAnterior(cart);
  const lista = listaAtivos(cart);
  const total = lista.reduce((t, a) => t + (a.valor || 0), 0) || 1;
  return lista.map(a => ({ ...a, pct: (a.valor || 0) / total, var: base ? base.var(a.chave, a.valor || 0) : null }));
}
function seusAtivos(cart, opcoes = {}) {
  const lista = variacaoAtivos(cart).filter(a => a.valor > 0);
  if (!lista.length) return '';
  const grupos = [...new Set(lista.map(a => a.rotulo))];
  const pctTxt = v => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const linha = a => {
    const dentro = `<span class="rec-nome">${esc(a.nome)}<small>${pctTxt(a.pct)} da carteira</small></span>
      <span class="ativo-dir"><b>${brl(a.valor)}</b>${a.var == null ? '' : `<small class="${a.var >= 0 ? 'bom' : 'ruim-txt'}">${a.var >= 0 ? '+' : '−'}${pctTxt(Math.abs(a.var))} no mês</small>`}</span>`;
    return opcoes.github ? `<li><button type="button" class="rec-linha" data-ativo-abrir="${esc(a.chave)}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
  };
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Seus investimentos</h2></div>
    ${opcoes.github ? '<p class="cartao-sub">Toque num investimento para aportar, resgatar, registrar dividendo ou atualizar o valor.</p>' : ''}
    ${grupos.map(g => `<p class="grupo">${esc(g)}</p><ul class="recorrentes contas-mes">${lista.filter(a => a.rotulo === g).map(linha).join('')}</ul>`).join('')}
  </section>`;
}

// v9.5 (item 8): estratégia — alocação de hoje × alvo por classe, com quanto falta, e os atalhos para o Claude
function estrategiaCartao(cart, opcoes = {}) {
  const a = alocacaoVsAlvo(cart);
  if (!a) return '';
  const pct = v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const linha = l => {
    const tom = Math.abs(l.pct - l.alvo) < 2 ? 'bom' : l.pct < l.alvo ? 'abaixo' : 'acima';
    return `<li class="est-linha">
      <div class="orc-topo"><span>${esc(l.nome)}</span><b>${pct(l.pct)}<small> / alvo ${pct(l.alvo)}</small></b></div>
      <div class="est-barra"><i style="width:${Math.min(100, l.pct)}%"></i><em style="left:${Math.min(100, l.alvo)}%"></em></div>
      <small class="orc-nota">${tom === 'bom' ? 'no alvo' : l.falta > 0 ? `faltam ${brl0(l.falta)} para o alvo` : `${brl0(-l.falta)} acima do alvo`}${l.tese ? ` · ${esc(l.tese)}` : ''}</small>
    </li>`;
  };
  return `<section class="cartao estrategia">
    <div class="cartao-topo"><h2>Estratégia</h2>${a.revisada ? `<small class="suave">revisada ${esc(a.revisada.split('-').reverse().slice(0, 2).join('/'))}</small>` : ''}</div>
    <p class="cartao-sub">${a.tese ? esc(a.tese) : a.fonte === 'target' ? 'Alvo atual do gestor de carteira. A estratégia nova (mais dólar e renda fixa) entra quando você revisar com o Claude.' : ''}${a.reservaFora ? ` Sem a reserva de emergência (${brl0(a.reservaFora)}).` : ''}</p>
    <ul class="orc-lista">${a.linhas.map(linha).join('')}</ul>
    ${ordemCartao(cart, opcoes)}
    ${gatilhosCartao(cart, opcoes)}
    ${pontosDoPlano(cart, opcoes)}
    ${opcoes.github ? `<div class="acoes-ativo">
      <button type="button" class="btn prim" data-revisar-estrategia>Revisar com o Claude</button>
      <button type="button" class="btn" data-pesquisar="">Pesquisar ativo</button>
      <button type="button" class="btn" data-fichas>Fichas dos ativos</button>
    </div>` : ''}
  </section>`;
}

// v9.13: ordem dos aportes com "Pausar" (a única parte da estratégia que o app muda; o resto é do Claude no PLANO)
function ordemCartao(cart, opcoes = {}) {
  const est = cart.estrategia || {};
  const lista = est.prioridade_aporte || [];
  if (!lista.length) return '';
  const linha = (i, n) => {
    const p = pausa(est, i), t = textoItem(i);
    return `<li class="est-ordem${p ? ' pausado' : ''}"><span><span class="n">${n + 1}.</span><span class="t">${esc(t)}</span>${p ? `<small> · pausado em ${esc(p.em.split('-').reverse().slice(0, 2).join('/'))}</small>` : ''}</span>${opcoes.github ? `<button type="button" class="link" data-pausar="${esc(t)}">${p ? 'Retomar' : 'Pausar'}</button>` : ''}</li>`;
  };
  return `<div class="pontos-plano"><p class="rotulo">Dinheiro novo, nesta ordem</p><ol class="est-ordens">${lista.map(linha).join('')}</ol>
    ${opcoes.github ? '<p class="nota">Pausar tira o item das sugestões do Investir até você retomar; a pausa vai junto no próximo Plano com o Claude.</p>' : ''}</div>`;
}

// v9.13: gatilhos da estratégia — os que têm número o app vigia todo dia; os outros só você sabe quando acontecem
function gatilhosCartao(cart, opcoes = {}) {
  const lista = gatilhos(cart.estrategia, opcoes.gatilhos || {});
  if (!lista.length) return '';
  const nb = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  const desc = g => (!g.vigiado ? 'só você sabe quando acontece' : g.agora == null ? `o app vigia o ${INDICADORES[g.se.indicador]} (sem o valor de hoje ainda)` : `${INDICADORES[g.se.indicador]} hoje: ${nb(g.agora)} · dispara ${g.se.op === '>' ? 'acima' : 'abaixo'} de ${nb(Number(g.se.valor))}`);
  return `<div class="pontos-plano"><p class="rotulo">Gatilhos para rever a estratégia</p>
    <ul>${lista.map(g => `<li class="tom-${g.disparou ? 'atencao' : 'info'}">${icTom(g.disparou ? 'atencao' : 'info')}<div><b>${g.disparou ? 'Disparou: ' : ''}${esc(g.texto)}</b><small>${esc(desc(g))}</small></div></li>`).join('')}</ul>
    ${lista.some(g => g.disparou) && opcoes.github ? '<button type="button" class="btn prim" data-levar-claude>Levar para o Claude</button>' : ''}</div>`;
}

// v9.7: o que o app achou no plano de aportes (fundo que rende pouco, dólar em ativo que já existe, data × resgate)
function pontosDoPlano(cart, opcoes = {}) {
  const classes = new Map(listaAtivos(cart).map(x => [x.chave, x.classe]));
  const lista = alertasPlano(cart, opcoes.cdiHist, { liquidez: k => prazoResgate(cart, k, classes.get(k)) });
  if (!lista.length) return '';
  return `<div class="pontos-plano">
      <p class="rotulo">Pontos a rever no plano</p>
      <ul>${lista.map(x => `<li class="tom-${x.tom}">${icTom(x.tom)}<div><b>${esc(x.titulo)}</b><small>${esc(x.texto)}</small></div></li>`).join('')}</ul>
      <p class="nota">Vão junto no texto do Plano e da revisão para o Claude.</p>
    </div>`;
}

// v9.6: quanto cada fundo de renda fixa rendeu de verdade × CDI (estrategia.js), pior primeiro
function rendaFixaReal(cart, opcoes = {}) {
  const lista = rendimentoRendaFixa(cart, opcoes.cdiHist);
  if (!lista) return opcoes.cdiHist ? '' : '<section class="cartao"><div class="cartao-topo"><h2>Renda fixa de verdade</h2></div><p class="cartao-sub">Buscando o CDI do Banco Central para comparar os fundos… (precisa de internet)</p></section>';
  const pct = v => (v == null ? '—' : `${Math.round(v)}%`);
  const dm = d => d.split('-').reverse().slice(0, 2).join('/');
  const melhor = Math.max(...lista.map(f => f.pct ?? 0)) || 1;
  const linha = f => `<li class="est-linha">
      <div class="orc-topo"><span>${icTom(f.tom)} ${esc(f.nome)}</span><b>${pct(f.pct)}<small> do CDI</small></b></div>
      <div class="est-barra"><i class="tom-${f.tom}" style="width:${Math.max(2, Math.min(100, ((f.pct || 0) / melhor) * 100))}%"></i></div>
      <small class="orc-nota">último mês ${pct(f.ultimo.pct)}${f.pct12m != null ? ` · o banco diz ${String(f.pct12m).replace('.', ',')}% em 12 meses` : ''}${f.taxa != null ? ` · taxa ${String(f.taxa).replace('.', ',')}%` : ''}${f.liquidez ? ` · ${esc(f.liquidez)}` : ''} · ${brl0(f.valor)}</small>
    </li>`;
  const pior = lista[0];
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Renda fixa de verdade</h2><small class="suave">${dm(pior.de)} a ${dm(pior.ate)}</small></div>
    <p class="cartao-sub">Quanto cada fundo rendeu nas posições que a carteira guarda a cada mês, tirando aportes e resgates, × o CDI oficial do mesmo período. Pior primeiro.</p>
    <ul class="orc-lista">${lista.map(linha).join('')}</ul>
    ${pior.tom !== 'bom' ? `<p class="nota">${icTom(pior.tom)} <b>${esc(pior.nome)}</b> rendeu ${pct(pior.pct)} do CDI, bem abaixo dos outros fundos no mesmo período. Vale levar para o Claude antes de pôr dinheiro novo nele.</p>` : ''}
    <p class="nota">As posições são líquidas (como o app do Itaú mostra); o app devolve o IR de 15% para comparar com o CDI bruto, como nas lâminas dos fundos. O que importa é a comparação entre eles. O histórico cresce sozinho a cada fechamento.</p>
    ${opcoes.github ? '<button type="button" class="btn prim" data-simular-troca>Simular uma troca</button>' : ''}
  </section>`;
}

// v9.8.3: saídas já combinadas para os próximos meses (Pix/débito parcelado ou agendado, conta a pagar de um mês que vem)
// — o que o painel soma na projeção (`parcelamentosExternos`); quem publica toca para tirar
function agendadosFuturos(dados, opcoes = {}) {
  const lista = (dados.parcelamentosExternos || []).map((p, i) => ({ ...p, i })).filter(p => p.ultimaParcela >= dados.periodo && p.valor > 0)
    .sort((a, b) => (a.primeiraParcela || '').localeCompare(b.primeiraParcela || '') || (a.dia || 0) - (b.dia || 0));
  const entradas = (dados.entradasFuturasApp || []).slice().sort((a, b) => a.mes.localeCompare(b.mes) || a.dia - b.dia); // v9.8.4
  if (!lista.length && !entradas.length) return '';
  const mm = ym => { const [a, m] = String(ym).split('-'); return `${MES3[Number(m) - 1]}/${a.slice(2)}`; };
  const linha = p => {
    const [, n] = String(p.atual || '1/1').split('/').map(Number);
    const vezes = p.primeiraParcela === p.ultimaParcela ? `em ${mm(p.primeiraParcela)}` : `${mm(p.primeiraParcela)} a ${mm(p.ultimaParcela)}${n > 1 ? ` · ${n}x` : ''}`;
    const nome = p.descricao || String(p.item || '').replace(/\s*—.*$/, '');
    const dentro = `<span class="conta-dia"><b>${pad(p.dia || 1)}</b></span><span class="rec-nome">${esc(nome)}<small>${esc(vezes)}${p.origem === 'app' ? ' · app' : ''}</small></span><b>${brl(-p.valor)}</b>`;
    return opcoes.github ? `<li><button type="button" class="rec-linha" data-externo="${p.i}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
  };
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Agendado nos próximos meses</h2></div>
    <p class="cartao-sub">Saídas já combinadas que entram na projeção${opcoes.github ? ' · toque para tirar' : ''}.</p>
    <ul class="recorrentes lista-rec">${lista.map(linha).join('')}${entradas.map(e => {
      const dentro = `<span class="conta-dia"><b>${pad(e.dia || 1)}</b></span><span class="rec-nome">${esc(e.descricao)}<small>entrada em ${esc(mm(e.mes))} · fora da projeção até o mês abrir</small></span><b class="bom">+${brl(e.valor)}</b>`;
      return opcoes.github ? `<li><button type="button" class="rec-linha" data-entrada-futura="${esc(e.id)}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
    }).join('')}</ul>
  </section>`;
}

// v9.8.4 (controle total): meses já fechados, para corrigir o histórico (quem publica toca para editar)
function mesesFechadosCartao(dados, opcoes = {}) {
  const lista = (dados.mesesFechados || []).slice().reverse();
  if (!lista.length || !opcoes.github) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Meses fechados</h2></div>
    <p class="cartao-sub">Toque num mês para corrigir o histórico.</p>
    <ul class="recorrentes lista-rec">${lista.map(m => `<li><button type="button" class="rec-linha" data-mes-fechado="${esc(m.periodo)}"><span class="rec-nome">${esc(mesBonito(m.periodoLabel) || m.periodo)}<small>${m.editadoApp ? 'corrigido no app' : 'fechado'}${Number.isFinite(m.itau) ? ` · fatura ${brl0(m.itau)}` : ''}</small></span><b class="${(m.resultado?.saldo ?? 0) < 0 ? 'ruim' : 'bom'}">${brl(m.resultado?.saldo ?? 0)}</b></button></li>`).join('')}</ul>
  </section>`;
}

// v9.8: escada — quando cada parte do dinheiro investido fica disponível (prazo de resgate) e os vencimentos por ano
function escadaCartao(cart, opcoes = {}) {
  const e = escada(cart, listaAtivos(cart), (k, c) => prazoResgate(cart, k, c), opcoes.hoje || new Date().toISOString().slice(0, 10));
  const total = e.degraus.reduce((s, d) => s + d.total, 0) + e.vencimentos.reduce((s, v) => s + v.total, 0);
  if (!total) return '';
  const abertos = opcoes.abertos || new Set();
  const pctT = v => `${Math.round((v / total) * 100)}%`;
  const dm = d => d.split('-').reverse().join('/');
  const degrau = d => {
    const chave = `escada:${d.id}`;
    return `<details class="dobra escada-degrau" data-chave="${chave}"${abertos.has(chave) ? ' open' : ''}>
      <summary><div class="escada-corpo"><div class="escada-topo"><span>${esc(d.nome)}</span><b>${brl0(d.total)} <small>${pctT(d.total)}</small></b></div>
        <div class="est-barra"><i style="width:${Math.max(2, (d.total / total) * 100)}%"></i></div></div></summary>
      <ul class="linhas">${d.itens.map(i => `<li><span>${esc(i.nome)}${i.du != null ? ` <small class="suave">D+${i.du}</small>` : ''}</span><b>${brl0(i.valor)}</b></li>`).join('')}</ul>
    </details>`;
  };
  const anos = e.vencimentos.map(v => `<li><span>${esc(v.ano)} <small class="suave">${v.itens.map(i => `${esc(i.nome)} (${dm(i.vencimento).slice(0, 5)})`).join(', ')}</small></span><b>${brl0(v.total)}</b></li>`).join('');
  return `<section class="cartao escada">
    <div class="cartao-topo"><h2>Quando o dinheiro fica disponível</h2></div>
    <p class="cartao-sub">Cada investimento pelo prazo de resgate (pedido hoje), e os títulos pelo ano em que vencem.</p>
    ${e.degraus.map(degrau).join('')}
    ${e.proximos.length ? `<p class="nota">${icTom('atencao')} Vence em até 60 dias: ${e.proximos.map(i => `<b>${esc(i.nome)}</b> em ${dm(i.vencimento)} (${brl0(i.valor)})`).join(', ')}. Decida para onde vai antes.</p>` : ''}
    ${anos ? `<p class="rotulo escada-rotulo">Vencimentos</p><ul class="linhas">${anos}</ul>` : '<p class="nota">Ainda não há títulos com data de vencimento (Tesouro, CDB, LCI): hoje é tudo fundo ou B3. Quando entrarem, aparecem aqui ano a ano — a data vem da ficha do ativo.</p>'}
  </section>`;
}

function proximasFaturas({ cf }, dados, abertos = new Set(), gh = false) {
  if (!cf?.meses?.length) return '';
  const lista = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau')?.parcelamentos || [];
  // v9.5: a parcela do agente abre o editor (o nome que o painel mostra é o começo do texto do parcelamento)
  const indiceDe = nome => lista.findIndex(x => String(x.item || '').startsWith(String(nome || '').replace(/\s*—\s*parcela.*$/i, '')));
  const fpc = dados.faturaProximoCiclo;
  const venc = (dados.obrigacoesCaixa || []).find(o => /fatura/i.test(`${o.id} ${o.descricao}`))?.dia;
  const itens = cf.meses.map(m => ({ rotulo: MES3[m.mes - 1], valor: m.total, dica: `${MES3[m.mes - 1]}/${String(m.ano).slice(2)}: ${brl(m.total)} já comprometidos` }));
  const primeiro = cf.meses[0];
  const meses = cf.meses.map((m, i) => {
    const chave = `fatura:${m.chave}`;
    const compras = fpc?.ciclo === m.chave ? fpc.comprasNovas || [] : [];
    const ultimo = new Date(m.ano, m.mes, 0).getDate();
    const pag = new Date(m.ano, m.mes, 1);
    const parcelas = [...m.ativas].sort((a, b) => b.valor - a.valor).map(p => {
      const { num, tot } = parcelaNoMes(p, m.chave) || {};
      const ultima = p.ultimaParcela === m.chave;
      const dentro = `<span>${esc(nomeCurto(p.nome))} ${num ? `<small class="suave">${num}/${tot}</small>` : ''}${ultima ? ' <small class="selo-ultima">última</small>' : ''}</span><b>${brl(p.valor)}</b>`;
      const ip = gh ? indiceDe(p.nome) : -1;
      return ip >= 0 ? `<li class="tocavel"><button type="button" class="linha-botao" data-parcelamento="${ip}">${dentro}</button></li>` : `<li>${dentro}</li>`;
    });
    return `<details class="dobra fatura-mes" data-chave="${chave}"${abertos.has(chave) || i === 0 ? ' open' : ''}>
      <summary><div><h3>${maiuscula(MESES[m.mes - 1])}${m.ano !== primeiro.ano || i === 0 ? ` <small class="suave">${m.ano}</small>` : ''}</h3>
        <p class="cartao-sub">fecha ${ultimo}/${String(m.mes).padStart(2, '0')}${venc ? ` · vence ${venc}/${String(pag.getMonth() + 1).padStart(2, '0')}` : ''}</p></div><b class="fatura-total">${brl(m.total)}</b></summary>
      <ul class="linhas fatura-itens">
        ${compras.map(c => `<li><span class="com-ic">${iconeCategoria(c.cat, 'peq')}${esc(c.descricao)} <small class="suave">${esc(c.data.slice(8, 10))}/${esc(c.data.slice(5, 7))}</small></span><b>${brl(c.valor)}</b></li>`).join('')}
        ${parcelas.join('')}
      </ul>
      ${(cf.recorrentes || []).length ? `<details class="dobra recorrentes-mes"><summary><span>Recorrentes <small class="suave">${cf.recorrentes.length} · iguais todo mês</small></span><b>${brl(cf.recorrentes.reduce((t, r) => t + (r.media ?? r.valor ?? 0), 0))}</b></summary>
        <ul class="linhas fatura-itens">${cf.recorrentes.map(r => `<li><span>${esc(nomeCurto(r.cat || r.nome || 'Recorrente'))} <small class="suave">${r.dia ? `dia ${r.dia}` : ''}</small></span><b>${brl(r.media ?? r.valor ?? 0)}</b></li>`).join('')}</ul>
        <p class="nota">Para mudar ou cancelar: <b>Recorrentes no cartão</b>, logo abaixo.</p></details>` : ''}
      ${m.queEncerraram?.length ? `<p class="nota">${m.queEncerraram.length === 1 ? 'Uma parcela termina' : `${m.queEncerraram.length} parcelas terminam`} nesta fatura.</p>` : ''}
    </details>`;
  }).join('');
  return `<section class="cartao hero">
    <p class="rotulo">Próximas faturas · já comprometido</p>
    <p class="hero-valor">${brl(primeiro.total)}</p>
    <p class="hero-sub">na fatura de <b>${MESES[primeiro.mes - 1]}</b>: parcelas, assinaturas${fpc?.ciclo === primeiro.chave && fpc.comprasNovas?.length ? ' e compras já feitas' : ''}. O gasto do dia a dia ainda vai somar.</p>
    ${itens.length > 1 ? `<div class="hero-grafico">${colunas(itens, { altura: 150, rotularValores: [0, itens.length - 1] })}</div>` : ''}
  </section>
  <section class="cartao faturas-lista">${meses}</section>`;
}

// Recorrentes do cartão (v6.3): a lista das assinaturas; no celular de quem publica, tocar edita ou cancela
function recorrentesCartao(dados, opcoes = {}) {
  const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const lista = (it?.assinaturas || []).map((a, i) => ({ ...a, i })).sort((x, y) => (x.dia ?? 99) - (y.dia ?? 99) || y.valor - x.valor); // pedido do Bruno (01/11): por dia, como Contas
  if (!lista.length && !opcoes.github) return '';
  const total = lista.reduce((s, a) => s + a.valor, 0);
  const aberto = (opcoes.abertos || new Set()).has('recorrentes');
  const linhaRec = a => {
    const cat = a.cat || adivinharCategoria(a.nome);
    const rev = (opcoes.assinaturas || []).find(x => x.nome === a.nome);
    const fora = a.foraDoMes === dados.periodo; // v9.8.2: tirada só desta fatura
    const dentro = `${iconeCategoria(cat || 'Others', 'peq')}<span class="rec-nome">${esc(a.nome)}<small>dia ${esc(a.dia ?? '?')}${cat ? ` · ${esc(nomeCategoria(cat))}` : ''}${fora ? ' · fora deste mês, volta no próximo' : ''}</small>${rev?.subiu ? `<small class="sobe">${icTom('atencao')}subiu ${brl(rev.subiu.diferenca)} desde ${esc(mesCurto(rev.subiu.mes))}</small>` : ''}</span><b>${brl(a.valor)}</b>`;
    return opcoes.github ? `<li><button type="button" class="rec-linha" data-assinatura="${a.i}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
  };
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Recorrentes no cartão</h2>${opcoes.github ? '<button type="button" class="link" data-nova-recorrente>Adicionar</button>' : ''}</div>
    ${lista.length ? (() => { const subiram = (opcoes.assinaturas || []).filter(x => x.subiu).length; const semRev = (opcoes.assinaturas || []).filter(x => x.semRevisao).length; return `<button type="button" class="link-extrato revisar" data-revisar-assinaturas>${svg('<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/>')}<span><b>Revisar assinaturas</b><small>${subiram ? `${subiram} ${subiram === 1 ? 'subiu' : 'subiram'} de preço · ` : ''}${semRev} sem revisão há mais de 3 meses</small></span></button>`; })() : ''}
    <p class="cartao-sub">${lista.length} ${lista.length === 1 ? 'cobrança' : 'cobranças'} · ${brl(total)} por mês (${brl0(total * 12)} por ano) · entram em todas as próximas faturas${opcoes.github ? '. Toque para editar ou cancelar.' : '.'}</p>
    <ul class="recorrentes">${(aberto ? lista : lista.slice(0, 6)).map(linhaRec).join('')}</ul>
    ${lista.length > 6 && !aberto ? `<button type="button" class="link" data-abrir="recorrentes">Ver todas (${lista.length})</button>` : ''}
  </section>`;
}

// ---------- v7: Caixa › Contas — todas as contas do mês, editáveis no celular de quem publica ----------
const ROTULO_RECEITA = Object.fromEntries(CATEGORIAS_RECEITA);
// v8.7: atalho para o extrato do mês com busca (app.js → abrirExtrato)
function linkExtrato() {
  return `<button type="button" class="cartao link-extrato" data-extrato-abrir>
    ${svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>')}
    <span><b>Extrato do mês</b><small>Busque em tudo: contas, cartão e investimentos</small></span>
  </button>`;
}

function contasDoMes(dados, ctx, opcoes = {}, m = null) {
  const gh = !!opcoes.github;
  const linhas = [];
  const add = (lista, it, grupo, sinal) => linhas.push({ lista, it, grupo, sinal });
  (dados.receitas || []).forEach(it => add('receitas', it, tickerDividendo(it.descricao) ? 'inv' : 'entra', 1));
  (dados.despesasFixas || []).forEach(it => add('despesasFixas', it, 'sai', -1));
  // a fatura do cartão (var-itau) é paga no mês seguinte: fica na aba Cartão, não nas saídas deste mês
  (dados.despesasVariaveis || []).filter(it => it.id !== 'var-itau' && !it.cicloSeguinte).forEach(it => add('despesasVariaveis', it, 'sai', -1));
  (dados.obrigacoesCaixa || []).forEach(it => add('obrigacoesCaixa', it, 'sai', -1));
  (dados.resgates || []).forEach(it => add('resgates', it, 'inv', 1));
  (dados.ajustesCaixa || []).forEach(it => add('ajustesCaixa', it, it.categoria === 'investimento' ? 'inv' : it.valor >= 0 ? 'entra' : 'sai', Math.sign(it.valor) || 1));
  const conf = it => it.status === 'confirmado';
  const linhaConta = ({ lista, it, sinal }) => {
    const v = sinal * Math.abs(it.valor);
    const entrada = sinal > 0;
    const pulado = it.puladoApp === dados.periodo; // v9.8.2: fora só deste mês
    const estado = pulado ? 'fora deste mês · volta no próximo' : conf(it) ? (entrada ? 'recebido' : 'pago') : entrada ? 'a receber' : 'a pagar';
    // dividendo: o nome já diz ("Dividendo HGLG11"); código cru do agente ganha maiúscula
    const cat = lista === 'receitas' ? (tickerDividendo(it.descricao) ? '' : ROTULO_RECEITA[it.categoria] || (it.categoria ? it.categoria.charAt(0).toUpperCase() + it.categoria.slice(1) : ''))
      : it.ativo ? nomeAtivo(it.ativo) : it.categoria ? categoriaDoItem(it) : '';
    const dia = it.dia ? `<span class="conta-dia${it.dia === ctx.diaHoje && !ctx.mesPassou ? ' hoje' : ''}"><b>${pad(it.dia)}</b></span>` : '<span class="conta-dia"><b>—</b></span>';
    const dentro = `${dia}<span class="rec-nome">${esc(nomeCurto(it.descricao))}<small><span class="${conf(it) || pulado ? '' : 'pendente'}">${estado}</span>${cat ? ` · ${esc(cat)}` : ''}${it.origem === 'app' || it.editadoApp ? ' · app' : ''}</small></span><b class="${entrada ? 'bom' : ''}">${pulado ? `<s>${brl(sinal * (it.valorBase || 0))}</s>` : `${entrada ? '+' : ''}${brl(v)}`}</b>`;
    // v9.5: conta pendente ganha o "Paguei/Recebi" na própria linha (antes: abrir a conta para marcar)
    const pagar = gh && !pulado && !conf(it) && ['receitas', 'despesasFixas', 'despesasVariaveis', 'obrigacoesCaixa'].includes(lista)
      ? `<button type="button" class="conta-pagar" data-pagar="${esc(lista)}|${esc(it.id)}">${entrada ? 'Recebi' : 'Paguei'}</button>` : '';
    return gh ? `<li${pagar ? ' class="com-acao"' : ''}><button type="button" class="rec-linha" data-conta="${esc(lista)}|${esc(it.id)}">${dentro}</button>${pagar}</li>` : `<li class="rec-linha">${dentro}</li>`;
  };
  const bloco = (grupo, titulo, vazio) => {
    const l = linhas.filter(x => x.grupo === grupo).sort((a, b) => (a.it.dia ?? 99) - (b.it.dia ?? 99));
    if (!l.length && !gh) return '';
    const total = l.reduce((s, x) => s + x.sinal * Math.abs(x.it.valor), 0);
    const feito = l.filter(x => conf(x.it)).reduce((s, x) => s + x.sinal * Math.abs(x.it.valor), 0);
    const chave = `contas:${grupo}`;
    const aberto = (opcoes.abertos || new Set()).has(chave);
    const mostrar = aberto ? l : l.slice(0, 8);
    return `<section class="cartao">
      <div class="cartao-topo"><h2>${titulo}</h2><b class="${total > 0 ? 'bom' : ''}">${total > 0 ? '+' : ''}${brl(total)}</b></div>
      <p class="cartao-sub">${l.length ? `${l.length} ${l.length === 1 ? 'item' : 'itens'} · ${grupo === 'sai' ? 'já pago' : grupo === 'entra' ? 'já recebido' : 'já feito'} ${brl(Math.abs(feito))}` : vazio}</p>
      <ul class="recorrentes contas-mes">${mostrar.map(linhaConta).join('')}</ul>
      ${l.length > mostrar.length ? `<button type="button" class="link" data-abrir="${chave}">Ver todos (${l.length})</button>` : ''}
    </section>`;
  };
  // v7.7: Agenda e Contas mostram os mesmos itens — o que a agenda do painel tem e esta lista não tinha entra aqui
  const mostrados = new Set(linhas.map(x => x.it));
  const soAgenda = (m?.tl?.porDia || []).flatMap(p => p.eventos.map(e => ({ e, dia: p.dia, it: e.key ? dados[e.key]?.[e.idx] : null })))
    .filter(({ e, it }) => Math.abs(e.valor) >= 0.5 && !mostrados.has(it) && it?.id !== 'var-itau');
  const outros = soAgenda.length ? `<section class="cartao">
      <div class="cartao-topo"><h2>Outros itens da agenda</h2></div>
      <p class="cartao-sub">Aparecem na agenda do painel${soAgenda.some(x => !x.it || !LISTAS_CAIXA.includes(x.e.key)) ? '. Os sem botão o painel do agente calcula sozinho: para mudar, peça ao Claude no fechamento do mês' : ''}.</p>
      <ul class="recorrentes contas-mes">${soAgenda.map(({ e, dia, it }) => {
        const dentro = `<span class="conta-dia"><b>${pad(dia)}</b></span><span class="rec-nome">${esc(nomeCurto(e.desc))}<small>${it && LISTAS_CAIXA.includes(e.key) ? (e.status === 'confirmado' ? 'feito' : 'previsto') : 'calculado pelo painel'}</small></span><b class="${e.valor > 0 ? 'bom' : ''}">${e.valor > 0 ? '+' : ''}${brl(e.valor)}</b>`;
        return gh && it && LISTAS_CAIXA.includes(e.key) ? `<li><button type="button" class="rec-linha" data-conta="${esc(e.key)}|${esc(it.id)}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
      }).join('')}</ul>
    </section>` : '';
  return [botoesContas(ctx, gh, 'conta'), bloco('entra', 'Entradas', 'Nenhuma entrada.'), bloco('sai', 'Saídas', 'Nenhuma saída.'), bloco('inv', 'Investimentos e dividendos', 'Nenhum aporte, resgate ou dividendo este mês.'), outros].join('');
}
function botoesContas(ctx, gh, onde) {
  if (!gh) return '';
  // v8.5: na Agenda da interface nova, só os três botões, sem cartão nem texto
  if (onde === 'agenda-v8') return `<nav class="acoes-rapidas" aria-label="Adicionar ao mês">
      <button type="button" class="botao-sec" data-nova-conta="receita">+ Entrada</button>
      <button type="button" class="botao-sec" data-nova-conta="despesa">+ A pagar</button>
      <button type="button" class="botao-sec" data-investir="aporte">+ Investir</button>
    </nav>`;
  return `<section class="cartao contas-acoes">
      <div class="cartao-topo"><h2>${onde === 'agenda' ? 'Mudou alguma coisa?' : 'Contas do mês'}</h2></div>
      <p class="cartao-sub">${onde === 'agenda' ? 'Toque no nome de um item da agenda para editar valor, dia ou categoria, marcar como pago ou excluir.' : `Tudo o que entra e sai do caixa em ${MESES[ctx.mes - 1]}. Toque numa conta para editar, marcar como paga ou excluir.`}</p>
      <div class="modelo-botoes">
        <button type="button" class="botao-sec" data-nova-conta="receita">+ Entrada</button>
        <button type="button" class="botao-sec" data-nova-conta="despesa">+ A pagar</button>
        <button type="button" class="botao-sec" data-investir="aporte">+ Investir</button>
      </div>
    </section>`;
}

// ---------- v7: Carteira — movimentar (quem publica) e ganhos e perdas (todos) ----------
function movimentarCarteira(opcoes) {
  if (!opcoes.github) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Movimentar</h2></div>
    <p class="cartao-sub">Valores de hoje do app do Itaú, aportes, resgates e dividendos. Caixa e carteira mudam juntos.</p>
    <div class="botoes-grade">
      <button type="button" class="botao-sec" data-investir="valores">Atualizar valores</button>
      <button type="button" class="botao-sec" data-investir="aporte">Aporte</button>
      <button type="button" class="botao-sec" data-investir="resgate">Resgate</button>
      <button type="button" class="botao-sec" data-investir="dividendo">Dividendo</button>
    </div>
  </section>`;
}

const sinalBrl = v => `${v > 0 ? '+' : ''}${brl(v)}`;
function ganhosPerdas(cart, abertos = new Set()) {
  const r = resultadoDoMes(cart);
  if (!r.mes) return '';
  const { longo } = rotuloMes(r.mes);
  const tom = v => (v > 0 ? 'bom' : v < 0 ? 'ruim' : '');
  const atu = [...r.atualizacoes].reverse();
  const movs = r.fluxos.filter(f => f.tipo === 'aporte' || f.tipo === 'resgate');
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Ganhos e perdas</h2><span class="cartao-sub">${esc(longo)}${r.emAndamento ? ' · até agora' : ''}</span></div>
    <ul class="linhas">
      ${r.mercado != null ? linha('Resultado de mercado', sinalBrl(r.mercado), tom(r.mercado)) : ''}
      ${linha('Dividendos (foram para o caixa)', brl(r.dividendos))}
      ${Object.entries(r.dividendosDetalhe).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<li class="sub"><span>${esc(nomeAtivo(k))}</span><b>${brl(v)}</b></li>`).join('')}
      ${r.aportes ? linha('Aportes', brl(r.aportes)) : ''}
      ${r.resgates ? linha('Resgates', brl(r.resgates)) : ''}
    </ul>
    <p class="nota">Ganho ou perda de valor muda o patrimônio, não o caixa. Mercado = variação do patrimônio − aportes + resgates.</p>
    ${atu.length ? `<h3 class="sub-titulo">Atualizações de valor pelo app</h3>
      ${atu.map((a, i) => {
        const chave = `ganhos:${r.mes}:${atu.length - i}`;
        return `<details class="dobra pn-dobra" data-chave="${esc(chave)}"${abertos.has(chave) ? ' open' : ''}>
          <summary><span class="pn-dobra-t">${esc(a.data.split('-').reverse().slice(0, 2).join('/'))}${a.hora ? ` às ${esc(a.hora)}` : ''}</span><b class="${tom(a.total)}">${sinalBrl(a.total)}</b></summary>
          <div class="pn-dobra-c"><ul class="linhas">${a.itens.map(x => linha(`${esc(nomeAtivo(x.ativo))} <small>${brl(x.antes)} → ${brl(x.depois)}</small>`, sinalBrl(x.depois - x.antes), tom(x.depois - x.antes))).join('')}</ul></div>
        </details>`;
      }).join('')}` : ''}
    ${movs.length ? `<h3 class="sub-titulo">Aportes e resgates</h3>
      <ul class="linhas">${movs.map(f => linha(`${f.tipo === 'aporte' ? 'Aporte' : 'Resgate'} · ${esc(nomeAtivo(f.ativo))}${f.data ? ` <small>${esc(f.data.split('-').reverse().slice(0, 2).join('/'))}</small>` : ''}`, `${f.tipo === 'aporte' ? '+' : '−'}${brl(f.valor)}`)).join('')}</ul>` : ''}
  </section>`;
}

function assinaturas({ assin }) {
  if (!assin?.length) return '';
  const total = assin.reduce((s, a) => s + (a.media || 0), 0);
  return `<section class="cartao">
    <details class="dobra">
      <summary><div><h2>Assinaturas e fixos no cartão</h2><p class="cartao-sub">${assin.length} itens · ${brl(total)} por mês</p></div></summary>
      <ul class="linhas">${[...assin].sort((a, b) => b.media - a.media).map(a => linha(esc(a.cat), brl(a.media))).join('')}</ul>
    </details>
  </section>`;
}

function abaCartao(m, dados, ctx) {
  return [
    secao(() => faturaHero(m, dados, ctx)),
    secao(() => projecaoCartao(m, dados)),
    secao(() => categoriasCartao(dados)),
    secao(() => historicoFaturas(m, dados, ctx)),
    secao(() => parcelasFuturas(m, dados)),
    secao(() => assinaturas(m)),
  ].join('');
}

// ---------- FUTURO ----------
function grafico12({ p12 }) {
  const meses = p12?.meses;
  if (!meses?.length) return '';
  const abrev = m => (m.label || '').slice(0, 3);
  const dicas = meses.map(m => `${m.labelLongo || m.label}: termina com ${brl0(m.final)} · resultado ${m.resultado >= 0 ? '+' : ''}${brl0(m.resultado)}${m.min < 0 ? ` · pior dia ${brl0(m.min)} (dia ${m.minDia})` : ''}`);
  return `${linhas([
      { nome: 'Saldo no fim do mês', classe: 's1', valores: meses.map(m => m.final) },
      { nome: 'Pior dia do mês', classe: 's2', valores: meses.map(m => m.min), marcarNegativos: true },
    ], { dicas, rotulosX: meses.map((m, i) => ({ i, texto: abrev(m) })).filter((_, i) => i % 2 === 0) })}
    <ul class="legenda horizontal">
      <li><i class="s1"></i>Saldo no fim do mês</li><li><i class="s2"></i>Pior dia do mês</li>
    </ul>`;
}

// v9.9.7: Caixa › 12 meses (o Bruno: "não entendo nada daquela parte"). Antes: o saldo ACUMULADO como se nada fosse
// investido, três vezes (lista, gráfico, simulador). Agora: a sobra de cada mês (o que dá para investir) e com quanto
// começar o mês para não ficar no vermelho antes do salário. Os números são todos do motor (projecao12 do painel).
function mesesCaixa(m, abertos = new Set()) {
  const meses = m.p12?.meses;
  if (!meses?.length) return '';
  const r = resumoMeses(meses);
  const media = r.reduce((s, x) => s + x.sobra, 0) / r.length;
  const negativos = r.filter(x => x.sobra < 0).length, vermelho = r.filter(x => x.vermelho).length;
  const colchao = Math.max(...r.map(x => x.colchao));
  const max = Math.max(...r.map(x => Math.abs(x.sobra)), 1);
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  return `<section class="cartao hero">
    <p class="rotulo">Sobra por mês, em média</p>
    <p class="hero-valor${media < 0 ? ' ruim' : ''}">${brl0(media)}</p>
    <p class="hero-sub">Sobra = o que entra menos o que sai no mês. É o que dá para investir — por isso aqui um mês não soma no outro.</p>
    <div class="chips">
      ${negativos ? chip('atencao', `${plural(negativos, 'mês gasta', 'meses gastam')} mais do que entra`) : chip('bom', 'Todo mês entra mais do que sai')}
      ${colchao ? chip('info', `Comece cada mês com ${brl0(colchao)} na conta`) : ''}
      ${vermelho ? chip('ruim', `${plural(vermelho, 'mês fica', 'meses ficam')} no vermelho em algum dia`) : ''}
    </div>
  </section>
  <section class="cartao">
    <div class="cartao-topo"><h2>Mês a mês</h2></div>
    <p class="cartao-sub">A sobra de cada mês e com quanto ele precisa começar (a conta desce antes do salário). Toque para ver o que entra e o que sai.</p>
    <div class="meses12">${r.map(x => { const chave = `m12:${x.label}`; return `<details class="m12" data-chave="${esc(chave)}"${abertos.has(chave) ? ' open' : ''}>
      <summary class="mam-linha"><span class="mam-mes">${esc(x.label)}</span>
        <span class="mam-barra"><i style="width:${Math.max(2, (Math.abs(x.sobra) / max) * 100).toFixed(1)}%" class="${x.sobra < 0 ? 'neg' : ''}"></i></span>
        <b class="${x.sobra < 0 ? 'ruim' : ''}">${x.sobra > 0 ? '+' : ''}${brl0(x.sobra)}</b>
        <small class="mam-nota">${x.vermelho ? `${icTom('ruim')}vermelho no dia ${x.minDia} · ` : ''}começar com ${brl0(x.colchao)}${x.fora.length ? ` · ${x.fora.slice(0, 2).map(e => esc(nomeCurto(e.desc))).join(', ')}` : ''}</small>
      </summary>
      <ul class="linhas">${linha('Entra', brl(x.entra), 'bom')}${linha('Sai', brl(-x.sai))}${linha('Sobra do mês', brl(x.sobra), x.sobra < 0 ? 'ruim' : '')}${linha(`Mais baixo: dia ${x.minDia}`, `${brl(x.colchao)} abaixo do começo`)}</ul>
      <ul class="linhas m12-evs">${x.evs.map(e => linha(`${pad(e.dia)} · ${esc(nomeCurto(e.desc))}${e.est ? ' <small>estimado</small>' : ''}`, `${e.valor > 0 ? '+' : ''}${brl(e.valor)}`, e.valor > 0 ? 'bom' : '')).join('')}</ul>
    </details>`; }).join('')}</div>
  </section>`;
}

function dozeMeses(m) {
  const meses = m.p12?.meses;
  if (!meses?.length) return '';
  const positivos = meses.filter(m => m.resultado >= 0).length;
  const comVermelho = meses.filter(m => m.min < 0).length;
  const fim = meses[meses.length - 1];
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Próximos 12 meses</h2></div>
    <p class="cartao-sub">${positivos} de ${meses.length} meses fecham positivos${comVermelho ? ` · ${comVermelho} ${comVermelho === 1 ? 'tem' : 'têm'} algum dia com a conta no vermelho` : ' · nenhum dia no vermelho'}.</p>
    ${grafico12(m)}
    <p class="nota">Em ${fim.labelLongo || fim.label}, a projeção termina com <b>${brl0(fim.final)}</b> na conta. Toque no gráfico para ver cada mês.</p>
  </section>`;
}

function decimoTerceiro(dados) {
  const p = dados.projecaoDecimoTerceiroEPPR;
  const r = p?.resumo;
  if (!r) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>13º e PPR</h2></div>
    <p class="destaque-txt"><b>${brl(r.totalGeralLiquido)}</b> líquidos a receber</p>
    <ul class="linhas">
      ${r.totalNovembro ? linha('Novembro', brl(r.totalNovembro), 'bom') : ''}
      ${r.totalDezembro ? linha('Dezembro', brl(r.totalDezembro), 'bom') : ''}
    </ul>
    ${r.totalNovembroDetalhe ? `<p class="nota">${esc(r.totalNovembroDetalhe)}</p>` : ''}
  </section>`;
}

function graficoPatrimonio({ c, plp }) {
  if (!plp?.meses?.length) return '';
  const inicio = plp.patrimonioInicial ?? c.patTotal;
  const pontos = [{ x: 0, y: inicio, dica: `Hoje: ${brl0(inicio)}` }].concat(plp.meses.map((m, i) => ({ x: i + 1, y: m.patrimonio, dica: `${m.mesLabel}/${String(m.ano).slice(2)}: ${brl0(m.patrimonio)}` })));
  const anos = (plp.porAno || []).map((a, i, arr) => {
    const idx = plp.meses.findIndex(m => m.ano === a.ano);
    return { x: idx + 1, texto: String(a.ano), i, total: arr.length };
  }).filter(r => r.x > 0 && r.i % 2 === 1);
  return linhaSaldo(pontos, { altura: 160, destaqueMin: false, rotulosX: anos, rotuloFim: true, formatoY: v => compacto(v) });
}

function patrimonio(m) {
  const { c, plp } = m;
  if (!plp?.meses?.length) return '';
  const inicio = plp.patrimonioInicial ?? c.patTotal;
  const taxa = plp.TAXA_MENSAL ? `${(plp.TAXA_MENSAL * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% ao mês` : '';
  const ultimo = plp.meses[plp.meses.length - 1];
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Patrimônio</h2></div>
    <div class="par">
      <div><p class="rotulo">Hoje</p><p class="tile-valor">${brl0(inicio)}</p></div>
      <div><p class="rotulo">Em ${ultimo.ano}</p><p class="tile-valor">${brl0(plp.patrimonioFinal ?? ultimo.patrimonio)}</p></div>
    </div>
    ${graficoPatrimonio(m)}
    <p class="nota">Projeção do painel${taxa ? `, supondo rendimento de ${taxa}` : ''} e o padrão de gastos atual.</p>
  </section>`;
}

function graficoAlocacao(dados) {
  const p = dados.patrimonio, alvo = dados.targetAlocacao;
  if (!p || !alvo) return '';
  const classes = [
    ['Renda fixa / fundos', (p.fundos || 0), alvo.fundos],
    ['ETFs e FIIs', (p.etfs || 0) + (p.fiis || 0), alvo.etfsFiis],
    ['Ouro', p.ouro || 0, alvo.ouro],
    ['Dólar', p.dolar || 0, alvo.dolar],
    ['Cripto', p.cripto || 0, alvo.cripto],
  ].filter(x => x[2] !== undefined);
  const total = classes.reduce((s, x) => s + x[1], 0);
  if (!total) return '';
  const max = Math.max(...classes.map(x => Math.max(x[1] / total * 100, x[2]))) / 100;
  return `<ul class="alocacao">${classes.map(([nome, valor, meta]) => {
      const pct = valor / total * 100;
      const dif = pct - meta;
      return `<li data-dica="${esc(`${nome}: ${pct.toFixed(1).replace('.', ',')}% (alvo ${meta}%) · ${brl0(valor)}`)}">
        <div class="bh-topo"><span>${esc(nome)}</span><b>${pct.toFixed(0)}% <small>alvo ${meta}%</small></b></div>
        ${medidor(pct / 100 / max, { classe: 'destaque', marca: meta / 100 / max })}
        ${Math.abs(dif) > 3 ? `<p class="nota">${dif > 0 ? 'Acima' : 'Abaixo'} do alvo em ${Math.abs(dif).toFixed(0)} pontos</p>` : ''}
      </li>`;
    }).join('')}</ul>
  </section>`;
}

function abaFuturo(m, dados) {
  return [secao(() => dozeMeses(m)), secao(() => decimoTerceiro(dados)), secao(() => patrimonio(m)), secao(() => alocacao(dados))].join('');
}

// ---------- ANÁLISES ----------
function scoreCartao({ sc }) {
  if (!sc || typeof sc.total !== 'number') return '';
  const tom = sc.status === 'CRÍTICO' ? 'ruim' : sc.status === 'ATENÇÃO' ? 'atencao' : 'bom';
  return `<section class="cartao">
    <div class="score">
      <div class="score-anel tom-${tom}">${anel(sc.total / 100)}<div><b>${sc.total}</b><span>de 100</span></div></div>
      <div><p class="rotulo">Saúde financeira do mês</p><h3>${chip(tom, esc(maiuscula(String(sc.status).toLowerCase())))}</h3>
      <p class="cartao-sub">Nota do painel a partir de ${sc.crit?.length || 0} critérios.</p></div>
    </div>
    ${sc.crit?.length ? `<details class="dobra"><summary><span class="link">Ver os critérios</span></summary><ul class="criterios">${sc.crit.map(k => {
      const pts = Math.round((k.v || 0) * k.p);
      return `<li><div class="bh-topo"><span>${esc(k.n)}</span><b>${pts}/${k.p}</b></div>${medidor(k.v || 0, { classe: k.v >= 0.8 ? 'bom' : k.v >= 0.4 ? 'atencao' : 'ruim' })}${k.d ? `<p class="nota">${esc(k.d)}</p>` : ''}</li>`;
    }).join('')}</ul></details>` : ''}
  </section>`;
}

function alertasCompletos({ alertas }) {
  if (!alertas?.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Alertas</h2></div>
    <ul class="alertas">${alertas.map(a => `<li>${icTom(a.tom)}<div><b>${esc(a.titulo)}</b><p>${a.texto}</p></div></li>`).join('')}</ul>
  </section>`;
}

function textoCorrido(titulo, paragrafos) {
  if (!paragrafos?.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>${titulo}</h2></div>
    <div class="texto">${paragrafos.map(p => `<p>${p}</p>`).join('')}</div>
  </section>`;
}

// Análises escritas pelo agente no JSON (campo "analises" — ver docs/ROADMAP.md).
function analisesAgente(dados, { github, carteira }) {
  // v8.10: as análises da carteira (campo "analises" do JSON da carteira) entram na mesma lista, marcadas
  const validas = (l, de) => (Array.isArray(l) ? l.filter(a => a && (a.titulo || a.texto)).map(a => ({ ...a, de })) : []);
  const lista = [...validas(dados.analises, 'caixa'), ...validas(carteira?.analises, 'carteira')];
  if (!lista.length) {
    return github ? `<section class="cartao dica-agente">
      <div class="cartao-topo"><h2>Análises do agente</h2></div>
      <p class="cartao-sub">Ainda vazio. Peça ao Agente Financeiro para registrar as análises da conversa no campo <b>analises</b> do JSON — elas aparecem aqui para vocês dois. O texto pronto está no README.</p>
    </section>` : '';
  }
  const tons = { alerta: 'ruim', atencao: 'atencao', dica: 'ideia', conquista: 'bom', info: 'info' };
  const ordenada = [...lista].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Análises do agente</h2></div>
    <ul class="analises">${ordenada.map(a => {
      const tom = tons[a.tipo] || 'info';
      const [, mm, d] = String(a.data || '').split('-');
      // v8.7: o texto é do dia em que o Claude escreveu; se os números mudaram depois, o app diz
      const velha = a.de === 'caixa' && a.data && dados.ultimaAtualizacao && String(dados.ultimaAtualizacao) > String(a.data);
      return `<li>
        <div class="analise-topo">${tom === 'ideia' ? svg(ICONE_IDEIA, 'tom-ideia') : icTom(tom)}<b>${esc(a.titulo || '')}</b>${d ? `<span>${a.de === 'carteira' ? 'Carteira · ' : ''}${d}/${mm}</span>` : a.de === 'carteira' ? '<span>Carteira</span>' : ''}</div>
        ${velha ? `<p class="carimbo">Escrito com os dados de ${d}/${mm} · os números mudaram depois</p>` : ''}
        ${a.texto ? `<p>${esc(a.texto).replace(/\n/g, '<br>')}</p>` : ''}
        ${a.acao ? `<p class="analise-acao"><b>O que fazer:</b> ${esc(a.acao)}</p>` : ''}
      </li>`;
    }).join('')}</ul>
  </section>`;
}

function graficoMesesFechados(dados) {
  const lista = (dados.mesesFechados || []).filter(m => m.resultado && typeof m.resultado.saldo === 'number');
  if (!lista.length) return '';
  const itens = lista.map(m => {
    const mm = Number(m.periodo.split('-')[1]);
    return { rotulo: MES3[mm - 1], valor: m.resultado.saldo, classe: m.resultado.saldo < 0 ? 'neg' : 'pos', dica: `${m.periodoLabel || m.periodo}: ${m.resultado.saldo >= 0 ? '+' : ''}${brl(m.resultado.saldo)}${m.resultado.statusFinal ? ` · ${m.resultado.statusFinal}` : ''}` };
  });
  return colunas(itens, { altura: 150, rotularValores: itens.map((_, i) => i) });
}

// v7.9: contas dos próximos meses com valor já conhecido (gravadas em Caixa › Contas › conta › Próximos meses)
function valoresConhecidos(dados) {
  const l = dados.valoresConhecidos || [];
  if (!l.length) return '';
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Valores já conhecidos</h2></div>
    <p class="cartao-sub">${dados.valoresConhecidosLidos ? 'Já estão na projeção acima.' : 'Entram na projeção acima depois do próximo fechamento com o Claude.'}</p>
    <ul class="linhas">${l.map(v => { const [a, mm] = v.mes.split('-').map(Number); return linha(`${esc(v.descricao)} · ${MES3[mm - 1]}/${String(a).slice(2)}`, brl(v.valor)); }).join('')}</ul>
  </section>`;
}

function mesesFechados(dados) {
  const g = graficoMesesFechados(dados);
  return g ? `<section class="cartao">
    <div class="cartao-topo"><h2>Como os últimos meses fecharam</h2></div>
    ${g}
  </section>` : '';
}

function abaAnalises(m, dados, _ctx, opcoes) {
  return [
    secao(() => scoreCartao(m)),
    secao(() => analisesAgente(dados, opcoes)),
    secao(() => alertasCompletos(m)),
    secao(() => textoCorrido('Leitura do mês', m.leitura)),
    secao(() => textoCorrido('Destaques', m.insights)),
    secao(() => mesesFechados(dados)),
  ].join('');
}


// ---------- v3/v4: tudo o que os painéis mostram, em sub-abas ----------
// Os blocos do painel de cashflow e do painel da carteira são traduzidos (traduzir.js) e
// distribuídos pelas abas. Os gráficos SVG dos painéis são trocados pelos gráficos do app.
// Bloco desconhecido (o agente criou um novo) cai na sub-aba padrão da seção dele — nada fica de fora.
// As seções da carteira chegam com o prefixo "c-" (c-visao, c-aloc…).
export const SUBABAS = {
  mes: [['geral', 'Visão geral'], ['agenda', 'Agenda'], ['contas', 'Contas'], ['meses', '12 meses']],
  cartao: [['fatura', 'Fatura'], ['gastos', 'Gastos'], ['parcelas', 'Parcelas']],
  carteira: [['visao', 'Visão'], ['aloc', 'Alocação'], ['ativos', 'Ativos'], ['renda', 'Renda'], ['futuro', 'Evolução']],
  analises: [['saude', 'Saúde'], ['mercado', 'Mercado'], ['historico', 'Histórico'], ['conferir', 'Conferir']],
};

const LUGAR_PADRAO = {
  visao: 'mes/geral', calendario: 'mes/agenda', cartao: 'cartao/fatura', projecao: 'mes/meses',
  patrimonio: 'carteira/visao', historico: 'analises/historico', insights: 'analises/saude',
  'c-plano': 'carteira/visao', 'c-visao': 'carteira/visao', 'c-evol': 'carteira/futuro', 'c-aloc': 'carteira/aloc',
  'c-ativos': 'carteira/ativos', 'c-bench': 'carteira/futuro', 'c-renda': 'carteira/renda', // v8.4: desempenho × índices é evolução
  'c-mkt': 'analises/mercado', 'c-usd': 'analises/mercado', 'c-alertas': 'analises/saude',
};
// [seção do painel, título do bloco (ou tipo: kpis/callout/acao), destino] — null = já está no app
const LUGARES = [
  ['visao', /12 meses/i, null], // v9.9.7: o gráfico do saldo acumulado saiu (mesesCaixa mostra a sobra de cada mês)
  ['visao', /^curva de caixa/i, null], // vira o destaque de Caixa › Visão geral
  ['calendario', /^padrão de vencimentos/i, null], // v7.8: texto fixo, sem ação — o Bruno pediu para tirar (fica no painel original)
  ['cartao', /^parcelas do cartão nos próximos meses/i, null], // v9.5: repetia as Próximas faturas (que agora editam cada parcela)
  ['cartao', /parcela|assinatura/i, 'cartao/parcelas'],
  ['cartao', /categoria|base recorrente|fatura por m/i, 'cartao/gastos'],
  ['projecao', /^(callout|kpis)$|como ler|patrim|ano a ano/i, 'carteira/futuro'],
  ['patrimonio', /aloca|prioridade de aporte/i, 'carteira/aloc'],
  ['insights', /saldo do banco|confer|o que atualizar|premissa/i, 'analises/conferir'],
  ['insights', /onde cortar|ritmo por categoria/i, 'cartao/gastos'],
  ['insights', /assinatura/i, null], // v8.3: repetia "Recorrentes no cartão" (o custo por ano foi para lá)
  ['insights', /^score/i, null], // o app mostra o score com anel e critérios
  ['insights', /^acao$/, null], // a próxima ação abre o Início
  ['c-renda', /aposentadoria/i, 'carteira/futuro'],
  ['c-visao', /term[oô]metro/i, 'carteira/futuro'], // v8.4: aportes × mercado desde o início = evolução
];
// Com o painel da carteira carregado, o que o cashflow só copia dela deixa de aparecer (a carteira é a fonte)
const COPIA_DA_CARTEIRA = /^kpis$|^aloca|prioridade de (aporte|resgate)/i;

function lugarDoBloco(b, temCarteira) {
  const nome = b.titulo || b.tipo;
  if (temCarteira && b.secao === 'patrimonio' && COPIA_DA_CARTEIRA.test(nome)) return null;
  const regra = LUGARES.find(([sec, re]) => sec === b.secao && re.test(nome));
  return regra ? regra[2] : LUGAR_PADRAO[b.secao] || 'analises/saude';
}

export function subPadrao(aba) {
  return SUBABAS[aba]?.[0][0] || '';
}

function trocasDeGraficos(m, dados, ctx) {
  return {
    runwayChart: () => graficoCurva(m, ctx),
    mini12: () => grafico12(m),
    projLPChart: () => graficoPatrimonio(m),
    itauHistChart: () => graficoFaturas(m, dados, ctx),
    compromissosTimeline: () => graficoParcelas(m),
    // v7.8: meses fechados do mais recente para o mais antigo (o painel lista do mais antigo); o gráfico segue no tempo
    tblHistorico: (original, el) => {
      const corpo = (el.matches('table') ? el : el.querySelector('table'))?.tBodies[0];
      const linhas = corpo ? [...corpo.rows] : [];
      const meses = linhas.filter(l => !l.classList.contains('total'));
      meses.reverse().concat(linhas.filter(l => l.classList.contains('total'))).forEach(l => corpo.appendChild(l));
      try {
        return `${graficoMesesFechados(dados)}${original()}`;
      } finally {
        linhas.forEach(l => corpo.appendChild(l)); // devolve o painel (motor) como estava
      }
    },
    tblTarget: original => {
      const g = graficoAlocacao(dados);
      return g ? `${g}<details class="dobra pn-dobra"><summary><span class="pn-dobra-t">Ver a tabela</span></summary><div class="pn-dobra-c">${original()}</div></details>` : null;
    },
  };
}

// ---------- carteira ----------
const rotuloMes = chave => {
  const [a, mm] = chave.split('-').map(Number);
  return { curto: MES3[mm - 1], longo: `${maiuscula(MESES[mm - 1])}/${String(a).slice(2)}` };
};
const valorMes = h => h.patrimonio_total ?? h.patrimonio_parcial
  ?? Object.values(h.composicao || {}).reduce((s, c) => s + (c.valor || 0), 0);

function graficoEvolucaoCarteira(cart) {
  const meses = Object.keys(cart.historico_mensal || {}).sort();
  const pontos = meses.map((k, i) => {
    const h = cart.historico_mensal[k];
    const v = valorMes(h);
    return { x: i, y: v, dica: `${rotuloMes(k).longo}${h.status === 'em_andamento' ? ' (até agora)' : ''}: ${brl0(v)}${h.aportes ? ` · aportes ${brl0(h.aportes)}` : ''}${h.resgates ? ` · resgates ${brl0(h.resgates)}` : ''}` };
  }).filter(p => p.y > 0);
  if (pontos.length < 2) return null;
  const rotulos = pontos.filter((_, i) => i % 2 === 0 || i === pontos.length - 1).map(p => ({ x: p.x, texto: rotuloMes(meses[p.x]).curto }));
  return `${linhaSaldo(pontos, { altura: 170, destaqueMin: false, rotuloFim: true, rotulosX: rotulos, formatoY: v => compacto(v), incluirZero: false })}
    <p class="nota">Patrimônio no fim de cada mês; o último ponto é o mês em andamento. Toque para ver aportes e resgates.</p>`;
}

function graficoDividendos(cart) {
  const meses = Object.keys(cart.historico_mensal || {}).sort().filter(k => typeof cart.historico_mensal[k].dividendos === 'number');
  if (!meses.length) return null;
  const itens = meses.map((k, i) => {
    const v = cart.historico_mensal[k].dividendos;
    return { rotulo: rotuloMes(k).curto, valor: v, classe: i === meses.length - 1 ? 'destaque' : 'suave', dica: `${rotuloMes(k).longo}: ${brl(v)}` };
  });
  return colunas(itens, { altura: 150, rotularValores: [itens.length - 1], formatoY: v => brl0(v).replace('R$', '').trim() });
}

// Texto do agente com negrito: escapa tudo e devolve só o <b>
const comNegrito = t => esc(String(t || '')).replace(/&lt;(\/?)b&gt;/g, '<$1b>');
const sinal = v => (typeof v === 'number' ? `${v > 0 ? '+' : ''}${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%` : '—');

// Roteiro do plano da carteira: progresso e passos (dados do plano_acao)
function roteiroCarteira(cart, podeMarcar = false) {
  const pa = cart.plano_acao;
  if (!pa?.passos?.length) return null;
  const feitos = pa.passos.filter(p => /conclu|decidid|cancel/i.test(p.status || '')).length;
  const tomStatus = st => (/conclu/i.test(st) ? 'bom' : /decidid|cancel/i.test(st) ? 'info' : 'atencao');
  // v8.4: o que falta fazer em cima; os passos feitos ficam numa dobra; nota longa abre em "Ler mais"
  const passo = p => `<li class="${/pendente/i.test(p.status || '') ? 'pendente' : ''}">
      <span class="roteiro-n">${p.n}</span>
      <div><b>${esc(p.titulo)}</b> ${chip(tomStatus(p.status || ''), esc(String(p.status || '').toLowerCase()))}
      ${p.nota && /pendente/i.test(p.status || '') ? (String(p.nota).length > 220
        ? `<details class="dobra pn-dobra"><summary><span class="pn-dobra-t">${esc(String(p.nota).replace(/\*\*/g, '').slice(0, 160).replace(/\s+\S*$/, ''))}… <small>Ler mais</small></span></summary><div class="pn-dobra-c"><p class="nota">${comNegrito(p.nota)}</p></div></details>`
        : `<p class="nota">${comNegrito(p.nota)}</p>`) : ''}${podeMarcar && !/conclu|cancel/i.test(p.status || '') ? `<p class="passo-acoes"><button type="button" class="link" data-passo="${esc(p.n)}">Marcar como feito</button><button type="button" class="link suave" data-passo="${esc(p.n)}" data-como="cancelar">Não vou fazer</button></p>` : ''}</div>
    </li>`;
  const ok = p => /conclu|decidid|cancel/i.test(p.status || '');
  const abertos = pa.passos.filter(p => !ok(p)), prontos = pa.passos.filter(ok);
  return `<div class="cartao-topo"><h2>Roteiro da carteira</h2><span class="suave">${feitos} de ${pa.passos.length}</span></div>
    ${medidor(feitos / pa.passos.length, { classe: 'bom' })}
    ${abertos.length ? `<ol class="roteiro">${abertos.map(passo).join('')}</ol>` : '<p class="nota">Todos os passos do roteiro estão feitos.</p>'}
    ${prontos.length ? `<details class="dobra pn-dobra"><summary><span class="pn-dobra-t">${prontos.length} ${prontos.length === 1 ? 'passo feito ou descartado' : 'passos feitos ou descartados'}</span></summary><div class="pn-dobra-c"><ol class="roteiro">${prontos.map(passo).join('')}</ol></div></details>` : ''}`;
}

// v10.0 (o Bruno: "o roteiro está muito confuso — tem que ficar claro o que eu tenho que fazer"): o que falta, agrupado
// pelo dia (com quanto falta para ele), cada passo com o valor e o "Feito"; os feitos numa linha só que abre.
export function roteiroCv(cart, podeMarcar = false, hoje = hojeBrasil()) {
  const pa = cart.plano_acao;
  if (!pa?.passos?.length) return null;
  const ok = p => /conclu|decidid|cancel/i.test(p.status || '');
  const abertos = pa.passos.filter(p => !ok(p)), prontos = pa.passos.filter(ok);
  const dias = d => Math.round((Date.parse(`${d}T12:00:00`) - Date.parse(`${hoje}T12:00:00`)) / 864e5);
  const quando = d => {
    if (!/^\d{4}-\d{2}-\d{2}/.test(d || '')) return 'Sem data';
    const n = dias(d.slice(0, 10)), dm = `${d.slice(8, 10)}/${d.slice(5, 7)}`;
    const sem = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${d.slice(0, 10)}T12:00:00`).getDay()];
    return `${sem}, ${dm} · ${n < 0 ? `atrasado ${-n} ${-n === 1 ? 'dia' : 'dias'}` : n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `daqui a ${n} dias`}`;
  };
  const grupos = [...new Set(abertos.map(p => String(p.quando || '').slice(0, 10)))].sort((a, b) => (a || '9').localeCompare(b || '9'));
  const linha = p => linhaCv({
    icone: `<span class="passo-n-cv">${esc(p.n)}</span>`, titulo: String(p.titulo || '').replace(/^(seg|ter|qua|qui|sex|s[áa]b|dom)\w*\s+\d{1,2}\/\d{1,2}:\s*/i, ''),
    sub: `${p.nota ? `<span class="passo-nota-cv">${comNegrito(p.nota)}</span>` : ''}${podeMarcar ? `<button type="button" class="link-cv suave" data-passo="${esc(p.n)}" data-como="cancelar">Não vou fazer</button>` : ''}`,
    valor: Number(p.valor) > 0 ? esc(brl(p.valor)) : '',
    acao: podeMarcar ? { rotulo: 'Feito', attr: `data-passo="${esc(p.n)}"`, icone: CHECK } : null,
  });
  return `<p class="cv-resumo"><b>${abertos.length ? `${abertos.length} a fazer` : 'Tudo feito'}</b> · ${prontos.length} ${prontos.length === 1 ? 'feito' : 'feitos'}${pa.atualizado_em ? ` · plano de ${esc(pa.atualizado_em.slice(8, 10))}/${esc(pa.atualizado_em.slice(5, 7))}` : ''}</p>
    <i class="cv-barra"><i style="width:${Math.round((prontos.length / pa.passos.length) * 100)}%"></i></i>
    ${grupos.map(g => `<p class="passo-dia-cv${g && dias(g) < 0 ? ' cai' : ''}">${esc(quando(g))}</p>${listaCv(abertos.filter(p => String(p.quando || '').slice(0, 10) === g).map(linha))}`).join('')}
    ${prontos.length ? `<details class="feitos-cv"><summary>${prontos.length} ${prontos.length === 1 ? 'passo feito ou descartado' : 'passos feitos ou descartados'}</summary>${listaCv(prontos.map(p => linhaCv({ icone: `<span class="passo-n-cv feito">${/conclu/i.test(p.status || '') ? '✓' : '–'}</span>`, titulo: p.titulo, sub: esc(String(p.status || '').toLowerCase()), valor: Number(p.valor) > 0 ? esc(brl(p.valor)) : '' })))}</details>` : ''}`;
}

// Análise de mercado por ativo (escrita pelo Claude na skill da carteira): ação e urgência
function mercadoPorAtivo(cart) {
  const lista = cart.analise_mercado?.ativos;
  if (!lista?.length) return null;
  const tom = u => ({ alta: 'ruim', media: 'atencao', média: 'atencao' }[String(u || '').toLowerCase()] || 'bom');
  const rotulo = u => ({ ruim: 'Agir', atencao: 'Acompanhar', bom: 'Tranquilo' }[tom(u)]);
  const ordem = { ruim: 0, atencao: 1, bom: 2 };
  const ordenada = [...lista].sort((a, b) => ordem[tom(a.urgencia)] - ordem[tom(b.urgencia)]);
  return `<ul class="mercado">${ordenada.map(a => `<li>
      <div class="mercado-topo"><b>${esc(a.n)}</b>${chip(tom(a.urgencia), rotulo(a.urgencia))}</div>
      <p class="mercado-classe">${esc(a.classe || '')}</p>
      ${typeof a.dm === 'number' ? `<p class="mercado-nums">No ano <b>${sinal(a.dm)}</b>${a.bench ? ` · ${esc(a.bench)} <b>${sinal(a.benchm)}</b>` : ''}${a.data_ref ? ` · <span class="suave">dado de ${String(a.data_ref).split('-').reverse().slice(0, 2).join('/')}</span>` : ''}</p>` : ''}
      <p class="mercado-acao"><b>Ação:</b> ${comNegrito(a.acao)}</p>
      ${a.expl ? `<details class="dobra pn-dobra"><summary><span class="pn-dobra-t">Por quê</span></summary><div class="pn-dobra-c"><p class="pn-p">${comNegrito(a.expl)}</p></div></details>` : ''}
    </li>`).join('')}</ul>
    <p class="nota">Opinião do Claude a partir da sua estratégia e do mercado na data indicada — não é recomendação profissional de investimento.</p>`;
}

function trocasDaCarteira(cart, podeMarcar = false, v10 = false) {
  return {
    lc: () => graficoEvolucaoCarteira(cart),
    'rp-chart': () => graficoDividendos(cart),
    steps: () => (v10 ? `<div class="cartao-topo"><h2>Roteiro da carteira</h2></div><div class="roteiro-cv">${roteiroCv(cart, podeMarcar)}</div>` : roteiroCarteira(cart, podeMarcar)),
    'mkt-cards': () => mercadoPorAtivo(cart),
  };
}
// Peças do painel da carteira que o app já mostra do jeito dele (destaque, roteiro)
// (o anel e o resumo do topo da Visão repetem o destaque; o próximo passo repete o roteiro; a legenda é do gráfico SVG trocado)
// v8.3: tabela "Assinaturas fixas" dentro de "Parcelas do cartão nos próximos meses" = "Recorrentes no cartão" de novo
const PULAR_DO_CAIXA = '.tscroll:has(> #compromissosAssinaturas), .secttl:has(+ .tscroll > #compromissosAssinaturas)';
// v8.3: Cartão › Gastos — o que mais importa primeiro; a comparação categoria por categoria fica recolhida
const ORDEM_GASTOS = [/^categorias do m/i, /onde cortar/i, /ritmo por categoria/i, /base recorrente/i, /fatura por m/i];
const RECOLHER_BLOCOS = [
  [/como cada m[eê]s vai fechar/i, 'Simular: e se eu mudar algo?'], // v9.9.7: o simulador do painel fica no fim, recolhido
  [/m[eê]s anterior × m[eê]s atual/i, 'Mês anterior × mês atual, categoria por categoria'],
  // v8.4: Carteira › Visão — o resumo de "Atenção" já está no topo; o detalhe e o que é consulta ficam recolhidos
  [/precisa da sua aten/i, 'Pontos de atenção em detalhe'],
  [/se precisar sacar/i, 'Se precisar sacar: a ordem'],
  [/consumo de patrim/i, 'Consumo de patrimônio, mês a mês'],
  [/^aportes do m[eê]s/i, 'Aportes do mês no caixa'],
  [/se a fatura fechar em cada cen/i, 'Se a fatura fechar em cada cenário'], // v9.1: consulta, não o principal
];
// v8.4: com o resumo "Atenção" (#v-urgent-pointer) na Visão, o detalhe de cada ponto fica em Análises › Mercado
const PULAR_DA_CARTEIRA = '#panel-ativos .card:has(#at-body), #panel-plano:has(~ #panel-visao #v-urgent-pointer) #urgent-section, .eyebrow, #panel-plano > .hero, #panel-plano > .pp-row, #panel-visao > .hero, #next-acao, .legend-inline';
// Seções longas e pouco mutáveis que ficam recolhidas num cartão só
const RECOLHER_SECOES = { 'c-usd': 'Dolarização: vale a pena ter mais dólar?' };
// Um bloco do painel que é detalhe (não o principal da tela) vira uma dobra fechada com o mesmo conteúdo
function recolherBloco(b, abertos = new Set()) {
  const regra = RECOLHER_BLOCOS.find(([re]) => re.test(b.titulo || ''));
  if (!regra || b.explicacao) return b;
  const chave = `bloco:${b.secao}:${regra[1]}`;
  return { ...b, html: `<section class="cartao dobra-grupo"><details class="dobra" data-chave="${esc(chave)}"${abertos.has(chave) ? ' open' : ''}>
      <summary><div><h2>${esc(regra[1])}</h2><p class="cartao-sub">Toque para abrir</p></div></summary>
      ${b.html}</details></section>` };
}

function recolherSecoes(lista, abertos = new Set()) {
  const out = [];
  const grupos = {};
  for (const b of lista) {
    const titulo = RECOLHER_SECOES[b.secao];
    if (!titulo || b.explicacao) { out.push(b); continue; }
    if (!grupos[b.secao]) {
      grupos[b.secao] = { secao: b.secao, titulo, tipo: 'recolhido', partes: [], explicacao: false };
      out.push(grupos[b.secao]);
    }
    grupos[b.secao].partes.push(b.html);
  }
  return out.map(b => (b.tipo !== 'recolhido' ? b : {
    ...b,
    html: `<section class="cartao dobra-grupo"><details class="dobra" data-chave="grupo:${b.secao}"${abertos.has(`grupo:${b.secao}`) ? ' open' : ''}>
      <summary><div><h2>${esc(b.titulo)}</h2><p class="cartao-sub">${b.partes.length} partes · toque para abrir</p></div></summary>
      ${b.partes.join('')}</details></section>`,
  }));
}

// Ordem dos blocos numa sub-aba que mistura os dois painéis: a carteira primeiro (é a fonte), depois o que vem do caixa
const ORDEM_SECOES = ['c-visao', 'c-plano', 'c-evol'];
const pesoSecao = b => { const i = ORDEM_SECOES.indexOf(b.secao); return i >= 0 ? i : b.secao.startsWith('c-') ? ORDEM_SECOES.length : ORDEM_SECOES.length + 1; };

// ---------- estimativa "Hoje" (cotações ao vivo; cotacoes.js) ----------
// Só aparece com cotação para pelo menos metade da carteira; o valor oficial continua sendo o do agente.
const COBERTURA_MINIMA = 0.5;
const ddmm = iso => String(iso).slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const pctSinal = v => `${v < 0 ? '−' : '+'}${Math.abs(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const brlSinal = v => `${v < 0 ? '−' : '+'}${brl0(Math.abs(v))}`;
const horaCotacao = iso => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const o = { timeZone: 'America/Sao_Paulo' };
  return `${d.toLocaleDateString('pt-BR', { ...o, day: '2-digit', month: '2-digit' })} às ${d.toLocaleTimeString('pt-BR', { ...o, hour: '2-digit', minute: '2-digit' })}`;
};
export const estimativaValida = est => !!est && est.cobertura >= COBERTURA_MINIMA;

function blocoEstimativa(est, opcoes, cart) {
  if (!estimativaValida(est)) {
    return est?.faltaChaveB3 && opcoes.github
      ? '<p class="nota">Para ver o valor de hoje, falta a chave gratuita da brapi no Cloudflare (passo a passo no README).</p>'
      : '';
  }
  const base = cart ? baseMesAnterior(cart) : null;
  const noMes = base?.noMes(est.total);
  const v = noMes ? noMes.valor : est.variacao;
  const desde = noMes ? `no mês · pela estimativa de agora` : `desde ${ddmm(est.ref)}`;
  const varItem = i => (base ? base.var(i.chave, i.hoje) : i.variacao);
  const chave = 'estimativa';
  const parcial = est.cobertura < 0.995 ? ` ${Math.round(est.cobertura * 100)}% da carteira tem cotação; o resto fica no valor oficial.` : '';
  return `<div class="estimativa">
    <p class="rotulo">Hoje · estimativa</p>
    <p class="est-valor">${brl(est.total)}</p>
    <p class="est-var ${v < 0 ? 'ruim' : 'bom'}">${brlSinal(v)} (${pctSinal((noMes ? noMes.base : est.oficial) ? v / (noMes ? noMes.base : est.oficial) : 0)}) ${desde}</p>
    <details class="dobra" data-chave="${chave}"${opcoes.abertos?.has(chave) ? ' open' : ''}>
      <summary><span class="link">Ativo por ativo</span></summary>
      <ul class="linhas">${est.itens.map(i => `<li><span>${esc(i.nome)} <small class="suave">· ${esc(i.fonte)}</small></span><b>${brl0(i.hoje)} <small class="${varItem(i) < 0 ? 'ruim' : ''}">${varItem(i) == null ? '—' : pctSinal(varItem(i))}</small></b></li>`).join('')}</ul>
      <p class="nota">Conta do app: valor oficial × variação de cada ativo desde ${ddmm(est.ref)}.${base ? ` As porcentagens comparam com o fechamento de ${mesCurto(base.mes)}, sem os aportes e resgates do mês.` : ''} Cotações de ${horaCotacao(est.cotadoEm)} (B3 com até 30 min de atraso).${parcial} É uma estimativa — o número oficial é o do gestor de carteira.</p>
    </details>
  </div>`;
}

// Destaque de Carteira › Visão: a posição registrada pelo gestor de carteira
function heroCarteira(cart, opcoes) {
  const p = posicao(cart);
  const r = reserva(cart);
  const [, mm, dd] = String(p.data).split('-');
  const div = p.h.dividendos;
  // v9.12.3: o resultado do mês da posição gravada (o mesmo "Result. mercado" do painel); a estimativa de agora só
  // aparece num dia depois da posição — no mesmo dia eram dois números quase iguais e confusos (−715,65 × −722)
  const base = baseMesAnterior(cart);
  const noMes = base?.noMes(p.total);
  // v9.21: na interface nova o patrimônio está no topo — aqui só o resto
  return `<section class="cartao${opcoes.v10 ? '' : ' hero'}">
    ${opcoes.v10 ? '' : `<p class="rotulo">Patrimônio investido</p>
    <p class="hero-valor">${brl(p.total)}</p>`}
    <p class="hero-sub">Posição de ${dd}/${mm}, ${p.h.atualizacoesApp?.at(-1)?.data === p.data ? 'atualizada no app' : 'registrada pelo gestor de carteira'}</p>
    ${noMes && !opcoes.v10 ? `<p class="est-var ${noMes.valor < 0 ? 'ruim' : 'bom'}">${noMes.valor < 0 ? '−' : '+'}${brl(Math.abs(noMes.valor))} (${pctSinal(noMes.valor / noMes.base)}) no mês · desde o fechamento de ${mesCurto(base.mes)}</p>` : ''}
    ${String(p.data).slice(0, 10) < hojeBrasil() ? blocoEstimativa(opcoes.estimativa, opcoes, cart) : ''}
    <div class="chips">
      ${r ? (r.atual >= r.alvo ? chip('bom', `Reserva de emergência completa · ${brl0(r.atual)}`) : chip('atencao', `Reserva ${brl0(r.atual)} de ${brl0(r.alvo)}`)) : ''}
      ${typeof div === 'number' && div > 0 ? chip('info', `Dividendos no mês · ${brl0(div)}`) : ''}
    </div>
    ${opcoes.github ? `<div class="modelo-botoes">
      <button type="button" class="botao-sec" data-modelo="parcial">Atualização parcial</button>
      <button type="button" class="botao-sec" data-modelo="fechamento">Fechamento do mês</button>
    </div>
    <p class="nota">Monta o documento para colar na conversa da carteira no Claude.</p>` : ''}
  </section>`;
}

function semCarteira(opcoes) {
  return `<section class="cartao dica-agente">
    <div class="cartao-topo"><h2>Carteira</h2></div>
    <p class="cartao-sub">${opcoes.github
      ? 'Importe o painel da carteira (gerado pelo gestor de carteira no Claude) por <b>Compartilhar → Lastro</b>, ou pelo menu. Ele é publicado para a família junto com o caixa.'
      : 'A carteira ainda não foi publicada. Por enquanto aparecem aqui os números de patrimônio que vêm do painel do caixa.'}</p>
    ${opcoes.github ? '<button type="button" class="botao-sec" data-importar-carteira>Importar a carteira</button>' : ''}
  </section>`;
}

// ---------- Início como hub: patrimônio líquido ----------
// "Proximos aportes: Cripto → Dolar → Ouro" já traz o rótulo: não repete "Próximo passo da carteira:"
function rotuloPasso(titulo) {
  const m = String(titulo).match(/^pr[oó]xim[oa]s? aportes?\s*:\s*(.+)$/i);
  return m ? `<b>Próximos aportes:</b> ${esc(m[1])}` : `<b>Próximo passo da carteira:</b> ${esc(titulo)}`;
}

// v8.1: quanto do patrimônio investido tem exposição ao dólar e a meta (que o Claude revisa no modo PLANO)
const pct1 = v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
function linhaDolar(cart) {
  const dz = dolarizacao(cart);
  if (!dz) return '';
  const [a, mm] = String(dz.prazo || '').split('-').map(Number);
  const meta = dz.alvo ? `meta ${pct1(dz.alvo)}${a && mm ? ` até ${MES3[mm - 1].toLowerCase()}/${String(a).slice(2)}` : ''}` : 'sem meta ainda';
  return linha(`Em dólar <small class="suave">· ${meta}</small>`, pct1(dz.pct));
}

function patrimonioLiquido({ c }, cart, conferencia, est, compacto = false) {
  const p = posicao(cart);
  const hoje = estimativaValida(est);
  const investido = hoje ? est.total - est.oficial + p.total : p.total;
  const total = investido + c.caixa - c.itau;
  const passo = proximoPasso(cart);
  const pendencias = conferencia.filter(i => i.tom === 'ruim' || i.tom === 'atencao').length;
  const [, mm, dd] = String(p.data).split('-');
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Patrimônio líquido</h2><button type="button" class="link" data-ir-aba="carteira/visao">Carteira</button></div>
    <p class="mini-valor ${tomValor(total)}">${brl(total)}</p>
    <ul class="linhas">
      ${hoje
        ? linha(`Investimentos hoje <small class="suave">· estimativa (${brlSinal(est.variacao)} desde ${dd}/${mm})</small>`, brl(investido))
        : linha(`Investimentos <small class="suave">· posição de ${dd}/${mm}</small>`, brl(p.total))}
      ${compacto ? '' : linha('Conta hoje', brl(c.caixa), tomValor(c.caixa))}
      ${compacto ? '' : linha('Cartão em aberto', brl(-c.itau), 'ruim')}
      ${linhaDolar(cart)}
    </ul>
    ${compacto ? `<p class="nota">Investimentos ${c.caixa >= 0 ? '+' : '−'} ${brl0(Math.abs(c.caixa))} na conta − ${brl0(c.itau)} do cartão em aberto.</p>` : ''}
    ${passo ? `<p class="destaque-txt pequeno">${rotuloPasso(passo.titulo)}</p>` : ''}
    ${pendencias ? `<div class="chips"><button type="button" class="chip-botao" data-ir-aba="analises/conferir">${chip('atencao', `${pendencias} ${pendencias === 1 ? 'ponto' : 'pontos'} para conferir entre caixa e carteira`)}</button></div>` : ''}
  </section>`;
}

// ---------- v8.8: orçamento, renda passiva, dólar mês a mês, assinaturas, metas, imposto de renda ----------
const pctBr = v => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

function orcamentoCartao(dados, ctx, opcoes = {}, compacto = false) {
  const lista = orcamentoDoMes(dados, ctx);
  if (!lista.length) return ''; // v9.1: sem convite vazio na tela (menu → Orçamento / Metas)
  const mostrar = compacto ? lista.filter(o => o.pct >= 0.8).slice(0, 3) : lista;
  if (compacto && !mostrar.length) return '';
  // v9.5: uma linha por categoria (nome, gasto/limite, barra fina); quem passou ou está perto fica aberto, o resto
  // numa dobra — antes eram 20 barras com uma frase cada ("muito poluído", Bruno)
  const linhaO = o => `<li class="orc-linha tom-${o.tom}">
    <div class="orc-topo"><span>${esc(o.nome)}</span><b>${brl0(o.gasto)}<small> / ${brl0(o.limite)}</small></b></div>
    <div class="orc-barra"><i style="width:${Math.min(100, Math.round(o.pct * 100))}%"></i></div>
    ${o.pct >= 1 ? `<small class="orc-nota">passou ${brl0(-o.sobra)}</small>` : o.pct >= 0.8 ? `<small class="orc-nota">sobram ${brl0(o.sobra)}</small>` : ''}
  </li>`;
  const acao = compacto ? '<button type="button" class="link" data-ir-aba="cartao/gastos">Ver</button>' : opcoes.github ? '<button type="button" class="link" data-orcamento>Editar</button>' : '';
  if (compacto) return `<section class="cartao"><div class="cartao-topo"><h2>Orçamento: atenção</h2>${acao}</div><ul class="orc-lista">${mostrar.map(linhaO).join('')}</ul></section>`;
  const atencao = lista.filter(o => o.pct >= 0.8); // o ritmo do começo do mês exagera (dia 7 × 4): fica fora
  const ok = lista.filter(o => !atencao.includes(o));
  const passou = lista.filter(o => o.pct >= 1).length;
  const gasto = lista.reduce((t, o) => t + o.gasto, 0), limite = lista.reduce((t, o) => t + o.limite, 0);
  const chave = 'orc:ok', aberto = (opcoes.abertos || new Set()).has(chave);
  return `<section class="cartao orcamento">
    <div class="cartao-topo"><h2>Orçamento do mês</h2>${acao}</div>
    <p class="orc-resumo"><b>${brl0(gasto)}</b> de ${brl0(limite)} <span class="suave">· ${passou ? `${passou} ${passou === 1 ? 'passou' : 'passaram'}` : 'nenhuma passou'}${atencao.length - passou ? ` · ${atencao.length - passou} perto` : ''}</span></p>
    <div class="orc-barra grossa"><i style="width:${Math.min(100, Math.round((gasto / (limite || 1)) * 100))}%"></i></div>
    ${atencao.length ? `<ul class="orc-lista">${atencao.map(linhaO).join('')}</ul>` : ''}
    ${ok.length ? `<details class="dobra" data-chave="${chave}"${aberto ? ' open' : ''}><summary>Dentro do limite <small class="suave">${ok.length}</small></summary><ul class="orc-lista">${ok.map(linhaO).join('')}</ul></details>` : ''}
  </section>`;
}

function rendaPassivaCartao({ c }, dados, cart, compacto = false) {
  const r = rendaPassiva(dados, cart, (c?.fixas || 0) + (c?.variaveis || 0));
  if (!r) return '';
  const itens = r.serie.slice(-6).map(x => ({ rotulo: mesCurto(x.mes), valor: Math.round(x.pct * 1000) / 10, classe: x.mes === r.atual.mes ? 'destaque' : 'suave', dica: `${mesCurto(x.mes)}: dividendos ${brl(x.dividendos)} ÷ despesas ${brl(x.custo)} = ${pctBr(x.pct)}` }));
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Renda passiva × custo de vida</h2>${compacto ? '<button type="button" class="link" data-ir-aba="carteira/renda">Ver</button>' : ''}</div>
    <p class="mini-valor">${pctBr(r.atual.pct)}</p>
    <p class="cartao-sub">das despesas de ${esc(mesCurto(r.atual.mes))} os dividendos já pagam (${brl0(r.atual.dividendos)} de ${brl0(r.atual.custo)}).</p>
    ${compacto ? '' : `${colunas(itens, { altura: 140, formatoY: v => `${v}%` })}
    ${r.necessario ? `<p class="nota">No rendimento dos últimos meses (${brl0(r.divMedio)} por mês), pagar o mês inteiro com dividendos pediria cerca de <b>${brl0(r.necessario)}</b> investidos. Renda fixa reinvestida não entra na conta.</p>` : ''}`}
  </section>`;
}

function dolarMesAMesCartao(cart) {
  const d = dolarMesAMes(cart);
  if (!d || d.pontos.length < 2) return '';
  const pts = d.pontos.slice(-12);
  const itens = pts.map((p, i) => ({ rotulo: mesCurto(p.mes), valor: Math.round(p.pct * 10) / 10, classe: i === pts.length - 1 ? 'destaque' : 'suave', dica: `${mesCurto(p.mes)}: ${p.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% em dólar (${brl(p.valor)})` }));
  const ult = pts[pts.length - 1], prim = pts[0];
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Em dólar mês a mês</h2></div>
    <p class="cartao-sub">${ult.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% hoje · ${ult.pct >= prim.pct ? '+' : ''}${(ult.pct - prim.pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ponto${Math.abs(ult.pct - prim.pct) >= 2 ? 's' : ''} desde ${esc(mesCurto(prim.mes))}${d.alvo ? ` · meta ${d.alvo}%${d.prazo ? ` até ${esc(mesCurto(d.prazo))}` : ''}` : ''}</p>
    ${colunas(itens, { altura: 140, formatoY: v => `${v}%`, referencia: d.alvo ? { valor: d.alvo } : null })}
    ${d.alvo ? '<ul class="legenda horizontal"><li><i class="destaque"></i>% em dólar</li><li><i class="ref"></i>meta</li></ul>' : ''}
  </section>`;
}

function metasCartao(cart, opcoes = {}, compacto = false) {
  const lista = progressoMetas(cart, opcoes.hoje);
  if (!lista.length) return ''; // v9.1: sem convite vazio na tela (menu → Orçamento / Metas)
  const linhaM = m => {
    const dentro = `<div class="bh-topo"><span>${esc(m.nome)}</span><b>${brl0(m.atual)}<small>de ${brl0(m.alvo)}</small></b></div>
      ${medidor(m.pct, { classe: m.concluida ? 'bom' : 'destaque' })}
      <p class="orc-nota">${m.concluida ? `${icTom('bom')}Meta alcançada` : `Faltam ${brl0(m.falta)}${m.porMes ? ` · ${brl0(m.porMes)} por mês até ${esc(mesCurto(m.prazo))}` : ''}`}${m.ligadosA && !compacto ? ` · ${esc(m.ligadosA.join(', '))}` : ''}</p>`;
    return opcoes.github && !compacto ? `<li><button type="button" class="meta-linha" data-meta="${esc(m.id)}">${dentro}</button></li>` : `<li>${dentro}</li>`;
  };
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Metas</h2>${compacto ? '<button type="button" class="link" data-ir-aba="carteira/visao">Ver</button>' : opcoes.github ? '<button type="button" class="link" data-meta="nova">Nova</button>' : ''}</div>
    <ul class="barrash">${(compacto ? lista.slice(0, 3) : lista).map(linhaM).join('')}</ul>
  </section>`;
}

function impostoRendaCartao(opcoes = {}) {
  return `<section class="cartao link-extrato-cartao">
    <button type="button" class="link-extrato" data-pacote-ir>
      ${svg('<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20z"/><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5"/>')}
      <span><b>Imposto de Renda</b><small>Dividendos, aportes, resgates e posição do ano num arquivo para o Claude ou o contador</small></span>
    </button>
  </section>`;
}

// ---------- conferência cruzada (caixa × carteira) ----------
const pp = v => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
function itensConferencia(m, dados, cart, ctx) {
  const itens = [];
  const p = posicao(cart);
  const tenta = fn => { try { const i = fn(); if (i) itens.push(i); } catch (e) { console.warn('Conferência:', e); } };
  // 0. v9.0: o que o app igualou sozinho (receitas com origem "conciliacao")
  tenta(() => {
    const feitos = (dados.receitas || []).filter(r => r.origem === 'conciliacao');
    if (!feitos.length) return null;
    return { tom: 'bom', titulo: `Conciliado pelo app · ${feitos.length} ${feitos.length === 1 ? 'item' : 'itens'}`, texto: `Os dividendos previstos na carteira entraram na agenda do caixa: ${feitos.map(r => `${esc(r.descricao.replace(/^Dividendo\s+/i, ''))} ${brl(r.valor)} (dia ${r.dia})`).join(', ')}.` };
  });
  // 1. a cópia do patrimônio no cashflow × a carteira
  tenta(() => {
    const copia = Object.values(dados.patrimonio || {}).reduce((s, v) => s + (Number(v) || 0), 0);
    if (!copia) return null;
    return Math.abs(copia - p.total) < 1
      ? { tom: 'bom', titulo: 'Patrimônio igual nos dois painéis', texto: `${brl(p.total)} no caixa e na carteira.` }
      : { tom: 'atencao', titulo: 'Patrimônio diferente entre caixa e carteira', texto: `O caixa registra ${brl(copia)}; a carteira, ${brl(p.total)} (diferença ${brl(copia - p.total)}). A carteira (posição de ${p.data.split('-').reverse().slice(0, 2).join('/')}) é a certa: copie para o caixa.<button type="button" class="botao-sec pn-botao so-quem-publica" data-igualar-patrimonio>Copiar o patrimônio da carteira para o caixa</button>` };
  });
  // 2. datas das duas atualizações
  tenta(() => {
    const dias = Math.round((new Date(dados.ultimaAtualizacao) - new Date(p.data)) / 86400000);
    if (Math.abs(dias) <= 7) return null;
    return { tom: 'atencao', titulo: dias > 0 ? 'Carteira desatualizada em relação ao caixa' : 'Caixa desatualizado em relação à carteira', texto: `${Math.abs(dias)} dias de diferença entre as duas atualizações.` };
  });
  // 3. dividendos do mês: o recebido no caixa × o registrado na carteira; o que ainda não caiu, previsto × agenda
  tenta(() => {
    const prev = cart.projecao_dividendos?.[dados.periodo]?.ativos || {};
    const det = cart.historico_mensal?.[dados.periodo]?.dividendos_detalhe || {};
    const rec = {}, aReceber = {};
    for (const r of dados.receitas || []) {
      const t = tickerDividendo(r.descricao);
      if (!t) continue;
      const alvo = r.status === 'confirmado' ? rec : aReceber;
      alvo[t] = (alvo[t] || 0) + (r.valor || 0);
    }
    const tickers = [...new Set([...Object.keys(prev), ...Object.keys(det), ...Object.keys(rec), ...Object.keys(aReceber)])];
    if (!tickers.length) return null;
    const faltam = [], diferentes = [];
    for (const t of tickers) {
      const T = t.toUpperCase();
      if (rec[t] || det[t]) {
        if (Math.abs((rec[t] || 0) - (det[t] || 0)) > 0.05) diferentes.push(`${T} (caixa ${brl(rec[t] || 0)} × carteira ${brl(det[t] || 0)})`);
      } else if (prev[t] && !prev[t].pago) {
        const v = prev[t].total ?? prev[t].valor ?? 0;
        if (!(t in aReceber)) faltam.push(T);
        else if (Math.abs(aReceber[t] - v) > 0.05) diferentes.push(`${T} previsto (caixa ${brl(aReceber[t])} × carteira ${brl(v)})`);
      }
    }
    const recebido = Object.values(rec).reduce((a, b) => a + b, 0);
    const previsto = Object.values(aReceber).reduce((a, b) => a + b, 0);
    if (!faltam.length && !diferentes.length) return { tom: 'bom', titulo: 'Dividendos do mês batem', texto: `${brl(recebido)} recebidos${previsto ? ` e ${brl(previsto)} a receber` : ''}, iguais na carteira e no caixa.` };
    return { tom: 'atencao', titulo: 'Dividendos diferentes entre carteira e caixa', texto: [faltam.length ? `Previstos na carteira e fora da agenda do caixa: ${faltam.join(', ')}.` : '', diferentes.length ? `Valores diferentes: ${diferentes.join('; ')}.` : ''].join(' ') };
  });
  // 4. resgates para o caixa no mês
  tenta(() => {
    const doCaixa = (dados.resgates || []).reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const h = cart.historico_mensal?.[dados.periodo];
    if (!h) return null;
    // resgates lançados pelo app vão sempre para o caixa (idCaixa), qualquer que seja o motivo
    const daCarteira = (h.fluxos || []).filter(f => f.tipo === 'resgate' && (f.idCaixa || /caixa/i.test(f.motivo || f.destino || ''))).reduce((s, f) => s + (f.valor || 0), 0);
    if (Math.abs(doCaixa - daCarteira) < 1) return null;
    return { tom: 'atencao', titulo: 'Resgates diferentes entre carteira e caixa', texto: `Caixa: ${brl(doCaixa)} · carteira: ${brl(daCarteira)} resgatados para o caixa em ${MESES[ctx.mes - 1]}.` };
  });
  // 5. premissa de rendimento das projeções
  tenta(() => {
    const mensal = m.plp?.TAXA_MENSAL;
    const anual = cart.projecao_aposentadoria?.taxa_retorno_anual;
    if (!mensal || !anual) return null;
    const doCaixa = (1 + mensal) ** 12 - 1;
    if (Math.abs(doCaixa - anual) < 0.005) return { tom: 'bom', titulo: 'Mesma premissa de rendimento', texto: `${pp(anual)} ao ano nas duas projeções.` };
    return { tom: 'atencao', titulo: 'Projeções com premissas diferentes', texto: `O caixa projeta o patrimônio com ${pp(doCaixa)} ao ano; a carteira usa ${pp(anual)} ao ano${cart.projecao_aposentadoria.taxa_e_nominal ? ' (nominal)' : ''}. A premissa da carteira é a que vale — peça ao Agente Financeiro para usá-la.` };
  });
  // 6. risco de resgate: o pior dia do caixa daqui para a frente × a reserva de emergência
  tenta(() => {
    const futuro = m.tl.porDia.filter(d => d.dia >= ctx.diaHoje);
    if (!futuro.length) return null;
    const pior = futuro.reduce((a, b) => (b.saldo < a.saldo ? b : a));
    const r = reserva(cart);
    if (pior.saldo >= 0) return { tom: 'bom', titulo: 'Sem risco de resgate neste mês', texto: `O caixa não fica negativo até o fim do mês (mínimo ${brl0(pior.saldo)} no dia ${pior.dia}).` };
    const falta = -pior.saldo;
    const ordem = (cart.estrategia?.prioridade_resgate || [])[0];
    if (!r) return { tom: 'atencao', titulo: 'Caixa negativo no mês', texto: `Faltam ${brl0(falta)} no pior dia (${pior.dia}).` };
    return r.atual >= falta
      ? { tom: 'atencao', titulo: 'Caixa negativo, mas a reserva cobre', texto: `No pior dia (${pior.dia}) faltam ${brl0(falta)}; a reserva de emergência tem ${brl0(r.atual)}. Se precisar sacar, a ordem começa por ${esc(ordem || 'a reserva')}. Veja se o próprio caixa se recupera antes (carência do limite).` }
      : { tom: 'ruim', titulo: 'Caixa negativo além da reserva', texto: `No pior dia (${pior.dia}) faltam ${brl0(falta)}, mais que a reserva de emergência (${brl0(r.atual)}).` };
  });
  // 6. v8.1: plano de aportes do mês (carteira) × o que foi feito, e se cabe no que sobra no caixa (capacidadeAporte)
  tenta(() => {
    const pl = planoDoMes(cart, dados.periodo);
    if (!pl) return null;
    const falta = pl.itens.filter(i => i.feito < i.planejado - 0.5);
    if (!falta.length) return { tom: 'bom', titulo: 'Plano de aportes do mês feito', texto: `${brl0(pl.planejado)} aportados como planejado (${pl.itens.map(i => i.nome).join(', ')}).` };
    const lista = falta.map(i => `${esc(i.nome)} ${brl0(i.planejado - i.feito)}`).join(', ');
    return ctx.mesPassou || ctx.diaHoje >= 25
      ? { tom: 'atencao', titulo: 'Falta aportar parte do plano do mês', texto: `Ainda faltam ${lista}. Lance em + → Investir quando aportar, ou ajuste o plano no modo PLANO com o Claude.` }
      : { tom: 'info', titulo: 'Plano de aportes do mês', texto: `${brl0(pl.feito)} de ${brl0(pl.planejado)} feitos. Faltam ${lista}.` };
  });
  tenta(() => {
    const pl = planoDoMes(cart, dados.periodo);
    const cap = (dados.capacidadeAporte?.meses || []).find(x => x.mes === dados.periodo);
    if (!pl || !cap || typeof cap.sobraSegura !== 'number') return null;
    return pl.planejado > cap.sobraSegura + 0.5
      ? { tom: 'ruim', titulo: 'Plano de aportes maior do que sobra no caixa', texto: `A carteira planeja ${brl0(pl.planejado)} neste mês; o caixa diz que sobram ${brl0(cap.sobraSegura)} sem mexer na reserva. Revise no modo PLANO.` }
      : { tom: 'bom', titulo: 'Plano de aportes cabe no caixa', texto: `${brl0(pl.planejado)} planejados; sobram ${brl0(cap.sobraSegura)} no mês sem mexer na reserva.` };
  });
  // v9.9.12 (auditoria): investimento que caiu muito no mês sem resgate registrado — foi o caso do Itaú Index Gold em
  // nov/2026 (resgate feito no banco e não lançado: o mês parecia ter perdido o valor inteiro)
  tenta(() => {
    const base = baseMesAnterior(cart);
    const caiu = base ? listaAtivos(cart, cart.historico_mensal[base.mes]).filter(a => a.valor >= 300).map(a => ({ ...a, hoje: listaAtivos(cart).find(x => x.chave === a.chave)?.valor || 0 })).filter(a => base.var(a.chave, a.hoje) <= -0.3) : [];
    if (!caiu.length) return null;
    return { tom: 'ruim', titulo: `${caiu.map(a => a.nome).join(', ')}: caiu sem resgate registrado`, texto: `${caiu.map(a => `${esc(a.nome)} tinha ${brl(a.valor)} no fechamento e agora tem ${brl(a.hoje)}`).join('; ')}. Se você resgatou, lance o resgate (+ → Investir → Resgate): o app registra a saída sem descontar de novo, e o mês deixa de mostrar essa queda como perda.` };
  });
  // fatura: a soma das categorias tem de dar o total (o painel acusa divergência se não der)
  tenta(() => {
    const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
    const soma = (it?.categorias || []).reduce((t, c) => t + c.valor, 0);
    return it && Math.abs(soma - it.valor) > 0.05 ? { tom: 'ruim', titulo: 'Fatura não bate com as categorias', texto: `A fatura está em ${brl(it.valor)} e as categorias somam ${brl(soma)}. Peça ao Claude para conferir no fechamento.` } : null;
  });
  return itens;
}

function conferenciaCruzada(itens) {
  if (!itens.length) return '';
  const ordem = { ruim: 0, atencao: 1, info: 2, bom: 3 };
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Caixa × carteira</h2></div>
    <p class="cartao-sub">O app confere um painel contra o outro: o que um registra precisa bater com o outro.</p>
    <div class="pn-alertas">${[...itens].sort((a, b) => ordem[a.tom] - ordem[b.tom]).map(i => `<div class="pn-alerta tom-${i.tom}">${icTom(i.tom)}<div><b>${esc(i.titulo)}</b><p>${i.texto}</p></div></div>`).join('')}</div>
  </section>`;
}

// Sub-abas que têm um destaque do app antes dos blocos dos painéis
const ANTES = {
  'mes/geral': (m, dados, ctx, opcoes) => [secao(() => heroSaldo(m, ctx, opcoes))],
  'mes/meses': (m, dados, ctx, opcoes) => [secao(() => mesesCaixa(m, opcoes.abertos))],
  'mes/agenda': (m, dados, ctx, opcoes) => [secao(() => heroAgenda(m, dados, ctx)), secao(() => botoesContas(ctx, !!opcoes.github, 'agenda-v8'))],
  'cartao/fatura': (m, dados, ctx, opcoes) => [secao(() => faturaHero(m, dados, ctx)), secao(() => composicaoCartao(dados, opcoes)), secao(() => projecaoCartao(m, dados))],
  'cartao/parcelas': (m, dados, _ctx, opcoes) => [secao(() => proximasFaturas(m, dados, opcoes.abertos, !!opcoes.github)), secao(() => recorrentesCartao(dados, opcoes))],
  'cartao/gastos': (m, dados, ctx, opcoes) => [secao(() => orcamentoCartao(dados, ctx, opcoes))],
  'carteira/aloc': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => estrategiaCartao(opcoes.carteira, opcoes)) : '', opcoes.carteira ? secao(() => rendaFixaReal(opcoes.carteira, opcoes)) : '', opcoes.carteira ? secao(() => escadaCartao(opcoes.carteira, opcoes)) : ''],
  'carteira/renda': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => rendaPassivaCartao(m, dados, opcoes.carteira)) : ''],
  'carteira/futuro': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => dolarMesAMesCartao(opcoes.carteira)) : ''],
  'mes/contas': (m, dados, ctx, opcoes) => [secao(() => linkExtrato()), secao(() => contasDoMes(dados, ctx, opcoes, m)), secao(() => agendadosFuturos(dados, opcoes)), secao(() => mesesFechadosCartao(dados, opcoes))],
  'carteira/visao': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => heroCarteira(opcoes.carteira, opcoes)) : semCarteira(opcoes), opcoes.carteira ? secao(() => metasCartao(opcoes.carteira, { ...opcoes, hoje: ctx.hoje || opcoes.hoje })) : '', opcoes.carteira ? secao(() => movimentarCarteira(opcoes)) : ''],
  'carteira/ativos': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => seusAtivos(opcoes.carteira, opcoes)) : '', opcoes.carteira ? secao(() => ganhosPerdas(opcoes.carteira, opcoes.abertos)) : ''],
  'analises/saude': (m, dados, _ctx, opcoes) => [secao(() => scoreCartao(m)), secao(() => analisesAgente(dados, opcoes))],
  'analises/conferir': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => conferenciaCruzada(itensConferencia(m, dados, opcoes.carteira, ctx))) : ''],
};
const DEPOIS = {
  'mes/meses': (m, dados) => [secao(() => valoresConhecidos(dados)), secao(() => decimoTerceiro(dados))],
  'carteira/renda': (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => impostoRendaCartao(opcoes)) : ''],
};

// Explicações dos painéis ("Como o ciclo funciona", "Como ler isso"…) recolhidas num cartão só, no fim.
function entenda(lista, abertos = new Set()) {
  if (!lista.length) return '';
  return `<section class="cartao entenda">
    <div class="cartao-topo"><h2>${svg(ICONE_IDEIA)}Entenda</h2></div>
    ${lista.map(b => {
      const chave = `entenda:${b.titulo}`;
      return `<details class="dobra pn-dobra" data-chave="${esc(chave)}"${abertos.has(chave) ? ' open' : ''}>
        <summary><span class="pn-dobra-t">${esc(b.titulo)}</span></summary>
        <div class="pn-dobra-c pn-p">${b.corpo}</div>
      </details>`;
    }).join('')}
  </section>`;
}

export function htmlSubabas(aba, sub) {
  const lista = SUBABAS[aba];
  if (!lista) return '';
  return `<div class="subabas ${lista.length > 4 ? 'muitas' : ''}" role="tablist">${lista.map(([id, nome]) =>
    `<button type="button" role="tab" class="${id === sub ? 'on' : ''}" aria-selected="${id === sub}" data-sub="${id}">${nome}</button>`).join('')}</div>`;
}

// Mês virou e o painel ainda é do anterior (v7): o fechamento é com o Claude, uma vez por mês
function fecharMes(dados, ctx, cart) {
  const mes = mesBonito(dados.periodoLabel) || dados.periodo;
  // v8.1: até a carteira ter a meta de dolarização, o fechamento lembra de montar o Projeto único (docs/PROJETO-CLAUDE.md)
  const projeto = cart && !cart.meta_dolarizacao ? `<p class="rotulo espaco">Desta vez: o Projeto "Vida financeira"</p>
    <ol class="passos-curtos">
      <li>No claude.ai, crie o Projeto <b>Vida financeira</b>.</li>
      <li>Nas instruções, cole as do Agente Financeiro e, abaixo, o bloco <b>Instruções do Lastro</b> (docs/PROJETO-CLAUDE.md no GitHub).</li>
      <li>Deixe ligados o Google Drive e a skill gestor de carteira.</li>
      <li>Feche o caixa (aba Caixa) e a carteira (aba Carteira), cada um numa conversa nova do Projeto.</li>
      <li>Depois, aba <b>Plano</b>: a primeira conversa define a meta de dolarização e o plano dos próximos 3 meses. Importe no Lastro o JSON da carteira que o Claude devolver.</li>
    </ol>` : '';
  return `<section class="cartao dica-agente">
    <div class="cartao-topo"><h2>Hora de fechar ${esc(mes)}</h2></div>
    <p class="cartao-sub">Leve o caixa (e a carteira) para o Claude fechar o mês e gerar o painel novo. Até lá, compras no cartão continuam pelo "+" e vão para a fatura de ${MESES[ctx.mes % 12]}.</p>
    ${projeto}
    <button type="button" class="botao-sec" data-levar-claude>Levar para o Claude</button>
  </section>`;
}

// v8.7: cartões do Início (ordem padrão). Um cartão novo de uma versão futura entra ligado no fim da ordem salva.
// v9.1: os secundários (aporte, orçamento, renda, metas, atenção) ficam desligados; o cartão "Para olhar" resume os cinco
const SECUNDARIOS = ['aporte', 'orcamento', 'metas', 'renda', 'atencao'];
export const CARTOES_INICIO = [
  ['gastar', 'Dá para gastar'], ['proximas', 'Próximas contas'], ['acao', 'Próxima ação'],
  ['contaCartao', 'Conta e cartão'], ['destaques', 'Hoje (o que fazer: aporte, passos do plano, gatilhos, orçamento e alertas)'], ['patrimonio', 'Patrimônio líquido'],
  ['aporte', 'Aporte do mês (cartão completo)'], ['orcamento', 'Orçamento (cartão completo)'],
  ['metas', 'Metas (cartão completo)'], ['renda', 'Renda passiva × custo de vida (cartão completo)'], ['atencao', 'Atenção (cartão completo)'],
];
export function ordemInicio(salva) {
  const ids = CARTOES_INICIO.map(([id]) => id);
  const lista = (Array.isArray(salva) ? salva : []).filter(c => ids.includes(c?.id)).map(c => ({ id: c.id, on: c.on !== false }));
  const antiga = lista.length && !lista.some(c => c.id === 'destaques'); // ordem salva antes da v9.1: o resumo entra no lugar dos cinco
  if (antiga) for (const c of lista) if (SECUNDARIOS.includes(c.id)) c.on = false;
  for (const id of ids) {
    if (lista.some(c => c.id === id)) continue;
    const i = id === 'destaques' ? lista.findIndex(c => SECUNDARIOS.includes(c.id)) : -1;
    lista.splice(i < 0 ? lista.length : i, 0, { id, on: !SECUNDARIOS.includes(id) });
  }
  return lista;
}

// v9.17: o Claude deixou o fechamento pronto pelo conector (rascunho); nada foi para a família até o Bruno aplicar.
// Depois de aplicar, o mesmo lugar mostra "Fechamento aplicado · Desfazer" por 2 dias (`aplicado` = IDB antesDoFechamento).
export function fechamentoPronto(rascunhos, aplicado = null) {
  const r = rascunhos || {};
  const partes = [['carteira', 'Carteira'], ['caixa', 'Caixa']].filter(([k]) => r[k]);
  if (!partes.length) {
    if (!aplicado?.em || Date.now() - Date.parse(aplicado.em) > 2 * 864e5) return '';
    return `<section class="cartao fech-pronto"><div class="cartao-topo"><h2>Fechamento aplicado</h2>
      <button type="button" class="link" data-fech-desfazer>Desfazer</button></div>
      <p class="cartao-sub">Já foi para a família. Desfazer volta o caixa e a carteira a como estavam antes.</p></section>`;
  }
  const det = (k, c = {}) => (k === 'caixa'
    ? `${c.periodo?.[0] ? mesCurto(c.periodo[0]) : '?'} → ${c.periodo?.[1] ? mesCurto(c.periodo[1]) : '?'} · meses fechados ${(c.mesesFechados || []).join(' → ')}`
    : `${c.mes?.[1] ? mesCurto(c.mes[1]) : ''} · patrimônio ${brl0(c.patrimonio?.[0] || 0)} → ${brl0(c.patrimonio?.[1] || 0)}`);
  return `<section class="cartao fech-pronto">
    <div class="cartao-topo"><h2>Fechamento pronto</h2></div>
    <p class="cartao-sub">O Claude deixou ${partes.length === 2 ? 'a carteira e o caixa' : partes[0][0] === 'caixa' ? 'o caixa' : 'a carteira'} prontos. Nada foi para a família ainda.</p>
    <ul class="linhas">${partes.map(([k, nome]) => linha(`${nome} <small class="suave">${esc(det(k, r[k].conferencia))}</small>`, '')).join('')}</ul>
    ${!r.caixa ? '<p class="nota">Falta o caixa: quando o Claude gravar, ele aparece aqui também.</p>' : ''}
    <button type="button" class="btn prim" data-fech-pronto>Ver e aplicar</button>
  </section>`;
}

// v9.16: resumo da semana — cartão no topo do Início aos domingos; nos outros dias, menu ⋮ → Resumo da semana
export const ehDomingo = iso => !!iso && new Date(`${iso}T12:00:00Z`).getUTCDay() === 0;
export function resumoSemanaHtml(m, dados, cart, ctx, opcoes = {}) {
  const hoje = opcoes.hoje || hojeBrasil();
  const r = resumoSemana(dados, hoje, proximasContas(m, dados));
  const dm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const dif = r.anterior ? r.total - r.anterior.total : null;
  const comp = dif == null ? '' : Math.abs(dif) < 1 ? chip('bom', 'Igual à semana anterior')
    : chip(dif < 0 ? 'bom' : 'atencao', `${brl0(Math.abs(dif))} ${dif < 0 ? 'a menos' : 'a mais'} que a semana anterior`);
  const { c } = m;
  const porDia = c.diasRest > 0 ? c.saldo / c.diasRest : c.saldo;
  const ritmo = c.taxaAtualLivre || 0;
  const mes = ctx.mesPassou ? '' : c.saldo <= 0 ? chip('ruim', 'O mês já passou do que dava para gastar')
    : ritmo > porDia ? chip('atencao', `Ritmo acima do que cabe: ${brl0(ritmo)} por dia no cartão, cabem ${brl0(porDia)}`)
      : chip('bom', `No ritmo: ainda dá para gastar ${brl0(c.saldo)} até o fim do mês (${brl0(porDia)} por dia)`);
  let aporte = '';
  try {
    const a = cart && aportePlanejado(m, dados, cart, ctx);
    if (a) aporte = linha(`Aporte do mês · ${a.dia ? (a.dia <= ctx.diaHoje ? 'já dá para fazer' : `a partir do dia ${a.dia}`) : a.cabe > 0 ? `cabem ${brl0(a.cabe)}` : 'não cabe neste mês'}`, brl0(a.valor));
  } catch { /* sem plano */ }
  const p = r.proximos;
  return `<section class="cartao resumo-semana">
    <div class="cartao-topo"><h2>Resumo da semana</h2><span class="meta">${dm(r.inicio)} a ${dm(r.fim)}</span></div>
    <p class="rs-total"><b>${brl(r.total)}</b> ${r.n ? `no dia a dia: ${r.n} ${r.n === 1 ? 'gasto' : 'gastos'} no cartão e no Pix` : 'sem gastos do dia a dia lançados'}</p>
    ${r.fixas.n ? `<ul class="linhas">${linha(`Contas fixas pagas <small class="suave">${r.fixas.n}</small>`, brl0(r.fixas.total))}</ul>` : ''}
    ${r.parcial ? '<p class="nota">Desde o dia 1: o começo da semana ficou no mês passado.</p>' : ''}
    <div class="chips">${comp}${mes}</div>
    ${r.categorias.length ? `<p class="rotulo espaco">Para onde foi</p><ul class="linhas">${r.categorias.map(x => linha(esc(x.nome), brl0(x.total))).join('')}</ul>` : ''}
    ${r.maiores.length ? `<p class="rotulo espaco">Maiores gastos</p><ul class="linhas">${r.maiores.map(x => linha(`${esc(nomeCurto(x.descricao))} <small class="suave">${dm(x.data)}</small>`, brl0(x.valor))).join('')}</ul>` : ''}
    <p class="rotulo espaco">Próximos 7 dias${p.ateFimDoMes ? ' (até o fim do mês)' : ''}</p>
    ${p.itens.length ? `<ul class="linhas">${p.itens.slice(0, 5).map(x => linha(`${esc(nomeCurto(x.desc))} <small class="suave">${dm(x.data)}</small>`, `${x.valor > 0 ? '+' : '−'}${brl0(Math.abs(x.valor))}`)).join('')}</ul>
      <p class="meta">${p.saem ? `Saem ${brl0(p.saem)}` : ''}${p.saem && p.entram ? ' · ' : ''}${p.entram ? `entram ${brl0(p.entram)}` : ''}${p.itens.length > 5 ? ` · +${p.itens.length - 5} na agenda` : ''}</p>`
      : '<p class="meta">Nenhuma conta a pagar ou salário a receber.</p>'}
    ${aporte ? `<ul class="linhas">${aporte}</ul>` : ''}
  </section>`;
}

// v9.19 (repaginação, etapa 2): o Hoje com a chave da interface nova — quatro blocos + até 3 faixas de ação.
// As faixas são as linhas do "Hoje" de sempre (linhasDoHoje) mais o que hoje são cartões soltos no Início: fechamento
// pronto, hora de fechar o mês, resumo da semana (domingo) e a próxima conta em até 3 dias.
function hojeV10(m, dados, cart, ctx, opcoes) {
  const extras = [];
  if (opcoes.github && opcoes.rascunhos && Object.keys(opcoes.rascunhos).length) extras.push({ tom: 'atencao', texto: 'Fechamento pronto: ver e aplicar', attr: 'data-fech-pronto' });
  if (opcoes.github && (ctx.mesPassou || ctx.diaHoje === ctx.dias)) extras.push({ tom: 'atencao', texto: `Hora de fechar ${MESES[ctx.mes - 1]} com o Claude`, attr: 'data-levar-claude' });
  if (ehDomingo(opcoes.hoje) && !ctx.mesPassou) extras.push({ tom: 'info', texto: 'Resumo da semana', attr: 'data-semana' });
  let linhas = [];
  try { linhas = linhasDoHoje(m, dados, cart, ctx, opcoes); } catch { /* sem linhas */ }
  let investido = null;
  try { if (cart) investido = { total: posicao(cart).total, mercado: Number(resultadoDoMes(cart)?.mercado) || 0 }; } catch { /* carteira incompleta */ }
  return htmlHojeV10({ c: m.c, limite: dados.regras?.limiteSaudavelItau || 0, venceDia: dados.calendario?.faturaCartao, mesProx: ctx.mes === 12 ? 1 : ctx.mes + 1, investido, faixas: faixasDoHoje(linhas, extras), github: !!opcoes.github }) + hojeListasCv(m, dados, ctx, opcoes);
}

// v9.27 (pedido do Bruno: "o Hoje está cru"): as próximas contas (com o pago) e as últimas compras do cartão, para ler
// sem sair do Hoje; cada lista leva à sua tela
function hojeListasCv(m, dados, ctx, opcoes) {
  const gh = !!opcoes.github, partes = [];
  let contas = [];
  try { contas = ctx.mesPassou ? [] : proximasContas(m, dados); } catch { /* sem agenda */ }
  const hoje = opcoes.hoje || hojeBrasil();
  if (contas.length) {
    const aPagar = contas.filter(x => x.valor < 0).reduce((s, x) => s - x.valor, 0);
    const aEntrar = contas.filter(x => x.valor > 0).reduce((s, x) => s + x.valor, 0);
    partes.push(secaoCv(aEntrar ? 'Contas e entradas' : 'Contas a pagar', { contagem: contas.length, link: linkCv('Ver todas', 'data-ir-aba="mes/agenda"') }), blocoCv(`<p class="cv-resumo"><b>${esc(brl(aPagar))}</b> a pagar${aEntrar ? ` · <b class="sobe">${esc(brl(aEntrar))}</b> a entrar` : ''}</p>${listaCv(contas.slice(0, 4).map(x => {
      const pode = gh && x.item && PAGAVEIS.includes(x.lista);
      return linhaCv({
        icone: diaCv(x.dia, semanaDe(x.data), x.data === hoje), titulo: nomeCurto(x.desc), sub: x.valor > 0 ? 'a receber' : 'a pagar',
        valor: `${x.valor > 0 ? '+' : ''}${esc(brl(Math.abs(x.valor)))}`, attr: pode ? `data-conta="${esc(x.lista)}|${esc(x.item)}"` : '',
        acao: pode ? { rotulo: x.valor > 0 ? 'Recebi' : 'Paguei', attr: `data-pagar="${esc(x.lista)}|${esc(x.item)}"`, icone: CHECK } : null,
      });
    }))}`));
  }
  try {
    const compras = composicaoFatura(dados).grupos.filter(g => g.k === 'compra' || g.k === 'fatura').flatMap(g => g.itens).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
    if (compras.length) {
      partes.push(secaoCv('Últimas compras', { link: linkCv('Cartão', 'data-aba="cartao"') }), blocoCv(listaCv(compras.slice(0, 3).map(i => {
        const [k, v] = Object.entries(i.abrir || {})[0] || [];
        return linhaCv({
          icone: iconeCategoria(i.categoria || 'Others', 'peq'), titulo: i.descricao,
          sub: esc([i.data ? ddmm(i.data) : '', i.categoria ? nomeCategoria(i.categoria) : ''].filter(Boolean).join(' · ')),
          valor: `${i.valor > 0 ? '−' : ''}${esc(brl(Math.abs(i.valor)))}`, attr: gh && ABRIR_FATURA[k] ? `${ABRIR_FATURA[k]}="${esc(v)}"` : '',
        });
      }))));
    }
  } catch { /* sem fatura detalhada */ }
  return partes.join('');
}

// v9.1: um cartão só, uma linha por assunto; tocar leva à tela de cada um
// v9.19: as linhas do "Hoje" (aporte, plano, orçamento, metas, alertas, Claude, gatilhos), já na ordem de urgência —
// usadas pelo cartão "Hoje" da v8 e pelas faixas do Hoje novo (v10.js)
export function linhasDoHoje(m, dados, cart, ctx, opcoes) {
  const linhas = [];
  const tenta = fn => { try { const l = fn(); if (l) linhas.push(l); } catch { /* sem esse dado */ } };
  tenta(() => { const a = aportePlanejado(m, dados, cart, ctx); return a && { tom: a.dia ? 'bom' : 'atencao', texto: `Aporte do mês ${brl(a.valor)} · ${a.dia ? (a.dia <= ctx.diaHoje ? 'hoje já dá' : `a partir do dia ${a.dia}`) : a.cabe > 0 ? `cabem ${brl(a.cabe)}` : 'não cabe neste mês'}`, ir: 'carteira/visao', ...(a.dia && a.dia <= ctx.diaHoje ? { acao: { rotulo: 'Investir', attr: 'data-aporte-plano' }, peso: 1 } : {}) }; });
  // v9.13 (parte 2, o "Hoje"): passo do plano de ação com data até daqui a 7 dias (ou já passada) e ainda pendente
  tenta(() => {
    const hoje = opcoes.hoje;
    const lim = hoje && new Date(Date.parse(`${hoje}T12:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10);
    const ps = (cart?.plano_acao?.passos || []).filter(x => !/conclu|decidid|cancel/i.test(x.status || '') && /^\d{4}-\d{2}-\d{2}/.test(x.quando || '') && x.quando.slice(0, 10) <= lim);
    if (!ps.length) return null;
    const p = ps.sort((x, y) => x.quando.localeCompare(y.quando))[0];
    const q = p.quando.slice(0, 10), atrasado = q < hoje;
    const dia = q === hoje ? 'hoje' : `${atrasado ? 'era ' : ''}${q.slice(8, 10)}/${q.slice(5, 7)}`;
    return { tom: atrasado ? 'atencao' : 'info', texto: `Plano: ${p.titulo} · ${dia}${ps.length > 1 ? ` (+${ps.length - 1})` : ''}`, ir: 'carteira/visao', ...(opcoes.github ? { acao: { rotulo: 'Feito', attr: `data-passo="${esc(p.n)}"` } } : {}) };
  });
  tenta(() => { const o = orcamentoDoMes(dados, ctx).filter(x => x.pct >= 0.8); if (!o.length) return null; const passou = o.filter(x => x.pct >= 1).length; return { tom: passou ? 'ruim' : 'atencao', texto: passou ? `Orçamento: ${passou} ${passou === 1 ? 'categoria passou' : 'categorias passaram'} do limite` : `Orçamento: ${o.length} perto do limite`, ir: 'cartao/gastos' }; });
  tenta(() => { const r = cart && rendaPassiva(dados, cart, (m.c?.fixas || 0) + (m.c?.variaveis || 0)); if (!r) return null;
    // v9.15: no começo do mês os dividendos ainda não caíram ("paga 0%"): mostra a média de 3 meses; sem renda nenhuma, some
    if (r.atual.pct >= 0.005) return { tom: 'info', texto: `Renda passiva paga ${pctBr(r.atual.pct)} das despesas`, ir: 'carteira/renda' };
    const fechados = r.serie.slice(0, -1).slice(-3); // sem o mês aberto, que ainda está em 0
    const custo = fechados.reduce((s, x) => s + x.custo, 0);
    const media = custo ? fechados.reduce((s, x) => s + x.dividendos, 0) / custo : 0;
    return media >= 0.005 ? { tom: 'info', texto: `Renda passiva paga ~${pctBr(media)} das despesas (média de 3 meses)`, ir: 'carteira/renda' } : null; });
  tenta(() => { const l = cart ? progressoMetas(cart, opcoes.hoje) : []; return l.length ? { tom: 'info', texto: `Metas: ${l.map(x => `${x.nome} ${Math.round(x.pct * 100)}%`).slice(0, 2).join(' · ')}`, ir: 'carteira/visao' } : null; });
  tenta(() => { const al = (m.alertas || []).filter(a => a.tom !== 'bom'); return al.length ? { tom: al.some(a => a.tom === 'ruim') ? 'ruim' : 'atencao', texto: al.length === 1 ? al[0].titulo : `${al.length} alertas: ${al[0].titulo}`, ir: 'analises/saude' } : null; });
  // v9.9.12: hora de rodar o Plano com o Claude antes do fechamento (o cenário mudou) — só no celular que publica
  tenta(() => { const p = opcoes.github && opcoes.hoje && agendaClaude(dados, cart, opcoes.hoje).find(x => x.qual === 'plano'); return p?.agora && opcoes.hoje < p.proxima ? { tom: 'atencao', texto: `Rodar o Plano com o Claude: ${p.motivo}`, attr: 'data-levar-claude' } : null; });
  // v9.13: gatilho da estratégia que disparou (dólar, CDI, salário) → hora de rever com o Claude
  tenta(() => { const g = cart && gatilhos(cart.estrategia, opcoes.gatilhos || {}).find(x => x.disparou); return g ? { tom: 'atencao', texto: `Gatilho da estratégia: ${g.texto}`, ...(opcoes.github ? { attr: 'data-levar-claude' } : { ir: 'carteira/aloc' }) } : null; });
  // o que pede ação primeiro: problema, atenção, o que dá para fazer agora (botão), o resto
  const peso = l => (l.tom === 'ruim' ? 0 : l.tom === 'atencao' ? 1 : l.acao ? 2 : 3);
  return linhas.sort((a, b) => peso(a) - peso(b));
}

function destaquesInicio(m, dados, cart, ctx, opcoes) {
  const linhas = linhasDoHoje(m, dados, cart, ctx, opcoes);
  if (!linhas.length) return '';
  return `<section class="cartao hoje">
    <div class="cartao-topo"><h2>Hoje</h2></div>
    <ul class="destaques">${linhas.map(l => `<li><button type="button" ${l.attr || `data-ir-aba="${l.ir}"`}>${icTom(l.tom)}<span>${esc(l.texto)}</span>${l.acao && opcoes.github ? '' : svg('<path d="m9 6 6 6-6 6"/>', 'seta')}</button>${l.acao && opcoes.github ? `<button type="button" class="btn mini" ${l.acao.attr}>${esc(l.acao.rotulo)}</button>` : ''}</li>`).join('')}</ul>
  </section>`;
}

// v8.9: o aporte planejado do mês (carteira.plano_aportes) e o dia seguro para fazer, calculado do saldo dia a dia
function aporteCartao(m, dados, cart, ctx, opcoes = {}) {
  const a = aportePlanejado(m, dados, cart, ctx);
  if (!a) return '';
  const dd = dia => `${String(dia).padStart(2, '0')}/${dados.periodo.slice(5, 7)}`;
  const onde = a.itens.map(i => `${esc(i.nome)} ${brl0(i.falta)}`).join(' · ');
  const aperto = d => (d ? `no dia ${d}` : 'no começo do mês que vem');
  const corpo = a.dia
    ? `<div class="chips">${chip('bom', a.dia <= ctx.diaHoje ? 'Hoje já dá para aportar' : `Pode aportar a partir de ${dd(a.dia)}`)}</div>
      <p class="nota">Depois do aporte, o dia mais apertado da conta (${aperto(a.apertoDia)}) ainda fica com ${brl0(a.apertoSaldo)}${a.buffer ? `, acima da reserva de ${brl0(a.buffer)}` : ''}.</p>`
    : `<div class="chips">${chip('atencao', a.cabe > 0 ? `Cabem ${brl0(a.cabe)} a partir de ${dd(a.cabeDia)}` : 'Não cabe neste mês')}</div>
      <p class="nota">Mesmo sem o aporte, a conta chega a ${brl0(a.apertoSaldo)} ${aperto(a.apertoDia)}${a.buffer ? ` (reserva: ${brl0(a.buffer)})` : ''}. ${a.cabe > 0 ? 'Aporte só o que cabe' : 'Aportar agora tiraria dinheiro que vai faltar'}, ou revise o plano no modo PLANO com o Claude.</p>`;
  return `<section class="cartao">
    <div class="cartao-topo"><h2>Aporte do mês</h2>${opcoes.github ? '<button type="button" class="link" data-aporte-plano>Investir</button>' : ''}</div>
    <p class="mini-valor">${brl0(a.valor)}</p>
    <p class="cartao-sub">${onde}</p>
    ${corpo}
  </section>`;
}

function abaInicioHub(m, dados, ctx, opcoes) {
  const cart = opcoes.carteira;
  if (opcoes.v10) return hojeV10(m, dados, cart, ctx, opcoes);
  let conf = [];
  try {
    if (cart) conf = itensConferencia(m, dados, cart, ctx);
  } catch { /* conferência indisponível */ }
  const fechar = (ctx.mesPassou || ctx.diaHoje === ctx.dias) && opcoes.github ? secao(() => fecharMes(dados, ctx, cart)) : '';
  // v8.5: o que se faz todo dia primeiro (dá para gastar, próximas contas); conta e cartão aparecem uma vez só.
  // v8.7: a ordem e o que aparece são escolhidos em menu → Organizar o Início (cada celular guarda a sua)
  const cartoes = {
    gastar: () => heroGastar(m, opcoes.hoje && !ctx.mesPassou ? gastoDoDia(dados, opcoes.hoje) : null),
    proximas: () => proximas(m, dados, ctx, opcoes),
    acao: () => cartaoAcao(m),
    contaCartao: () => duplaContaCartao(m, dados, ctx),
    patrimonio: () => (cart ? patrimonioLiquido(m, cart, conf, opcoes.estimativa, true) : ''),
    atencao: () => alertasCompactos(m),
    orcamento: () => orcamentoCartao(dados, ctx, opcoes, true),
    metas: () => (cart ? metasCartao(cart, { ...opcoes, hoje: opcoes.hoje }, true) : ''),
    renda: () => (cart ? rendaPassivaCartao(m, dados, cart, true) : ''),
    aporte: () => (cart ? aporteCartao(m, dados, cart, ctx, opcoes) : ''),
    destaques: () => destaquesInicio(m, dados, cart, ctx, opcoes),
  };
  const semana = ehDomingo(opcoes.hoje) && !ctx.mesPassou ? secao(() => resumoSemanaHtml(m, dados, cart, ctx, opcoes)) : '';
  const pronto = opcoes.github ? secao(() => fechamentoPronto(opcoes.rascunhos, opcoes.fechamentoAplicado)) : '';
  return [pronto, fechar, semana, ...ordemInicio(opcoes.ordemInicio).filter(c => c.on && cartoes[c.id]).map(c => secao(cartoes[c.id]))].join('');
}

// opcoes: { doc (painel do caixa), docCarteira, carteira (JSON), estimativa (cotacoes.js), sub, abertos (Set), github, agora }
export function htmlAba(aba, m, dados, opcoes = {}) {
  const ctx = contexto(dados, opcoes.agora || new Date());
  if (aba === 'inicio' || !SUBABAS[aba]) return abaInicioHub(m, dados, ctx, opcoes);
  // v9.26: a interface nova desenha cada tela do zero; a leitura de antes (com os blocos do painel) só em "Tudo do painel"
  if (opcoes.v10 && TELAS_CV[aba] && !opcoes.tudo) return TELAS_CV[aba](m, dados, ctx, opcoes);
  let blocos = [];
  try {
    if (opcoes.doc) blocos = blocosDoPainel(opcoes.doc, { trocas: trocasDeGraficos(m, dados, ctx), abertos: opcoes.abertos, diaHoje: ctx.mesPassou ? 0 : ctx.diaHoje, pular: PULAR_DO_CAIXA });
  } catch (e) {
    console.warn('Tradução do painel indisponível:', e);
  }
  const v2 = { mes: abaMes, cartao: abaCartao, carteira: abaFuturo, analises: abaAnalises }[aba];
  if (!blocos.length) return v2(m, dados, ctx, opcoes); // painel sem blocos reconhecíveis: telas da v2
  const temCarteira = !!(opcoes.docCarteira && opcoes.carteira);
  if (temCarteira) {
    try {
      blocos = blocos.concat(blocosDoPainel(opcoes.docCarteira, { trocas: trocasDaCarteira(opcoes.carteira, !!opcoes.github, !!opcoes.v10), abertos: opcoes.abertos, prefixo: 'c-', fonte: 'carteira', pular: PULAR_DA_CARTEIRA }));
    } catch (e) {
      console.warn('Tradução da carteira indisponível:', e);
    }
  }
  const sub = SUBABAS[aba].some(([id]) => id === opcoes.sub) ? opcoes.sub : subPadrao(aba);
  const chave = `${aba}/${sub}`;
  // os blocos do painel de uma sub-aba, já na ordem e recolhidos
  const doLugar = chave => {
    let daqui = blocos.filter(b => lugarDoBloco(b, temCarteira) === chave);
    if (aba === 'carteira') daqui = daqui.map((b, i) => ({ b, i })).sort((x, y) => pesoSecao(x.b) - pesoSecao(y.b) || x.i - y.i).map(x => x.b);
    // v8.5: na Agenda, a lista do mês logo abaixo do destaque (os indicadores e o aviso do agente vêm depois)
    if (chave === 'mes/agenda') daqui = daqui.map((b, i) => ({ b, i })).sort((x, y) => (y.b.html.includes('pn-agenda') - x.b.html.includes('pn-agenda')) || x.i - y.i).map(x => x.b);
    if (chave === 'cartao/gastos') {
      const peso = b => { const i = ORDEM_GASTOS.findIndex(re => re.test(b.titulo || '')); return i < 0 ? ORDEM_GASTOS.length : i; };
      daqui = daqui.map((b, i) => ({ b, i })).sort((x, y) => peso(x.b) - peso(y.b) || x.i - y.i).map(x => x.b);
    }
    daqui = daqui.map(b => recolherBloco(b, opcoes.abertos));
    return recolherSecoes(daqui, opcoes.abertos);
  };
  if (opcoes.v10 && LEITURAS_V10[aba]) {
    const lugar = aba !== 'carteira' ? doLugar : k => { const l = doLugar(k); return k === 'carteira/visao' ? [...l.filter(ehRoteiro), ...l.filter(b => !ehRoteiro(b))] : l; };
    const args = [m, dados, ctx, { ...opcoes, carteira: temCarteira ? opcoes.carteira : null }];
    if (opcoes.tudo) return `<div class="tudo-topo-cv"><button type="button" class="link-cv" data-tudo="">‹ Voltar</button><h2>Tudo do painel</h2><p>Tudo o que o painel do Claude mostra sobre este assunto. Toque para abrir.</p></div>${tudoV10(aba, LEITURAS_V10[aba], lugar, opcoes.abertos, args)}`;
    return leituraV10(LEITURAS_V10[aba], lugar, opcoes.abertos, VAZIO_V10[aba], args);
  }
  const daqui = doLugar(chave);
  const partes = [
    ...(ANTES[chave]?.(m, dados, ctx, { ...opcoes, carteira: temCarteira ? opcoes.carteira : null }) || []),
    ...daqui.filter(b => !b.explicacao).map(b => b.html),
    ...(DEPOIS[chave]?.(m, dados, ctx, opcoes) || []),
    entenda(daqui.filter(b => b.explicacao), opcoes.abertos),
  ].filter(Boolean);
  return partes.join('') || '<section class="cartao"><p class="cartao-sub">Nada nesta parte por enquanto.</p></section>';
}

// Repaginação (v9.20–v9.24): cada destino é uma leitura só, de cima para baixo, juntando as sub-abas de antes —
// tudo o que elas mostravam, inclusive os blocos do painel de cada uma. Grupo = [título, sub-aba, partes do app antes
// dos blocos do painel, partes depois] (antes/depois: lista pronta ou função (m, dados, ctx, opcoes); sem eles, os
// ANTES/DEPOIS da sub-aba). Título só onde há conteúdo, com âncora para os links (data-ir-aba) rolarem até ele; as
// explicações de todas as partes vão juntas no Entenda do fim.
export function leituraV10(grupos, doLugar, abertos, vazio, args = []) {
  const parte = (f, padrao) => (typeof f === 'function' ? f(...args) : f || padrao?.(...args) || []);
  const lugares = grupos.map(g => doLugar(g[1]));
  return [
    ...grupos.map(([titulo, chave, antes, depois], i) => {
      const h = [...parte(antes, ANTES[chave]), ...lugares[i].filter(b => !b.explicacao).map(b => b.html), ...parte(depois, DEPOIS[chave])].filter(Boolean).join('');
      return h ? `${titulo ? `<h3 class="secao-v10" id="v10-${chave.replace('/', '-')}">${titulo}</h3>` : ''}${h}` : '';
    }),
    entenda(lugares.flat().filter(b => b.explicacao), abertos),
  ].filter(Boolean).join('') || `<section class="cartao"><p class="cartao-sub">${vazio}</p></section>`;
}

// v9.27 (pedido do Bruno: "Tudo do painel" estava feio): um índice limpo em vez da pilha de blocos. Cada sub-aba de
// antes vira um grupo (com o nome dela); cada bloco do painel, uma linha (ícone, título, um resumo) que abre ali mesmo
// (details — os controles do painel, simuladores e pago/a pagar continuam funcionando). Nada some.
const textoLimpo = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const IC_TUDO = {
  tabela: '<path d="M4 6h16M4 12h16M4 18h16M9 6v12"/>',
  grafico: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>',
  numeros: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
  aviso: ICONE_IDEIA,
  texto: '<path d="M5 6h14M5 11h14M5 16h9"/>',
};
// v10.0 (áudio do Bruno, 18/11: "coisas tão simples, não precisa ser segmentado"): pares do mesmo assunto viram uma linha
// só — o segundo entra embaixo do primeiro, com o título dele. [o que entra, onde entra, título da linha]
const JUNTAR_TUDO = [
  [/^Aportes do mês/i, /^Consumo de patrimônio/i, 'Consumo de patrimônio e aportes do mês'],
  [/^Custo médio/i, /^Eficiência da Renda Fixa/i, 'Renda fixa: eficiência, custo médio e retorno real'],
  [/^Termômetro de longo prazo/i, /^Variação do patrimônio/i, 'Variação do patrimônio, do mês ao longo prazo'],
];
function juntarTudo(itens) {
  for (const [de, em, titulo] of JUNTAR_TUDO) {
    const a = itens.findIndex(it => de.test(it.titulo)), b = itens.findIndex(it => em.test(it.titulo));
    if (a < 0 || b < 0) continue;
    itens[b] = { ...itens[b], titulo, html: `${itens[b].html}<div class="junto-cv"><p class="junto-titulo">${esc(itens[a].titulo)}</p>${itens[a].html}</div>` };
    itens.splice(a, 1);
  }
  return itens;
}
// blocos do painel que a tela nova já mostra inteiros (o mercado por ativo vira o carrossel das Análises)
const REPETE_TELA_V10 = /class="mercado-acao"/;
// "<section>…</section><section>…</section>" → um pedaço por cartão de primeiro nível (texto solto vai com o seguinte)
function cartoesSoltos(html) {
  const out = [];
  let prof = 0, ini = 0;
  for (const t of String(html).matchAll(/<(\/?)section\b[^>]*>/g)) {
    if (!t[1]) prof++;
    else if (--prof === 0) { out.push(html.slice(ini, t.index + t[0].length)); ini = t.index + t[0].length; }
  }
  const resto = html.slice(ini);
  if (resto.trim()) out.push(resto);
  return out;
}
function itemTudo(html, titulo) {
  // bloco que a leitura recolhia ("Toque para abrir"): aqui a própria linha já abre — tira a dobra de dentro
  const rec = String(html).match(/^\s*<details class="dobra"[^>]*>\s*<summary>[\s\S]*?<\/summary>([\s\S]*)<\/details>\s*$/);
  if (rec) html = rec[1];
  const t = titulo || textoLimpo(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] || html.match(/class="(?:rotulo|pn-h|pn-dobra-t)"[^>]*>([\s\S]*?)<\/(?:p|b|span)>/)?.[1] || html.match(/class="link-extrato"[\s\S]*?<b>([\s\S]*?)<\/b>/)?.[1]) || 'Indicadores';
  const sub = textoLimpo(html.match(/class="cartao-sub"[^>]*>([\s\S]*?)<\/p>/)?.[1] || html.match(/class="hero-sub"[^>]*>([\s\S]*?)<\/p>/)?.[1] || html.match(/class="link-extrato"[\s\S]*?<small>([\s\S]*?)<\/small>/)?.[1]);
  const tipo = /pn-tab|<table|pn-registros/.test(html) ? 'tabela' : /<svg[^>]*class="[^"]*(grafico|g-)/.test(html) || /barrash|colunas|hero-grafico/.test(html) ? 'grafico'
    : /class="tiles"|pn-solto/.test(html) ? 'numeros' : /pn-callout|pn-alerta|analise/.test(html) ? 'aviso' : 'texto';
  let resumo = /^toque para abrir$/i.test(sub) ? '' : sub;
  // v10.0 (o Bruno viu blocos "vazios"): sem nada além do título, o bloco diz isso em vez de abrir em branco
  if (!/<(svg|canvas|input|select|textarea|button)\b/.test(html) && textoLimpo(html.replace(/<h2[^>]*>[\s\S]*?<\/h2>/, '').replace(/<p class="cartao-sub"[\s\S]*?<\/p>/, '')).replace(/[—–-]/g, '').trim().length < 3) {
    html += '<p class="cv-nota vazio-cv">O painel do Claude não trouxe dados para este bloco agora. Se continuar assim, mande o Diagnóstico (menu → Configurações → Suporte) ou peça no próximo fechamento.</p>';
    resumo ||= 'sem dados agora';
  }
  // v9.29: aberto, o bloco não repete o nome da linha (título do aviso igual ao da linha) nem diz "Toque para abrir"
  html = html.replace(/<p class="cartao-sub">\s*Toque para abrir\s*<\/p>/gi, '');
  const igual = [...html.matchAll(/<(\w+) class="pn-h"[^>]*>([\s\S]*?)<\/\1>/g)].find(x => textoLimpo(x[2]).toLowerCase() === t.toLowerCase());
  if (igual) html = html.replace(igual[0], '');
  // dobra única (ou grupos da fatura) já vem aberta; várias dobras (ex.: ano a ano) ficam fechadas para tocar uma a uma
  const varias = (html.match(/<details[^>]*class="[^"]*\bdobra\b/g) || []).length > 1;
  return { titulo: t, sub: resumo.length > 90 ? `${resumo.slice(0, 88)}…` : resumo, tipo, html: html.replace(varias ? /<details(?![^>]*\sopen)([^>]*class="[^"]*comp-grupo[^"]*")/g : /<details(?![^>]*\sopen)([^>]*class="[^"]*(?:dobra|comp-grupo)[^"]*")/g, '<details open$1').replace(/<details(?=[^>]*class="[^"]*\bdobra\b)/g, varias ? '<details data-varias' : '<details data-unica') };
}
export function tudoV10(aba, grupos, doLugar, abertos, args = []) {
  const parte = (f, padrao) => (typeof f === 'function' ? f(...args) : f || padrao?.(...args) || []);
  const nomes = Object.fromEntries((SUBABAS[aba] || []).map(([id, nome]) => [`${aba}/${id}`, nome]));
  const lugares = grupos.map(g => doLugar(g[1]));
  const linha = (it, chave) => `<details class="tudo-item" data-chave="${esc(chave)}"${abertos?.has(chave) ? ' open' : ''}>
      <summary><span class="ic-tile">${svg(IC_TUDO[it.tipo])}</span><span class="li-txt"><b>${esc(it.titulo)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>${svg('<path d="m9 6 6 6-6 6"/>', 'tudo-seta')}</summary>
      <div class="tudo-corpo">${it.html}</div>
    </details>`;
  // peças do app: uma linha por cartão (contas do mês = entradas, saídas, investimentos…), sem os botões de lançar
  const doApp = l => l.filter(Boolean).flatMap(cartoesSoltos).filter(h => !/class="cartao contas-acoes"|class="acoes-rapidas"/.test(h)).map(h => itemTudo(h));
  const blocos = grupos.map(([, chave, antes, depois], i) => {
    const itens = [
      ...doApp(parte(antes, ANTES[chave])),
      ...lugares[i].filter(b => !b.explicacao && !REPETE_TELA_V10.test(b.html || '')).map(b => itemTudo(b.html, b.titulo)),
      ...doApp(parte(depois, DEPOIS[chave])),
    ].filter(it => textoLimpo(it.html).length > 2);
    juntarTudo(itens);
    if (!itens.length) return '';
    return `${secaoCv(nomes[chave] || 'Outros', { id: `v10-${chave.replace('/', '-')}`, contagem: itens.length })}<div class="tudo-lista">${itens.map((it, j) => linha(it, `tudo:${chave}:${j}`)).join('')}</div>`;
  }).filter(Boolean);
  const exp = lugares.flat().filter(b => b.explicacao);
  if (exp.length) blocos.push(`${secaoCv('Entenda', { contagem: exp.length })}<div class="tudo-lista">${exp.map((b, j) => linha({ titulo: b.titulo, sub: '', tipo: 'aviso', html: `<div class="pn-p">${b.corpo}</div>` }, `tudo:entenda:${aba}:${j}`)).join('')}</div>`);
  return blocos.join('') || '<p class="cv-nota">Nada do painel sobre este assunto.</p>';
}

// v9.29: o que vai para "Tudo do painel" — um grupo por sub-aba de antes. As peças do app que as telas novas já mostram
// inteiras (destaques, botões de lançar, metas, movimentar, ativos, nota, análises, mercado, conferência, 12 meses) ficam
// de fora ([] = nenhuma); o resto (contas do mês com edição, recorrentes, estratégia, renda fixa…) continua aqui.
export const LEITURAS_V10 = {
  cartao: [
    ['', 'cartao/fatura', (m, dados, ctx, opcoes) => [secao(() => composicaoCartao(dados, opcoes))]],
    ['Por categoria', 'cartao/gastos'],
    ['Próximas faturas', 'cartao/parcelas', (m, dados, ctx, opcoes) => [secao(() => recorrentesCartao(dados, opcoes))]],
  ],
  carteira: [
    ['', 'carteira/visao', []],
    ['Estratégia', 'carteira/aloc'],
    ['Seus ativos', 'carteira/ativos', (m, dados, ctx, opcoes) => [opcoes.carteira ? secao(() => ganhosPerdas(opcoes.carteira, opcoes.abertos)) : '']],
    ['Renda', 'carteira/renda'],
    ['Evolução', 'carteira/futuro'],
  ],
  mes: [
    ['', 'mes/geral', []],
    ['Contas a pagar', 'mes/agenda', []],
    ['Contas do mês', 'mes/contas', (m, dados, ctx, opcoes) => [secao(() => contasDoMes(dados, ctx, opcoes, m)), secao(() => agendadosFuturos(dados, opcoes)), secao(() => mesesFechadosCartao(dados, opcoes))]],
    ['Próximos 12 meses', 'mes/meses', []],
  ],
  analises: [['', 'analises/saude', []], ['Mercado', 'analises/mercado'], ['Histórico', 'analises/historico'], ['Conferir caixa × carteira', 'analises/conferir', []]],
};
const VAZIO_V10 = { cartao: 'Nada no cartão por enquanto.', carteira: 'Nada nos investimentos por enquanto.', mes: 'Nada no caixa por enquanto.', analises: 'Nenhuma análise por enquanto.' };
const ehRoteiro = b => /class="roteiro-n"|class="roteiro-cv"/.test(b.html || ''); // o bloco "steps" do painel, trocado por roteiroCarteira

// ---------- v9.26: o redesenho "Carteira de cartões" (escolhido pelo Bruno em 15/11/2026; .impeccable/surfaces) ----------
// Cada tela da interface nova é desenhada do zero com os componentes de carvao.js — o que importa vira um cartão que se
// desliza (o que encaixa acende em brasa: ligarCarrosseis) e tocar abre a folha do item; os blocos do painel do Claude
// saem da frente e ficam em "Tudo do painel" (LEITURAS_V10, a leitura de antes), no fim de cada tela. As âncoras
// v10-aba-sub continuam: os links "aba/sub" rolam até a seção certa.
const DIAS_SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const semanaDe = iso => DIAS_SEM[new Date(`${iso}T12:00:00`).getDay()];
const tomTile = tom => `<span class="ic-tile tom-${tom}">${tom === 'ideia' ? svg(ICONE_IDEIA) : icTom(tom)}</span>`;
const tile = d => `<span class="ic-tile">${svg(d)}</span>`;
const PAGAVEIS = ['receitas', 'despesasFixas', 'despesasVariaveis', 'obrigacoesCaixa'];
const ABRIR_FATURA = { compra: 'data-compra', compraFatura: 'data-compra-fatura', parcelamento: 'data-parcelamento', assinatura: 'data-assinatura' };
// A folha de detalhe de um cartão (só leitura, serve à Rafael também): o conteúdo vai num <template> ao lado do
// cartão e o toque (data-detalhe) abre ele numa folha. Quem publica continua com as folhas que gravam onde já existiam.
const detalheCv = (id, titulo, corpo) => `<template id="${id}"><h2 class="detalhe-titulo">${esc(titulo)}</h2>${corpo}</template>`;
const linhasDet = pares => listaCv(pares.filter(Boolean).map(([t, v, sub = '']) => linhaCv({ titulo: t, valor: v, sub })));
const tomMercado = u => ({ alta: 'ruim', media: 'atencao', média: 'atencao' }[String(u || '').toLowerCase()] || 'bom');
const ROTULO_MERCADO = { ruim: 'Agir', atencao: 'Acompanhar', bom: 'Tranquilo' };
const ORDEM_TOM = { ruim: 0, atencao: 1, bom: 2 };

function investimentosCv(m, dados, ctx, o) {
  const cart = o.carteira, gh = !!o.github;
  if (!cart) return `<span id="v10-carteira-visao"></span>${semCarteira(o)}${tudoDoPainelCv('carteira', 'O patrimônio')}`;
  const partes = ['<span id="v10-carteira-visao"></span>'], modelos = [];
  const aloc = alocacaoVsAlvo(cart);
  const merc = cart.analise_mercado?.ativos || [];
  // 1. seus ativos: os cartões; "Ver todos" troca o carrossel pela grade inteira
  const ativos = variacaoAtivos(cart).filter(a => a.valor > 0).sort((a, b) => b.valor - a.valor);
  if (ativos.length) {
    const todos = (o.abertos || new Set()).has('cv:ativos');
    const cartao = (a, i) => {
      const cod = codigoAtivo(a.nome), id = `det-ativo-${i}`;
      if (!gh) {
        const cl = aloc?.linhas.find(l => l.classe === a.classe);
        const mk = merc.find(x => codigoAtivo(x.n) === cod);
        modelos.push(detalheCv(id, a.nome, `${linhasDet([
          ['Valor', esc(brl(a.valor))],
          a.var != null ? ['Variação no mês', `${a.var < 0 ? '−' : '+'}${pct1(Math.abs(a.var * 100))}`] : null,
          ['Peso na carteira', pct1(a.pct * 100)],
          cl ? [cl.nome, `${pct1(cl.pct)}`, `alvo ${pct1(cl.alvo)} para a classe`] : null,
        ])}${mk ? `<p class="cv-resumo">${chip(tomMercado(mk.urgencia), ROTULO_MERCADO[tomMercado(mk.urgencia)])}</p><p class="cv-texto">${comNegrito(mk.acao || '')}</p>` : ''}`));
      }
      // v9.30 (o Bruno: no "Ver todos" só o primeiro ficava em brasa): na grade, todos acesos, um tom quente por classe
      return cartaoCv({
        codigo: cod, nome: a.nome, valor: esc(brl(a.valor)), destaque: !todos && i === 0, classe: todos ? `aceso classe-${String(a.classe || 'outro').replace(/[^a-z_]/g, '')}` : '',
        rodape: `${variacaoCv(a.var, `${pct1(Math.abs((a.var || 0) * 100))} no mês`)}<span>${pct1(a.pct * 100)} da carteira</span>`,
        attr: gh ? `data-ativo-abrir="${esc(a.chave)}"` : `data-detalhe="${id}"`,
      });
    };
    partes.push(secaoCv('Seus ativos', { id: 'v10-carteira-ativos', contagem: ativos.length, link: ativos.length > 2 ? (todos ? linkCv('Ver menos', 'data-fechar="cv:ativos"') : linkCv('Ver todos', 'data-abrir="cv:ativos"')) : '' }),
      todos ? `<div class="grade-cv">${ativos.map(cartao).join('')}</div>` : carrosselCv(ativos.map(cartao), 'Seus ativos'));
  }
  // 2. estratégia: agora × alvo por classe, uma linha cada (a nota só onde está fora do alvo)
  if (aloc) {
    const s = saudeCarteira(aloc, reserva(cart));
    const linhas = aloc.linhas.map(l => {
      const d = l.pct - l.alvo, perto = Math.abs(d) < 2;
      return { rotulo: l.nome, valor: pct1(l.pct), atual: l.pct, alvo: l.alvo, tom: perto ? '' : d < 0 ? 'atencao' : '', nota: perto ? '' : l.falta > 0 ? `faltam ${brl(l.falta)} para ${pct1(l.alvo)}` : `${brl(-l.falta)} acima de ${pct1(l.alvo)}` };
    });
    partes.push(secaoCv('Estratégia', { id: 'v10-carteira-aloc', link: linkCv('Ordem e gatilhos', 'data-tudo="carteira" data-tudo-secao="carteira-aloc"') }),
      blocoCv(`<p class="cv-resumo"><b>${s.fiel}% fiel</b> ao alvo${aloc.revisada ? ` · revisada em ${esc(ddmm(aloc.revisada))}` : ''}</p>
        ${barrasAlvoCv(linhas, { compacto: true })}<p class="cv-legenda"><i></i>agora<em></em>alvo</p>
        ${gh ? acoesCv([{ rotulo: 'Revisar estratégia', attr: 'data-revisar-estrategia' }, { rotulo: 'Pesquisar ativo', attr: 'data-pesquisar=""' }]) : ''}`));
  }
  // 3. o próximo passo, em destaque; o resto do que pede ação numa lista curta
  let fazer = [];
  try { fazer = linhasDoHoje(m, dados, cart, ctx, o).filter(l => (/^carteira/.test(l.ir || '') || l.attr === 'data-levar-claude') && (l.tom !== 'info' || l.acao)); } catch { /* sem linhas */ }
  const destino = l => l.attr || `data-ir-aba="${esc(l.ir || 'carteira')}"`;
  if (fazer.length) {
    const [p1] = fazer; // o resto do que pede ação já está nas faixas do Hoje
    // o botão é o da própria linha; sem ele, "Investir" quando a linha é o aporte do mês; sem nenhum, a seta (leva ao assunto)
    const acao1 = gh ? p1.acao || (/aporte/i.test(p1.texto) ? { rotulo: 'Investir', attr: 'data-aporte-plano' } : null) : null;
    partes.push(`<div class="passo-cv tom-${p1.tom}"><button type="button" class="passo-txt" ${destino(p1)}>${tomTile(p1.tom)}<span><b>${esc(p1.texto)}</b><small>próximo passo</small></span>${acao1 ? '' : svg('<path d="m9 6 6 6-6 6"/>', 'li-seta')}</button>${acao1 ? `<button type="button" class="li-acao principal" ${acao1.attr}>${esc(acao1.rotulo)}</button>` : ''}</div>`);
  }
  // 3. evolução e renda num bloco só (o gráfico, os dividendos do mês, a renda passiva e, se houver, a estimativa de hoje)
  const p = posicao(cart);
  const nums = [];
  // dividendos do mês pelo caixa (o que caiu e o que vai cair); sem nenhum, o registrado na carteira
  const divs = (dados.receitas || []).filter(r => tickerDividendo(r.descricao));
  const recebido = divs.filter(r => r.status === 'confirmado').reduce((s, r) => s + (r.valor || 0), 0);
  const aReceber = divs.filter(r => r.status !== 'confirmado').reduce((s, r) => s + (r.valor || 0), 0);
  if (divs.length) nums.push({ rotulo: `Dividendos de ${MESES[ctx.mes - 1]}`, valor: esc(brl(recebido + aReceber)), sub: `${esc(brl(recebido))} já caiu${aReceber ? ` · ${esc(brl(aReceber))} a cair` : ''}` });
  else if (p.h.dividendos > 0) nums.push({ rotulo: 'Dividendos no mês', valor: esc(brl(p.h.dividendos)) });
  try {
    const rp = rendaPassiva(dados, cart, (m.c?.fixas || 0) + (m.c?.variaveis || 0));
    if (rp?.atual && rp.atual.pct >= 0.005) nums.push({ rotulo: 'Renda passiva', valor: pctBr(rp.atual.pct), sub: `das despesas de ${esc(mesCurto(rp.atual.mes))}` });
  } catch { /* sem histórico */ }
  const evo = secao(() => evolucaoCv(cart));
  const est = String(p.data).slice(0, 10) < hojeBrasil() ? secao(() => blocoEstimativa(o.estimativa, o, cart)) : '';
  if (evo || nums.length) partes.push('<span id="v10-carteira-renda"></span>', secaoCv('Evolução e renda', { id: 'v10-carteira-futuro' }), blocoCv(`${evo || ''}${nums.length ? `<div class="separa-cv">${numerosCv(nums)}</div>` : ''}${est ? `<div class="separa-cv">${est}</div>` : ''}`));
  // 3b. v10.0 (áudio do Bruno, 18/11): a projeção de cada ativo, ao lado da do total. Quem calcula é o Claude no
  // fechamento (`projecao_ativos`, contrato em projeto.txt) — o app só mostra; sem o campo, nada aparece.
  const pj = cart.projecao_ativos;
  const proj = (pj?.ativos || []).filter(a => a?.ativo && Array.isArray(a.anos) && a.anos.length);
  if (proj.length) {
    const fim = a => a.anos[a.anos.length - 1];
    const anoFim = Math.max(...proj.map(a => Number(fim(a).ano) || 0));
    const total = proj.reduce((s, a) => s + (Number(fim(a).valor) || 0), 0);
    const pct = v => `${String(Math.round(Number(v) * 10) / 10).replace('.', ',')}% a.a.`;
    modelos.push(detalheCv('det-proj-total', `Carteira em ${anoFim}`, `<p class="cv-resumo"><b>${esc(brl(total))}</b> somando a projeção de cada ativo, sem aportes novos</p>${linhasDet(proj.map(a => [a.nome || nomeAtivo(a.ativo), esc(brl(fim(a).valor)), Number.isFinite(Number(a.taxa_anual)) ? pct(a.taxa_anual) : '']))}<p class="cv-nota">Projeção do Claude${pj.atualizado_em ? ` de ${esc(ddmm(pj.atualizado_em))}` : ''}. É uma estimativa com as premissas de cada ativo, não uma promessa.</p>`));
    const cards = [cartaoCv({ codigo: 'TOTAL', nome: 'Carteira toda', valor: esc(brl(total)), destaque: true, attr: 'data-detalhe="det-proj-total"', rodape: `<span>em ${anoFim} · sem aportes novos</span>` })];
    proj.forEach((a, i) => {
      modelos.push(detalheCv(`det-proj-${i}`, a.nome || nomeAtivo(a.ativo), `${a.premissa ? `<p class="cv-texto">${esc(a.premissa)}</p>` : ''}${linhasDet(a.anos.map(x => [String(x.ano), esc(brl(x.valor))]))}`));
      cards.push(cartaoCv({ codigo: codigoAtivo(a.nome || nomeAtivo(a.ativo)), nome: a.nome || nomeAtivo(a.ativo), valor: esc(brl(fim(a).valor)), attr: `data-detalhe="det-proj-${i}"`,
        rodape: `<span>em ${esc(fim(a).ano)}${Number.isFinite(Number(a.taxa_anual)) ? ` · ${pct(a.taxa_anual)}` : ''}</span>` }));
    });
    partes.push(secaoCv('Projeção de cada ativo', { contagem: proj.length }), carrosselCv(cards, 'Projeção de cada ativo'));
  }
  // 4. metas: uma linha por meta, com a barra do quanto já foi
  const metas = progressoMetas(cart, ctx.hoje || o.hoje);
  if (metas.length || gh) {
    partes.push(secaoCv('Metas', { contagem: metas.length || null, link: gh ? linkCv('Nova meta', 'data-meta="nova"') : '' }), blocoCv(metas.length ? listaCv(metas.map((mt, i) => {
      const quando = mt.concluida ? 'meta alcançada' : mt.porMes ? `${brl(mt.porMes)} por mês até ${mesCurto(mt.prazo)}` : `faltam ${brl(mt.falta)}`;
      if (!gh) modelos.push(detalheCv(`det-meta-${i}`, mt.nome, linhasDet([['Guardado', esc(brl(mt.atual))], ['Meta', esc(brl(mt.alvo))], ['Falta', esc(brl(mt.falta))], mt.prazo ? ['Prazo', esc(mesCurto(mt.prazo))] : null, mt.porMes ? ['Por mês', esc(brl(mt.porMes))] : null])));
      return linhaCv({
        icone: `<span class="pct-cv${mt.concluida ? ' feito' : ''}">${Math.round(mt.pct * 100)}%</span>`, titulo: mt.nome,
        sub: `<i class="cv-barra"><i style="width:${Math.round(mt.pct * 100)}%"></i></i>${esc(quando)}`,
        valor: esc(brl(mt.atual)), valorSub: `de ${esc(brl(mt.alvo))}`, attr: gh ? `data-meta="${esc(mt.id)}"` : `data-detalhe="det-meta-${i}"`,
      });
    })) : '<p class="cv-nota">Nenhuma meta ainda — reserva, viagem, apê: quanto e até quando.</p>'));
  }
  // 5. movimentar (quem publica): uma fileira de ícones, e o que vai para o Claude em dois links
  if (gh) {
    const acao = (rot, attr, d) => `<button type="button" ${attr}><span class="ic-tile">${svg(d)}</span>${rot}</button>`;
    partes.push(`<div class="acoes-ic-cv">${[
      acao('Aporte', 'data-investir="aporte"', '<circle cx="12" cy="12" r="8.5"/><path d="M12 8.5v7M8.5 12h7"/>'),
      acao('Resgate', 'data-investir="resgate"', '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>'),
      acao('Dividendo', 'data-investir="dividendo"', '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.5-.8-1.4-1.2-2.5-1.2-1.5 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.1-1.1 1.9-2.5 1.9-1.2 0-2.2-.5-2.7-1.4M12 6.8v1.5M12 15.7v1.5"/>'),
      acao('Valores', 'data-investir="valores"', '<path d="M20 11a8 8 0 0 0-14.6-4.5M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20v-4h-4"/>'),
    ].join('')}</div><p class="links-cv">Com o Claude: ${linkCv('Atualização parcial', 'data-modelo="parcial"')} · ${linkCv('Fechamento do mês', 'data-modelo="fechamento"')}</p>`);
  }
  partes.push(tudoDoPainelCv('carteira', 'Score, dividendos, renda fixa, simuladores e mais'), ...modelos); // a data da posição está no topo
  return partes.join('');
}

function cartaoTelaCv(m, dados, ctx, o) {
  const gh = !!o.github, c = m.c || {};
  const limite = dados.regras?.limiteSaudavelItau || 0;
  const partes = ['<span id="v10-cartao-fatura"></span>'], modelos = [];
  const itens = composicaoFatura(dados).grupos.filter(g => g.k === 'compra' || g.k === 'fatura').flatMap(g => g.itens)
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const linhaCompra = (i, editar) => {
    const [k, v] = Object.entries(i.abrir || {})[0] || [];
    return linhaCv({
      icone: iconeCategoria(i.categoria || 'Others', 'peq'), titulo: i.descricao,
      sub: esc([i.data ? ddmm(i.data) : '', i.categoria ? nomeCategoria(i.categoria) : ''].filter(Boolean).join(' · ')),
      valor: `${i.valor > 0 ? '−' : ''}${esc(brl(Math.abs(i.valor)))}`, valorSub: i.valor > 0 ? 'estorno' : '',
      attr: editar && gh && ABRIR_FATURA[k] ? `${ABRIR_FATURA[k]}="${esc(v)}"` : '',
    });
  };
  // v9.27: as próximas faturas (o que já está comprometido) — a aberta saiu do carrossel: o topo já mostra o valor e o
  // vencimento, e a composição e as compras vêm logo abaixo (pedido do Bruno: estava duplicado)
  const futuras = (m.cf?.meses || []).slice(0, 6);
  futuras.forEach((f, i) => modelos.push(detalheCv(`det-fatura-${i + 1}`, `Fatura de ${MESES[f.mes - 1]} ${f.ano}`,
    `<p class="cv-resumo"><b>${esc(brl(f.total))}</b> já comprometido</p>${listaCv([...f.ativas].sort((a, b) => b.valor - a.valor).map(pc => linhaCv({ titulo: nomeCurto(pc.nome), sub: esc((n => (n ? `parcela ${n.num}/${n.tot}${n.num === n.tot ? ' · última' : ''}` : pc.atual ? `parcela ${pc.atual}` : ''))(parcelaNoMes(pc, f.chave))), valor: esc(brl(pc.valor)) })))}${(m.cf.recorrentes || []).length ? `<p class="cv-nota">Mais ${m.cf.recorrentes.length} recorrentes, iguais todo mês.</p>` : ''}`)));
  partes.push(secao(() => htmlComposicaoV10({ c, limite })));
  const faturas = futuras.map((f, i) => cartaoCv({
    codigo: maiuscula(MESES[f.mes - 1]), nome: String(f.ano), valor: esc(brl(f.total)), classe: 'fatura', destaque: i === 0, attr: `data-detalhe="det-fatura-${i + 1}"`,
    rodape: `<span>já comprometido · ${f.ativas.length} ${f.ativas.length === 1 ? 'parcela' : 'parcelas'}</span>`,
  }));
  if (faturas.length) partes.push(secaoCv('Próximas faturas', { link: linkCv('Planilha', 'data-planilha-fatura') }), carrosselCv(faturas, 'Próximas faturas'));
  // compras: as mais novas, cada uma abre o editor (quem publica)
  if (itens.length) partes.push(secaoCv('Compras', { contagem: itens.length, link: linkCv('Ver todas', 'data-extrato-abrir') }), blocoCv(listaCv(itens.slice(0, 4).map(i => linhaCompra(i, true)))));
  // por categoria, com o orçamento como o traço do alvo
  const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const cats = (it?.categorias || []).filter(x => x.valor > 0).sort((a, b) => b.valor - a.valor);
  if (cats.length) {
    let orc = [];
    try { orc = orcamentoDoMes(dados, ctx); } catch { /* sem orçamento */ }
    const linhas = cats.slice(0, 5).map(x => {
      const ob = orc.find(z => z.cat === x.cat || z.nome === nomeCategoria(x.cat));
      return { icone: iconeCategoria(x.cat, 'micro'), rotulo: nomeCategoria(x.cat), valor: brl(x.valor), atual: x.valor, alvo: ob ? ob.limite : null,
        tom: ob ? (ob.pct >= 1 ? 'ruim' : ob.pct >= 0.8 ? 'atencao' : '') : '',
        nota: ob ? (ob.pct >= 1 ? `passou ${brl(-ob.sobra)} do orçamento de ${brl(ob.limite)}` : `orçamento ${brl(ob.limite)} · sobram ${brl(ob.sobra)}`) : '' };
    });
    partes.push(secaoCv('Por categoria', { id: 'v10-cartao-gastos', contagem: cats.length, link: gh ? linkCv('Orçamento', 'data-orcamento') : '' }),
      blocoCv(`${barrasAlvoCv(linhas)}${cats.length > 5 ? linkCv(`Ver todas (${cats.length})`, 'data-tudo="cartao" data-tudo-secao="cartao-gastos"') : ''}${orc.length ? '<p class="cv-legenda"><i></i>gasto<em></em>orçamento</p>' : ''}`));
  }
  // recorrentes
  const rec = (it?.assinaturas || []).map((a, i) => ({ ...a, i })).sort((x, y) => (x.dia ?? 99) - (y.dia ?? 99));
  if (rec.length || gh) {
    const total = rec.reduce((s, a) => s + a.valor, 0);
    partes.push(secaoCv('Recorrentes', { id: 'v10-cartao-parcelas', contagem: rec.length || null, link: gh ? linkCv('Adicionar', 'data-nova-recorrente') : '' }),
      blocoCv(`${rec.length ? `<p class="cv-resumo"><b>${esc(brl(total))}</b> por mês · ${esc(brl(total * 12))} por ano</p>` : '<p class="cv-nota">Nenhuma cobrança recorrente.</p>'}
        ${listaCv(rec.slice(0, 3).map(a => linhaCv({ icone: iconeCategoria(a.cat || adivinharCategoria(a.nome) || 'Others', 'peq'), titulo: a.nome, sub: `dia ${esc(a.dia ?? '?')}${a.foraDoMes === dados.periodo ? ' · fora deste mês' : ''}`, valor: esc(brl(a.valor)), attr: gh ? `data-assinatura="${a.i}"` : '' })))}
        ${rec.length > 3 ? linkCv(`Ver todas (${rec.length})`, 'data-tudo="cartao" data-tudo-secao="cartao-parcelas"') : ''}`));
  }
  partes.push(tudoDoPainelCv('cartao', 'Parcelas mês a mês, onde cortar, histórico e mais'), ...modelos);
  return partes.join('');
}

function caixaCv(m, dados, ctx, o) {
  const gh = !!o.github;
  const partes = ['<span id="v10-mes-geral"></span>'], modelos = [];
  const curva = secao(() => curvaCv(m, ctx));
  if (curva) partes.push(secaoCv('O mês, dia a dia'), blocoCv(`${curva}${gh ? acoesCv([{ rotulo: 'Conferir com o saldo do banco', attr: 'data-conferir-banco' }]) : ''}`));
  // contas e entradas daqui em diante (o salário a entrar fica junto, separado no total)
  let contas = [];
  try { contas = proximasContas(m, dados); } catch { /* sem agenda */ }
  const hoje = o.hoje || hojeBrasil();
  const aPagar = contas.filter(x => x.valor < 0).reduce((s, x) => s - x.valor, 0);
  const aEntrar = contas.filter(x => x.valor > 0).reduce((s, x) => s + x.valor, 0);
  partes.push(secaoCv(aEntrar ? 'Contas e entradas' : 'Contas a pagar', { id: 'v10-mes-agenda', contagem: contas.length || null, link: linkCv('O mês inteiro', 'data-tudo="mes" data-tudo-secao="mes-contas"') }));
  partes.push(blocoCv(ctx.mesPassou
    ? `<p class="cv-nota">O mês virou — as contas de ${esc(MESES[ctx.mes - 1])} ficam no fechamento com o Claude.</p>`
    : contas.length
      ? `<p class="cv-resumo"><b>${esc(brl(aPagar))}</b> a pagar${aEntrar ? ` · <b class="sobe">${esc(brl(aEntrar))}</b> a entrar` : ''} até o fim do mês</p>${listaCv(contas.slice(0, 5).map(x => {
        const pode = gh && x.item && PAGAVEIS.includes(x.lista);
        return linhaCv({
          icone: diaCv(x.dia, semanaDe(x.data), x.data === hoje), titulo: nomeCurto(x.desc), sub: x.valor > 0 ? 'a receber' : 'a pagar',
          valor: `${x.valor > 0 ? '+' : ''}${esc(brl(Math.abs(x.valor)))}`, attr: pode ? `data-conta="${esc(x.lista)}|${esc(x.item)}"` : '',
          acao: pode ? { rotulo: x.valor > 0 ? 'Recebi' : 'Paguei', attr: `data-pagar="${esc(x.lista)}|${esc(x.item)}"`, icone: CHECK } : null,
        });
      }))}${contas.length > 5 ? linkCv(`Ver todas (${contas.length})`, 'data-tudo="mes" data-tudo-secao="mes-agenda"') : ''}`
      : '<p class="cv-nota">Nada a pagar até o fim do mês.</p>'));
  if (gh) partes.push(acoesCv([{ rotulo: '+ Entrada', attr: 'data-nova-conta="receita"' }, { rotulo: '+ A pagar', attr: 'data-nova-conta="despesa"' }, { rotulo: '+ Investir', attr: 'data-investir="aporte"' }]));
  partes.push(blocoCv(listaCv([linhaCv({ icone: tile('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'), titulo: 'Extrato do mês', sub: 'Busque em tudo: contas, cartão e investimentos', attr: 'data-extrato-abrir' })]), 'compacto'));
  // próximos 12 meses: um cartão por mês com a sobra; tocar abre o que entra e o que sai
  const meses = m.p12?.meses?.length ? resumoMeses(m.p12.meses) : [];
  if (meses.length) {
    const media = meses.reduce((s, x) => s + x.sobra, 0) / meses.length;
    partes.push(secaoCv('Próximos 12 meses', { id: 'v10-mes-meses', link: linkCv('Detalhes', 'data-tudo="mes" data-tudo-secao="mes-meses"') }),
      `<p class="cv-resumo fora">Sobra média <b class="${media < 0 ? 'cai' : ''}">${esc(brl(media))}</b> por mês</p>`,
      carrosselCv(meses.map((x, i) => {
        modelos.push(detalheCv(`det-mes-${i}`, x.label, `${linhasDet([['Entra', esc(brl(x.entra))], ['Sai', esc(brl(-x.sai))], ['Sobra do mês', esc(brl(x.sobra))], ['Começar o mês com', esc(brl(x.colchao)), 'a conta desce antes do salário'], x.vermelho ? ['Vermelho no dia', String(x.minDia)] : null])}${x.fora?.length ? `<p class="cv-nota">Fora do comum: ${x.fora.map(e => esc(nomeCurto(e.desc))).join(', ')}.</p>` : ''}`));
        return cartaoCv({
          codigo: x.label, destaque: i === 0, classe: `mes${x.sobra < 0 ? ' negativo' : ''}`, attr: `data-detalhe="det-mes-${i}"`,
          valor: `${x.sobra > 0 ? '+' : ''}${esc(brl(x.sobra))}`,
          rodape: `<span>começar com ${esc(brl(x.colchao))}</span>${x.vermelho ? `<span class="cai">vermelho no dia ${x.minDia}</span>` : ''}`,
        });
      }), 'Próximos 12 meses'));
  }
  partes.push(tudoDoPainelCv('mes', 'Agenda, contas do mês, gráficos e projeções'), ...modelos);
  return partes.join('');
}

function analisesCv(m, dados, ctx, o) {
  const cart = o.carteira;
  const partes = ['<span id="v10-analises-saude"></span>'], modelos = [];
  // saúde do mês: a nota está no topo; aqui, de onde ela vem — cada critério na sua escala (cheio = pontos máximos)
  const sc = m.sc;
  const crit = sc && typeof sc.total === 'number' ? sc.crit || [] : [];
  if (crit.length) {
    const cheios = crit.filter(k => (k.v || 0) >= 0.999), faltam = crit.filter(k => (k.v || 0) < 0.999);
    partes.push(secaoCv('De onde vem a nota', { contagem: crit.length }), blocoCv(`${barrasAlvoCv(faltam.map(k => ({
      rotulo: k.n, valor: `${Math.round((k.v || 0) * k.p)}/${k.p}`, atual: (k.v || 0) * k.p, alvo: k.p, tom: k.v >= 0.8 ? '' : k.v >= 0.4 ? 'atencao' : 'ruim', nota: k.v >= 0.8 ? '' : k.d || '',
    })), { porLinha: true })}${cheios.length ? `<p class="ok-cv">${icTom('bom')}<span><b>${cheios.length} ${cheios.length === 1 ? 'critério' : 'critérios'} no máximo</b><small>${esc(cheios.map(k => k.n).join(' · '))}</small></span></p>` : ''}`));
  }
  // análises do Claude: um cartão por análise, a mais nova primeiro
  const tons = { alerta: 'ruim', atencao: 'atencao', dica: 'ideia', conquista: 'bom', info: 'info' };
  const validas = (l, de) => (Array.isArray(l) ? l.filter(a => a && (a.titulo || a.texto)).map(a => ({ ...a, de })) : []);
  const lista = [...validas(dados.analises, 'caixa'), ...validas(cart?.analises, 'carteira')].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')));
  if (lista.length) {
    partes.push(secaoCv('Do Claude', { contagem: lista.length }), carrosselCv(lista.map(a => `<article class="analise-cv tom-${tons[a.tipo] || 'info'}">
        <span class="an-topo">${tomTile(tons[a.tipo] || 'info')}<small>${a.de === 'carteira' ? 'Carteira · ' : ''}${a.data ? esc(ddmm(a.data)) : ''}</small></span>
        <b>${esc(a.titulo || '')}</b>${a.texto ? `<p>${esc(a.texto)}</p>` : ''}${a.acao ? `<p class="an-acao"><b>O que fazer:</b> ${esc(a.acao)}</p>` : ''}
      </article>`), 'Análises do Claude'));
  }
  // alertas do painel que ainda não estão nos critérios da nota (sem repetir; os "tudo certo" ficam de fora)
  const nomesCrit = crit.map(k => String(k.n || '').toLowerCase()).filter(Boolean);
  const alertas = (m.alertas || []).filter(a => a.tom !== 'bom' && !nomesCrit.some(n => String(a.titulo || '').toLowerCase().startsWith(n)));
  if (alertas.length) partes.push(secaoCv('Alertas'), blocoCv(listaCv(alertas.map(a => linhaCv({ icone: tomTile(a.tom), titulo: a.titulo, sub: a.texto || '' })))));
  // mercado: um cartão por ativo, o que pede ação primeiro; tocar abre a ação inteira e o porquê
  const merc = cart?.analise_mercado?.ativos || [];
  if (merc.length) {
    partes.push(secaoCv('Mercado', { id: 'v10-analises-mercado', contagem: merc.length }), carrosselCv([...merc].sort((a, b) => ORDEM_TOM[tomMercado(a.urgencia)] - ORDEM_TOM[tomMercado(b.urgencia)]).map((a, i) => {
      const tom = tomMercado(a.urgencia);
      modelos.push(detalheCv(`det-merc-${i}`, a.n, `<p class="cv-resumo">${chip(tom, ROTULO_MERCADO[tom])}${a.classe ? ` <span class="suave">${esc(a.classe)}</span>` : ''}</p>
        ${typeof a.dm === 'number' ? linhasDet([['No ano', sinal(a.dm)], a.bench ? [a.bench, sinal(a.benchm)] : null]) : ''}
        <p class="cv-texto"><b>Ação:</b> ${comNegrito(a.acao || '')}</p>${a.expl ? `<p class="cv-texto">${comNegrito(a.expl)}</p>` : ''}
        <p class="cv-nota">Opinião do Claude a partir da sua estratégia e do mercado${a.data_ref ? ` em ${esc(ddmm(a.data_ref))}` : ''} — não é recomendação profissional.</p>`));
      return cartaoCv({
        codigo: codigoAtivo(a.n), nome: a.classe || a.n, classe: `mercado tom-${tom}`, destaque: i === 0, attr: `data-detalhe="det-merc-${i}"`,
        topo: chip(tom, ROTULO_MERCADO[tom]),
        valor: typeof a.dm === 'number' ? `${sinal(a.dm)}<small> no ano</small>` : '',
        rodape: `<span>${comNegrito(a.acao || '')}</span>`,
      });
    }), 'Mercado'), '<p class="cv-nota fora">Opinião do Claude a partir da sua estratégia e do mercado — não é recomendação profissional.</p>');
  }
  // conferir caixa × carteira
  if (cart) {
    let itens = [];
    try { itens = itensConferencia(m, dados, cart, ctx); } catch { /* sem conferência */ }
    const pend = itens.filter(i => i.tom === 'ruim' || i.tom === 'atencao'), certos = itens.filter(i => !pend.includes(i));
    if (itens.length) partes.push(secaoCv('Conferir caixa × carteira', { id: 'v10-analises-conferir', contagem: pend.length ? `${pend.length} a ver` : null }), blocoCv(`${listaCv(pend.map(i => linhaCv({ icone: tomTile(i.tom), titulo: i.titulo, sub: esc(i.texto || '') })))}${certos.length ? `<p class="ok-cv">${icTom('bom')}<span><b>${certos.length} ${certos.length === 1 ? 'ponto bate' : 'pontos batem'}</b><small>${esc(certos.map(i => i.titulo).join(' · '))}</small></span></p>` : ''}`));
  }
  const hist = secao(() => fechadosCv(dados));
  if (hist) partes.push(secaoCv('Meses fechados', { id: 'v10-analises-historico' }), blocoCv(hist));
  partes.push(tudoDoPainelCv('analises', 'Leitura automática, radar de risco, histórico e mais'), ...modelos);
  return partes.join('');
}

// v9.28: os gráficos no Carvão (carvao.js: areaCv, colunasCv) com os mesmos dados e dicas de antes
function curvaCv({ tl }, ctx) {
  const pontos = tl.porDia.map(p => {
    const sem = SEMANA[new Date(ctx.ano, ctx.mes - 1, p.dia).getDay()];
    const evs = p.eventos.filter(e => Math.abs(e.valor) >= 1).slice(0, 3).map(e => `${nomeCurto(e.desc)} ${e.valor > 0 ? '+' : ''}${brl(e.valor)}`);
    return { x: p.dia, y: p.saldo, dica: `${pad(p.dia)}/${pad(ctx.mes)} (${sem}) · saldo ${brl(p.saldo)}${evs.length ? ` · ${evs.join(' · ')}` : ''}` };
  });
  return areaCv(pontos, { hojeX: ctx.mesPassou ? null : ctx.diaHoje, fim: true, rotulosX: [1, 8, 15, 22, ctx.dias].map(d => ({ x: d, texto: String(d) })), rotulo: 'Saldo da conta dia a dia. Toque ou arraste para ver cada dia.' });
}
function evolucaoCv(cart) {
  const meses = Object.keys(cart.historico_mensal || {}).sort();
  const pontos = meses.map((k, i) => {
    const h = cart.historico_mensal[k], v = valorMes(h);
    return { x: i, y: v, mes: k, dica: `${rotuloMes(k).longo}${h.status === 'em_andamento' ? ' (até agora)' : ''}: ${brl(v)}${h.aportes ? ` · aportes ${brl(h.aportes)}` : ''}${h.resgates ? ` · resgates ${brl(h.resgates)}` : ''}` };
  }).filter(p => p.y > 0);
  if (pontos.length < 2) return null;
  const d = pontos[pontos.length - 1].y - pontos[0].y;
  return `<p class="cv-resumo"><b class="${d < 0 ? 'cai' : 'sobe'}">${d < 0 ? '−' : '+'}${esc(brl(Math.abs(d)))}</b> desde ${esc(rotuloMes(pontos[0].mes).curto)}</p>
    ${areaCv(pontos, { fim: true, marcas: true, altura: 140, rotulosX: pontos.filter((_, i) => i === 0 || i === pontos.length - 1 || i % 3 === 0).map(p => ({ x: p.x, texto: rotuloMes(p.mes).curto })), rotulo: 'Patrimônio no fim de cada mês' })}`;
}
function fechadosCv(dados) {
  const lista = (dados.mesesFechados || []).filter(m => m.resultado && typeof m.resultado.saldo === 'number').slice(-8);
  if (!lista.length) return '';
  return colunasCv(lista.map(m => ({ rotulo: MES3[Number(m.periodo.split('-')[1]) - 1], valor: m.resultado.saldo, dica: `${m.periodoLabel || m.periodo}: ${m.resultado.saldo >= 0 ? '+' : ''}${brl(m.resultado.saldo)}` })),
    { formato: v => compacto(v), rotulo: 'Sobra de cada mês fechado' });
}

export const TELAS_CV = { carteira: investimentosCv, cartao: cartaoTelaCv, mes: caixaCv, analises: analisesCv };

// v9.22 (repaginação, etapa 5): a linha de situação dos itens do Mais que levam ao Caixa e às Análises
export function situacoesMais(m, dados, cart, agora = new Date()) {
  const ctx = contexto(dados, agora);
  const dm = d => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  let contas = 'Agenda e contas do mês';
  try {
    const l = proximasContas(m, dados, agora).filter(x => x.valor < 0);
    contas = ctx.mesPassou ? `O mês virou — falta fechar ${MESES[ctx.mes - 1]}` : l.length ? `${l.length} ${l.length === 1 ? 'conta' : 'contas'} até o fim do mês · próxima ${dm(l[0].data)}` : 'Nada a pagar até o fim do mês';
  } catch { /* sem agenda */ }
  const n = (dados.analises || []).length;
  let conferir = 'Precisa da carteira carregada';
  if (cart) {
    try {
      const p = itensConferencia(m, dados, cart, ctx).filter(i => i.tom === 'ruim' || i.tom === 'atencao').length;
      conferir = p ? `${p} ${p === 1 ? 'ponto' : 'pontos'} para conferir` : 'Caixa e carteira batem';
    } catch { conferir = 'Patrimônio, dividendos e resgates'; }
  }
  return { contas, analises: n ? `${n} ${n === 1 ? 'análise' : 'análises'} do Claude` : 'Saúde, mercado e histórico', conferir };
}

// ---------- v9.11: seletor de mês (Caixa e Cartão; o Início fica sempre em hoje) ----------
// Passado = o que ficou no fechamento (mesesFechados: totais, compras do app, anotação), corrigível. Futuro = a projeção do
// painel (p12 e próximas faturas); o que se muda num mês que vem vale só para ele (valoresConhecidos / agendado).
const somaMes = (ym, n) => { const [a, m] = ym.split('-').map(Number), t = a * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; };
const nomeMes = ym => `${maiuscula(MESES[Number(ym.slice(5)) - 1])} ${ym.slice(0, 4)}`;
export function mesesDoSeletor(dados, m) {
  const passados = (dados.mesesFechados || []).map(x => x.periodo).filter(p => p < dados.periodo).sort();
  const futuros = Math.max(m?.p12?.meses?.length || 0, (m?.cf?.meses || []).filter(x => x.chave > dados.periodo).length);
  return [...passados, dados.periodo, ...Array.from({ length: futuros }, (_, i) => somaMes(dados.periodo, i + 1))];
}
export function seletorMes(dados, m, mesVer) {
  const lista = mesesDoSeletor(dados, m);
  const atual = mesVer || dados.periodo, i = lista.indexOf(atual);
  const tipo = atual === dados.periodo ? 'este mês' : atual < dados.periodo ? 'fechado' : 'projeção';
  const seta = (alvo, rot, d) => `<button type="button" class="sm-seta" ${alvo ? `data-mes-ver="${alvo}"` : 'disabled'} aria-label="${rot}">${svg(d)}</button>`;
  return `<div class="seletor-mes${mesVer ? ' fora' : ''}" role="group" aria-label="Mês">
    ${seta(lista[i - 1], 'Mês anterior', '<path d="m15 18-6-6 6-6"/>')}
    <span class="sm-mes" aria-live="polite"><b>${nomeMes(atual)}</b><small>${tipo}</small></span>
    ${seta(lista[i + 1], 'Próximo mês', '<path d="m9 18 6-6-6-6"/>')}
  </div>${mesVer ? '<button type="button" class="link sm-hoje" data-mes-ver="">Voltar para este mês</button>' : ''}`;
}

export function telaDoMes(aba, mes, m, dados, opcoes = {}) {
  const gh = !!opcoes.github, nome = nomeMes(mes);
  if (mes < dados.periodo) {
    const f = (dados.mesesFechados || []).find(x => x.periodo === mes);
    if (!f) return `<section class="cartao"><p class="cartao-sub">${esc(nome)} não está no histórico deste painel.</p></section>`;
    const r = f.resultado || {};
    const corrigir = gh ? `<button type="button" class="botao-sec" data-mes-fechado="${esc(mes)}">Corrigir este mês</button>` : '';
    if (aba === 'cartao') {
      const compras = f.lancamentosApp || [];
      return `<section class="cartao hero"><p class="rotulo">Fatura do Itaú · ${esc(nome)}</p>
        <p class="hero-valor">${Number.isFinite(f.itau) ? brl(f.itau) : '—'}</p>
        <p class="hero-sub">Mês fechado${f.editadoApp ? ' · corrigido no app' : ''}. O detalhe por categoria fica em Cartão › Gastos (histórico).</p>${corrigir}</section>
        ${compras.length ? `<section class="cartao"><div class="cartao-topo"><h2>Lançadas pelo app</h2></div>
          <ul class="linhas">${compras.map(c => `<li><span class="com-ic">${iconeCategoria(c.cat || 'Others', 'peq')}${esc(c.descricao)} <small class="suave">${esc(String(c.data).slice(8, 10))}/${esc(String(c.data).slice(5, 7))}</small></span><b>${brl(c.valor)}</b></li>`).join('')}</ul></section>` : ''}`;
    }
    return `<section class="cartao hero"><p class="rotulo">Sobra de ${esc(nome)}</p>
      <p class="hero-valor${(r.saldo ?? 0) < 0 ? ' ruim' : ''}">${brl(r.saldo ?? 0)}</p>
      <p class="hero-sub">Mês fechado${f.fechadoEm ? ` em ${esc(f.fechadoEm.split('-').reverse().join('/'))}` : ''}${f.editadoApp ? ' · corrigido no app' : ''}.</p>${corrigir}</section>
      <section class="cartao"><ul class="linhas">
        ${linha('Entrou', brl(r.receitaTotal ?? 0), 'bom')}${linha('Contas fixas', brl(-(r.fixasTotal ?? 0)))}${linha('Variáveis (com o cartão)', brl(-(r.variaveisTotal ?? 0)))}
        ${Number.isFinite(f.itau) ? linha('Fatura do Itaú <small class="suave">já dentro das variáveis</small>', brl(f.itau), 'suave') : ''}${Number.isFinite(r.saldoSalario) ? linha('Só com o salário', brl(r.saldoSalario), r.saldoSalario < 0 ? 'ruim' : '') : ''}
      </ul>${f.notas ? `<details class="dobra"><summary><span>Anotação do mês</span></summary><p class="nota">${esc(f.notas)}</p></details>` : ''}</section>`;
  }
  // futuro
  if (aba === 'cartao') {
    const cf = m?.cf && { ...m.cf, meses: (m.cf.meses || []).filter(x => x.chave === mes) };
    return (cf?.meses.length ? proximasFaturas({ cf }, dados, new Set([`fatura:${mes}`]), gh) : `<section class="cartao"><p class="cartao-sub">Nada comprometido ainda na fatura de ${esc(nome)}.</p></section>`)
      + '<p class="nota">Compras novas entram na fatura do mês em que você comprar; parcelas e recorrentes já aparecem aqui. Toque numa parcela para mudar.</p>';
  }
  const i = mesesEntre(dados.periodo, mes) - 1;
  const x = m?.p12?.meses?.length ? resumoMeses(m.p12.meses)[i] : null;
  if (!x) return `<section class="cartao"><p class="cartao-sub">A projeção do painel não chega a ${esc(nome)}.</p></section>`;
  const conhecidos = dados.valoresConhecidos || [];
  const itemDe = desc => {
    for (const lista of ['despesasFixas', 'receitas', 'obrigacoesCaixa']) {
      const it = (dados[lista] || []).find(y => y.descricao === desc);
      if (it) return { lista, id: it.id };
    }
    return null;
  };
  const evs = x.evs.map(e => {
    const ref = gh && itemDe(e.desc);
    const sabido = ref && conhecidos.some(v => v.lista === ref.lista && v.id === ref.id && v.mes === mes);
    const dentro = `<span class="conta-dia"><b>${pad(e.dia)}</b></span><span class="rec-nome">${esc(nomeCurto(e.desc))}<small>${sabido ? 'valor deste mês já informado' : e.est ? 'estimado' : ref ? 'toque para mudar só este mês' : ''}</small></span><b class="${e.valor > 0 ? 'bom' : ''}">${e.valor > 0 ? '+' : ''}${brl(e.valor)}</b>`;
    return ref ? `<li><button type="button" class="rec-linha" data-valor-futuro="${esc(`${ref.lista}|${ref.id}|${mes}`)}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
  }).join('');
  const entradasApp = (dados.entradasFuturasApp || []).filter(e => e.mes === mes);
  const dia = pad(Math.min(Number((opcoes.hoje || '').slice(8, 10)) || 1, new Date(Number(mes.slice(0, 4)), Number(mes.slice(5)), 0).getDate()));
  return `<section class="cartao hero"><p class="rotulo">Sobra prevista · ${esc(nome)}</p>
    <p class="hero-valor${x.sobra < 0 ? ' ruim' : ''}">${x.sobra > 0 ? '+' : ''}${brl0(x.sobra)}</p>
    <p class="hero-sub">Entra ${brl0(x.entra)} · sai ${brl0(x.sai)}. Projeção do painel com o que já se sabe hoje.</p>
    <div class="chips">${x.vermelho ? chip('ruim', `Vermelho no dia ${x.minDia}`) : ''}${x.colchao ? chip('info', `Comece o mês com ${brl0(x.colchao)}`) : ''}</div>
    ${gh ? `<div class="botoes-linha"><button type="button" class="botao-sec" data-nova-conta="despesa" data-nova-data="${mes}-${dia}">+ A pagar neste mês</button><button type="button" class="botao-sec" data-nova-conta="receita" data-nova-data="${mes}-${dia}">+ Entrada neste mês</button></div>` : ''}
  </section>
  <section class="cartao"><div class="cartao-topo"><h2>O que entra e o que sai</h2></div>
    <p class="cartao-sub">${gh ? 'Contas que se repetem: toque para mudar o valor só deste mês.' : 'Previsto para o mês.'}</p>
    <ul class="recorrentes lista-rec">${evs}${entradasApp.map(e => `<li class="rec-linha"><span class="conta-dia"><b>${pad(e.dia || 1)}</b></span><span class="rec-nome">${esc(e.descricao)}<small>lançada no app · fora da projeção até o mês abrir</small></span><b class="bom">+${brl(e.valor)}</b></li>`).join('')}</ul>
  </section>`;
}
