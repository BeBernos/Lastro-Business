// v10.2 — o Hoje novo (modelo 13 do quadro, escolhido pelo Bruno em 19/11/2026): a leitura do dia, os três resumos em
// cartões coloridos (Caixa, Cartão, Carteira), a faixa da carteira, a agenda por dia, o que fazer e para onde vai.
// Só os três resumos são cartões; o resto corre solto no fundo (o Bruno: "um card para cada assunto é extremamente feio").
// resumoHoje = dados puros (testável em Node); htmlHoje = o desenho. Não importa do app.js nem do telas.js.
import { brl, brl0, esc } from './graficos.js';
import { posicao, reserva } from './carteira.js';
import { resultadoDoMes } from './investimentos.js';
import { alocacaoVsAlvo } from './estrategia.js';
import { rendaPassiva, ritmoLivre } from './indicadores.js';
import { tickerDividendo } from './lancamentos.js';
import { saudeCarteira } from './v10.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const pad = n => String(n).padStart(2, '0');
const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);
// curto para frase e cartão: "R$ 18,5 mil" de 10 mil para cima, senão sem centavos
export const curto = v => {
  const a = Math.abs(v);
  return a >= 10000 ? `R$ ${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : brl0(a);
};
const sinal = v => `${v < 0 ? '−' : '+'}${curto(v)}`;
// "Fatura do cartão (ciclo novembro)" → "Fatura do cartão"; "Salário — 2ª parcela" fica
const nome = d => String(d || '').replace(/\s*\([^)]*\)/g, '').trim();
const nomeDoDia = d => nome(d).split(' — ')[0].toLowerCase();

// m: motor (c, tl, p12, plp); ctx: contexto(); linhas: linhasDoHoje; extras: [{tom, texto, attr}] (fechamento etc.)
export function resumoHoje(m, dados, cart, ctx, { linhas = [], extras = [], hoje = '', github = false } = {}) {
  const c = m.c || {}, porDia = m.tl?.porDia || [];
  const dia = ctx.mesPassou ? porDia.length : Math.min(Math.max(1, ctx.diaHoje), porDia.length);
  const limite = dados.regras?.limiteSaudavelItau || 0;

  // Caixa: hoje, fim do mês, o menor saldo daqui em diante e a curva
  const daqui = porDia.slice(dia - 1);
  const caixa = porDia.length ? {
    hoje: porDia[dia - 1]?.saldo ?? 0,
    fecha: porDia[porDia.length - 1].saldo,
    pior: daqui.reduce((a, b) => (b.saldo < a.saldo ? b : a), daqui[0] || porDia[0]),
    pontos: porDia.map(p => p.saldo), diaHoje: ctx.mesPassou ? null : dia,
  } : null;

  // Cartão: o que já foi, o limite e para onde o ritmo leva
  const vence = dados.calendario?.faturaCartao;
  const cartao = {
    fatura: c.itau || 0, limite, ritmo: c.itauProjetado || 0, acima: c.acimaProj || 0, cabe: c.margemAteLimite ?? Math.max(0, limite - (c.itau || 0)),
    porDia: c.tetoPorDia || 0, vence: vence ? `${pad(vence)}/${pad(ctx.mes === 12 ? 1 : ctx.mes + 1)}` : '',
  };

  // Carteira: total, mercado no mês, os últimos 13 meses e os dividendos do mês (pelo caixa; sem eles, pela carteira)
  let carteira = null, faixa = null;
  if (cart) {
    try {
      const p = posicao(cart);
      const hist = Object.keys(cart.historico_mensal || {}).sort().map(k => { const h = cart.historico_mensal[k]; return { mes: k, v: h.patrimonio_total ?? h.patrimonio_parcial ?? 0 }; }).filter(x => x.v > 0);
      if (hist.length && hist[hist.length - 1].mes === dados.periodo) hist[hist.length - 1].v = p.total; else hist.push({ mes: dados.periodo, v: p.total });
      const divs = (dados.receitas || []).filter(r => tickerDividendo(r.descricao)).reduce((s, r) => s + (r.valor || 0), 0);
      carteira = { total: p.total, mercado: Number(resultadoDoMes(cart)?.mercado) || 0, meses: hist.slice(-13), dividendos: divs || p.h?.dividendos || 0 };
      const aloc = alocacaoVsAlvo(cart);
      const fiel = aloc ? saudeCarteira(aloc, reserva(cart)).fiel : null;
      const dolar = aloc?.linhas.find(l => l.classe === 'dolar');
      let rp = null;
      // o mês aberto ainda não recebeu todos os dividendos: a média dos 3 últimos fechados (como em linhasDoHoje)
      try {
        const sr = rendaPassiva(dados, cart, (c.fixas || 0) + (c.variaveis || 0))?.serie || [];
        const f3 = sr.slice(0, -1).slice(-3), custo = f3.reduce((s, x) => s + x.custo, 0);
        rp = custo ? f3.reduce((s, x) => s + x.dividendos, 0) / custo : sr.length ? sr[sr.length - 1].pct : null;
      } catch { /* sem histórico */ }
      faixa = [
        fiel != null && { rotulo: 'No alvo', valor: `${fiel}%`, pct: fiel },
        dolar && { rotulo: 'Em dólar', valor: `${String(Math.round(dolar.pct * 10) / 10).replace('.', ',')}%`, extra: ` /${dolar.alvo}`, pct: dolar.alvo ? Math.min(100, (dolar.pct / dolar.alvo) * 100) : 0, brasa: true },
        rp != null && { rotulo: 'Renda passiva', valor: `${String(Math.round(rp * 1000) / 10).replace('.', ',')}%`, extra: ' do custo', pct: Math.min(100, rp * 100) },
      ].filter(Boolean);
    } catch { carteira = null; }
  }

  // Agenda: hoje e os próximos dias com movimento (o resto do mês pelo painel, depois o mês seguinte da projeção)
  const dias = [];
  const ponha = (ano, mes, d, evs) => {
    const itens = evs.filter(e => Math.abs(e.valor) >= 50).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));
    if (!itens.length) return;
    const total = itens.reduce((s, e) => s + e.valor, 0), entra = itens.filter(e => e.valor > 0).reduce((s, e) => s + e.valor, 0);
    const saidas = itens.filter(e => e.valor < 0);
    const titulo = entra > -saidas.reduce((s, e) => s + e.valor, 0) ? 'Dia de receber' : maiuscula(saidas.slice(0, 2).map(e => nomeDoDia(e.desc)).join(' e '));
    dias.push({ data: `${ano}-${pad(mes)}-${pad(d)}`, dia: pad(d), sem: SEM[new Date(ano, mes - 1, d).getDay()], quando: `${pad(d)}/${pad(mes)}`, titulo, total,
      itens: itens.slice(0, 5).map(e => ({ nome: nome(e.desc), valor: e.valor })), mais: Math.max(0, itens.length - 5) });
  };
  if (!ctx.mesPassou) for (const p of daqui) ponha(ctx.ano, ctx.mes, p.dia, (p.eventos || []).filter(e => e.status !== 'confirmado'));
  const prox = m.p12?.meses?.[0];
  if (prox) for (const p of prox.porDia || []) ponha(prox.ano, prox.mes, p.dia, p.eventos || []);
  const hojeIso = `${ctx.ano}-${pad(ctx.mes)}-${pad(dia)}`;
  const agenda = dias.slice(0, 6);
  if (!ctx.mesPassou && agenda[0]?.data !== hojeIso) {
    agenda.unshift({ data: hojeIso, dia: pad(dia), sem: SEM[new Date(ctx.ano, ctx.mes - 1, dia).getDay()], quando: 'hoje', titulo: 'Hoje', total: 0, itens: [], mais: 0,
      vazio: agenda[0] ? `Nada vence hoje. Próximo: ${agenda[0].sem}, ${agenda[0].quando}.` : 'Nada vence hoje.' });
    agenda.splice(6);
  }

  // Para fazer (no máximo 3): fechamento, passos do plano da semana, o cartão e o resto do que pede atenção
  const fazer = extras.filter(e => e.tom !== 'info').map(e => ({ titulo: e.texto, sub: '', tom: e.tom, attr: e.attr }));
  const passos = cart?.plano_acao?.passos || [];
  const lim = hoje && new Date(Date.parse(`${hoje}T12:00:00Z`) + 7 * 864e5).toISOString().slice(0, 10);
  passos.filter(x => !/conclu|decidid|cancel/i.test(x.status || '') && /^\d{4}-\d{2}-\d{2}/.test(x.quando || '') && (!lim || x.quando.slice(0, 10) <= lim))
    .sort((a, b) => a.quando.localeCompare(b.quando)).slice(0, 2).forEach(p => {
      const q = p.quando.slice(0, 10), atrasado = hoje && q < hoje;
      fazer.push({ titulo: p.titulo, sub: `${q === hoje ? 'hoje' : `${atrasado ? 'era ' : ''}${q.slice(8, 10)}/${q.slice(5, 7)}`}${p.valor ? ` · ${brl(p.valor)}` : ''} · do plano`,
        tom: atrasado ? 'ruim' : 'info', attr: 'data-aba="carteira"', passo: github ? p.n : null });
    });
  if (!ctx.mesPassou && limite && cartao.ritmo > limite) {
    fazer.push(c.limiteJaRompido || cartao.fatura > limite
      ? { titulo: `O cartão já passou ${brl(cartao.fatura - limite)} do limite`, sub: `no ritmo de hoje fecha em ${brl(cartao.ritmo)}`, tom: 'ruim', attr: 'data-aba="cartao"' }
      : { titulo: `Segurar o cartão em ${brl(cartao.porDia)} por dia`, sub: `até o fechamento · senão passa ${brl(cartao.acima)} do limite`, tom: 'atencao', attr: 'data-aba="cartao"' });
  }
  for (const l of linhas) if ((l.tom === 'ruim' || l.tom === 'atencao') && !/^Plano:/.test(l.texto)) fazer.push({ titulo: l.texto, sub: '', tom: l.tom, attr: l.attr || `data-ir-aba="${esc(l.ir || 'inicio')}"` });
  const feitos = passos.filter(x => /conclu/i.test(x.status || '')).length;
  const plano = passos.length ? { feitos, total: passos.filter(x => !/cancel/i.test(x.status || '')).length } : null;

  // Para onde vai: a conta nos próximos 12 meses (fim de cada mês e o pior dia) e o patrimônio lá na frente
  const meses = (m.p12?.meses || []).map(x => { const s = (x.porDia || []).map(d => d.saldo); return { label: x.label, fim: s.length ? s[s.length - 1] : x.abertura, piso: s.length ? Math.min(...s) : x.abertura }; });
  const ultLP = m.plp?.meses?.[m.plp.meses.length - 1];
  const rumo = meses.length && caixa ? {
    meses, conta: meses[meses.length - 1].fim, contaLabel: meses[meses.length - 1].label, porMes: (meses[meses.length - 1].fim - caixa.fecha) / meses.length,
    piso: Math.min(...meses.map(x => x.piso)), patrimonio: ultLP ? { valor: ultLP.patrimonio, label: `${ultLP.mesLabel}/${ultLP.ano}`.toLowerCase() } : null,
  } : null;

  // a leitura do dia: como o mês fecha e o ponto que mais pede cuidado
  let leitura = null;
  if (caixa) {
    const mesNome = maiuscula(MESES[ctx.mes - 1]);
    const t1 = caixa.fecha < 0 ? `${mesNome} fecha no vermelho.` : caixa.pior.saldo < 0 ? `${mesNome} fecha no positivo, mas aperta antes.` : `${mesNome} fecha bem.`;
    const cartaoMal = !ctx.mesPassou && limite && cartao.ritmo > limite;
    const atrasado = fazer.find(f => f.passo !== undefined && f.tom === 'ruim');
    const t2 = cartaoMal ? 'O ponto fraco é o cartão.' : caixa.pior.saldo < 0 ? `Atenção ao dia ${caixa.pior.dia}.` : atrasado ? 'Tem passo do plano atrasado.' : 'Tudo em dia.';
    const grande = dias.filter(d => d.total > 0).sort((a, b) => b.total - a.total)[0];
    const frases = [];
    if (grande && grande.total >= 1000) frases.push(`Dia ${Number(grande.dia)} entram <b class="sobe">${esc(curto(grande.itens.filter(i => i.valor > 0).reduce((s, i) => s + i.valor, 0)))}</b>.`);
    if (cartaoMal) frases.push(`No ritmo de hoje, a fatura${cartao.vence ? ` de ${cartao.vence}` : ''} chega a <b class="cai">${esc(brl0(cartao.ritmo))}</b> — ${esc(brl0(cartao.ritmo - limite))} acima do limite.`);
    else if (caixa.pior.saldo < 0) frases.push(`A conta chega a <b class="cai">${esc(brl0(caixa.pior.saldo))}</b> no dia ${caixa.pior.dia}.`);
    leitura = { t1, t2, texto: frases.join(' ') };
  }
  return { leitura, caixa, cartao, carteira, faixa, agenda, fazer: fazer.slice(0, 3), plano, rumo };
}

// ---------- o desenho ----------
const X = (i, n, w) => (n > 1 ? (i * w) / (n - 1) : 0);
function caminho(vals, w, h, pad = 6, min = Math.min(...vals), max = Math.max(...vals)) {
  const Y = v => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);
  return { d: vals.map((v, i) => `${i ? 'L' : 'M'}${X(i, vals.length, w).toFixed(1)} ${Y(v).toFixed(1)}`).join(' '), Y };
}
const SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';

function cartaoCaixa(cx) {
  const { d, Y } = caminho(cx.pontos, 300, 80);
  const hx = cx.diaHoje ? X(cx.diaHoje - 1, cx.pontos.length, 300) : null;
  return `<button type="button" class="pilar-hoje caixa" data-aba="mes">
    <span class="pl-topo"><b>Caixa</b><span>Abrir${SETA}</span></span>
    <small>Fecha o mês com</small><b class="pl-num">${esc(brl0(cx.fecha))}</b>
    <svg viewBox="0 0 300 80" class="pl-graf" role="img" aria-label="Saldo da conta dia a dia neste mês"><path d="${d} L300 80 L0 80 Z" class="pl-area"/><path d="${d}" class="pl-linha"/>${hx != null ? `<circle cx="${hx.toFixed(1)}" cy="${Y(cx.pontos[cx.diaHoje - 1]).toFixed(1)}" r="5" class="pl-ponto"/>` : ''}</svg>
    <p>${cx.diaHoje ? `Hoje <b>${esc(brl0(cx.hoje))}</b> · ` : ''}${cx.pior.saldo < 0 ? `pior dia <b>${esc(brl0(cx.pior.saldo))}</b> (dia ${cx.pior.dia})` : cx.pior.dia === cx.diaHoje ? 'só sobe até o fim do mês' : `menor saldo ${esc(brl0(cx.pior.saldo))} (dia ${cx.pior.dia})`}</p>
  </button>`;
}
function cartaoCartao(ct) {
  const teto = Math.max(ct.ritmo, ct.limite, ct.fatura) || 1, pc = v => `${Math.min(100, (v / teto) * 100).toFixed(1)}%`;
  const barra = ct.limite ? `<span class="pl-limite" role="img" aria-label="Fatura ${esc(brl0(ct.fatura))}, limite ${esc(brl0(ct.limite))}, ritmo ${esc(brl0(ct.ritmo))}">
      <i class="pl-feito" style="width:${pc(ct.fatura)}"></i>${ct.ritmo > ct.fatura ? `<i class="pl-ritmo" style="left:${pc(ct.fatura)};width:${(Math.min(100, (ct.ritmo / teto) * 100) - Math.min(100, (ct.fatura / teto) * 100)).toFixed(1)}%"></i>` : ''}<em style="left:${pc(ct.limite)}"></em></span>
    <span class="pl-legenda"><span>hoje</span><span>limite ${esc(brl0(ct.limite))}</span>${ct.ritmo ? `<span>ritmo ${esc(brl0(ct.ritmo))}</span>` : ''}</span>` : '';
  const pe = ct.fatura > ct.limite && ct.limite ? `Passou <b>${esc(brl0(ct.fatura - ct.limite))}</b> do limite` : ct.limite ? `Cabem <b>${esc(brl0(ct.cabe))}</b>${ct.porDia ? ` · <b>${esc(brl0(ct.porDia))} por dia</b> até o fechamento` : ''}` : '';
  return `<button type="button" class="pilar-hoje cartao" data-aba="cartao">
    <span class="pl-topo"><b>Cartão</b><span>Abrir${SETA}</span></span>
    <small>Fatura até agora${ct.vence ? ` · vence ${ct.vence}` : ''}</small><b class="pl-num">${esc(brl0(ct.fatura))}</b>
    ${barra}${pe ? `<p>${pe}</p>` : ''}
  </button>`;
}
function cartaoCarteira(cr) {
  const vs = cr.meses.map(x => x.v), min = Math.min(...vs) * 0.92, max = Math.max(...vs);
  const cols = cr.meses.map((x, i) => `<i style="height:${Math.max(8, ((x.v - min) / (max - min || 1)) * 100).toFixed(0)}%"${i === cr.meses.length - 1 ? ' class="agora"' : ''}></i>`).join('');
  const de = cr.meses[0]?.mes, ate = cr.meses[cr.meses.length - 1]?.mes, rot = k => (k ? `${MES3[Number(k.slice(5, 7)) - 1]}/${k.slice(2, 4)}` : '');
  return `<button type="button" class="pilar-hoje carteira" data-aba="carteira">
    <span class="pl-topo"><b>Carteira</b><span>Abrir${SETA}</span></span>
    <small>Investido${cr.mercado ? ` · ${cr.mercado < 0 ? '▼' : '▲'} ${esc(brl0(Math.abs(cr.mercado)))} no mês` : ''}</small><b class="pl-num">${esc(curto(cr.total))}</b>
    ${cols ? `<span class="pl-colunas" role="img" aria-label="Patrimônio investido mês a mês">${cols}</span>` : ''}
    <p>${cr.dividendos ? `Dividendos <b>${esc(brl0(cr.dividendos))}</b> · ` : ''}${rot(de)} → ${rot(ate)}</p>
  </button>`;
}

export function htmlHoje(r) {
  const p = [];
  if (r.leitura) p.push(`<section class="leitura-hoje"><span class="cap-hoje"><i></i>Leitura do dia</span><p class="lh-titulo">${esc(r.leitura.t1)} <span>${esc(r.leitura.t2)}</span></p>${r.leitura.texto ? `<p class="lh-texto">${r.leitura.texto}</p>` : ''}</section>`);
  const pilares = [r.caixa && cartaoCaixa(r.caixa), cartaoCartao(r.cartao), r.carteira && cartaoCarteira(r.carteira)].filter(Boolean);
  const faixa = r.faixa?.length ? `<div class="faixa-hoje">${r.faixa.map(f => `<div><span>${esc(f.rotulo)}</span><b>${esc(f.valor)}${f.extra ? `<small>${esc(f.extra)}</small>` : ''}</b><i><i style="width:${f.pct.toFixed(0)}%"${f.brasa ? ' class="brasa"' : ''}></i></i></div>`).join('')}</div>` : '';
  p.push(`<section><div class="pilares-hoje">${pilares.join('')}</div>${faixa}</section>`);
  if (r.agenda.length) {
    const linhaAg = i => `<div class="ag-linha"><span>${esc(i.nome)}</span><b class="${i.valor > 0 ? 'sobe' : ''}">${esc(`${i.valor > 0 ? '+' : '−'}${brl(Math.abs(i.valor))}`)}</b></div>`;
    p.push(`<section class="agenda-hoje"><div class="tit-hoje"><h2>Agenda</h2><button type="button" class="link-cv" data-ir-aba="mes/agenda">Ver o mês</button></div>
      <div class="ag-dias" role="radiogroup" aria-label="Dias">${r.agenda.map((d, i) => `<label class="ag-dia"><input type="radio" name="ag-dia" value="${i}"${i === (r.agenda[0].vazio && r.agenda[1] ? 1 : 0) ? ' checked' : ''}><span>${esc(d.sem)}</span><b>${esc(d.dia)}</b><i class="${d.total > 0 ? 'sobe' : d.total < 0 ? 'sai' : ''}"></i></label>`).join('')}</div>
      ${r.agenda.map((d, i) => `<div class="ag-painel" data-i="${i}"><div class="ag-cab"><span><b>${esc(d.titulo)}</b>${d.quando !== 'hoje' ? ` · ${esc(d.quando)}` : ''}</span>${d.total ? `<b class="${d.total > 0 ? 'sobe' : 'cai'}">${esc(sinal(d.total))}</b>` : ''}</div>
        ${d.vazio ? `<p class="cv-nota">${esc(d.vazio)}</p>` : d.itens.map(linhaAg).join('')}${d.mais ? `<p class="cv-nota">e mais ${d.mais}</p>` : ''}</div>`).join('')}</section>`);
  }
  if (r.fazer.length) {
    p.push(`<section class="fazer-hoje"><div class="tit-hoje"><h2>Para fazer</h2>${r.plano ? `<span><b>${r.plano.feitos} de ${r.plano.total}</b> do plano</span>` : ''}</div>
      ${r.plano ? `<i class="fz-progresso"><i style="width:${Math.round((r.plano.feitos / (r.plano.total || 1)) * 100)}%"></i></i>` : ''}
      ${r.fazer.map(f => `<div class="fz-linha tom-${f.tom}">${f.passo != null ? `<button type="button" class="fz-check" data-passo="${esc(f.passo)}" aria-label="Marcar como feito"></button>` : '<i class="fz-ponto"></i>'}
        <button type="button" class="fz-txt" ${f.attr || ''}><b>${esc(f.titulo)}</b>${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</button></div>`).join('')}</section>`);
  }
  if (r.rumo) {
    const ru = r.rumo, todos = ru.meses.flatMap(x => [x.fim, x.piso]), mn = Math.min(...todos), mx = Math.max(...todos);
    const fim = caminho(ru.meses.map(x => x.fim), 300, 64, 6, mn, mx).d, piso = caminho(ru.meses.map(x => x.piso), 300, 64, 6, mn, mx).d;
    const frase = ru.piso < 0 ? `A conta fica negativa em algum dia do próximo ano (pior: <b class="cai">${esc(brl0(ru.piso))}</b>) — vale rever o plano com o Claude.`
      : ru.porMes < 0 ? `A conta perde <b class="cai">${esc(brl0(-ru.porMes))} por mês</b>, mas nunca desce de <b>${esc(curto(ru.piso))}</b>${ru.piso >= 5000 ? ': tem dinheiro parado que pode render' : ''}.`
        : `A conta cresce <b class="sobe">${esc(brl0(ru.porMes))} por mês</b> e nunca desce de <b>${esc(curto(ru.piso))}</b>.`;
    p.push(`<section class="rumo-hoje"><h2>Para onde vai</h2>
      <div class="rumo-nums">${ru.patrimonio ? `<div><span>Patrimônio em ${esc(ru.patrimonio.label)}</span><b class="ouro">${esc(curto(ru.patrimonio.valor))}</b></div>` : ''}<div><span>Conta em ${esc(ru.contaLabel.toLowerCase())}</span><b>${esc(curto(ru.conta))}</b></div></div>
      <svg viewBox="0 0 300 64" class="rumo-graf" role="img" aria-label="Saldo da conta no fim de cada mês e no pior dia, nos próximos 12 meses"><path d="${fim} L300 64 L0 64 Z" class="rg-area"/><path d="${fim}" class="rg-fim"/><path d="${piso}" class="rg-piso"/></svg>
      <p class="rumo-leg"><span><i></i>conta no fim do mês</span><span><i class="tr"></i>pior dia</span><span class="rg-ate">${esc(ru.meses[0].label.toLowerCase())} → ${esc(ru.contaLabel.toLowerCase())}</span></p>
      <p class="lh-texto">${frase}</p></section>`);
  }
  return `<div class="hoje-cv">${p.join('')}</div>`;
}

// ---------- v11.0 (Repaginação 360, Meia-noite): o Hoje como briefing ----------
// O número de cima (o "Livre de verdade", livreDeVerdade em indicadores.js) fica no topo; aqui: uma frase, até 3 coisas
// para fazer hoje, o ritmo do gasto livre e os próximos dias. Os 5 números do consultor vão para a revisão do mês (Plano,
// v11.3). Tocar no número de cima, no ritmo ou num dia abre a gaveta com o porquê (data-detalhe + <template>).
const tpl = (id, titulo, linhas, nota) => `<template id="${id}"><h2 class="detalhe-titulo">${esc(titulo)}</h2><ul class="hj11-det">${linhas.filter(Boolean).map(([n, v, cls = '']) => `<li><span>${esc(n)}</span><b class="${cls}">${esc(v)}</b></li>`).join('')}</ul>${nota ? `<p class="hj11-nota"><b>Claude:</b> ${esc(nota)}</p>` : ''}</template>`;
export function htmlHojeV11({ r, l, c = {}, limite = 0, ctx, github = false }) {
  const mesNome = maiuscula(MESES[ctx.mes - 1]);
  const p = [];
  // a frase do dia: a sobra já tem dono quando há aportes no plano; o ponto fraco vem da leitura de sempre
  if (r.leitura) {
    const t1 = l.aportes && r.caixa?.fecha > 0 ? `${mesNome} fecha com sobra, mas ela já tem dono: os aportes do plano.` : r.leitura.t1;
    p.push(`<p class="hj11-frase"><b>${esc(t1)}</b> ${esc(r.leitura.t2)}</p>${r.leitura.texto ? `<p class="hj11-sub">${r.leitura.texto}</p>` : ''}`);
  }
  // até 3 coisas para hoje; se os aportes do plano passam do caixa do mês que vem, isso entra em segundo
  const fazer = [...r.fazer];
  if (l.planoPassa) fazer.splice(1, 0, { titulo: 'Antes de investir: rever os aportes do plano', sub: `com todos, ${l.mesProx.toLowerCase()} fica em −${brl0(l.planoPassa)} no pior dia`, tom: 'atencao', attr: 'data-detalhe="det-plano"' });
  const peso = f => (f.tom === 'ruim' ? 0 : f.tom === 'atencao' ? 1 : 2); // o mais urgente primeiro (sort estável)
  const tres = fazer.map((f, i) => ({ f, i })).sort((a, b) => peso(a.f) - peso(b.f) || a.i - b.i).slice(0, 3).map(x => x.f);
  if (tres.length) p.push(`<section class="hj11-sec"><div class="tit-hoje"><h2>Hoje</h2><span>${tres.length} ${tres.length === 1 ? 'coisa' : 'coisas'}</span></div>
    ${tres.map(f => `<div class="fz-linha tom-${f.tom}">${f.passo != null && github ? `<button type="button" class="fz-check" data-passo="${esc(f.passo)}" aria-label="Marcar como feito"></button>` : '<i class="fz-ponto"></i>'}<button type="button" class="fz-txt" ${f.attr || ''}><b>${esc(f.titulo)}</b>${f.sub ? `<small>${esc(f.sub)}</small>` : ''}</button></div>`).join('')}</section>`);
  // o ritmo do gasto livre (cartão + Pix sem as contas fixas) contra a linha que fecha no limite
  const rt = ctx.mesPassou ? null : ritmoLivre(c, limite, ctx);
  if (rt) {
    const { livre: livreLimite, dia, gasto, ideal, dif } = rt, teto = Math.max(livreLimite, gasto) * 1.08 || 1;
    const X = d => 10 + ((d - 1) / Math.max(1, ctx.dias - 1)) * 330, Y = v => 112 - (v / teto) * 96;
    p.push(`<section class="hj11-sec"><div class="tit-hoje"><h2>Ritmo do gasto livre</h2><button type="button" class="link-cv" data-detalhe="det-ritmo">Por quê?</button></div>
      <svg viewBox="0 0 350 132" class="hj11-ritmo" role="img" aria-label="Gasto livre ${esc(brl0(gasto))} até o dia ${dia}; o ritmo que fecha no limite seria ${esc(brl0(ideal))}">
        <line x1="${X(1)}" y1="${Y(0)}" x2="${X(ctx.dias)}" y2="${Y(livreLimite).toFixed(1)}" class="hr-ideal"></line>
        <line x1="${X(1)}" y1="${Y(0)}" x2="${X(dia).toFixed(1)}" y2="${Y(gasto).toFixed(1)}" class="hr-real ${dif > 0 ? 'acima' : ''}"></line>
        <circle cx="${X(dia).toFixed(1)}" cy="${Y(gasto).toFixed(1)}" r="5" class="hr-pt ${dif > 0 ? 'acima' : ''}"></circle>
        <text x="${Math.min(X(dia) + 10, 230).toFixed(1)}" y="${(Y(gasto) - 8).toFixed(1)}" class="hr-val ${dif > 0 ? 'acima' : ''}">${esc(brl0(gasto))} (${dif > 0 ? '+' : '−'}${esc(brl0(Math.abs(dif)))})</text>
        <text x="${X(1)}" y="128" class="hr-eixo">dia 1</text><text x="${X(dia).toFixed(1)}" y="128" text-anchor="middle" class="hr-eixo hj">dia ${dia}</text><text x="${X(ctx.dias)}" y="128" text-anchor="end" class="hr-eixo">dia ${ctx.dias}</text>
      </svg>
      <p class="rumo-leg"><span><i class="hr-i"></i>gasto livre (cartão + Pix)</span><span><i class="tr"></i>ritmo que fecha no limite</span></p></section>`);
    p.push(tpl('det-ritmo', 'Ritmo do gasto livre', [['Gasto livre até o dia ' + dia, brl(gasto), dif > 0 ? 'cai' : ''], ['O ritmo que fecha no limite', brl(ideal)], ['Livre no mês (limite − já comprometido)', brl(livreLimite)], ['Já comprometido (recorrentes e parcelas)', brl(c.comprometido || 0)]],
      dif > 0 ? `Está ${brl0(dif)} acima do ritmo. Até o fechamento cabem ${brl0(Math.max(0, livreLimite - gasto))}.` : 'Dentro do ritmo: o mês fecha abaixo do limite se continuar assim.'));
  }
  // os próximos dias com movimento (o "Hoje" vazio não entra)
  const dias = r.agenda.filter(d => !d.vazio).slice(0, 4);
  if (dias.length) p.push(`<section class="hj11-sec"><div class="tit-hoje"><h2>Próximos</h2><button type="button" class="link-cv" data-ir-aba="mes/agenda">O mês inteiro</button></div>
    <div class="hj11-prox">${dias.map((d, i) => `<button type="button" class="hj11-dia" data-detalhe="det-dia-${i}"><small>${esc(d.sem)}${d.data.slice(5, 7) !== String(ctx.mes).padStart(2, '0') ? ` · ${esc(MES3[Number(d.data.slice(5, 7)) - 1])}` : ''}</small><b>${esc(d.dia)}</b><em class="${d.total > 0 ? 'sobe' : d.total < 0 ? 'cai' : ''}">${esc(sinal(d.total))}</em></button>`).join('')}</div>
    ${dias.map((d, i) => tpl(`det-dia-${i}`, `${d.titulo} · ${d.quando}`, d.itens.map(it => [it.nome, `${it.valor > 0 ? '+' : '−'}${brl(Math.abs(it.valor))}`, it.valor > 0 ? 'sobe' : '']), d.mais ? `E mais ${d.mais} movimentos pequenos nesse dia.` : '')).join('')}</section>`);
  // as gavetas do número de cima e do plano
  p.push(tpl('det-livre', l.cartao?.passou ? 'O cartão passou do limite' : `Livre de verdade: ${brl0(l.valor)}`, [
    l.cartao && ['Fatura até agora', brl(c.itau || 0)], l.cartao && ['Limite saudável', brl(limite)], l.cartao && ['Por dia até o fechamento', brl(l.cartao.porDia)],
    l.aportes && ['Aportes do plano ainda por fazer', brl(l.aportes)], l.piso != null && [l.mesProx ? `Pior dia de ${l.mesProx.toLowerCase()}` : 'Pior dia até o fim do mês', brl(l.piso), l.piso < 0 ? 'cai' : ''],
  ], 'A sobra do mês já tem destino (os aportes do plano). O que dá para gastar sem mexer nisso é o que ainda cabe no cartão.'));
  if (l.planoPassa) p.push(tpl('det-plano', 'Os aportes do plano e o caixa', [[`Pior dia de ${l.mesProx.toLowerCase()} sem os aportes`, brl(l.piso)], ['Aportes do plano ainda por fazer', `−${brl(l.aportes)}`, 'cai'], ['Pior dia com todos', `−${brl(l.planoPassa)}`, 'cai']],
    'Estimativa pela projeção do painel, supondo que os aportes ainda não foram lançados. Dividir o maior aporte em dois meses evita o cheque especial.'));
  return `<div class="hoje-cv hj11">${p.join('')}</div>`;
}
