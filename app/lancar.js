// O "+" de lançar (saiu do app.js em 14/11/2026): as opções em cartões (v8.5), as abas do "+" (cartão, Pix/débito,
// entrada, investir), contas do Caixa, valores futuros, investir e atualizar valores. O que precisa do app.js chega por
// configurarLancar, chamado no fim do app.js.
import { CATEGORIAS_RECEITA, LISTAS_CONHECIDAS, editarItem, excluirItem, hojeBrasil, lerValor, novoAporte, novoDividendo, novoItem, novoResgate, registrar, sinalDe, tickerDividendo, validar, valorConhecido } from './lancamentos.js';
import { ALCANCES_EDITAR, ALCANCES_PARCELA, abrirFolha, aviso, brlTexto, confirmar, dataCurta, esc, escolherAlcance, fecharFolha } from './ui.js';
import { categoriaDoItem, iconeCategoria, nomeCategoria } from './categorias.js';
import { atualizarValores, cotasDe, listaAtivos, mesAberto, nomeAtivo } from './investimentos.js';
import { conselhoAtivo, ordemAportes } from './ficha.js';
import { posicao } from './carteira.js';
import { abrirConfigBinance, abrirConfigItau, credenciaisItau, mostrarItau, saldoBinance } from './integracoes.js';

let ultimoDiaDe, estado, virgula, podeLancar, aplicarLancamento, ligarFormLanc, maxPlano, notaAgendamento, MESES_LONGOS, abrirLancar, abrirCategorias, diaSemana, creditoDe, colarSms, mesSeguinte;
export function configurarLancar(app) {
  ({ ultimoDiaDe, estado, virgula, podeLancar, aplicarLancamento, ligarFormLanc, maxPlano, notaAgendamento, MESES_LONGOS, abrirLancar, abrirCategorias, diaSemana, creditoDe, colarSms, mesSeguinte } = app);
}

// ---------- v8.5: o "+" do meio da barra abre as opções em cartões que sobem (como no protótipo Brasa) ----------
const IC_DISCAR = {
  cartao: '<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M2.5 10h19M6.5 15h4"/>',
  pix: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
  entrada: '<path d="M12 4v13M6.5 11.5 12 17l5.5-5.5M5 20.5h14"/>',
  investir: '<path d="M4 16.5 9.5 11l4 4L20 8.5"/><path d="M15 8.5h5v5"/>',
  sms: '<path d="M4.5 5.5h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-4.5 3.5v-3.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/>',
};
export function abrirDiscar() {
  if (!podeLancar({ cartao: true })) return;
  const d = estado.dados;
  const mesNovo = hojeBrasil().slice(0, 7) > d.periodo;
  let temCartao = true;
  try {
    validar(d, hojeBrasil(), { cartao: true, proximoMes: true });
  } catch {
    temCartao = false;
  }
  const op = [
    temCartao && ['cartao', 'Cartão', 'Compra no Itaú, à vista ou parcelada'],
    !mesNovo && ['pix', 'Pix ou débito', 'Sai da conta hoje'],
    !mesNovo && ['entrada', 'Entrada', 'Salário, reembolso, venda…'],
    !mesNovo && estado.cart.dados && ['investir', 'Investir', 'Aporte, resgate ou dividendo'],
    temCartao && ['sms', 'Colar SMS do Itaú', 'Lê valor, loja e parcelas da mensagem'],
  ].filter(Boolean);
  if (op.length < 2) return abrirLancar();
  const folha = abrirFolha(`<h2 class="so-leitor">Lançar</h2>
    <div class="discar">${op.map(([k, nome, sub], i) => `<button type="button" class="discar-op" data-discar="${k}" style="--i:${op.length - 1 - i}">
      <span class="discar-ic"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${IC_DISCAR[k]}</svg></span><span><b>${nome}</b><small>${sub}</small></span></button>`).join('')}</div>
    <button type="button" class="discar-fechar" aria-label="Fechar"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button>`, { classe: 'folha-discar' });
  folha.querySelector('.discar-fechar').onclick = fecharFolha;
  folha.querySelectorAll('[data-discar]').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.discar;
      if (k === 'entrada') return abrirNovaConta('receita', { pago: true, doMais: true });
      if (k === 'investir') return abrirInvestir('aporte', { doMais: true });
      if (k === 'sms') return colarSms();
      abrirLancar(k);
    };
  });
}

// ---------- v7: abas do "+" (cartão, Pix/débito, entrada, investimento) ----------
export function abasLancar(atual, { temCartao = true, mesNovo = false } = {}) {
  const op = [
    temCartao && ['cartao', 'Cartão'],
    !mesNovo && ['pix', 'Pix/débito'],
    !mesNovo && ['entrada', 'Entrada'],
    !mesNovo && estado.cart.dados && ['investir', 'Investir'],
  ].filter(Boolean);
  if (op.length < 2) return '';
  return `<div class="escolha ${op.length > 3 ? 'quatro' : ''}" role="tablist">${op.map(([k, n]) =>
    `<button type="button" role="tab" data-tipo="${k}" class="${k === atual ? 'on' : ''}">${n}</button>`).join('')}</div>`;
}
export function ligarAbasLancar(folha, atual, rascunho) {
  folha.querySelectorAll('[data-tipo]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.tipo === atual) return;
      const f = rascunho();
      const leva = { valor: f.valor, desc: f.desc, data: f.data };
      if (b.dataset.tipo === 'entrada') abrirNovaConta('receita', { ...leva, pago: true, doMais: true });
      else if (b.dataset.tipo === 'investir') abrirInvestir('aporte', { valor: f.valor, doMais: true });
      else abrirLancar(b.dataset.tipo, f);
    };
  });
}

const pad2 = n => String(n).padStart(2, '0');
const seletorReceita = atual => {
  const ops = CATEGORIAS_RECEITA.some(([k]) => k === atual) || !atual ? CATEGORIAS_RECEITA : [...CATEGORIAS_RECEITA, [atual, atual]];
  return `<select class="campo" id="cCat">${ops.map(([k, n]) => `<option value="${esc(k)}"${k === (atual || 'extraordinaria') ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
};
export const botaoCategoria = cat => `<button type="button" class="campo campo-cat" id="lCatBtn">${cat ? `${iconeCategoria(cat)}<span>${esc(nomeCategoria(cat))}</span>` : '<span class="ph">Escolha a categoria</span>'}</button>`;
function campoDia(d, valor, { max } = {}) {
  return `<label for="lData">Data</label>
    <input class="campo" id="lData" type="date" value="${esc(valor)}" min="${d.periodo}-01" max="${max || ultimoDiaDe(d.periodo)}" required>`;
}

// Editar uma conta do mês (Caixa › Contas): nome, valor, data, pago/a pagar, categoria, observação ou excluir
export function abrirConta(ref, rascunho = null) {
  if (!podeLancar()) return;
  const d = estado.dados;
  const [lista, id] = ref.split('|');
  const it = (d[lista] || []).find(x => x.id === id);
  if (!it || it.id === 'var-itau') return aviso('Essa conta não está mais no painel — busque a atualização.', { erro: true });
  const entrada = sinalDe(lista, it) > 0;
  const temCat = ['receitas', 'despesasFixas', 'despesasVariaveis'].includes(lista);
  const t = lista === 'receitas' ? tickerDividendo(it.descricao) : null;
  const repete = (lista === 'despesasFixas' || (lista === 'receitas' && !t)) && (it.origem !== 'app' || it.recorrenteApp);
  const parcelado = (d.parcelamentosExternos || []).some(p => p.idCaixa === it.id); // Pix/débito parcelado: tem parcelas nos próximos meses
  // categoria: para despesas, o nome do catálogo (o slug do agente só é trocado se a pessoa escolher outra)
  const r = rascunho || { desc: it.descricao, valor: virgula(Math.abs(it.valor).toFixed(2)), data: `${d.periodo}-${pad2(it.dia || 1)}`, pago: it.status === 'confirmado', cat: lista === 'receitas' ? it.categoria || '' : categoriaDoItem(it), nota: it.nota || '' };
  const ligacao = it.ativo ? `${lista === 'resgates' ? 'Resgate de' : 'Aporte em'} ${nomeAtivo(it.ativo)}: mudar aqui muda também a carteira.`
    : t ? (estado.cart.dados ? `Dividendo de ${t.toUpperCase()}: o valor recebido também fica na carteira.` : '')
    : lista === 'resgates' || lista === 'ajustesCaixa' ? 'Lançado pelo agente: mudar aqui não mexe na carteira.' : '';
  const [rotPago, rotAberto] = entrada ? ['Recebido', 'A receber'] : ['Pago', 'A pagar'];
  const folha = abrirFolha(`
    <h2>${entrada ? 'Entrada' : 'Conta'}</h2>
    ${ligacao ? `<p class="meta">${esc(ligacao)}</p>` : ''}
    <form id="formLanc">
      <label for="cDesc">Descrição</label>
      <input class="campo" id="cDesc" autocomplete="off" value="${esc(r.desc)}" required>
      <label for="lValor">Valor (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" value="${esc(r.valor)}" required>
      ${campoDia(d, r.data)}
      <div class="escolha pequena" role="radiogroup" aria-label="Situação">
        <button type="button" data-pago="1" class="${r.pago ? 'on' : ''}">${rotPago}</button>
        <button type="button" data-pago="0" class="${r.pago ? '' : 'on'}">${rotAberto}</button>
      </div>
      ${temCat && !t ? `<label for="${lista === 'receitas' ? 'cCat' : 'lCatBtn'}">Categoria</label>${lista === 'receitas' ? seletorReceita(r.cat) : botaoCategoria(r.cat)}` : ''}
      <label for="cNota">Observação <small class="opcional">(opcional)</small></label>
      <textarea class="campo area-nota" id="cNota" rows="2">${esc(r.nota)}</textarea>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>
    <button type="button" class="btn perigo" id="cExcluir">Excluir ${entrada ? 'esta entrada' : 'esta conta'}</button>
    <p class="erro" id="cErro"></p>
    ${LISTAS_CONHECIDAS.includes(lista) ? htmlConhecidos(d, lista, id) : ''}`);
  const $c = sel => folha.querySelector(sel);
  $c('#cFuturo')?.addEventListener('click', () => abrirValorFuturo(ref));
  folha.querySelectorAll('[data-tirar-futuro]').forEach(b => {
    b.onclick = async () => {
      const mes = b.dataset.tirarFuturo;
      if (!(await confirmar({ titulo: `Tirar o valor de ${mesCurto(mes)}?`, texto: `${it.descricao} volta ao valor previsto pelo agente nesse mês.`, sim: 'Tirar', manter: true }))) return abrirConta(ref);
      try {
        await aplicarLancamento(x => valorConhecido(x, { lista, id, mes, valor: null }, hojeBrasil()), `${it.descricao} de ${mesCurto(mes)}: volta ao previsto`);
      } catch (err) {
        aviso(err.message, { erro: true, fixo: true });
      }
    };
  });
  let pago = r.pago;
  folha.querySelectorAll('[data-pago]').forEach(b => {
    b.onclick = () => {
      pago = b.dataset.pago === '1';
      folha.querySelectorAll('[data-pago]').forEach(o => o.classList.toggle('on', o === b));
    };
  });
  const estadoC = () => ({ desc: $c('#cDesc').value, valor: $c('#lValor').value, data: $c('#lData').value, pago, cat: $c('#cCat')?.value ?? r.cat, nota: $c('#cNota').value });
  $c('#lCatBtn')?.addEventListener('click', () => {
    const f = estadoC();
    abrirCategorias({ tipo: 'pix', atual: f.cat, aoEscolher: c => abrirConta(ref, { ...f, cat: c }), aoVoltar: () => abrirConta(ref, f) });
  });
  ligarFormLanc(folha, async () => {
    const f = estadoC();
    const v = lerValor(f.valor);
    const dia = Number(f.data.slice(8, 10));
    const mudouValor = Math.abs(v - Math.abs(it.valor)) >= 0.005;
    // v9.8.4 (regra do app): mudou valor ou data de algo que se repete ou tem parcelas → pergunta de quando vale
    let alcance = 'todos';
    if ((repete || parcelado) && (mudouValor || dia !== it.dia)) {
      alcance = await escolherAlcance({ titulo: `Mudar ${it.descricao} de quando?`, texto: [mudouValor ? `${brlTexto(Math.abs(it.valor))} → ${brlTexto(v)}` : '', dia !== it.dia ? `dia ${it.dia} → ${dia}` : ''].filter(Boolean).join(' · '), rotulos: parcelado ? ALCANCES_PARCELA : ALCANCES_EDITAR });
      if (!alcance) { abrirConta(ref, f); return null; }
    }
    return [x => {
      let y = editarItem(x, { lista, id, descricao: f.desc, valor: v, dia, pago: f.pago, categoria: temCat && !t ? f.cat : undefined, nota: f.nota, alcance }, hojeBrasil());
      // a projeção do painel lê valoresConhecidos: o mês que vem já sai com o valor certo
      if (mudouValor && alcance !== 'todos' && LISTAS_CONHECIDAS.includes(lista)) y = valorConhecido(y, { lista, id, mes: mesSeguinte(y.periodo), valor: alcance === 'mes' ? Math.abs(it.valor) : v }, hojeBrasil());
      return y;
    }, `${f.desc.trim()}: ${brlTexto(v)}${mudouValor && alcance === 'mes' ? ' (só este mês)' : mudouValor && alcance === 'proximos' ? ' (do mês que vem em diante)' : ''}`];
  });
  $c('#cExcluir').onclick = async e => {
    const botao = e.currentTarget;
    let alcance = 'todos';
    if (parcelado) {
      alcance = await escolherAlcance({ titulo: `Tirar ${it.descricao} de quando?`, texto: `${brlTexto(Math.abs(it.valor))} por parcela.`, rotulos: ALCANCES_PARCELA, detalhes: { mes: 'Só esta parcela sai; as próximas continuam.', todos: 'Esta e as próximas saem.', proximos: 'Esta fica; as próximas saem.' } });
      if (!alcance) return abrirConta(ref);
    } else if (repete && LISTAS_CONHECIDAS.includes(lista)) {
      // v9.8.2: conta que se repete — só deste mês, deste e dos próximos, ou só dos próximos
      alcance = await escolherAlcance({ titulo: `Tirar ${it.descricao} de quando?`, texto: `${brlTexto(Math.abs(it.valor))} ${entrada ? 'de entrada' : 'por mês'}. Dá para desfazer depois.`, opcoes: it.puladoApp === d.periodo ? ['todos', 'proximos'] : ['mes', 'todos', 'proximos'] });
      if (!alcance) return abrirConta(ref);
    } else if (!(await confirmar({ titulo: `Excluir ${it.descricao}?`, texto: `${brlTexto(Math.abs(it.valor))} sai do caixa${it.ativo ? ' e a carteira volta junto' : ''}. Dá para desfazer depois.`, sim: 'Excluir', perigo: true, manter: true }))) return abrirConta(ref);
    botao.disabled = true;
    try {
      const rot = { mes: `Fora só deste mês: ${it.descricao}`, proximos: `Não se repete mais: ${it.descricao}`, todos: `Excluído: ${it.descricao}` }[alcance];
      await aplicarLancamento(x => excluirItem(x, { lista, id, alcance }, hojeBrasil()), rot);
    } catch (err) {
      if ($c('#cErro')?.isConnected) $c('#cErro').textContent = err.message;
      else aviso(err.message, { erro: true, fixo: true });
    } finally {
      botao.disabled = false;
    }
  };
}

// v7.9: valor já conhecido de um mês que vem (ex.: a conta de energia de novembro já chegou)
export const mesCurto = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES_LONGOS[m - 1]}/${a}`; };
function htmlConhecidos(d, lista, id) {
  const meus = (d.valoresConhecidos || []).filter(v => v.lista === lista && v.id === id);
  return `<p class="rotulo espaco">Próximos meses</p>
    ${meus.length ? `<ul class="recorrentes">${meus.map(v => `<li><button type="button" class="rec-linha" data-tirar-futuro="${esc(v.mes)}"><span class="rec-nome">${esc(mesCurto(v.mes))}<small>já conhecido · toque para tirar</small></span><b>${brlTexto(v.valor)}</b></button></li>`).join('')}</ul>` : ''}
    <button type="button" class="botao-sec" id="cFuturo">Já sei o valor de um mês que vem</button>`;
}
export function abrirValorFuturo(ref, mesEscolhido = null) {
  if (!podeLancar()) return;
  const d = estado.dados;
  const [lista, id] = ref.split('|');
  const it = (d[lista] || []).find(x => x.id === id);
  if (!it) return aviso('Essa conta não está mais no painel — busque a atualização.', { erro: true });
  const [a, m] = d.periodo.split('-').map(Number);
  const meses = Array.from({ length: 12 }, (_, i) => { const t = a * 12 + m + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; });
  const folha = abrirFolha(`
    <h2>${esc(it.descricao)}</h2>
    <p class="meta">Previsto pelo agente: ${brlTexto(Math.abs(it.valor))} por mês. O valor que você informar entra na projeção dos 12 meses${d.valoresConhecidosLidos ? '' : ' depois do próximo fechamento com o Claude'} e vale só para o mês escolhido.</p>
    <form id="formLanc">
      <label for="fMes">Mês</label>
      <select class="campo" id="fMes">${meses.map(x => `<option value="${x}"${x === mesEscolhido ? ' selected' : ''}>${esc(mesCurto(x))}</option>`).join('')}</select>
      <label for="lValor">Valor (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" placeholder="0,00" required>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>
    <button type="button" class="link" id="fVoltar">Voltar para a conta</button>`);
  folha.querySelector('#fVoltar').onclick = () => abrirConta(ref);
  ligarFormLanc(folha, () => {
    const mes = folha.querySelector('#fMes').value;
    const v = lerValor(folha.querySelector('#lValor').value);
    return [x => valorConhecido(x, { lista, id, mes, valor: v }, hojeBrasil()), `${it.descricao} de ${mesCurto(mes)}: ${brlTexto(v)}`];
  });
}

// Entrada nova ou conta a pagar nova (Caixa › Contas ou "+" → Entrada)
export function abrirNovaConta(tipo = 'receita', preenchido = {}) {
  if (!podeLancar()) return;
  const d = estado.dados;
  const hoje = hojeBrasil();
  const receita = tipo === 'receita';
  const r = { desc: '', valor: '', data: hoje, pago: receita, cat: receita ? 'extraordinaria' : '', nota: '', ...preenchido };
  const [rotPago, rotAberto] = receita ? ['Já recebi', 'A receber'] : ['Já paguei', 'A pagar'];
  const folha = abrirFolha(`
    <h2>${receita ? 'Nova entrada' : 'Nova conta a pagar'}</h2>
    ${r.doMais ? abasLancar('entrada') : `<p class="meta">${receita ? 'Salário, bônus, reembolso, venda… Dividendo se lança em Investimentos.' : 'Boleto ou conta que ainda vai sair do caixa. Compra no cartão vai pelo "+".'}</p>`}
    <form id="formLanc">
      <label for="lValor">Valor (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(r.valor)}" required>
      <label for="cDesc">Descrição</label>
      <input class="campo" id="cDesc" autocomplete="off" placeholder="${receita ? 'Ex.: reembolso do plano de saúde' : 'Ex.: IPTU'}" value="${esc(r.desc)}" required>
      ${campoDia(d, r.data, { max: maxPlano() })}
      <p class="nota" id="lAgendaNota" hidden></p>
      <div class="escolha pequena" role="radiogroup" aria-label="Situação">
        <button type="button" data-pago="1" class="${r.pago ? 'on' : ''}">${rotPago}</button>
        <button type="button" data-pago="0" class="${r.pago ? '' : 'on'}">${rotAberto}</button>
      </div>
      <label for="${receita ? 'cCat' : 'lCatBtn'}">Categoria</label>
      ${receita ? seletorReceita(r.cat) : botaoCategoria(r.cat)}
      <label for="cNota">Observação <small class="opcional">(opcional)</small></label>
      <textarea class="campo area-nota" id="cNota" rows="2">${esc(r.nota)}</textarea>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Lançar e publicar</button>
    </form>`);
  const $c = sel => folha.querySelector(sel);
  let pago = r.pago;
  folha.querySelectorAll('[data-pago]').forEach(b => {
    b.onclick = () => {
      pago = b.dataset.pago === '1';
      folha.querySelectorAll('[data-pago]').forEach(o => o.classList.toggle('on', o === b));
    };
  });
  const nAg = $c('#lAgendaNota');
  if (nAg) { const mostrar = () => { nAg.textContent = notaAgendamento($c('#lData').value, hoje, receita); nAg.hidden = !nAg.textContent; }; $c('#lData').addEventListener('change', mostrar); mostrar(); }
  const estadoC = () => ({ ...r, desc: $c('#cDesc').value, valor: $c('#lValor').value, data: $c('#lData').value, pago, cat: $c('#cCat')?.value ?? r.cat, nota: $c('#cNota').value });
  if (r.doMais) ligarAbasLancar(folha, 'entrada', estadoC);
  $c('#lCatBtn')?.addEventListener('click', () => {
    const f = estadoC();
    abrirCategorias({ tipo: 'pix', atual: f.cat, aoEscolher: c => abrirNovaConta(tipo, { ...f, cat: c }), aoVoltar: () => abrirNovaConta(tipo, f) });
  });
  ligarFormLanc(folha, () => {
    const f = estadoC();
    const v = lerValor(f.valor);
    return [x => novoItem(x, { tipo, descricao: f.desc, valor: v, data: f.data, pago: f.pago, categoria: f.cat, nota: f.nota }, hojeBrasil()), `${receita ? 'Entrada' : 'Conta a pagar'}: ${f.desc.trim()} ${brlTexto(v)}`];
  });
}

// "Tesouro Prefixado 2029" → tesouro_prefixado_2029 (o mesmo formato das chaves do plano do Claude)
const chaveAtivo = nome => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

// Aporte, resgate e dividendo: nascem no caixa e a carteira acompanha (investimentos.js)
export function abrirInvestir(tipo = 'aporte', preenchido = {}) {
  if (!podeLancar()) return;
  const cart = estado.cart.dados;
  if (!cart) return aviso('Importe a carteira antes (menu → Importar arquivo do agente).', { erro: true, fixo: true });
  const hoje = hojeBrasil();
  try {
    mesAberto(structuredClone(cart), hoje);
  } catch (e) {
    return aviso(e.message, { erro: true, fixo: true });
  }
  const d = estado.dados;
  const todos = listaAtivos(cart);
  const ativos = tipo === 'dividendo' ? todos.filter(a => a.classe === 'fiis' || a.classe === 'etfs') : todos;
  const r = { ativo: '', valor: '', data: hoje, motivo: 'necessidade_caixa', ...preenchido };
  // v9.13: o aporte abre no primeiro item da ordem de aportes da estratégia (sem os pausados)
  if (tipo === 'aporte' && !r.ativo) r.ativo = ordemAportes(cart.estrategia, todos).find(o => o.chaves.length === 1)?.chaves[0] || '';
  // v9.9.13: aporte num investimento que a carteira ainda não tem (o plano pede Tesouro, VWRA11…)
  const NOVO = '__novo';
  if (tipo === 'aporte' && r.ativo && r.ativo !== NOVO && !todos.some(a => a.chave === r.ativo)) {
    r.nomeNovo ||= nomeAtivo(r.ativo);
    r.classeNovo ||= /^[a-z]{4}\d{2}$/.test(r.ativo) ? 'etfs' : 'renda_fixa';
    r.ativo = NOVO;
  }
  const pj = cart.projecao_dividendos?.[d.periodo]?.ativos || {};
  const previsto = t => {
    const rec = d.receitas.find(x => tickerDividendo(x.descricao) === t && x.status !== 'confirmado');
    if (rec) return rec.valor;
    return pj[t] && !pj[t].pago ? pj[t].total : null;
  };
  const grupos = [...new Set(ativos.map(a => a.rotulo))];
  const opcoes = grupos.map(g => `<optgroup label="${esc(g)}">${ativos.filter(a => a.rotulo === g).map(a =>
    `<option value="${esc(a.chave)}"${a.chave === r.ativo ? ' selected' : ''}>${esc(a.nome)}${tipo === 'dividendo' ? (previsto(a.chave) ? ` · previsto ${brlTexto(previsto(a.chave))}` : '') : ` · ${brlTexto(a.valor)}`}</option>`).join('')}</optgroup>`).join('');
  const textos = {
    aporte: 'Sai do caixa e entra no investimento. O patrimônio sobe o mesmo valor; não é ganho.',
    resgate: 'Sai do investimento e entra no caixa no dia do crédito. O patrimônio desce o mesmo valor; não é perda.',
    dividendo: 'Entra no caixa e fica registrado no ativo da carteira. O valor do FII/ETF não muda.',
  };
  const folha = abrirFolha(`
    <h2>Investimentos</h2>
    ${r.doMais ? abasLancar('investir') : ''}
    <div class="escolha pequena quatro" role="tablist">
      ${[['aporte', 'Aporte'], ['resgate', 'Resgate'], ['dividendo', 'Dividendo'], ['valores', 'Valores']].map(([k, n]) => `<button type="button" data-inv="${k}" class="${k === tipo ? 'on' : ''}">${n}</button>`).join('')}
    </div>
    <p class="meta">${textos[tipo]}</p>
    <form id="formLanc">
      <label for="iAtivo">${tipo === 'dividendo' ? 'Quem pagou' : 'Investimento'}</label>
      <select class="campo" id="iAtivo" required><option value="">Escolha</option>${opcoes}${tipo === 'aporte' ? `<optgroup label="Novo"><option value="${NOVO}"${r.ativo === NOVO ? ' selected' : ''}>+ Investimento novo (Tesouro, ETF…)</option></optgroup>` : ''}</select>
      <div id="iNovoBox" hidden>
        <label for="iNome">Nome do investimento</label>
        <input class="campo" id="iNome" autocomplete="off" placeholder="Ex.: Tesouro Prefixado 2029, VWRA11" value="${esc(r.nomeNovo || '')}">
        <label for="iClasse">Tipo</label>
        <select class="campo" id="iClasse">${[['renda_fixa', 'Renda fixa (Tesouro, CDB, fundo)'], ['etfs', 'ETF'], ['fiis', 'FII']].map(([k, n]) => `<option value="${k}"${k === (r.classeNovo || 'renda_fixa') ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <p class="nota">Ele entra na carteira com este aporte. No fechamento, o Claude completa a ficha (prazo de resgate, vencimento).</p>
      </div>
      <p class="nota" id="iDica" hidden></p>
      <label for="lValor">Valor (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(r.valor)}" required>
      <label for="lData">${tipo === 'resgate' ? 'Cai na conta em' : tipo === 'dividendo' ? 'Recebido em' : 'Data'}</label>
      <input class="campo" id="lData" type="date" value="${esc(r.data)}" min="${d.periodo}-01" max="${ultimoDiaDe(d.periodo)}" required>
      <div id="iCotasBox" hidden>
        <label for="iCotas">Cotas ${tipo === 'resgate' ? 'vendidas' : 'compradas'}</label>
        <input class="campo" id="iCotas" type="number" inputmode="numeric" min="1" step="1" value="${esc(r.cotas || '')}">
        <p class="nota" id="iCotasNota"></p>
      </div>
      ${tipo === 'resgate' ? `<div class="escolha pequena" role="radiogroup" aria-label="Motivo">
        <button type="button" data-motivo="necessidade_caixa" class="${r.motivo === 'necessidade_caixa' ? 'on' : ''}">Para o caixa</button>
        <button type="button" data-motivo="estrategico" class="${r.motivo === 'estrategico' ? 'on' : ''}">Outro motivo</button>
      </div>` : ''}
      <p class="nota" id="iJaSaiu" hidden></p>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Lançar e publicar</button>
    </form>`);
  const $i = sel => folha.querySelector(sel);
  let motivo = r.motivo;
  folha.querySelectorAll('[data-motivo]').forEach(b => {
    b.onclick = () => {
      motivo = b.dataset.motivo;
      folha.querySelectorAll('[data-motivo]').forEach(o => o.classList.toggle('on', o === b));
    };
  });
  const estadoI = () => ({ ...r, ativo: $i('#iAtivo').value, valor: $i('#lValor').value, data: $i('#lData').value, motivo, cotas: $i('#iCotas').value, nomeNovo: $i('#iNome').value, classeNovo: $i('#iClasse').value });
  const ehNovo = () => $i('#iAtivo').value === NOVO;
  const novoComCotas = () => ehNovo() && $i('#iClasse').value !== 'renda_fixa';
  // FIIs, ETFs e GLDI11: o número de cotas mantém o preço médio da carteira certo (sugestão = valor ÷ cota de hoje)
  let cotasMexeu = !!r.cotas;
  $i('#iCotas').addEventListener('input', () => { cotasMexeu = true; });
  const cotas = () => {
    const k = $i('#iAtivo').value;
    const cm = tipo === 'dividendo' ? null : cotasDe(cart, k);
    const a = todos.find(x => x.chave === k);
    $i('#iNovoBox').hidden = !ehNovo();
    $i('#iNome').required = ehNovo();
    $i('#iCotasBox').hidden = !cm && !novoComCotas();
    $i('#iCotas').required = !!cm || novoComCotas();
    if (novoComCotas()) $i('#iCotasNota').textContent = 'Confira no comprovante do Itaú: o preço médio da carteira começa com este número.';
    if (!cm || !a) return;
    const cota = cm.qtd ? a.valor / cm.qtd : 0;
    const v = lerValor($i('#lValor').value);
    if (!cotasMexeu && cota && v > 0) $i('#iCotas').value = Math.max(1, Math.round(v / cota));
    $i('#iCotasNota').textContent = `Você tem ${cm.qtd} cotas${cota ? ` · cota de hoje ≈ ${brlTexto(Math.round(cota * 100) / 100)}` : ''}. Confira no comprovante do Itaú — o preço médio da carteira usa esse número.`;
  };
  $i('#lValor').addEventListener('input', cotas);
  if (r.doMais) ligarAbasLancar(folha, 'investir', () => ({ valor: $i('#lValor').value }));
  folha.querySelectorAll('[data-inv]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.inv === tipo) return;
      if (b.dataset.inv === 'valores') return abrirValores();
      const f = estadoI();
      abrirInvestir(b.dataset.inv, { ...f, ativo: '', doMais: r.doMais });
    };
  });
  const dica = () => {
    const k = $i('#iAtivo').value;
    const a = todos.find(x => x.chave === k);
    const el = $i('#iDica');
    let txt = '';
    if (a && tipo === 'resgate') {
      // v9.7: pedido hoje → dia em que cai na conta (dias úteis e feriados do caixa)
      const cr = creditoDe(cart, k, a.classe);
      txt = `Tem ${brlTexto(a.valor)}.${cr.data ? ` Pedindo hoje, cai ${cr.du === 0 ? 'hoje' : `${diaSemana(cr.data)}, ${dataCurta(cr.data)}`} (${cr.texto}${cr.du ? ' úteis' : ''}).` : ''}`;
      const campo = $i('#lData');
      if (cr.data && (!preenchido.data || preenchido.data === hoje) && (campo.value === hoje || campo.dataset.auto)) {
        if (!campo.dataset.auto) campo.addEventListener('change', () => { delete campo.dataset.auto; }, { once: true });
        campo.dataset.auto = '1'; // a data foi o app que pôs: trocar de ativo troca a data (até a pessoa mexer nela)
        if (cr.data <= campo.max) campo.value = cr.data;
        else txt += ' Isso já é no mês que vem: lance o resgate depois do fechamento, no dia em que cair.';
      }
    }
    const cons = tipo !== 'dividendo' && k !== NOVO && conselhoAtivo(cart.estrategia, k, tipo, todos);
    if (cons) txt = `${txt ? `${txt} ` : ''}${cons.texto}`;
    if (a && tipo === 'dividendo') {
      const p = previsto(k);
      if (p && !$i('#lValor').value) $i('#lValor').value = virgula(p.toFixed(2));
      if (p) txt = `Previsto: ${brlTexto(p)}. Confira com o valor que caiu na conta.`;
    }
    el.hidden = !txt;
    el.textContent = txt;
  };
  $i('#iAtivo').onchange = () => { dica(); cotas(); };
  $i('#iClasse').onchange = cotas;
  // v9.9.12: resgate maior do que o investimento tem na carteira = o banco já descontou (Itaú automático) — só registra
  const jaSaiu = () => { const a = todos.find(x => x.chave === $i('#iAtivo').value); return tipo === 'resgate' && !!a && lerValor($i('#lValor').value) > a.valor + 0.004; };
  const notaJaSaiu = () => { const el = $i('#iJaSaiu'), a = todos.find(x => x.chave === $i('#iAtivo').value); el.hidden = !jaSaiu(); if (!el.hidden) el.textContent = `${a.nome} já está com ${brlTexto(a.valor)} na carteira: o banco já descontou esse resgate. O app registra a saída e a entrada no caixa, sem descontar de novo do investimento.`; };
  $i('#lValor').addEventListener('input', notaJaSaiu); $i('#iAtivo').addEventListener('change', notaJaSaiu); notaJaSaiu();
  dica();
  cotas();
  ligarFormLanc(folha, () => {
    const f = estadoI();
    const v = lerValor(f.valor);
    const dia = Number(f.data.slice(8, 10));
    if (f.ativo === NOVO) {
      const nome = f.nomeNovo.trim();
      const chave = chaveAtivo(nome);
      if (!chave) throw new Error('Escreva o nome do investimento.');
      const existe = todos.find(x => x.chave === chave);
      const cl = existe ? null : f.classeNovo;
      const n = (existe ? !!cotasDe(cart, chave) : cl !== 'renda_fixa') ? Number(f.cotas) : 0;
      if ((existe ? !!cotasDe(cart, chave) : cl !== 'renda_fixa') && !(n >= 1)) throw new Error('Informe quantas cotas.');
      const nm = existe ? existe.nome : nomeAtivo(chave);
      return [x => novoAporte(x, { ativo: chave, nome: nm, valor: v, dia, cotas: n, classe: cl }, hojeBrasil()), `Aporte: ${nm} ${brlTexto(v)}`];
    }
    const a = todos.find(x => x.chave === f.ativo);
    if (!a) throw new Error(tipo === 'dividendo' ? 'Escolha quem pagou.' : 'Escolha o investimento.');
    const pedeCotas = tipo !== 'dividendo' && !!cotasDe(cart, a.chave);
    const n = pedeCotas ? Number(f.cotas) : 0;
    if (pedeCotas && !(n >= 1)) throw new Error('Informe quantas cotas.');
    if (tipo === 'aporte') return [x => novoAporte(x, { ativo: a.chave, nome: a.nome, valor: v, dia, cotas: n }, hojeBrasil()), `Aporte: ${a.nome} ${brlTexto(v)}`];
    if (tipo === 'resgate') return [x => novoResgate(x, { ativo: a.chave, nome: a.nome, valor: v, dia, motivo: f.motivo, cotas: n, jaSaiu: jaSaiu() }, hojeBrasil()), `Resgate: ${a.nome} ${brlTexto(v)}`];
    return [x => novoDividendo(x, { ativo: a.chave, valor: v, data: f.data }, hojeBrasil()), `Dividendo ${a.nome}: ${brlTexto(v)}`];
  });
}

// "Atualizar valores": todos os investimentos numa tela, com o ganho/perda de cada um enquanto digita.
// Variação acima dos limites da carteira (limites_entrada) pede para conferir, sem bloquear.
export function abrirValores() {
  if (!estado.github || !estado.dados) return;
  const cart = estado.cart.dados;
  if (!cart) return aviso('Importe a carteira antes (menu → Importar arquivo do agente).', { erro: true, fixo: true });
  const hoje = hojeBrasil();
  try {
    mesAberto(structuredClone(cart), hoje);
  } catch (e) {
    return aviso(e.message, { erro: true, fixo: true });
  }
  const ativos = listaAtivos(cart);
  const lim = cart.limites_entrada || {};
  const limite = a => (a.classe === 'renda_fixa' ? lim.renda_fixa_pct : a.classe === 'fiis' || a.classe === 'etfs' || a.chave === 'gldi11' ? lim.cotas_pct : a.classe === 'cripto' ? lim.cripto_usd_pct : lim.fundos_pct) || 20;
  const pos = posicao(cart);
  const grupos = [...new Set(ativos.map(a => a.rotulo))];
  const folha = abrirFolha(`
    <h2>Atualizar valores</h2>
    <p class="meta">Digite o valor de hoje de cada investimento (app do Itaú). Última posição: ${esc(dataCurta(pos.data))}. O que você não mudar continua igual. Ganho ou perda fica na carteira — o caixa não muda. Os marcados como automáticos se atualizam sozinhos; se mudar um deles aqui, vale o seu valor até o banco mostrar um saldo mais novo.</p>
    <div class="binance-linha"><button type="button" class="link" id="vItau">${estado.pluggy ? 'Itaú pelo Open Finance: ligar e atualizar' : 'Ligar o Itaú pelo Open Finance (Pluggy)'}</button></div>
    ${ativos.some(a => a.chave === 'cripto') ? `<div class="binance-linha">${estado.binance ? '<button type="button" class="btn" id="vBinance">Puxar a cripto da Binance</button>' : '<button type="button" class="link" id="vBinanceLigar">Ligar a Binance: a cripto se atualiza sozinha, 1× por dia</button>'}</div>` : ''}
    <form id="formLanc" class="valores">
      ${grupos.map(g => `<h3 class="sub-titulo">${esc(g)}</h3>${ativos.filter(a => a.rotulo === g).map(a => `
        <div class="valor-linha">
          <label for="v-${esc(a.chave)}">${esc(a.nome)}<small>${brlTexto(a.valor)}<span class="auto-tag" data-auto="${esc(a.chave)}"></span></small></label>
          <input class="campo" id="v-${esc(a.chave)}" data-ativo="${esc(a.chave)}" inputmode="decimal" autocomplete="off" value="${esc(virgula(a.valor.toFixed(2)))}">
          <span class="valor-dif" id="d-${esc(a.chave)}"></span>
        </div>`).join('')}`).join('')}
      <div class="valores-total" id="vTotal"></div>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>`);
  const ler = () => Object.fromEntries([...folha.querySelectorAll('[data-ativo]')].map(i => [i.dataset.ativo, lerValor(i.value)]));
  folha.querySelector('#vBinanceLigar')?.addEventListener('click', () => abrirConfigBinance());
  folha.querySelector('#vItau')?.addEventListener('click', () => (estado.pluggy ? mostrarItau() : abrirConfigItau()));
  // automático × manual: mostra o que o banco atualiza sozinho (o valor digitado vale até o banco ter um saldo mais novo)
  const marcarAuto = (chave, de) => { const t = folha.querySelector(`[data-auto="${CSS.escape(chave)}"]`); if (t) t.textContent = ` · automático (${de})`; };
  if (estado.binance) marcarAuto('cripto', 'Binance');
  if (estado.pluggy) credenciaisItau().then(c => Object.values(c?.ligacoes || {}).filter(Boolean).forEach(k => marcarAuto(k, 'Itaú'))).catch(() => {});
  folha.querySelector('#vBinance')?.addEventListener('click', async e => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = 'Consultando a Binance…';
    try {
      const v = await saldoBinance();
      const campo = folha.querySelector('#v-cripto');
      campo.value = virgula(v.brl.toFixed(2)); campo.dispatchEvent(new Event('input', { bubbles: true }));
      b.textContent = `Binance: ${brlTexto(v.brl)} · toque em Salvar`;
    } catch (err) { b.disabled = false; b.textContent = 'Puxar a cripto da Binance'; aviso(`Binance: ${err.message}`, { erro: true }); }
  });
  const conta = () => {
    const vals = ler();
    let total = 0, n = 0;
    for (const a of ativos) {
      const el = folha.querySelector(`#d-${CSS.escape(a.chave)}`);
      const v = vals[a.chave];
      const dif = Number.isFinite(v) ? Math.round((v - a.valor) * 100) / 100 : NaN;
      el.className = 'valor-dif';
      if (!Number.isFinite(dif)) { el.textContent = 'confira'; el.classList.add('ruim'); continue; }
      if (Math.abs(dif) < 0.01) { el.textContent = ''; continue; }
      total += dif;
      n++;
      const pct = a.valor ? (dif / a.valor) * 100 : 100;
      el.textContent = `${dif > 0 ? '+' : '−'}${brlTexto(Math.abs(dif))}${Math.abs(pct) > limite(a) ? ` · ${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(0)}%, confira` : ''}`;
      el.classList.add(Math.abs(pct) > limite(a) ? 'atencao' : dif > 0 ? 'bom' : 'ruim');
    }
    folha.querySelector('#vTotal').innerHTML = n
      ? `<span>${n} ${n === 1 ? 'investimento mudou' : 'investimentos mudaram'}</span><b class="${total >= 0 ? 'bom' : 'ruim'}">${total >= 0 ? 'Ganho' : 'Perda'} ${brlTexto(Math.abs(Math.round(total * 100) / 100))}</b>`
      : '<span>Nenhum valor mudou ainda</span>';
    return { vals, total: Math.round(total * 100) / 100 };
  };
  folha.querySelector('#formLanc').addEventListener('input', conta);
  conta();
  ligarFormLanc(folha, () => {
    const { vals, total } = conta();
    const ruim = ativos.find(a => !Number.isFinite(vals[a.chave]));
    if (ruim) throw new Error(`Confira o valor de ${ruim.nome}.`);
    const ptax = estado.cot?.dados?.ptax?.agora || null;
    const alterar = (x, c) => {
      if (!c) throw new Error('Importe a carteira antes.');
      const r = atualizarValores(c, { valores: vals, ptax }, hojeBrasil());
      const cf = structuredClone(x);
      registrar(cf, hojeBrasil(), `Investimentos atualizados na carteira (não mexe no caixa): ${r.itens.map(i => `${i.nome} ${brlTexto(i.antes)} → ${brlTexto(i.depois)}`).join('; ')}. ${r.total >= 0 ? 'Ganho' : 'Perda'} de ${brlTexto(Math.abs(r.total))}.`);
      return { cf, cart: r.cart };
    };
    return [alterar, `Valores atualizados: ${total >= 0 ? '+' : '−'}${brlTexto(Math.abs(total))}`];
  });
}
