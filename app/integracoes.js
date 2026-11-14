// Integrações automáticas (saíram do app.js em 14/11/2026): conciliação caixa × carteira (v9.0), Binance (v9.3) e Itaú
// pelo Open Finance (v9.4/v9.9). Não importa do app.js: estado, aplicarLancamento e atualizarCotacoes chegam por
// configurarIntegracoes, chamado uma vez pelo app.js.
import { banco } from './banco.js';
import { abrirFolha, aviso, brlTexto, confirmar, dataCurta, esc, fecharFolha } from './ui.js';
import { acertarCategorias, assinatura, categorizar, conciliar, unificarCategorias } from './conciliar.js';
import { atualizarValores, listaAtivos, nomeAtivo } from './investimentos.js';
import { b64, cifrar, decifrar } from './cofre.js';
import { dataDoSaldo, esperandoBanco, lerItau, sugerirLigacao, valoresB3, valoresDoItau } from './pluggy.js';
import { hojeBrasil, registrar } from './lancamentos.js';
import { lerSaldoBinance } from './binance.js';
import { pedidoCotacoes, urlCotacoes } from './cotacoes.js';
import { posicao } from './carteira.js';

let estado, aplicarLancamento, atualizarCotacoes;
export function configurarIntegracoes(app) {
  ({ estado, aplicarLancamento, atualizarCotacoes } = app);
}

// ---------- v9.0: conciliação automática caixa × carteira (só no celular que publica) ----------
// Roda ao abrir e quando chega caixa ou carteira nova. Cada conjunto de mudanças é feito uma vez só (IDB 'conciliado'):
// se o Bruno desfizer, o app não insiste. Vira um lançamento comum (um envio, com Desfazer).
export async function conciliarAgora() {
  if (!estado.github || !estado.dados || !estado.cart.dados || estado.conciliando) return;
  const tudo = (cf, cart) => { const a = conciliar(cf, cart), b = categorizar(a.cf), u = unificarCategorias(b.cf), k = acertarCategorias(u.cf); return { cf: k.cf, mudancas: [...a.mudancas, ...b.mudancas, ...u.mudancas, ...k.mudancas] }; };
  const { mudancas } = tudo(estado.dados, estado.cart.dados);
  if (!mudancas.length) return;
  const ass = assinatura(estado.dados.periodo, mudancas);
  const feitas = (await banco.ler('conciliado').catch(() => null)) || [];
  if (feitas.some(f => f.ass === ass)) return;
  estado.conciliando = true;
  try {
    await banco.gravar('conciliado', [...feitas, { ass, em: new Date().toISOString(), textos: mudancas.map(m => m.texto) }].slice(-30));
    const div = mudancas.filter(m => m.tipo !== 'categoria').length, cats = mudancas.length - div;
    const rotulo = mudancas.length === 1 ? `${cats ? 'Categoria' : 'Conciliação'}: ${mudancas[0].texto}`
      : [div ? `${div} dividendos da carteira na agenda do caixa` : '', cats ? `${cats} categorias acertadas` : ''].filter(Boolean).join(' · ');
    await aplicarLancamento((cf, cart) => tudo(cf, cart || estado.cart.dados).cf, rotulo);
  } catch (e) {
    console.warn('conciliação', e);
  } finally {
    estado.conciliando = false;
  }
}

// ---------- v9.3: Binance (chave só de leitura; o celular assina, o Worker só repassa) ----------
// IDB 'binance' = a chave e o segredo cifrados com a chave da família (no modo digital, só abrem com a digital);
// 'binanceEm' = o dia da última atualização automática (1× por dia, ao abrir).
export async function credenciaisBinance() {
  const env = await banco.ler('binance').catch(() => null);
  return env && estado.cofre?.chave ? decifrar(env, estado.cofre.chave) : null;
}
export async function saldoBinance() {
  const cred = await credenciaisBinance();
  if (!cred) throw new Error('ligue a Binance antes (Atualizar valores → Ligar a Binance)');
  return lerSaldoBinance(cred, { agora: Date.now() });
}
export function abrirConfigBinance() {
  const folha = abrirFolha(`
    <h2>Ligar a Binance</h2>
    <p class="meta">Com isso, a cripto da carteira se atualiza sozinha uma vez por dia. A chave fica cifrada neste celular; o servidor do Lastro só repassa o pedido e a resposta, sem guardar nada.</p>
    <ol class="passos-curtos">
      <li>No app da Binance: Perfil → <b>Gerenciamento de API</b> → <b>Criar API</b> → "Gerada pelo sistema".</li>
      <li>Deixe marcado <b>só "Habilitar leitura"</b> (nada de negociar ou sacar).</li>
      <li>Copie a <b>API Key</b> e a <b>Secret Key</b> (a secret só aparece uma vez) e cole aqui.</li>
    </ol>
    <form id="formBin" autocomplete="off">
      <label for="binChave">API Key</label>
      <input class="campo mono" id="binChave" autocapitalize="off" spellcheck="false" required>
      <label for="binSegredo">Secret Key</label>
      <input class="campo mono" id="binSegredo" type="password" autocapitalize="off" spellcheck="false" required>
      <p class="erro" id="binErro"></p>
      <button class="btn prim" id="binOk">Testar e salvar</button>
      ${estado.binance ? '<button type="button" class="btn perigo" id="binTirar">Desligar a Binance</button>' : ''}
    </form>`);
  folha.querySelector('#formBin').onsubmit = async e => {
    e.preventDefault();
    const btn = folha.querySelector('#binOk');
    const cred = { chave: folha.querySelector('#binChave').value.trim(), segredo: folha.querySelector('#binSegredo').value.trim() };
    btn.disabled = true; btn.textContent = 'Testando…';
    try {
      const v = await lerSaldoBinance(cred, { agora: Date.now() });
      await banco.gravar('binance', await cifrar(cred, estado.cofre.chave, b64.para(estado.cofre.sal), estado.cofre.iteracoes));
      estado.binance = true;
      fecharFolha();
      aviso(`Binance ligada: ${brlTexto(v.brl)} em cripto (${Object.keys(v.moedas).map(m => m.toUpperCase()).join(', ')}). A carteira se atualiza sozinha 1× por dia.`, { tom: 'ok', duracao: 8000 });
      atualizarCriptoBinance({ forcar: true });
    } catch (err) {
      folha.querySelector('#binErro').textContent = `Não funcionou: ${err.message}.`;
      btn.disabled = false; btn.textContent = 'Testar e salvar';
    }
  };
  folha.querySelector('#binTirar')?.addEventListener('click', async () => {
    await banco.gravar('binance', null); estado.binance = false; fecharFolha(); aviso('Binance desligada neste celular.');
  });
}
// 1× por dia (ou na hora de ligar): o valor de Cripto da carteira = o saldo da Binance, com o detalhe em dólar por moeda
export const depoisDoAviso = mudou => mudou && new Promise(r => setTimeout(r, 6500)); // o aviso da Binance fica 6 s na tela
export async function atualizarCriptoBinance({ forcar = false } = {}) {
  if (!estado.github || !estado.binance || !estado.cart.dados || estado.binanceRodando) return;
  const hoje = hojeBrasil();
  if (!forcar && (await banco.ler('binanceEm').catch(() => null)) === hoje) return;
  estado.binanceRodando = true;
  try {
    const v = await saldoBinance();
    await banco.gravar('binanceEm', hoje);
    // aporte/resgate em cripto lançado hoje: o depósito pode ainda não ter caído na Binance → espera amanhã (o botão força)
    const espera = forcar ? {} : esperandoBanco(estado.dados, [{ id: 'b', data: hoje }], { b: 'cripto' }, null, salvosAMao(), { dias: 0 });
    if (espera.cripto) return false;
    const previa = atualizarValores(estado.cart.dados, { valores: { cripto: v.brl } }, hoje); // só para o texto do aviso
    await aplicarLancamento((cf, cart) => {
      const r = atualizarValores(cart, { valores: { cripto: v.brl } }, hoje);
      const h = r.cart.historico_mensal[posicao(r.cart).mes];
      manterDataOficial(cart, r.cart);
      h.cripto_detalhe_usd = { ...v.moedas, cotacao_usd_brl: Math.round(v.usdtbrl * 10000) / 10000 };
      return { cf: registrarVariacao(cf, 'Binance', r), cart: r.cart };
    }, `Binance: cripto ${variacaoTexto(previa)}`);
    return true;
  } catch (e) {
    if (!/Nenhum valor mudou/.test(e.message)) console.warn('Binance', e);
    return false;
  } finally {
    estado.binanceRodando = false;
  }
}

// ---------- v9.4 / v9.9: Itaú pelo Open Finance (Pluggy) ----------
// IDB 'pluggy' = {clientId, clientSecret, itemIds, ligacoes} cifrados com a chave da família; 'pluggyEm' = dia da última
// atualização automática (1× por dia, ao abrir, como a Binance). ligacoes: id do investimento na Pluggy → chave do ativo.
export async function credenciaisItau() {
  const env = await banco.ler('pluggy').catch(() => null);
  return env && estado.cofre?.chave ? decifrar(env, estado.cofre.chave) : null;
}
const guardarItau = async cred => banco.gravar('pluggy', await cifrar(cred, estado.cofre.chave, b64.para(estado.cofre.sal), estado.cofre.iteracoes));
export function abrirConfigItau(atual = null) {
  const folha = abrirFolha(`
    <h2>Ligar o Itaú</h2>
    <p class="meta">Pelo Open Finance, com a Pluggy. As chaves ficam cifradas neste celular; o servidor do Lastro só repassa o pedido, sem guardar nada. Os investimentos se atualizam sozinhos 1× por dia.</p>
    <ol class="passos-curtos">
      <li>No <b>dashboard.pluggy.ai</b>, na sua aplicação: copie o <b>CLIENT_ID</b> e o <b>CLIENT_SECRET</b>.</li>
      <li>Ainda no dashboard, abra a página <b>Demo</b>: na coluna da esquerda estão as conexões. Toque na do <b>Itaú</b> e copie o <b>itemId</b> (tem um botão de copiar no detalhe). É um código longo, tipo <span class="mono">a1b2c3d4-…</span>.</li>
    </ol>
    <form id="formItau" autocomplete="off">
      <label for="itId">CLIENT_ID</label>
      <input class="campo mono" id="itId" autocapitalize="off" spellcheck="false" required value="${esc(atual?.clientId || '')}">
      <label for="itSegredo">CLIENT_SECRET</label>
      <input class="campo mono" id="itSegredo" type="password" autocapitalize="off" spellcheck="false" required value="${esc(atual?.clientSecret || '')}">
      <label for="itItem">Item ID da conexão do Itaú</label>
      <input class="campo mono" id="itItem" autocapitalize="off" spellcheck="false" required placeholder="vários? separe com vírgula" value="${esc((atual?.itemIds || []).join(', '))}">
      <p class="erro" id="itErro"></p>
      <button class="btn prim" id="itOk">Testar e salvar</button>
      ${estado.pluggy ? '<button type="button" class="btn perigo" id="itTirar">Desligar o Itaú</button>' : ''}
    </form>`);
  folha.querySelector('#formItau').onsubmit = async e => {
    e.preventDefault();
    const btn = folha.querySelector('#itOk');
    const cred = { clientId: folha.querySelector('#itId').value.trim(), clientSecret: folha.querySelector('#itSegredo').value.trim(), itemIds: folha.querySelector('#itItem').value.split(/[\s,]+/).filter(Boolean), ligacoes: atual?.ligacoes || {} };
    btn.disabled = true; btn.textContent = 'Testando…';
    try {
      const r = await lerItau(cred);
      await guardarItau(cred);
      estado.pluggy = true;
      mostrarItau(r, cred);
    } catch (err) {
      folha.querySelector('#itErro').textContent = `Não funcionou: ${err.message}.`;
      btn.disabled = false; btn.textContent = 'Testar e salvar';
    }
  };
  folha.querySelector('#itTirar')?.addEventListener('click', async () => {
    if (!await confirmar({ titulo: 'Desligar o Itaú?', texto: 'As chaves e as ligações saem deste celular. Os valores já gravados na carteira ficam.', sim: 'Desligar', perigo: true, manter: true })) return abrirConfigItau(atual);
    await banco.gravar('pluggy', null); estado.pluggy = false; fecharFolha(); aviso('Itaú desligado neste celular.');
  });
}
// O que a Pluggy enxerga e, para cada investimento, a qual ativo da carteira ele corresponde
export async function mostrarItau(r, cred) {
  if (!r) {
    const folha = abrirFolha('<h2>Itaú pelo Open Finance</h2><p class="meta">Consultando a Pluggy…</p>');
    try { cred = await credenciaisItau(); r = await lerItau(cred); } catch (e) { folha.querySelector('.meta').textContent = `Não funcionou: ${e.message}.`; return; }
  }
  const ativos = estado.cart.dados ? listaAtivos(estado.cart.dados) : [];
  const lig = { ...(cred?.ligacoes || {}) };
  for (const i of r.investimentos) if (!(i.id in lig)) lig[i.id] = sugerirLigacao(i.nome, ativos) || '';
  const conexao = r.conexoes?.[0];
  const quando = conexao?.atualizadoEm ? `Dados do banco de ${dataCurta(conexao.atualizadoEm.slice(0, 10))}` : '';
  const sandbox = r.conexoes?.some(c => c.sandbox);
  // v9.9.10: o líquido (já sem o IR) é o que vai para a carteira; o bruto fica miúdo, com o nome de cada um
  const valor = i => `${brlTexto(i.liquido)}${i.bruto != null && Math.abs(i.bruto - i.liquido) >= 0.01 ? ` <small>líquido · bruto ${esc(brlTexto(i.bruto))}</small>` : ''}`;
  const opcoes = sel => `<option value="">Não ligar</option>${ativos.map(a => `<option value="${esc(a.chave)}"${a.chave === sel ? ' selected' : ''}>${esc(a.nome)} · ${esc(brlTexto(a.valor))}</option>`).join('')}`;
  const folha = abrirFolha(`
    <h2>Itaú pelo Open Finance</h2>
    ${sandbox ? '<p class="erro">Esta conexão é o banco de teste da Pluggy, não o Itaú de verdade. Use o Item ID da conexão real.</p>' : ''}
    <p class="meta">${quando ? `${esc(quando)}. ` : ''}Escolha a qual investimento da carteira cada um corresponde. O app usa o valor líquido (o mesmo do app do Itaú, já sem o IR), como a carteira guarda.</p>
    <h3 class="sub-titulo">Investimentos</h3>
    ${r.investimentos.length ? `<div class="itau-ligar">${r.investimentos.map(i => `
      <div class="itau-inv">
        <div class="itau-nome"><span>${esc(i.nome)}</span><b>${valor(i)}</b></div>
        ${ativos.length ? `<select class="campo" data-inv="${esc(i.id)}" aria-label="Ativo da carteira para ${esc(i.nome)}">${opcoes(lig[i.id])}</select>` : ''}
      </div>`).join('')}</div>` : '<p class="meta">A Pluggy não trouxe investimentos desta conexão.</p>'}
    ${ativos.length && r.investimentos.length ? '<button type="button" class="btn prim" id="itSalvar">Salvar e atualizar a carteira</button>' : ''}
    <details class="dobra"><summary>Contas e cartões</summary><ul class="linhas">${r.contas.map(c => `<li><span>${esc(c.nome)}<small>${c.tipo === 'cartao' ? 'cartão' : 'conta'}</small></span><b>${esc(brlTexto(c.saldo))}</b></li>`).join('') || '<li><span>Nenhuma</span></li>'}</ul></details>
    <button type="button" class="link" id="itConfig">Trocar as chaves</button>`);
  folha.querySelector('#itConfig').onclick = () => abrirConfigItau(cred);
  folha.querySelector('#itSalvar')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    folha.querySelectorAll('[data-inv]').forEach(s => { lig[s.dataset.inv] = s.value; });
    btn.disabled = true; btn.textContent = 'Atualizando…';
    await guardarItau({ ...cred, ligacoes: lig });
    fecharFolha();
    const n = await atualizarItau({ forcar: true, r });
    if (n === 0) aviso('Ligações salvas. Os valores da carteira já estavam iguais aos do Itaú.', { tom: 'ok' });
  });
}
// Automático × manual: o que foi feito à mão (aporte, resgate, valor digitado) não é atropelado por saldo velho do banco
const MOTIVO_ESPERA = { aporte: 'o banco ainda não mostra o aporte lançado', resgate: 'o banco ainda não mostra o resgate lançado', manual: 'você atualizou à mão depois do último saldo do banco' };
// A automática não move a data da posição oficial (h.atualizado_em): ela é a base da estimativa "Hoje" dos outros ativos
const manterDataOficial = (antes, depois) => { const a = posicao(antes), d = posicao(depois); if (a.mes === d.mes && a.h?.atualizado_em) d.h.atualizado_em = a.h.atualizado_em; };
const salvosAMao = () => { try { return posicao(estado.cart.dados).h?.ativos_atualizado_em || {}; } catch { return {}; } };
// Subiu/caiu de uma atualização (resultado de atualizarValores): "subiu R$ 12,30 (+0,4%)"
function variacaoTexto(r) {
  const antes = r.itens.reduce((s, i) => s + i.antes, 0);
  const pct = antes > 0 ? ` (${r.total >= 0 ? '+' : '−'}${Math.abs((r.total / antes) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%)` : '';
  return `${r.total >= 0 ? 'subiu' : 'caiu'} ${brlTexto(Math.abs(r.total))}${pct}`;
}
// Igual ao manual: o detalhe de cada ativo fica no histórico (e no aviso do Rafael)
function registrarVariacao(cf, origem, r) {
  const c = structuredClone(cf);
  registrar(c, hojeBrasil(), `${origem} atualizou a carteira (não mexe no caixa): ${r.itens.map(i => `${i.nome} ${brlTexto(i.antes)} → ${brlTexto(i.depois)}`).join('; ')}. ${r.total >= 0 ? 'Ganho' : 'Perda'} de ${brlTexto(Math.abs(r.total))}.`);
  return c;
}
// 1× por dia ao abrir (ou na hora, ao salvar as ligações): valores dos investimentos ligados → carteira
export async function atualizarItau({ forcar = false, r = null } = {}) {
  if (!estado.github || !estado.pluggy || !estado.cart.dados || estado.itauRodando) return null;
  const hoje = hojeBrasil();
  if (!forcar && (await banco.ler('pluggyEm').catch(() => null)) === hoje) return null;
  estado.itauRodando = true;
  try {
    const cred = await credenciaisItau();
    if (!cred || !Object.values(cred.ligacoes || {}).some(Boolean)) return null;
    r ||= await lerItau(cred);
    const ativos = new Set(listaAtivos(estado.cart.dados).map(a => a.chave));
    // automático × manual: ativo com aporte/resgate ou valor digitado mais novo que o saldo do banco espera o próximo dia
    const conexaoEm = r.conexoes?.[0]?.atualizadoEm;
    const espera = esperandoBanco(estado.dados, r.investimentos, cred.ligacoes, conexaoEm, salvosAMao(), { feriados: estado.dados?.feriados?.datas || {} });
    // v9.12.3: B3 (FIIs, ETFs, GLDI11) = cotas × preço da B3; do Itaú, só o que não é da B3 (fundos, renda fixa)
    await atualizarCotacoes();
    const cot = estado.cot?.url === urlCotacoes(pedidoCotacoes(estado.cart.dados)) ? estado.cot.dados : null;
    const b3 = valoresB3(estado.cart.dados, cot?.b3, hoje);
    const daB3 = new Set(Object.keys(estado.cart.dados.custo_medio?.ativos || {}));
    for (const k of daB3) delete espera[k];
    const datas = { ...dataDoSaldo(r.investimentos, cred.ligacoes, conexaoEm), ...b3.datas };
    const valores = Object.fromEntries(Object.entries({ ...valoresDoItau(r.investimentos, cred.ligacoes), ...b3.valores })
      .filter(([k]) => ativos.has(k) && !(k in espera) && (!daB3.has(k) || k in b3.valores)));
    await banco.gravar('pluggyEm', hoje);
    const nota = Object.keys(espera).length ? ` · fica para depois: ${Object.entries(espera).map(([k, t]) => `${nomeAtivo(k)} (${MOTIVO_ESPERA[t]})`).join(', ')}` : '';
    if (!Object.keys(valores).length) {
      if (nota && forcar) aviso(`Itaú: nada para atualizar agora${nota}.`);
      return 0;
    }
    const previa = atualizarValores(estado.cart.dados, { valores }, hoje); // só para o texto do aviso
    let n = 0;
    await aplicarLancamento((cf, cart) => {
      const x = atualizarValores(cart, { valores }, hoje);
      const h = x.cart.historico_mensal[posicao(x.cart).mes];
      manterDataOficial(cart, x.cart);
      for (const i of x.itens) if (datas[i.chave]) h.ativos_atualizado_em[i.chave] = datas[i.chave]; // data do saldo, não hoje
      n = x.itens.length;
      return { cf: registrarVariacao(cf, 'Itaú', x), cart: x.cart };
    }, `Itaú: ${previa.itens.length === 1 ? `${previa.itens[0].nome} ` : ''}${variacaoTexto(previa)}${nota}`);
    return n;
  } catch (e) {
    if (/Nenhum valor mudou/.test(e.message)) return 0;
    console.warn('Itaú', e);
    if (forcar) aviso(`Itaú: não deu para atualizar — ${e.message}.`, { erro: true });
    return null;
  } finally {
    estado.itauRodando = false;
  }
}
