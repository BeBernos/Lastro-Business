import { b64, cifrar, decifrar, derivarBruta, gerarSenha, importarChave, novoSal, ITERACOES } from './cofre.js';
import { banco } from './banco.js';
import { aplicarDados, extrairDados, lerArquivo, mesBonito, resumo } from './painel.js';
import { aplicarCarteira, ehCarteira, ehDadosCarteira, extrairCarteira, lerArquivoCarteira, posicao, resumoCarteira } from './carteira.js';
import { contexto, lerMotor, proximasContas } from './resumo.js';
import { ABAS, CARTOES_INICIO, htmlAba, htmlNav, htmlSubabas, htmlTopo, mesesDoSeletor, ordemInicio, resumoSemanaHtml, seletorMes, SUBABAS, subPadrao, telaDoMes, variacaoAtivos } from './telas.js';
import { extratoDoMes, filtrarExtrato, TIPOS } from './extrato.js';
import { gerarXlsx, TIPO_XLSX } from './xlsx.js';
import { agendaClaude, aportePlanejado, definirOrcamentos, excluirMeta, pacoteIR, registrarAssinaturas, revisarAssinaturas, salvarMeta, sugestaoOrcamento } from './indicadores.js';
import { icTom, ligarDicas } from './graficos.js';
import { juntarParcial, lerParcial } from './conciliar.js';
import { alertasPlano, rendimentoRendaFixa, textoEstrategia, textoPesquisa } from './estrategia.js';
import { creditoResgate, linhasFicha, prazoResgate, textoFichas } from './liquidez.js';
import { cdiAnualDe, simularTroca } from './rendafixa.js';
import { traduzirFragmento } from './traduzir.js';
import { estimar, pedidoCotacoes, urlCotacoes } from './cotacoes.js';
import { editarMesFechado, excluirEntradaFutura, excluirExterno, acertarComBanco, acharItem, alternarPago, caixaHoje, comprasApp, excluirCompra, categoriasCartao, categoriasConta, editarAssinatura, editarCompraFatura, editarParcelamento, excluirCompraFatura, excluirParcelamento, excluirCategoria, hojeBrasil, historicoApp, lancarCartao, LISTAS_CAIXA, lancarPix, lerValor, marcarPago, parcelasItau, pareceLancado, removerAssinatura, salvarCategoria, sinalDe, validar } from './lancamentos.js';
import { copiarPatrimonio, listaAtivos, sincronizar } from './investimentos.js';
import { chaveLoja, lerSms, marcaSms, separarSms } from './sms.js';
import { acharCategoria, adivinharCategoria, categoriasAtivas, CORES, definirCategorias, GRUPOS, ICONES as ICONES_CAT, iconeCategoria, iconeDe, listaDoPainel, nomeCategoria, norm } from './categorias.js';
import { digitalDisponivel } from './trava.js';
import { abrirComDigital, abrirComSenha, criarProtecao, protegido, regravarProtecao } from './protecao.js';
import { ligarEscolhas } from './escolha.js';
import { DEMO } from './modo.js';
import { NOME_CAMPO } from './parcial.js';
import { alternarPausa, derivarTarget, gatilhos, mudancasEstrategia, textoItem } from './ficha.js';
import { NOVIDADES } from './novidades.js';
import { htmlNavV10, htmlTopoCarvao, ligarV10, numerosDoTopo, v10Ligada } from './v10.js';
import { $, esc, brlTexto, dataCurta, dataHora, icone, aviso, mascarar, fecharAvisoCarregando, valoresEscondidos, trocarEsconder, confirmar, ALCANCES_EDITAR, escolherAlcance, abrirFolha, fecharFolha, configurarFolha } from './ui.js';
import { enviarArquivo, exportarPlanilhaFatura, enviarArquivos, conectorLigado, pedidoPeloConector, mesSeguinte, etapaAberta, marcarEtapa, abrirLevarClaude, svgCadeado, abrirLancamentos, configurarClaude } from './claude.js';
import { abrirDiscar, abasLancar, ligarAbasLancar, botaoCategoria, abrirConta, mesCurto, abrirValorFuturo, abrirNovaConta, abrirInvestir, abrirValores, configurarLancar } from './lancar.js';
import { conciliarAgora, depoisDoAviso, atualizarCriptoBinance, atualizarItau, configurarIntegracoes } from './integracoes.js';
import { animarNumeros, ESQUELETO, lerChaveV8, ligarArrastarFolha, ligarDeslizar, ligarPuxar, comTransicao } from './v8.js';

const VERSAO_APP = '9.20.0';
lerChaveV8(); // v8: interface nova (Brasa) antes do primeiro desenho, sem piscar
document.documentElement.classList.toggle('v10', v10Ligada()); // v9.18: a repaginação (Carvão), atrás da chave em Configurações
const REMOTO = 'data/painel.enc';
const REMOTO_CARTEIRA = 'data/carteira.enc';
const GITHUB_PADRAO = { repo: 'usuario/repositorio', branch: 'main', caminho: 'app/data/painel.enc' };


const estado = {
  cofre: null, // chave da família e segredos, só na memória e só destrancado (protecao.js)
  salvo: null, // o que está guardado no aparelho para destrancar (protecao.js)
  envelope: null,
  origem: null,
  conteudo: null, // { html, arquivo?, importadoEm? } decifrado, só em memória
  remoto: undefined, // último envelope visto no servidor (null = nada publicado)
  instalar: null,
  resumoOk: false, // as telas do app conseguiram ler os números do painel atual
  aba: 'inicio', // aba aberta no app: inicio | mes (Caixa) | cartao | carteira | analises
  sub: {}, // sub-aba aberta em cada aba (telas.js → SUBABAS)
  abertos: new Set(), // dobras (details) abertas — continuam abertas quando a tela é redesenhada
  frame: null, // iframe do painel (o motor)
  motor: null, // números e textos lidos do painel (resumo.js)
  dados: null, // JSON do painel
  vista: 'resumo', // 'resumo' | 'painel' — o que está na tela agora ('painel' só no Avançado ou se o app não ler o painel)
  inicio: 'resumo', // tela base: sempre o app
  github: false, // este aparelho publica (tem token)
  lembretes: false,
  avisos: false, // recebe push quando sai painel novo
  travado: false, // tela de bloqueio na frente; os dados foram apagados da memória
  digital: false, // o aparelho tem digital/rosto/PIN para o bloqueio
  recarregouPainel: false, // já tentou recarregar o painel depois de uma falha
  diagnostico: null, // último problema ao desenhar o painel (menu → Avançado)
  // painel da carteira (opcional): mesmo esquema do cashflow, num iframe e num arquivo cifrado próprios
  cart: { envelope: null, origem: null, conteudo: null, frame: null, dados: null, pendente: false },
  cot: undefined, // últimas cotações { em, url, dados } (só preços públicos; undefined = ainda não lidas do aparelho)
};
const VALIDADE_COTACOES = 15 * 60 * 1000;
configurarIntegracoes({ estado, aplicarLancamento: (...a) => aplicarLancamento(...a), atualizarCotacoes: (...a) => atualizarCotacoes(...a) });
configurarFolha({ historico: () => ({ vista: estado.vista, aba: estado.aba }), menu: { html: () => menuHtml(), ligar: f => ligarMenu(f) } });

// v8.7: o olho (esconder os valores) — o estado mora no ui.js; aqui só redesenha
function alternarOlho() {
  trocarEsconder();
  if (estado.resumoOk) renderizarApp(estado.aba, { remendo: true });
}

// ---------- telas de entrada ----------
function tela(html) {
  fecharFolha();
  $('moldura').hidden = true;
  $('resumo').hidden = true;
  const t = $('tela');
  t.hidden = false;
  t.innerHTML = `<div class="entrada"><img class="marca" src="icons/logo.svg" alt="">${html}</div>`;
  return t;
}

function telaCarregando() {
  $('tela').hidden = false;
  $('tela').innerHTML = '<div class="girando" role="status" aria-label="Carregando"></div>';
}

function botaoInstalar() {
  return estado.instalar ? `<button type="button" class="link" id="instalar">Instalar o app na tela inicial</button>` : '';
}
function ligarInstalar(raiz) {
  raiz.querySelector('#instalar')?.addEventListener('click', instalarApp);
}

function telaBoasVindas() {
  const t = tela(`
    <p class="olho">Controle financeiro</p>
    <h1>O patrimônio da família no celular</h1>
    <p class="texto">Ainda não há painel publicado. Para começar, importe o arquivo que o <b>Agente Financeiro</b> gerou no Claude.</p>
    <ol class="passos">
      <li>No Claude, baixe o <b>painel_cashflow_….html</b> (ou o <b>cashflow_dados_….json</b>).</li>
      <li>Toque em <b>Importar painel</b> e escolha o arquivo.</li>
      <li>Crie a senha da família — ela protege os dados.</li>
    </ol>
    <button type="button" class="btn prim" id="importar">Importar painel</button>
    ${botaoInstalar()}`);
  t.querySelector('#importar').onclick = escolherArquivo;
  ligarInstalar(t);
}

function telaSemConexao() {
  const t = tela(`
    <p class="olho">Sem conexão</p>
    <h1>Não consegui buscar o painel</h1>
    <p class="texto">Na primeira vez o app precisa de internet para baixar o painel publicado. Depois disso ele funciona offline.</p>
    <button type="button" class="btn prim" id="tentar">Tentar de novo</button>
    <button type="button" class="link" id="importar">Importar um arquivo em vez disso</button>`);
  t.querySelector('#tentar').onclick = () => { telaCarregando(); buscarAtualizacao(); };
  t.querySelector('#importar').onclick = escolherArquivo;
}

// Campo de usuário fixo e invisível: faz o Gerenciador de Senhas do Google
// salvar e preencher a senha como "familia" neste site.
const USUARIO_SENHA = '<input type="text" name="username" autocomplete="username" value="familia" readonly hidden>';

// Pede a senha de um painel já publicado. Se houver um arquivo importado esperando, salva ele depois.
function telaEntrar(envelope, pendente = null) {
  const t = tela(`
    <p class="olho">Lastro · família</p>
    <h1>Digite a senha da família</h1>
    <p class="texto">É a mesma senha usada no outro celular. Você só precisa digitá-la uma vez neste aparelho. Se ela estiver salva no Google, o teclado sugere sozinho.</p>
    <form id="form">
      ${USUARIO_SENHA}
      <label for="senha">Senha</label>
      <input class="campo mono" id="senha" name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required>
      <p class="erro" id="erro"></p>
      <button class="btn prim" id="entrar">Abrir painel</button>
    </form>
    ${pendente ? '' : '<button type="button" class="link" id="importar">Importar um arquivo em vez disso</button>'}
    ${botaoInstalar()}`);
  t.querySelector('#importar')?.addEventListener('click', escolherArquivo);
  ligarInstalar(t);
  t.querySelector('#form').onsubmit = async e => {
    e.preventDefault();
    const btn = t.querySelector('#entrar');
    btn.disabled = true;
    btn.textContent = 'Abrindo…';
    t.querySelector('#erro').textContent = '';
    const senha = t.querySelector('#senha').value;
    let cofre, conteudo;
    try {
      cofre = await abrirComSenha(senha, envelope.kdf.sal, envelope.kdf.iteracoes, [envelope]);
      conteudo = await decifrar(envelope, cofre.chave);
    } catch {
      t.querySelector('#erro').textContent = 'Senha incorreta. Confira e tente de novo.';
      btn.disabled = false;
      btn.textContent = 'Abrir painel';
      return;
    }
    salvarNoGoogle(senha);
    await salvarCofre(cofre); // no aparelho novo, passa pela tela "Proteja o Lastro"
    if (pendente) {
      await guardarLocal(pendente);
      avisoImportado();
    } else {
      await salvarEnvelope(envelope, 'remoto');
      mostrarPainel(conteudo);
    }
  };
}

// Campos "senha + repetir + gerar", usados na criação e na troca da senha da família.
function camposNovaSenha(rotuloBotao) {
  return `
    ${USUARIO_SENHA}
    <label for="senha">Senha (mínimo 12 caracteres)</label>
    <input class="campo mono" id="senha" name="password" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" required>
    <label for="senha2">Repita a senha</label>
    <input class="campo mono" id="senha2" type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" required>
    <p class="erro" id="erro"></p>
    <button class="btn prim" id="salvarSenha">${rotuloBotao}</button>
    <button type="button" class="btn" id="gerar">Gerar uma senha forte para mim</button>`;
}

// Liga os campos acima. aoSalvar(senha, sal, chave) roda depois da senha validada e da chave derivada.
function ligarNovaSenha(raiz, aoSalvar) {
  const s1 = raiz.querySelector('#senha');
  const s2 = raiz.querySelector('#senha2');
  const erro = raiz.querySelector('#erro');
  const btn = raiz.querySelector('#salvarSenha');
  raiz.querySelector('#gerar').onclick = () => {
    s1.value = s2.value = gerarSenha();
    s1.type = s2.type = 'text';
    erro.textContent = 'Depois de salvar, ela fica guardada em "Senha da família", no menu.';
    erro.style.color = 'var(--accent)';
  };
  raiz.querySelector('#form').onsubmit = async e => {
    e.preventDefault();
    erro.style.color = '';
    if (s1.value.length < 12) return (erro.textContent = 'Use pelo menos 12 caracteres.');
    if (s1.value !== s2.value) return (erro.textContent = 'As duas senhas não são iguais.');
    btn.disabled = true;
    btn.textContent = 'Protegendo…';
    const sal = novoSal();
    const bruta = await derivarBruta(s1.value, sal);
    salvarNoGoogle(s1.value);
    try {
      await salvarCofre({ chave: await importarChave(bruta), bruta, sal: b64.de(sal), iteracoes: ITERACOES, senha: s1.value });
    } catch {
      erro.textContent = 'A digital foi cancelada — a senha não foi trocada.';
      btn.disabled = false;
      btn.textContent = 'Tentar de novo';
      return;
    }
    await aoSalvar();
  };
}

// Primeiro uso, sem nada publicado: cria a senha da família.
function telaCriarSenha(pendente) {
  const r = resumo(pendente.html);
  const t = tela(`
    <p class="olho">${esc(r.periodoLabel)} · dados de ${esc(dataCurta(r.ultimaAtualizacao))}</p>
    <h1>Crie a senha da família</h1>
    <p class="texto">Ela embaralha os dados antes de saírem do aparelho. Sua esposa vai digitá-la <b>uma única vez</b> no celular dela. Você pode consultá-la depois no menu do app, em <b>Senha da família</b>.</p>
    <form id="form">${camposNovaSenha('Salvar e abrir o painel')}</form>`);
  ligarNovaSenha(t, async () => {
    await guardarLocal(pendente);
    avisoImportado();
  });
}

// Oferece salvar no Gerenciador de Senhas do Google (Chrome no Android).
// Dali dá para compartilhar com a família pelo próprio Google.
async function salvarNoGoogle(senha) {
  if (!('PasswordCredential' in window)) return false;
  try {
    await navigator.credentials.store(new PasswordCredential({ id: 'familia', password: senha, name: 'Senha da família' }));
    return true;
  } catch {
    return false;
  }
}

// ---------- senha da família (consultar / compartilhar / trocar) ----------
function abrirSenhaFamilia() {
  const senha = estado.cofre?.senha;
  const folha = abrirFolha(senha ? `
    <h2>Senha da família</h2>
    <p class="meta">É a senha que abre o painel em outro celular. Guarde-a no Gerenciador de Senhas do Google — de lá dá para compartilhar com sua esposa pelo grupo familiar.</p>
    <input class="campo mono" id="senhaVer" type="password" value="${esc(senha)}" readonly aria-label="Senha da família">
    <button type="button" class="btn" id="mostrar">Mostrar</button>
    <button type="button" class="btn" id="copiar">Copiar</button>
    ${'PasswordCredential' in window ? '<button type="button" class="btn" id="google">Salvar no Gerenciador de Senhas do Google</button>' : ''}
    ${navigator.share ? '<button type="button" class="btn" id="enviar">Enviar para minha esposa</button>' : ''}
    <button type="button" class="link" id="trocar">Trocar a senha da família</button>` : `
    <h2>Senha da família</h2>
    <p class="meta">Este aparelho foi configurado antes deste recurso existir: ele guarda só a chave que abre o painel, não a senha em si.<br><br>
    Se você não anotou a senha, crie uma nova agora. O painel continua aqui normalmente; ao publicar, o outro celular vai pedir a senha nova uma vez.</p>
    <button type="button" class="btn prim" id="trocar">Criar uma nova senha da família</button>`);
  const campo = folha.querySelector('#senhaVer');
  folha.querySelector('#mostrar')?.addEventListener('click', e => {
    const ver = campo.type === 'password';
    campo.type = ver ? 'text' : 'password';
    e.target.textContent = ver ? 'Esconder' : 'Mostrar';
  });
  folha.querySelector('#copiar')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(senha);
      aviso('Senha copiada.');
    } catch {
      campo.type = 'text';
      campo.select();
    }
  });
  folha.querySelector('#google')?.addEventListener('click', async () => {
    if (!(await salvarNoGoogle(senha))) aviso('O Chrome não ofereceu salvar. Use "Copiar" e guarde no gerenciador de senhas.', { duracao: 7000 });
  });
  folha.querySelector('#enviar')?.addEventListener('click', () => {
    navigator.share({ text: `Senha do app Finanças (painel da família): ${senha}` }).catch(() => {});
  });
  folha.querySelector('#trocar').onclick = abrirTrocarSenha;
}

function abrirTrocarSenha() {
  if (!estado.conteudo) return aviso('Abra um painel antes de trocar a senha.');
  const folha = abrirFolha(`
    <h2>Nova senha da família</h2>
    <p class="meta">O painel deste aparelho passa a usar a senha nova. Depois toque em <b>Publicar</b>: no outro celular o app vai pedir a senha nova uma vez.</p>
    <form id="form">${camposNovaSenha('Trocar senha')}</form>`);
  ligarNovaSenha(folha, async () => {
    await guardarLocal(estado.conteudo);
    if (estado.cart.conteudo) await guardarCarteira(estado.cart.conteudo);
    aviso('Senha trocada neste aparelho. Publique para valer também no outro celular.', { acao: { rotulo: 'Publicar', fn: publicar }, duracao: 10000 });
  });
}

// ---------- painel ----------
// Roda antes de qualquer script do painel:
// - registra erros desde a primeira linha, para o diagnóstico e a recuperação;
// - abre sempre em português. O painel quebra ao iniciar com "EN" salvo (a projeção de
//   12 meses traduz antes de o dicionário existir) e, desde a v3, o app mostra os textos
//   do painel nas próprias telas, que não têm troca de idioma.
const SONDA = '<script>window.__errosPainel=[];'
  + 'try{if(localStorage.getItem("cf-lang")==="en")localStorage.setItem("cf-lang","pt");}catch(e){}'
  + 'addEventListener("error",function(e){__errosPainel.push((e.message||"erro")+" (linha "+(e.lineno||"?")+")")});'
  + 'addEventListener("unhandledrejection",function(e){__errosPainel.push("promise: "+((e.reason&&e.reason.message)||e.reason))});'
  + '<\/script>';
const comSonda = html => (/<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + SONDA) : SONDA + html);

// Categorias editadas (v6.3) ficam no painel (categoriasApp); a cópia no aparelho cobre um painel novo do agente
// que venha sem elas: o app continua mostrando a lista do Bruno e a devolve ao painel no próximo lançamento.
function sincronizarCategorias() {
  const doPainel = listaDoPainel(estado.dados);
  if (doPainel) {
    estado.categoriasCopia = doPainel;
    banco.gravar('categoriasApp', doPainel).catch(() => {});
  }
  definirCategorias(doPainel || estado.categoriasCopia);
}

// Resolve quando as telas do app terminam de ler o painel atual (montarResumo)
let painelProntoOk = null;
let painelPronto = Promise.resolve();
const esperarPainel = () => Promise.race([painelPronto, new Promise(r => setTimeout(r, 15000))]);

// suave: depois de um lançamento — a tela atual fica (sem "carregando") e é redesenhada no lugar, na mesma rolagem
function mostrarPainel(conteudo, { recarga = false, suave = false } = {}) {
  estado.conteudo = conteudo;
  if (!painelProntoOk) painelPronto = new Promise(r => { painelProntoOk = r; });
  if (!recarga) estado.recarregouPainel = false;
  // Com a tela de bloqueio na frente (ou o app em segundo plano), o Android pausa a página.
  // Desenhar o painel nesse momento já deixou gráficos e listas em branco no celular,
  // então ele só começa a carregar depois do desbloqueio, com o app visível.
  if (estado.travado || document.hidden) {
    estado.painelPendente = true;
    return;
  }
  estado.painelPendente = false;
  fecharFolha();
  $('tela').hidden = true;
  const moldura = $('moldura');
  moldura.hidden = false;
  // as telas do app cobrem o painel enquanto ele carrega por baixo
  estado.vista = estado.inicio;
  const r = $('resumo');
  estado.suave = suave && estado.resumoOk && !r.hidden && !!r.querySelector('.app-conteudo');
  if (!estado.suave) r.innerHTML = ESQUELETO;
  r.hidden = estado.inicio !== 'resumo';
  // um iframe novo a cada versão: trocar o srcdoc do mesmo iframe empilharia
  // entradas no histórico e o botão "voltar" do Android passaria a navegar nelas
  const frame = document.createElement('iframe');
  frame.title = 'Painel financeiro';
  frame.addEventListener('load', () => prepararPainel(frame), { once: true });
  frame.srcdoc = comSonda(conteudo.html);
  moldura.replaceChildren(frame);
}

// Painel desenhado pela metade (erro no script ou blocos vazios): recarrega uma vez;
// se falhar de novo, avisa e guarda o diagnóstico para o menu.
function painelComProblema(frame) {
  const w = frame.contentWindow;
  const doc = frame.contentDocument;
  const erros = (w && w.__errosPainel) || [];
  const kpis = doc && doc.getElementById('kpis');
  const vazio = !!kpis && kpis.children.length === 0;
  if (!erros.length && !vazio) return false;
  estado.diagnostico = {
    quando: new Date().toLocaleString('pt-BR'),
    erros: erros.length ? erros : ['blocos do painel vazios, sem erro registrado'],
    tentativa: estado.recarregouPainel ? 2 : 1,
    tela: `${w?.innerWidth}x${w?.innerHeight}`,
    visivel: document.visibilityState,
    app: VERSAO_APP,
    navegador: navigator.userAgent,
  };
  if (!estado.recarregouPainel) {
    estado.recarregouPainel = true;
    setTimeout(() => mostrarPainel(estado.conteudo, { recarga: true }), 300);
  } else {
    aviso('O painel não carregou por completo.', { acao: { rotulo: 'Ver detalhes', fn: abrirDiagnostico }, erro: true, fixo: true });
  }
  return true;
}

// v9.6: fluidez — tempos de abertura e travadas (tarefas de mais de 50 ms) desde que o app abriu; "Medir a fluidez"
// rola a tela de verdade por 4 s e conta os quadros (60 por segundo = liso; quadro acima de 33 ms = engasgo visível).
const medidas = { longas: 0, piorLonga: 0 };
try {
  new PerformanceObserver(l => { for (const e of l.getEntries()) { medidas.longas++; medidas.piorLonga = Math.max(medidas.piorLonga, Math.round(e.duration)); } }).observe({ type: 'longtask', buffered: true });
} catch { /* navegador sem longtask */ }
function medirFluidez(ms = 4000) {
  const el = $('resumo');
  return new Promise(fim => {
    const quadros = [];
    let antes = performance.now(), dir = 1;
    const t0 = antes;
    const passo = agora => {
      quadros.push(agora - antes);
      antes = agora;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) dir = -1;
      else if (el.scrollTop <= 0) dir = 1;
      el.scrollTop += 14 * dir;
      if (agora - t0 < ms) return requestAnimationFrame(passo);
      const q = quadros.slice(1);
      const lentos = q.filter(d => d > 33).length;
      fim({ fps: Math.round((q.length * 1000) / (agora - t0)), engasgos: lentos, pctEngasgos: Math.round((lentos / (q.length || 1)) * 100), piorQuadroMs: Math.round(Math.max(0, ...q)) });
    };
    requestAnimationFrame(passo);
  });
}
const textoFluidez = f => (f ? `${f.fps} quadros por segundo · ${f.engasgos} engasgos (${f.pctEngasgos}%) · pior quadro ${f.piorQuadroMs} ms — ${f.fps >= 55 && f.pctEngasgos <= 5 ? 'liso' : f.fps >= 40 ? 'aceitável' : 'pesado'}` : '');

async function abrirDiagnostico() {
  const folha = abrirFolha(`
    <h2>Diagnóstico</h2>
    <p class="meta">Copie e mande para quem cuida do app. Não tem nenhum valor das finanças, só o estado do app.</p>
    <p class="nota" id="diagTeste">${esc(textoFluidez(estado.fluidez))}</p>
    <pre class="diag" id="diagTexto">Lendo…</pre>
    <button type="button" class="btn prim" id="testarPub">Testar publicação</button>
    <button type="button" class="btn" id="medirFluidez">Medir a fluidez (4 s rolando a tela)</button>
    <button type="button" class="btn" id="copiarDiag">Copiar</button>
    <button type="button" class="btn" id="recarregar">Recarregar o painel</button>`);
  let texto = await textoDiagnostico();
  folha.querySelector('#diagTexto').textContent = texto;
  folha.querySelector('#testarPub').onclick = async () => {
    const r = await testarPublicacao();
    folha.querySelector('#diagTeste').textContent = r;
    texto = `${r}\n${await textoDiagnostico()}`;
    folha.querySelector('#diagTexto').textContent = texto;
  };
  folha.querySelector('#copiarDiag').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(texto);
      aviso('Diagnóstico copiado.');
    } catch {
      aviso('Não deu para copiar. Faça um print desta tela.');
    }
  });
  folha.querySelector('#recarregar').onclick = () => mostrarPainel(estado.conteudo);
  folha.querySelector('#medirFluidez').onclick = async () => {
    fecharFolha();
    await new Promise(ok => setTimeout(ok, 400)); // a folha termina de descer antes de medir
    estado.fluidez = await medirFluidez();
    $('resumo').scrollTop = 0;
    abrirDiagnostico();
  };
}

// Coloca o botão do menu do app ao lado do seletor de idioma do painel.
function prepararPainel(frame) {
  const doc = frame.contentDocument;
  if (!doc) return montarResumo(frame);
  const problema = painelComProblema(frame);
  if (problema && estado.diagnostico.tentativa === 1) return; // um painel novo já está a caminho
  if (!problema && estado.recarregouPainel && estado.diagnostico) estado.diagnostico.resolvidoNaRecarga = true;
  const estilo = doc.createElement('style');
  estilo.textContent = `
    .app-menu{display:inline-flex;align-items:center;justify-content:center;width:36px;height:32px;padding:0;border-radius:9px;
      border:1px solid var(--line-2,rgba(255,255,255,.12));background:rgba(255,255,255,.04);color:var(--chalk,#F2F1F6);cursor:pointer}
    .app-menu svg{width:18px;height:18px;fill:currentColor}
    .app-menu.solto{position:fixed;top:12px;right:12px;z-index:50;background:rgba(22,19,40,.85)}`;
  doc.head.append(estilo);
  const btn = doc.createElement('button');
  btn.type = 'button';
  btn.className = 'app-menu';
  btn.setAttribute('aria-label', 'Menu do app');
  btn.setAttribute('data-noi18n', '');
  btn.innerHTML = icone('menu');
  btn.addEventListener('click', () => abrirFolha());
  const alvo = doc.querySelector('.topright');
  if (alvo) alvo.prepend(btn);
  else {
    btn.classList.add('solto');
    doc.body.append(btn);
  }
  montarResumo(frame);
}

// ---------- App com abas (por cima do painel original) ----------
function montarResumo(frame) {
  estado.frame = frame;
  try {
    estado.motor = lerMotor(frame.contentWindow, frame.contentDocument);
    estado.dados = extrairDados(estado.conteudo.html);
    sincronizarCategorias();
    // v8.8: orçamento guardado no aparelho volta se o painel do agente chegou sem ele
    if (estado.dados.orcamentos) { estado.orcamentosCopia = estado.dados.orcamentos; banco.gravar('orcamentosCopia', estado.orcamentosCopia).catch(() => {}); }
    else if (estado.orcamentosCopia?.length) estado.dados.orcamentos = estado.orcamentosCopia;
    renderizarApp(history.state?.aba || estado.aba, { remendo: !!estado.suave });
    estado.suave = false;
  } catch (e) {
    // painel num formato que o app não conhece: fica só o painel original
    console.warn('Telas do app indisponíveis:', e);
    estado.resumoOk = false;
    aplicarVista('painel');
    painelProntoOk?.();
    painelProntoOk = null;
    return;
  }
  estado.resumoOk = true;
  medidas.tela ??= Math.round(performance.now());
  if (medidas.destrancou && medidas.aposDestrancar == null) medidas.aposDestrancar = Math.round(performance.now() - medidas.destrancou);
  aplicarVista(history.state?.vista || base());
  mostrarNovidades();
  if (estado.cart.dados) setTimeout(conciliarAgora, 1200); // v9.0
  setTimeout(buscarRascunhos, 1500); // v9.17: fechamento que o Claude deixou pronto pelo conector
  if (estado.cart.dados) setTimeout(() => atualizarCriptoBinance().then(depoisDoAviso).then(() => atualizarItau()), 2500); // v9.3 / v9.9
  // v8.11: lançamento que ficou só neste celular (sem rede) volta para a fila ao abrir
  if (pendente() && !precisaDoBruno(estado.publicacao?.erro) && !envio.timer) agendarEnvio(null, 5000);
  avisarToken();
  painelProntoOk?.();
  painelProntoOk = null;
  // v8.8: histórico de preço das assinaturas (neste aparelho); redesenha se alguma subiu
  lerAssinaturas().then(() => { if (estado.assinaturas?.some(x => x.subiu) && estado.aba === 'cartao') renderizarApp(estado.aba, { remendo: true }); }).catch(() => {});
  gravarAgenda();
}

// agenda dos lembretes (o service worker lê daqui): próximas contas e, no celular que publica, o dia do aporte planejado
function gravarAgenda() {
  if (!estado.motor || !estado.dados) return;
  const agenda = proximasContas(estado.motor, estado.dados).filter(i => i.valor < 0);
  try {
    const a = estado.github && aportePlanejado(estado.motor, estado.dados, estado.cart.dados, contexto(estado.dados));
    if (a?.dia) agenda.push({ id: `aporte|${estado.dados.periodo}|${a.valor}`, data: `${estado.dados.periodo}-${String(a.dia).padStart(2, '0')}`, dia: a.dia, desc: `Aporte planejado — ${a.itens.map(i => i.nome).join(', ')}` /* o sw tira o que está entre parênteses */, valor: -a.valor });
  } catch { /* sem carteira ou sem plano */ }
  // v9.9.12: lembrete de rodar o Claude — o fechamento no último dia do mês e o Plano quando o cenário muda
  try {
    if (estado.github) {
      const hoje = hojeBrasil(), ag = agendaClaude(estado.dados, estado.cart.dados, hoje), plano = ag.find(x => x.qual === 'plano');
      agenda.push({ id: `claude|fechamento|${estado.dados.periodo}`, data: plano.proxima, claude: true, desc: 'Fechamento do mês com o Claude', detalhe: 'Carteira, depois Caixa, depois Plano — menu, Levar para o Claude.', valor: 0 });
      if (plano.agora && hoje < plano.proxima) agenda.push({ id: `claude|plano|${plano.motivo}`, data: hoje, claude: true, desc: 'Rodar o Plano com o Claude', detalhe: plano.motivo, valor: 0 });
    }
  } catch { /* sem carteira */ }
  banco.gravar('agenda', agenda).catch(() => {});
}

// v8.9: "Investir" do cartão Aporte do mês — abre o aporte já com o primeiro ativo do plano que falta
function abrirAportePlano() {
  const a = aportePlanejado(estado.motor, estado.dados, estado.cart.dados, contexto(estado.dados));
  const i = a?.itens[0];
  abrirInvestir('aporte', i ? { ativo: i.ativo, valor: virgula(i.falta.toFixed(2)) } : {});
}

function renderizarApp(aba, { remendo = false } = {}) {
  estado.aba = ['inicio', 'mes', 'cartao', 'carteira', 'analises'].includes(aba) ? aba : 'inicio';
  const sub = estado.sub[estado.aba] || subPadrao(estado.aba);
  const r = $('resumo');
  // v9.11: seletor de mês em Caixa e Cartão; fora do mês atual a tela é a do mês escolhido (fechado ou projeção)
  const comMes = ['mes', 'cartao'].includes(estado.aba) && estado.dados && estado.motor;
  if (comMes && estado.mesVer && (estado.mesVer === estado.dados.periodo || !mesesDoSeletor(estado.dados, estado.motor).includes(estado.mesVer))) estado.mesVer = null; // mês virou ou saiu da projeção
  const outroMes = comMes && estado.mesVer;
  const v10 = v10Ligada();
  const cabeca = v10 ? htmlTopoCarvao(numerosDoTopo(estado.aba, estado.motor, estado.dados, estado.cart.dados), { esconder: valoresEscondidos() }) : htmlTopo(estado.aba, estado.dados, { lancar: estado.github });
  const html = `<div class="app-conteudo${v10 ? ' v10' : ''}">${cabeca}${v10 ? '<section class="folha-v10">' : ''}${outroMes || (v10 && estado.aba === 'cartao') ? '' : htmlSubabas(estado.aba, sub)}${comMes ? seletorMes(estado.dados, estado.motor, outroMes) : ''}
    <main class="app-aba">${outroMes ? telaDoMes(estado.aba, outroMes, estado.motor, estado.dados, { github: estado.github, hoje: hojeBrasil() }) : htmlAba(estado.aba, estado.motor, estado.dados, {
      github: estado.github, sub, abertos: estado.abertos, doc: estado.frame?.contentDocument, ordemInicio: lerOrdemInicio(), assinaturas: estado.assinaturas, hoje: hojeBrasil(), rascunhos: estado.rascunhos, fechamentoAplicado: estado.fechamentoAplicado, v10,
      docCarteira: estado.cart.frame?.contentDocument, carteira: estado.cart.dados, estimativa: estimativaAtual(), cdiHist: estado.cdiHist?.cdi, gatilhos: valoresGatilhos(),
    })}</main>${v10 ? '</section>' : ''}</div>
    ${v10 ? htmlNavV10(estado.aba, { lancar: !!estado.github }) : htmlNav(estado.aba, { lancar: !!estado.github })}`;
  // redesenho no lugar (depois de lançar, simulador): sem a animação de entrada — senão a tela pisca
  r.classList.toggle('sem-anim', remendo);
  if (!remendo) {
    r.innerHTML = html;
    r.scrollTop = 0;
    mostrarAbas(true);
    extrasDaTela(r);
    mascarar(r);
    animarNumeros(r, `${estado.aba}/${sub}`);
    return;
  }
  // depois de um toque num controle do painel: troca o conteúdo sem perder a rolagem
  // nem o campo que está sendo digitado
  const rolagem = r.scrollTop;
  const ativo = document.activeElement;
  const campo = ativo && r.contains(ativo) && /^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) ? ativo : null;
  const novo = document.createElement('div');
  novo.innerHTML = html;
  remendar(r, novo, campo);
  extrasDaTela(r);
  mascarar(r);
  animarNumeros(r, `${estado.aba}/${sub}`);
  r.scrollTop = rolagem;
  if (campo && !campo.isConnected && campo.dataset.proxy) {
    const outro = [...r.querySelectorAll('[data-proxy]')].find(e => e.dataset.proxy === campo.dataset.proxy);
    outro?.focus();
  }
}

// Troca os filhos de `velho` pelos de `novo`, mantendo o elemento `ativo` (campo em edição).
function remendar(velho, novo, ativo) {
  if (!ativo || !velho.contains(ativo)) return velho.replaceChildren(...novo.childNodes);
  const vs = [...velho.childNodes], ns = [...novo.childNodes];
  if (vs.length !== ns.length) return velho.replaceChildren(...ns);
  vs.forEach((v, i) => {
    const nv = ns[i];
    if (v === ativo) return;
    if (v.nodeType === 1 && nv.nodeType === 1 && v.tagName === nv.tagName && v.contains(ativo)) {
      [...v.attributes].forEach(a => { if (!nv.hasAttribute(a.name)) v.removeAttribute(a.name); });
      [...nv.attributes].forEach(a => v.setAttribute(a.name, a.value));
      remendar(v, nv, ativo);
    } else v.replaceWith(nv);
  });
}

// Controles traduzidos do painel (agenda pago/a pagar, simuladores, cenários, conferência):
// o toque vai para o elemento original no painel escondido, que recalcula tudo; depois o app
// relê os números e redesenha.
let timerCampo;
async function repassar(el, tipo) {
  const doc = (el.closest('[data-fonte="carteira"]') ? estado.cart.frame : estado.frame)?.contentDocument;
  let alvo = null;
  try {
    alvo = doc?.querySelector(el.dataset.proxy);
  } catch { /* seletor inválido */ }
  if (!alvo) return renderizarApp(estado.aba, { remendo: true });
  if (tipo === 'clique') alvo.click();
  else {
    alvo.value = el.value;
    alvo.dispatchEvent(new Event('input', { bubbles: true }));
    alvo.dispatchEvent(new Event('change', { bubbles: true }));
  }
  await new Promise(ok => setTimeout(ok, 30));
  try {
    estado.motor = lerMotor(estado.frame.contentWindow, doc);
  } catch (e) {
    console.warn('Motor depois do toque:', e);
  }
  renderizarApp(estado.aba, { remendo: true });
}

function irParaSub(sub) {
  if (estado.sub[estado.aba] === sub || (!estado.sub[estado.aba] && sub === subPadrao(estado.aba))) return;
  estado.sub[estado.aba] = sub;
  history.replaceState({ ...(history.state || {}), sub: estado.sub }, '');
  renderizarApp(estado.aba);
}

async function exportarTexto(botao, baixar) {
  const texto = botao.closest('.pn-exportar')?.querySelector('textarea')?.value || '';
  if (baixar) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = `cashflow_dados_${estado.dados?.ultimaAtualizacao || 'atual'}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return;
  }
  try {
    await navigator.clipboard.writeText(texto);
    aviso('Copiado. Cole na conversa com o Agente Financeiro.');
  } catch {
    aviso('Não deu para copiar. Use "Baixar arquivo".');
  }
}

// Barra de abas que sai do caminho: some enquanto a tela rola (para cima ou para baixo) e volta
// quando a rolagem para por um instante, no topo e no fim da tela.
let timerAbas;
function mostrarAbas(sim) {
  $('resumo').classList.toggle('abas-fora', !sim);
}
function ligarBarraAbas(r) {
  let ultimo = r.scrollTop;
  r.addEventListener('scroll', () => {
    const y = r.scrollTop;
    r.classList.toggle('compacto', y > 60 && v10Ligada()); // v9.18: topo carvão encolhe
    const fim = y + r.clientHeight >= r.scrollHeight - 24;
    const delta = y - ultimo;
    if (y < 40 || fim) mostrarAbas(true);
    else if (Math.abs(delta) > 6) mostrarAbas(false);
    if (Math.abs(delta) > 6 || y < 40) ultimo = y;
    clearTimeout(timerAbas);
    timerAbas = setTimeout(() => mostrarAbas(true), 900);
  }, { passive: true });
}

// Toques e digitação no app: um ouvinte só no contêiner (a tela é redesenhada a cada troca).
function ligarApp(r) {
  ligarBarraAbas(r);
  ligarDeslizar(r, () => !$('veu').hidden);
  ligarPuxar(r, () => !$('veu').hidden, () => Promise.all([buscarAtualizacao(), buscarCarteira({ silencioso: false }), atualizarCotacoes({ forcar: true })]));
  ligarArrastarFolha($('folha'), fecharFolha);
  r.addEventListener('click', e => {
    const el = e.target.closest('button, [data-expandir]');
    if (!el || !r.contains(el)) return;
    if (el.id === 'appMenu') { abrirFolha().scrollTop = 0; return; }
    if (el.dataset.mesVer !== undefined) { estado.mesVer = el.dataset.mesVer || null; return renderizarApp(estado.aba); }
    if (el.dataset.valorFuturo) { const [l, id, mes] = el.dataset.valorFuturo.split('|'); return abrirValorFuturo(`${l}|${id}`, mes); }
    if (el.id === 'appBusca') return abrirBusca();
    if (el.hasAttribute('data-olho')) return alternarOlho();
    if (el.hasAttribute('data-orcamento')) return abrirOrcamento();
    if (el.hasAttribute('data-aporte-plano')) return abrirAportePlano();
    if (el.dataset.meta) return abrirMeta(el.dataset.meta);
    if (el.hasAttribute('data-revisar-assinaturas')) return abrirRevisarAssinaturas();
    if (el.hasAttribute('data-pacote-ir')) return abrirPacoteIR();
    if (el.hasAttribute('data-extrato-abrir')) return abrirExtrato();
    if (el.id === 'appLancar') return abrirDiscar();
    if (el.dataset.pagar) return abrirPagar(el.dataset.pagar);
    if (el.dataset.assinatura !== undefined) return abrirAssinatura(Number(el.dataset.assinatura));
    if (el.dataset.parcelamento !== undefined) return abrirParcelamento(Number(el.dataset.parcelamento));
    if (el.dataset.ativoAbrir) return abrirAtivo(el.dataset.ativoAbrir);
    if (el.dataset.pesquisar !== undefined) return abrirPesquisa(el.dataset.pesquisar);
    if (el.hasAttribute('data-revisar-estrategia')) return abrirPesquisa(null, { estrategia: true });
    if (el.dataset.pausar !== undefined) return pausarItem(el.dataset.pausar);
    if (el.hasAttribute('data-fichas')) return abrirPesquisa(null, { fichas: true });
    if (el.hasAttribute('data-simular-troca')) return abrirSimuladorTroca();
    if (el.dataset.externo) return abrirExterno(Number(el.dataset.externo));
    if (el.dataset.entradaFutura) return abrirEntradaFutura(el.dataset.entradaFutura);
    if (el.dataset.mesFechado) return abrirMesFechado(el.dataset.mesFechado);
    if (el.dataset.compraFatura !== undefined) return abrirCompraFatura(Number(el.dataset.compraFatura));
    if (el.hasAttribute('data-nova-recorrente')) return abrirLancar('cartao', { recorrente: true });
    if (el.hasAttribute('data-resolver-pendencia')) return resolverPendencia();
    if (el.dataset.agenda) return alternarAgenda(el);
    if (el.dataset.agendaItem) return abrirDaAgenda(el.dataset.agendaItem);
    if (el.dataset.agendaCalc !== undefined) return explicarCalculado(el.dataset.agendaCalc);
    if (el.dataset.proxy === '#btnExport') return abrirLevarClaude();
    if (el.hasAttribute('data-ajustar-caixa')) return ajustarCaixa(el);
    if (el.hasAttribute('data-conferir-banco')) return abrirConferirBanco();
    if (el.dataset.compra) return abrirCompra(Number(el.dataset.compra));
    if (el.dataset.conta) return abrirConta(el.dataset.conta);
    if (el.dataset.novaConta) return abrirNovaConta(el.dataset.novaConta, el.dataset.novaData ? { data: el.dataset.novaData } : {});
    if (el.dataset.investir) return el.dataset.investir === 'valores' ? abrirValores() : abrirInvestir(el.dataset.investir);
    if (el.hasAttribute('data-levar-claude')) return abrirLevarClaude();
    if (el.hasAttribute('data-fech-pronto')) return abrirFechamentoPronto();
    if (el.hasAttribute('data-semana')) return abrirResumoSemana(); // v9.19: faixa do Hoje novo aos domingos
    if (el.hasAttribute('data-fech-desfazer')) return desfazerFechamento();
    if (el.hasAttribute('data-planilha-fatura')) return exportarPlanilhaFatura();
    if (el.hasAttribute('data-passo')) return marcarPasso(el.dataset.passo, el.dataset.como);
    if (el.hasAttribute('data-igualar-patrimonio')) return igualarPatrimonio();
    if (el.dataset.abrir) {
      estado.abertos.add(el.dataset.abrir);
      return renderizarApp(estado.aba, { remendo: true });
    }
    if (el.dataset.aba || el.dataset.irAba) {
      const [aba, sub] = (el.dataset.aba || el.dataset.irAba).split('/');
      if (sub) estado.sub[aba] = sub;
      return irParaAba(aba);
    }
    if (el.dataset.sub) return irParaSub(el.dataset.sub);
    if (el.dataset.proxy) return repassar(el, 'clique');
    if (el.dataset.modelo) return abrirModeloCarteira(el.dataset.modelo === 'fechamento');
    if (el.dataset.importarCarteira !== undefined) return escolherArquivo();
    if (el.hasAttribute('data-copiar')) return exportarTexto(el, false);
    if (el.hasAttribute('data-baixar')) return exportarTexto(el, true);
    if (el.hasAttribute('data-expandir')) el.classList.toggle('aberto');
  });
  // "Ler mais" e "Ver todos": abre/fecha e lembra (a tela é redesenhada depois de cada toque no painel)
  r.addEventListener('click', e => {
    const el = e.target.closest('[data-alternar]');
    if (!el || e.target.closest('[data-proxy]')) return;
    const alvo = el.closest('.pn-longo, .pn-limite');
    const aberto = alvo.classList.toggle('aberto');
    if (aberto) estado.abertos.add(el.dataset.alternar);
    else estado.abertos.delete(el.dataset.alternar);
  });
  r.addEventListener('change', e => {
    if (e.target.matches('select[data-proxy], input[data-proxy]')) {
      clearTimeout(timerCampo);
      repassar(e.target, 'valor');
    }
  });
  r.addEventListener('input', e => {
    if (!e.target.matches('input[data-proxy]')) return;
    clearTimeout(timerCampo);
    timerCampo = setTimeout(() => repassar(e.target, 'valor'), 350);
  });
  // "toggle" não sobe pela árvore: escuta na fase de captura
  r.addEventListener('toggle', e => {
    const chave = e.target.dataset?.chave;
    if (!chave) return;
    if (e.target.open) estado.abertos.add(chave);
    else estado.abertos.delete(chave);
  }, true);
}

// Abas entram no histórico (só quando o app é a tela base), para o "voltar" do Android
// retornar ao Início antes de sair do app.
function irParaAba(aba) {
  if (aba === estado.aba) return renderizarApp(aba);
  const st = history.state || {};
  if (base() === 'resumo' && estado.vista === 'resumo') {
    if (aba === 'inicio') {
      if (st.aba && st.aba !== 'inicio') return history.back(); // o popstate desenha o Início
    } else if (st.aba && st.aba !== 'inicio') {
      history.replaceState({ ...st, aba }, '');
    } else {
      history.pushState({ vista: 'resumo', aba }, '');
    }
  } else {
    history.replaceState({ ...st, aba }, '');
  }
  comTransicao(() => renderizarApp(aba));
}

// A tela "base" deste aparelho fica no fundo do histórico; a outra entra por cima,
// para o "voltar" do Android sempre retornar à base.
const base = () => (estado.resumoOk ? estado.inicio : 'painel');

function aplicarVista(vista) {
  const nova = estado.resumoOk ? vista : 'painel';
  const r = $('resumo');
  if (nova === 'resumo' && r.hidden) r.scrollTop = 0;
  r.hidden = nova !== 'resumo';
  estado.vista = nova;
}

function irPara(vista) {
  if (vista === estado.vista) return fecharFolha();
  const st = history.state || {};
  $('veu').hidden = true;
  if (vista === base()) {
    const passos = (st.folha ? 1 : 0) + (st.vista && st.vista !== base() ? 1 : 0);
    if (passos) history.go(-passos); // o popstate aplica a base
    else aplicarVista(vista);
  } else {
    if (st.folha) history.replaceState({ vista }, '');
    else history.pushState({ vista }, '');
    aplicarVista(vista);
  }
}

// ---------- persistência ----------
// Senha nova ou primeira senha neste aparelho. Aparelho sem proteção: passa pela tela "Proteja o Lastro"
// (obrigatória); já protegido: guarda de novo do mesmo jeito (no modo digital pode pedir a digital).
async function salvarCofre(cofre) {
  if (estado.cofre) {
    cofre.token ??= estado.cofre.token;
    cofre.embrulho ??= estado.cofre.embrulho;
  }
  if (protegido(estado.salvo)) {
    await comDigital(async () => { estado.salvo = await regravarProtecao(estado.salvo, cofre); });
    await banco.gravar('cofre', estado.salvo);
  } else {
    cofre = await configurarProtecao(cofre);
  }
  estado.cofre = cofre;
  buscarCarteira(); // a carteira publicada usa a mesma senha
  prepararAvisos(); // primeiro acesso: já liga (ou oferece) os avisos de painel novo
}

async function salvarEnvelope(envelope, origem) {
  estado.envelope = envelope;
  estado.origem = origem;
  await banco.gravar('envelope', envelope);
  await banco.gravar('origem', origem);
}

async function guardarLocal(conteudo, { suave = false } = {}) {
  const envelope = await cifrar(conteudo, estado.cofre.chave, b64.para(estado.cofre.sal), estado.cofre.iteracoes);
  await salvarEnvelope(envelope, 'local');
  mostrarPainel(conteudo, { suave });
}

// ---------- importação ----------
function escolherArquivo() {
  const input = $('arquivo');
  input.value = '';
  input.onchange = () => input.files[0] && importar(input.files[0]);
  input.click();
}

function avisoImportado() {
  const r = resumo(estado.conteudo.html);
  aviso(`Painel de ${r.periodoLabel} (dados de ${dataCurta(r.ultimaAtualizacao)}) salvo neste aparelho.`, {
    acao: { rotulo: 'Publicar', fn: publicar },
    duracao: 10000,
  });
}

function ehArquivoCarteira(texto) {
  if (ehCarteira(texto)) return true;
  if (/id=["']cashflow-data["']/i.test(texto)) return false;
  try {
    return ehDadosCarteira(JSON.parse(texto));
  } catch {
    return false;
  }
}

async function importar(arquivo) {
  let html;
  const texto = await arquivo.text();
  const parcial = lerParcial(texto);
  if (parcial) return importarParcial(parcial);
  if (ehArquivoCarteira(texto)) return importarCarteira(texto, arquivo.name);
  try {
    html = lerArquivo(texto, estado.conteudo?.html);
  } catch (e) {
    return aviso(e.message, { erro: true, fixo: true });
  }
  const conteudo = { html: estado.cofre ? patrimonioDaCarteira(html) : html, arquivo: arquivo.name || null, importadoEm: new Date().toISOString() };
  if (!estado.cofre) {
    if (estado.remoto === undefined) await consultarRemoto();
    return estado.remoto ? telaEntrar(estado.remoto, conteudo) : telaCriarSenha(conteudo);
  }
  if (estado.conteudo) {
    const novo = resumo(html);
    const atual = resumo(estado.conteudo.html);
    if (novo.ultimaAtualizacao < atual.ultimaAtualizacao
      && !(await confirmar({ titulo: 'Arquivo mais antigo', texto: `Este arquivo tem dados de ${dataCurta(novo.ultimaAtualizacao)}, mais antigos que os do painel atual (${dataCurta(atual.ultimaAtualizacao)}). Importar mesmo assim?`, sim: 'Importar mesmo assim' }))) return;
  }
  await guardarLocal(conteudo);
  // v8.10: no fechamento, o caixa conta como feito quando o painel importado já é do mês seguinte
  if (etapaAberta('caixa') && resumo(html).periodo > estado.fechamento.mes) marcarEtapa('caixa');
  // no aparelho que publica, importar já manda para a família
  if (estado.github) await publicar();
  else avisoImportado();
}

// Arquivos recebidos pelo "Compartilhar" do Android (o service worker guarda no cache).
// Dá para compartilhar os dois painéis de uma vez: cashflow e carteira.
// Também chega texto (SMS do Itaú compartilhado pelo app de Mensagens): vira lançamento.
async function pegarCompartilhado() {
  const url = new URL(location.href);
  if (!url.searchParams.has('compartilhado')) return { arquivos: [], textos: [] };
  history.replaceState(null, '', url.pathname);
  const cache = await caches.open('compartilhado');
  const arquivos = [];
  const textos = [];
  for (const req of await cache.keys()) {
    const resp = await cache.match(req);
    await cache.delete(req);
    if (!resp) continue;
    if (resp.headers.get('X-Tipo') === 'texto') {
      textos.push(await resp.text());
      continue;
    }
    const nome = decodeURIComponent(resp.headers.get('X-Nome') || 'painel');
    arquivos.push(new File([await resp.blob()], nome));
  }
  // o cashflow primeiro: no aparelho novo é ele que cria/pede a senha
  arquivos.sort((a, b) => Number(/carteira/i.test(a.name)) - Number(/carteira/i.test(b.name)));
  return { arquivos, textos };
}

// ---------- sincronização com a versão publicada ----------
// undefined = sem conexão, null = nada publicado, objeto = envelope publicado
async function consultarRemoto() {
  if (DEMO) return (estado.remoto = null); // a demo não tem versão publicada
  try {
    const r = await fetch(`${REMOTO}?t=${Date.now()}`, { cache: 'no-store' });
    if (r.status === 404) return (estado.remoto = null);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const envelope = await r.json();
    if (envelope?.formato !== 'painel-cifrado') return (estado.remoto = null);
    return (estado.remoto = envelope);
  } catch {
    return undefined;
  }
}

async function buscarAtualizacao({ silencioso = false } = {}) {
  const remoto = await consultarRemoto();
  if (remoto === undefined) {
    if (!estado.conteudo) telaSemConexao();
    else if (!silencioso) aviso('Sem conexão — mostrando a última versão salva.');
    return;
  }
  if (!remoto) {
    if (!estado.conteudo) telaBoasVindas();
    else if (!silencioso) aviso('Ainda não há versão publicada para a família.');
    return;
  }
  if (!estado.cofre || estado.cofre.sal !== remoto.kdf.sal) {
    if (!estado.conteudo) return telaEntrar(remoto);
    // a senha foi trocada neste aparelho e a versão nova ainda não foi publicada
    if (estado.envelope && estado.envelope.publicadoEm > remoto.publicadoEm) {
      if (!silencioso) aviso('Este aparelho tem uma versão mais nova que a publicada.');
      return;
    }
    return aviso('A senha da família mudou.', { acao: { rotulo: 'Digitar', fn: () => telaEntrar(remoto) }, fixo: true });
  }
  if (estado.envelope && remoto.publicadoEm <= estado.envelope.publicadoEm) {
    if (!silencioso) aviso('Você já está com a versão mais recente.');
    return;
  }
  if (!estado.conteudo || !silencioso) return aplicarRemoto(remoto);
  aviso(`Nova versão publicada em ${dataHora(remoto.publicadoEm)}.`, { acao: { rotulo: 'Atualizar', fn: () => aplicarRemoto(remoto) }, fixo: true });
}

async function aplicarRemoto(envelope) {
  let conteudo;
  try {
    conteudo = await decifrar(envelope, estado.cofre.chave);
  } catch {
    return telaEntrar(envelope);
  }
  await salvarEnvelope(envelope, 'remoto');
  const tinhaPainel = !!estado.conteudo;
  mostrarPainel(conteudo);
  if (tinhaPainel) aviso('Painel atualizado.');
}

// ---------- publicação (GitHub) ----------
function erroGithub(resp) {
  const msgs = {
    401: 'o token é inválido ou expirou',
    403: 'o token não tem permissão de escrita (Contents: Read and write)',
    404: 'repositório ou branch não encontrado — confira o nome e se o token tem acesso a ele',
    409: 'conflito com outra publicação — tente de novo',
    422: 'o GitHub recusou o arquivo — tente de novo',
  };
  return new Error(msgs[resp.status] || `erro ${resp.status} do GitHub`);
}

async function enviarGithub(gh, caminho, envelope, mensagem) {
  const url = `https://api.github.com/repos/${gh.repo}/contents/${caminho}`;
  const cab = { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const atual = await fetch(`${url}?ref=${encodeURIComponent(gh.branch)}`, { headers: cab, cache: 'no-store' });
  if (!atual.ok && atual.status !== 404) throw erroGithub(atual);
  const sha = atual.ok ? (await atual.json()).sha : undefined;
  const corpo = { message: mensagem, content: b64.de(new TextEncoder().encode(JSON.stringify(envelope))), branch: gh.branch, sha };
  const resp = await fetch(url, { method: 'PUT', headers: cab, body: JSON.stringify(corpo) });
  if (!resp.ok) throw erroGithub(resp);
}

// Caixa e carteira num commit só (API Git Data): uma montagem no Cloudflare em vez de duas, e o Rafael recebe os dois
// juntos. arquivos = [{ caminho, envelope }]. Se o GitHub recusar o caminho novo, quem chama volta ao jeito antigo.
async function enviarGithubJuntos(gh, arquivos, mensagem) {
  const git = `https://api.github.com/repos/${gh.repo}/git`;
  const cab = { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const json = async (url, op = {}) => {
    const r = await fetch(url, { cache: 'no-store', ...op, headers: { ...cab, ...(op.body ? { 'Content-Type': 'application/json' } : {}) } });
    if (!r.ok) throw Object.assign(erroGithub(r), { status: r.status });
    return r.json();
  };
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const ref = await json(`${git}/ref/heads/${encodeURIComponent(gh.branch)}`);
    const pai = ref?.object?.sha;
    const commitPai = pai && (await json(`${git}/commits/${pai}`));
    if (!commitPai?.tree?.sha) throw new Error('resposta inesperada do GitHub');
    // v9.15: arquivo binário (imagem do feedback) vai como blob em base64 antes da árvore
    const itens = await Promise.all(arquivos.map(async a => (a.base64
      ? { path: a.caminho, mode: '100644', type: 'blob', sha: (await json(`${git}/blobs`, { method: 'POST', body: JSON.stringify({ content: a.base64, encoding: 'base64' }) })).sha }
      : { path: a.caminho, mode: '100644', type: 'blob', content: JSON.stringify(a.envelope) })));
    const arvore = await json(`${git}/trees`, { method: 'POST', body: JSON.stringify({ base_tree: commitPai.tree.sha, tree: itens }) });
    const commit = await json(`${git}/commits`, { method: 'POST', body: JSON.stringify({ message: mensagem, tree: arvore.sha, parents: [pai] }) });
    try {
      await json(`${git}/refs/heads/${encodeURIComponent(gh.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
      return;
    } catch (e) {
      if (e.status !== 422 || tentativa) throw e; // outra publicação entrou no meio: refaz em cima dela
    }
  }
}

// A carteira vai para o mesmo diretório do painel publicado: app/data/carteira.enc
const caminhoCarteira = caminho => caminho.replace(/[^/]*$/, 'carteira.enc');

// Configuração de publicação. No modo digital o token fica selado junto com a chave (protecao.js);
// se o app foi destrancado pela senha, pede a digital para lê-lo.
async function lerGithub() {
  let gh = await banco.ler('github');
  // v9.12.1: o repositório foi renomeado (Agente-Financeiro → Lastro-Personal, 12/11/2026); o celular se corrige sozinho
  if (gh && /^bebernos\/agente-financeiro$/i.test(gh.repo)) await banco.gravar('github', (gh = { ...gh, repo: GITHUB_PADRAO.repo }));
  if (!gh || gh.token) return gh;
  if (estado.cofre && estado.cofre.token === undefined) {
    const aberto = await comDigital(() => abrirComDigital(estado.salvo));
    estado.cofre.token = aberto.token;
    estado.cofre.embrulho = aberto.embrulho;
  }
  return estado.cofre?.token ? { ...gh, token: estado.cofre.token } : null;
}

async function gravarGithub(novo) {
  if (estado.salvo?.modo !== 'digital') await banco.gravar('github', novo);
  else {
    estado.cofre.token = novo.token;
    await comDigital(async () => { estado.salvo = await regravarProtecao(estado.salvo, estado.cofre); });
    await banco.gravar('cofre', estado.salvo);
    await banco.gravar('github', { ...novo, token: null });
  }
  // v9.10: token novo também vai para o conector do Claude (senão ele para de gravar quando o antigo vencer)
  let conector = false;
  try { conector = localStorage.getItem('lastro-conector') === '1'; } catch { /* sem armazenamento */ }
  if (conector && estado.cofre?.bruta) conectorPedido('ligar', { chave: b64.de(estado.cofre.bruta) }).catch(() => {});
}

// Resultado da última tentativa de publicar (motivo aparece no aviso, na faixa e no Diagnóstico)
async function anotarPublicacao(ok, erro = '') {
  estado.publicacao = { em: new Date().toISOString(), ok, erro };
  await banco.gravar('publicacao', estado.publicacao).catch(() => {});
}

// opcoes (quando chamado pelo app, não pelo menu): { silencioso: sem avisos, devolve true/false e deixa o motivo em
// estado.publicacao.erro; mensagem: do commit }
async function publicar(opcoes = {}) {
  estado.publicando = true;
  try {
    return await publicarAgora(opcoes);
  } finally {
    estado.publicando = false;
    marcarPendencias();
  }
}

async function publicarAgora(opcoes = {}) {
  const silencioso = opcoes.silencioso === true;
  if (DEMO) { // nada sai do aparelho
    estado.origem = 'publicado';
    estado.cart.origem = 'publicado';
    await anotarPublicacao(true);
    marcarPendencias();
    return silencioso ? true : aviso('Publicado (demonstração): nada sai deste aparelho.');
  }
  if (!estado.envelope) return silencioso ? false : aviso('Nada para publicar ainda.');
  let gh;
  try {
    gh = await lerGithub();
  } catch {
    await anotarPublicacao(false, 'a digital não foi confirmada (o token do GitHub fica guardado com ela)');
    return silencioso ? false : aviso('Publicar precisa da digital (o token do GitHub fica guardado com ela).', { erro: true });
  }
  if (!gh) {
    await anotarPublicacao(false, 'a publicação não está configurada neste celular (falta o token do GitHub)');
    if (silencioso) return false;
    return abrirConfigGithub(true);
  }
  if (!silencioso) {
    fecharFolha();
    aviso('Publicando…', { fixo: true });
  }
  try {
    const r = resumo(estado.conteudo.html);
    const mensagem = typeof opcoes.mensagem === 'string' ? opcoes.mensagem : `Painel: ${r.periodoLabel} (dados de ${r.ultimaAtualizacao})`;
    const caixa = estado.origem === 'local' || !silencioso;
    const carteira = !!estado.cart.envelope && estado.cart.origem === 'local';
    let juntos = false;
    if (caixa && carteira) {
      try {
        await enviarGithubJuntos(gh, [{ caminho: gh.caminho, envelope: estado.envelope }, { caminho: caminhoCarteira(gh.caminho), envelope: estado.cart.envelope }], mensagem);
        juntos = true;
      } catch (e) {
        if (e.status === 401) throw e; // token vencido: o jeito antigo também falharia
        console.warn('Publicação num commit só falhou; enviando separado:', e);
      }
    }
    if (juntos) {
      estado.cart.origem = 'publicado';
      await banco.gravar('carteiraOrigem', 'publicado');
    } else if (caixa) await enviarGithub(gh, gh.caminho, estado.envelope, mensagem);
    if (caixa) {
      estado.origem = 'publicado';
      await banco.gravar('origem', 'publicado');
    }
    // carteira importada ou mudada aqui e ainda não publicada vai junto
    if (!juntos && carteira) await enviarCarteira(gh);
    await anotarPublicacao(true);
    marcarPendencias();
    if (silencioso) return true;
    aviso('Publicado! Em 1 a 2 minutos o painel novo chega no celular da família.');
  } catch (e) {
    await anotarPublicacao(false, e.message);
    marcarPendencias();
    if (silencioso) return false;
    aviso(`Não deu para publicar: ${e.message}.`, { erro: true, fixo: true, acao: { rotulo: 'Corrigir', fn: () => abrirConfigGithub(true) } });
  }
}

async function enviarCarteira(gh) {
  const r = resumoCarteira(estado.cart.conteudo.html);
  await enviarGithub(gh, caminhoCarteira(gh.caminho), estado.cart.envelope, `Carteira: posição de ${r.data}`);
  estado.cart.origem = 'publicado';
  await banco.gravar('carteiraOrigem', 'publicado');
}

async function publicarCarteira() {
  if (!estado.cart.envelope) return aviso('Nenhuma carteira para publicar ainda.');
  let gh;
  try {
    gh = await lerGithub();
  } catch {
    return aviso('Publicar precisa da digital (o token do GitHub fica guardado com ela).', { erro: true });
  }
  if (!gh) return abrirConfigGithub(true);
  fecharFolha();
  aviso('Publicando a carteira…', { fixo: true });
  try {
    await enviarCarteira(gh);
    aviso('Carteira publicada! Em 1 a 2 minutos ela chega no celular da família.');
  } catch (e) {
    aviso(`Não deu para publicar a carteira: ${e.message}.`, { erro: true, fixo: true });
  }
}

// ---------- carteira ----------
async function guardarCarteira(conteudo) {
  const envelope = await cifrar(conteudo, estado.cofre.chave, b64.para(estado.cofre.sal), estado.cofre.iteracoes);
  estado.cart.envelope = envelope;
  estado.cart.origem = 'local';
  await banco.gravar('carteiraEnvelope', envelope);
  await banco.gravar('carteiraOrigem', 'local');
  mostrarCarteira(conteudo);
}

// v9.6: resposta parcial do Claude (plano, análises) junta aos dados atuais — um lançamento comum (envio, Desfazer)
async function importarParcial(parcial) {
  const qual = parcial.lastro_parcial;
  if (!estado.cofre || !estado.github) return aviso('Só o celular de quem publica importa a resposta do Claude.', { erro: true, fixo: true });
  if (qual === 'carteira' ? !estado.cart.dados : !estado.dados) return aviso(`Abra o app com ${qual === 'carteira' ? 'a carteira' : 'o painel'} carregado antes de importar.`, { erro: true, fixo: true });
  try {
    const { mudou, ignorados } = juntarParcial(qual === 'carteira' ? estado.cart.dados : estado.dados, parcial);
    const rotulo = `Do Claude: ${mudou.map(k => NOME_CAMPO[k] || k).join(', ')}${qual === 'carteira' ? ' na carteira' : ' no caixa'}`;
    await aplicarLancamento((cf, cart) => (qual === 'carteira' ? { cf, cart: juntarParcial(cart, parcial).dados } : juntarParcial(cf, parcial).dados), rotulo);
    if (qual === 'carteira' && mudou.includes('plano_aportes') && etapaAberta('plano')) marcarEtapa('plano');
    if (ignorados.length) aviso(`Importado. O app ignorou o que não sabe juntar: ${ignorados.join(', ')}.`, { duracao: 10000 });
  } catch (e) {
    aviso(e.message, { erro: true, fixo: true });
  }
}

async function importarCarteira(texto, nome) {
  if (!estado.cofre) return aviso('Abra o app com a senha da família antes de importar a carteira.', { erro: true, fixo: true });
  let html;
  try {
    html = lerArquivoCarteira(texto, estado.cart.conteudo?.html);
  } catch (e) {
    return aviso(e.message, { erro: true, fixo: true });
  }
  const novo = resumoCarteira(html);
  if (estado.cart.conteudo) {
    const atual = resumoCarteira(estado.cart.conteudo.html);
    if (novo.data < atual.data) {
      // v8.9.1: o modo PLANO às vezes parte da carteira do Drive (mais velha): copiar só o plano não perde o fechamento
      const nc = extrairCarteira(html);
      if ((nc.plano_aportes || nc.meta_dolarizacao) && estado.github && estado.cart.dados
        && (await confirmar({ titulo: 'Carteira mais antiga, com plano', texto: `Esta carteira tem posição de ${dataCurta(novo.data)}, mais antiga que a atual (${dataCurta(atual.data)}): o Claude provavelmente partiu do arquivo do Drive. Ela traz o plano de aportes e a meta de dólar. O app copia só isso para a carteira atual, sem perder nada do que já está aqui.`, sim: 'Copiar só o plano (recomendado)', nao: 'Outras opções', manter: true }))) {
        const plano = { ...(nc.meta_dolarizacao ? { meta_dolarizacao: nc.meta_dolarizacao } : {}), ...(nc.plano_aportes ? { plano_aportes: nc.plano_aportes } : {}) };
        return aplicarLancamento((cf, cart) => ({ cf, cart: { ...cart, ...plano } }), 'Plano de aportes e meta de dólar copiados da carteira do Claude')
          .then(() => etapaAberta('plano') && marcarEtapa('plano')).catch(e => aviso(e.message, { erro: true, fixo: true }));
      }
      if (!(await confirmar({ titulo: 'Substituir pela carteira mais antiga?', texto: `A carteira atual (posição de ${dataCurta(atual.data)}) será trocada por esta, de ${dataCurta(novo.data)}. O que foi registrado depois disso some.`, sim: 'Substituir mesmo assim', perigo: true }))) return;
    }
  }
  await guardarCarteira({ html, arquivo: nome || null, importadoEm: new Date().toISOString() });
  // v8.10: no fechamento, a carteira importada fecha a etapa aberta (o plano, se ele já começou; senão a carteira)
  if (etapaAberta('plano')) marcarEtapa('plano');
  else if (etapaAberta('carteira')) marcarEtapa('carteira');
  const caixa = estado.conteudo && patrimonioDaCarteira(estado.conteudo.html, extrairCarteira(html));
  if (estado.github && caixa && caixa !== estado.conteudo.html) {
    await guardarLocal({ ...estado.conteudo, html: caixa, arquivo: 'patrimônio copiado da carteira', importadoEm: new Date().toISOString() }, { suave: true });
    await publicar({ mensagem: 'Lastro: carteira nova e patrimônio copiado para o caixa' });
  } else if (estado.github) await publicarCarteira();
  else aviso(`Carteira (posição de ${dataCurta(novo.data)}) salva neste aparelho.`, { acao: { rotulo: 'Publicar', fn: publicarCarteira }, duracao: 10000 });
}

// O painel da carteira roda escondido, como o do cashflow: é o motor das telas da carteira.
function mostrarCarteira(conteudo) {
  estado.cart.conteudo = conteudo;
  if (estado.travado || document.hidden) {
    estado.cart.pendente = true;
    return;
  }
  estado.cart.pendente = false;
  const frame = document.createElement('iframe');
  frame.title = 'Painel da carteira';
  frame.addEventListener('load', () => {
    try {
      estado.cart.dados = extrairCarteira(conteudo.html);
      // v8.8: metas guardadas no aparelho voltam se a carteira chegou sem elas
      if (estado.cart.dados.metas) { estado.metasCopia = estado.cart.dados.metas; banco.gravar('metasCopia', estado.metasCopia).catch(() => {}); }
      else if (estado.metasCopia?.length) estado.cart.dados.metas = estado.metasCopia;
      // v9.7: as fichas dos ativos também voltam se uma carteira nova chegar sem elas
      if (estado.cart.dados.fichas_ativos) { estado.fichasCopia = estado.cart.dados.fichas_ativos; banco.gravar('fichasCopia', estado.fichasCopia).catch(() => {}); }
      else if (estado.fichasCopia) estado.cart.dados.fichas_ativos = estado.fichasCopia;
      estado.cart.frame = frame;
    } catch (e) {
      console.warn('Carteira indisponível:', e);
      estado.cart.frame = null;
      return;
    }
    if (estado.resumoOk) renderizarApp(estado.aba, { remendo: true });
    gravarAgenda();
    if (estado.resumoOk) setTimeout(conciliarAgora, 1200); // v9.0
    if (estado.resumoOk) setTimeout(avisarEstrategia, 1800); // v9.13
    if (estado.resumoOk) setTimeout(() => atualizarCriptoBinance().then(depoisDoAviso).then(() => atualizarItau()), 2500); // v9.3 / v9.9
    atualizarCotacoes();
    atualizarCdiHist(); // v9.6
  }, { once: true });
  frame.srcdoc = comSonda(conteudo.html);
  $('moldura-carteira').replaceChildren(frame);
}

// ---------- cotações ao vivo (estimativa "Hoje" da carteira) ----------
// O Worker recebe só os códigos dos ativos e a data da posição; a conta com os valores é feita aqui.
function estimativaAtual() {
  const { dados } = estado.cart;
  if (!dados || !estado.cot) return null;
  try {
    if (estado.cot.url !== urlCotacoes(pedidoCotacoes(dados))) return null; // cotações de outra posição
    return estimar(dados, estado.cot.dados);
  } catch (e) {
    console.warn('Estimativa indisponível:', e);
    return null;
  }
}

let buscandoCotacoes = false;
async function atualizarCotacoes({ forcar = false } = {}) {
  if (!estado.cart.dados || buscandoCotacoes) return;
  let url;
  try {
    url = urlCotacoes(pedidoCotacoes(estado.cart.dados));
  } catch {
    return;
  }
  buscandoCotacoes = true;
  try {
    if (estado.cot === undefined) {
      estado.cot = (await banco.ler('cotacoes').catch(() => null)) || null;
      if (estado.cot?.url === url && estado.resumoOk) renderizarApp(estado.aba, { remendo: true });
    }
    if (!forcar && estado.cot?.url === url && Date.now() - estado.cot.em < VALIDADE_COTACOES) return;
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) return; // sem internet ou rota fora do ar: continua a última estimativa
    estado.cot = { em: Date.now(), url, dados: await r.json() };
    await banco.gravar('cotacoes', estado.cot).catch(() => {});
    if (estado.resumoOk && !estado.travado) renderizarApp(estado.aba, { remendo: true });
  } catch { /* offline */ } finally {
    buscandoCotacoes = false;
  }
}

// v9.6: CDI diário oficial desde a posição mais antiga da renda fixa (para "Renda fixa de verdade"). Só a data vai na
// pergunta; 1× por dia (IDB 'cdiHist' = { em, ref, cdi }).
async function atualizarCdiHist() {
  const hist = estado.cart.dados?.historico_mensal || {};
  const m = Object.keys(hist).sort().find(k => hist[k]?.ativos?.renda_fixa);
  if (!m) return;
  const ref = hist[m].atualizado_em || `${m}-${String(new Date(Number(m.slice(0, 4)), Number(m.slice(5)), 0).getDate()).padStart(2, '0')}`;
  estado.cdiHist ??= (await banco.ler('cdiHist').catch(() => null)) || null;
  if (estado.cdiHist?.ref === ref && Date.now() - estado.cdiHist.em < 20 * 3600 * 1000) return;
  try {
    const r = await fetch(`cotacoes?ref=${ref}`, { cache: 'no-store' });
    if (!r.ok) return;
    const cdi = (await r.json()).cdi;
    if (!Array.isArray(cdi) || !cdi.length) return;
    estado.cdiHist = { em: Date.now(), ref, cdi };
    await banco.gravar('cdiHist', estado.cdiHist).catch(() => {});
    if (estado.resumoOk && !estado.travado && estado.aba === 'carteira') renderizarApp(estado.aba, { remendo: true });
  } catch { /* offline: fica o último */ }
}

async function carregarCarteiraLocal() {
  const [envelope, origem] = await Promise.all([banco.ler('carteiraEnvelope'), banco.ler('carteiraOrigem')]);
  if (!envelope || !estado.cofre) return;
  try {
    const conteudo = await decifrar(envelope, estado.cofre.chave);
    estado.cart.envelope = envelope;
    estado.cart.origem = origem;
    mostrarCarteira(conteudo);
  } catch { /* cifrada com uma senha antiga: a versão publicada substitui */ }
}

async function buscarCarteira({ silencioso = true } = {}) {
  if (!estado.cofre) return;
  let envelope;
  try {
    const r = await fetch(`${REMOTO_CARTEIRA}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    envelope = await r.json();
  } catch {
    return;
  }
  if (envelope?.formato !== 'painel-cifrado' || envelope.kdf?.sal !== estado.cofre.sal) return;
  if (estado.cart.envelope && envelope.publicadoEm <= estado.cart.envelope.publicadoEm) return;
  try {
    const conteudo = await decifrar(envelope, estado.cofre.chave);
    const tinha = !!estado.cart.conteudo;
    estado.cart.envelope = envelope;
    estado.cart.origem = 'remoto';
    await banco.gravar('carteiraEnvelope', envelope);
    await banco.gravar('carteiraOrigem', 'remoto');
    mostrarCarteira(conteudo);
    if (tinha && !silencioso) aviso('Carteira atualizada.');
  } catch { /* senha diferente: o cashflow já pede a senha nova */ }
}

// "Atualização parcial" / "Fechamento do mês": o painel da carteira monta o documento para
// colar na conversa da carteira no Claude. O app abre o mesmo documento numa folha.
let timerModelo;
function abrirModeloCarteira(fechamento) {
  const doc = estado.cart.frame?.contentDocument;
  const botao = doc?.getElementById(fechamento ? 'btn-tpl-fech' : 'btn-tpl-parcial');
  const original = doc?.getElementById('tpl-texto');
  if (!botao || !original) return aviso('Esta versão do painel da carteira não tem o documento de atualização.');
  botao.click();
  const titulo = doc.getElementById('tpl-titulo')?.textContent || 'Atualizar a carteira';
  const folha = abrirFolha(`
    <h2>${esc(titulo)}</h2>
    <p class="meta">Já vem preenchido com o que a carteira sabe. Complete os campos em branco (ou escreva "segue print"), depois cole o documento inteiro na conversa da carteira no Claude.</p>
    <textarea class="pn-exp modelo" id="modeloTexto" spellcheck="false">${esc(original.value)}</textarea>
    <div class="modelo-check" id="modeloCheck"></div>
    <button type="button" class="btn prim" id="modeloCopiar">Copiar e abrir o Claude</button>
    <button type="button" class="btn" id="modeloSo">Só copiar</button>`);
  const area = folha.querySelector('#modeloTexto');
  const conferir = () => {
    original.value = area.value;
    original.dispatchEvent(new Event('input', { bubbles: true }));
    const check = doc.getElementById('tpl-check');
    folha.querySelector('#modeloCheck').innerHTML = check ? traduzirFragmento(check) : '';
  };
  area.addEventListener('input', () => {
    clearTimeout(timerModelo);
    timerModelo = setTimeout(conferir, 300);
  });
  conferir();
  const copiar = async abrir => {
    try {
      await navigator.clipboard.writeText(area.value);
      aviso('Documento copiado. Cole na conversa da carteira no Claude.');
    } catch {
      area.select();
      aviso('Não deu para copiar sozinho: o texto ficou selecionado, use "Copiar".');
      return;
    }
    if (abrir) window.open('https://claude.ai/', '_blank');
  };
  folha.querySelector('#modeloCopiar').onclick = () => copiar(true);
  folha.querySelector('#modeloSo').onclick = () => copiar(false);
}

async function abrirConfigGithub(publicarDepois = false) {
  const gh = { ...GITHUB_PADRAO, ...(await banco.ler('github')) };
  gh.token ||= estado.cofre?.token || '';
  const folha = abrirFolha(`
    <h2>Publicação no GitHub</h2>
    <p class="meta">Só no celular de quem publica. O token fica guardado apenas neste aparelho (protegido pela digital) e precisa de acesso <b>Contents: Read and write</b> ao repositório.</p>
    <form id="form" autocomplete="off">
      <label for="token">Token do GitHub</label>
      <input class="campo mono" id="token" type="password" placeholder="github_pat_…" value="${esc(gh.token)}" autocapitalize="off" spellcheck="false" required>
      <label for="repo">Repositório</label>
      <input class="campo mono" id="repo" value="${esc(gh.repo)}" autocapitalize="off" spellcheck="false" required>
      <label for="branch">Branch</label>
      <input class="campo mono" id="branch" value="${esc(gh.branch)}" autocapitalize="off" spellcheck="false" required>
      <label for="caminho">Arquivo publicado</label>
      <input class="campo mono" id="caminho" value="${esc(gh.caminho)}" autocapitalize="off" spellcheck="false" required>
      <label for="vence">Validade do token <span class="opcional">(opcional)</span></label>
      <input class="campo" id="vence" type="date" value="${esc((await banco.ler('tokenVence')) || '')}">
      <p class="nota" style="margin:-8px 0 14px">O GitHub mostra a data ao criar o token ("Expires on…"). Com ela, o app avisa 7 dias antes de vencer. Token sem vencimento: deixe em branco.</p>
      <p class="erro" id="erro"></p>
      <button class="btn prim" id="salvar">Testar e salvar</button>
    </form>`);
  folha.querySelector('#form').onsubmit = async e => {
    e.preventDefault();
    const val = id => folha.querySelector(id).value.trim();
    const novo = { token: val('#token'), repo: val('#repo').replace(/^https:\/\/github\.com\//, ''), branch: val('#branch'), caminho: val('#caminho') };
    const btn = folha.querySelector('#salvar');
    btn.disabled = true;
    btn.textContent = 'Testando…';
    try {
      const r = await fetch(`https://api.github.com/repos/${novo.repo}/branches/${encodeURIComponent(novo.branch)}`, {
        headers: { Authorization: `Bearer ${novo.token}`, Accept: 'application/vnd.github+json' },
      });
      if (!r.ok) throw erroGithub(r);
      await gravarGithub(novo);
      await banco.gravar('tokenVence', folha.querySelector('#vence').value || null);
      estado.github = true;
      fecharFolha();
      if (estado.resumoOk) renderizarApp(estado.aba, { remendo: true }); // aparecem os botões de lançar
      if (publicarDepois) publicar();
      else aviso('Publicação configurada.');
    } catch (err) {
      folha.querySelector('#erro').textContent = `Não funcionou: ${err.message}.`;
      btn.disabled = false;
      btn.textContent = 'Testar e salvar';
    }
  };
}

// ---------- menu (folha inferior) ----------
// v9.12: menu em grupos (o que se usa, Claude, dados, ajuda) e o que é do aparelho numa tela própria, Configurações
const itemMenu = (acao, ic, titulo, sub, extra = '') =>
  `<button type="button" class="item ${extra}" data-acao="${acao}">${icone(ic)}<span><b>${titulo}</b><small>${sub}</small></span></button>`;
// linha com chave liga/desliga: o texto abre a tela do assunto (teste, explicação), a chave muda na hora
const itemChave = (acao, ic, titulo, sub, on) =>
  `<div class="item item-chave">${icone(ic)}<button type="button" class="item-texto" data-acao="${acao}"><b>${titulo}</b><small>${sub}</small></button>
    <button type="button" class="chave${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${titulo}" data-chave="${acao}"><i></i></button></div>`;

function menuHtml() {
  const r = estado.conteudo ? resumo(estado.conteudo.html) : null;
  const quando = estado.envelope ? dataHora(estado.envelope.publicadoEm) : '';
  let rc = null;
  try {
    rc = estado.cart.conteudo ? resumoCarteira(estado.cart.conteudo.html) : null;
  } catch { /* carteira ilegível */ }
  const gh = !!estado.github, d = !!estado.dados;
  const local = estado.origem === 'local' || estado.cart.origem === 'local';
  return `
    <div class="folha-marca"><img src="icons/logo.svg" alt=""><h2>Lastro</h2></div>
    <section class="menu-estado${local ? ' local' : ''}">
      <p>${r ? `<b>Caixa</b> ${esc(r.periodoLabel)} · dados de ${esc(dataCurta(r.ultimaAtualizacao))}` : 'Nenhum painel carregado'}${rc ? `<br><b>Carteira</b> posição de ${esc(dataCurta(rc.data))}` : ''}</p>
      <p class="menu-selo">${local ? `${icTom('atencao')}Só neste celular — ainda não foi para a família` : `${icTom('bom')}Versão da família · publicada ${esc(quando)}`}</p>
      <div class="menu-acoes"><button type="button" class="botao-sec" data-acao="atualizar">Buscar atualização</button>${gh && local ? '<button type="button" class="botao-sec" data-acao="publicar">Publicar agora</button>' : ''}</div>
    </section>
    ${estado.resumoOk && estado.vista === 'painel' ? itemMenu('resumo', 'resumo', 'Voltar ao app', 'Início, caixa, cartão, carteira e análises') : ''}
    ${d ? `<p class="grupo">Do dia a dia</p>
    ${itemMenu('extrato', 'lupa', 'Extrato do mês', 'Busca em tudo: contas, cartão e investimentos')}
    ${itemMenu('semana', 'resumo', 'Resumo da semana', 'Quanto saiu nos últimos 7 dias e o que vem aí (aparece sozinho aos domingos)')}
    ${gh ? itemMenu('orcamento', 'lista', 'Orçamento por categoria', 'Limite por mês; o app avisa em 80% e quando passar') : ''}
    ${gh && estado.cart.dados ? itemMenu('metas', 'ordem', 'Metas', 'Reserva, viagem, apê: quanto e até quando') : ''}
    ${estado.cart.dados ? itemMenu('ir', 'documento', 'Imposto de Renda', 'Dividendos, aportes, resgates e posição do ano') : ''}
    ${itemChave('olho', 'olho', 'Esconder os valores', 'Troca os R$ por ••• neste celular', valoresEscondidos())}` : ''}
    ${gh ? `<p class="grupo">Com o Claude</p>
    ${DEMO ? '' : itemMenu('conector', 'enviar', 'Claude direto', (() => { try { return localStorage.getItem('lastro-conector') === '1' ? 'Ligado — o Claude lê e grava no Lastro' : 'Desligado — ligue para não mandar arquivo'; } catch { return 'O Claude lê e grava no Lastro'; } })())}
    ${d ? itemMenu('claude', 'enviar', 'Levar para o Claude', 'Fechamento do mês e análise do dia') : ''}
    ${itemMenu('projeto', 'documento', 'Instruções do Projeto', projetoDesatualizado() ? `<b class="atencao-txt">Mudaram na v${VERSAO_PROJETO} — copie e cole de novo</b>` : 'O texto do Projeto "Vida financeira"')}` : ''}
    <p class="grupo">Dados</p>
    ${itemMenu('importar', 'importar', 'Importar arquivo', `Caixa ou carteira (.html ou .json)${gh ? ' — e já publica' : ''}`)}
    ${gh ? itemMenu('publicar', 'publicar', 'Publicar para a família', local ? 'Envia esta versão para o outro celular' : 'Reenvia a versão atual') : ''}
    ${gh && d ? itemMenu('lancamentos', 'lista', 'Lançamentos do app', 'Histórico, desfazer e exportar (.json)') : ''}
    ${gh && d ? itemMenu('categorias', 'etiqueta', 'Categorias', 'Criar, editar e excluir — ícone, emoji e cor') : ''}
    <p class="grupo">Ajuda</p>
    ${itemMenu('tour', 'ajuda', 'Como usar o Lastro', 'O essencial em 4 passos')}
    ${itemMenu('feedback', 'ideia', 'Ideias e feedback', gh ? 'Anote o que melhorar — vai para a lista do Claude' : 'Anote o que melhorar e mande para o Bruno')}
    ${itemMenu('novidades', 'novidade', 'Novidades e histórico', `O que mudou na v${VERSAO_APP}`)}
    <div class="menu-config">${itemMenu('config', 'engrenagem', 'Configurações', 'Avisos, lembretes, proteção, senha, publicação e suporte')}</div>
    <p class="versao">app v${VERSAO_APP}</p>`;
}

async function configHtml() {
  const vence = estado.github ? await banco.ler('tokenVence').catch(() => null) : null;
  const dias = vence ? Math.round((new Date(`${vence}T12:00`) - new Date(`${hojeBrasil()}T12:00`)) / 86400000) : null;
  const token = !estado.github ? '' : !vence ? 'Validade do token não informada — informe para o app avisar antes de vencer'
    : dias < 0 ? `<b class="ruim-txt">Token vencido em ${esc(dataCurta(vence))} — troque para voltar a publicar</b>`
      : dias <= 7 ? `<b class="atencao-txt">Token vence em ${dias} ${dias === 1 ? 'dia' : 'dias'} (${esc(dataCurta(vence))})</b>` : `Token válido até ${esc(dataCurta(vence))}`;
  return `
    <button type="button" class="link voltar-menu" data-acao="menu">‹ Menu</button>
    <h2>Configurações</h2>
    <p class="grupo">Neste celular</p>
    ${itemChave('v10', 'novidade', 'Interface nova (em teste)', 'A repaginação, aos poucos — dá para voltar', v10Ligada())}
    ${suportaAvisos() && !DEMO ? itemChave('avisos', 'avisos', 'Avisos de atualização', 'Notifica quando sai painel novo', !!estado.avisos) : ''}
    ${itemChave('lembretes', 'sino', 'Lembretes de contas', 'Na véspera e no dia de cada conta', !!estado.lembretes)}
    ${itemMenu('protecao', 'cadeado', 'Proteção do app', estado.salvo?.modo === 'senha' ? 'Senha da família a cada abertura' : 'Digital a cada abertura · trancar agora')}
    ${itemMenu('senha', 'chave', 'Senha da família', estado.cofre?.senha ? 'Ver, copiar ou enviar para o outro celular' : 'Criar uma nova senha')}
    ${itemMenu('organizar', 'ordem', 'Organizar o Início', 'Ordem dos cartões e o que aparece neste celular')}
    ${estado.instalar ? itemMenu('instalar', 'instalar', 'Instalar na tela inicial', 'Abre como app, sem barra do navegador') : ''}
    ${DEMO ? '' : estado.github ? `<p class="grupo">Publicação</p>${itemMenu('github', 'github', 'Token do GitHub', token)}` : `<p class="grupo">Publicação</p>${itemMenu('github', 'github', 'Configurar publicação', 'Só no celular de quem lança (token do GitHub)')}`}
    <p class="grupo">Suporte</p>
    ${itemMenu('diagnostico', 'lupa', 'Diagnóstico', estado.diagnostico ? 'Houve um problema ao desenhar o painel' : 'Versão, publicação e erros — mande quando algo não funcionar')}
    ${estado.conteudo ? itemMenu('paineisTeste', 'enviar', 'Baixar os painéis para testes', 'Os dois painéis vão para Downloads, para o Claude Code testar') : ''}
    ${estado.resumoOk && estado.vista === 'resumo' ? itemMenu('painel', 'resumo', 'Ver o arquivo do agente', 'O painel como o agente gerou — só para conferência') : ''}
    <div class="zona-perigo"><p class="grupo">Zona de perigo</p>
    ${DEMO ? itemMenu('recomecar', 'atualizar', 'Recomeçar a demonstração', 'Volta tudo ao começo, com os dados de hoje') : itemMenu('sair', 'sair', 'Apagar dados deste aparelho', 'Pede a senha da família de novo', 'perigo')}</div>
    <p class="versao">app v${VERSAO_APP}</p>`;
}

async function abrirConfiguracoes({ rolagem = 0 } = {}) {
  const folha = abrirFolha(await configHtml());
  folha.scrollTop = rolagem;
  ligarMenu(folha);
}

function ligarMenu(folha) {
  const acoes = {
    resumo: () => irPara('resumo'),
    painel: () => irPara('painel'),
    feedback: () => abrirFeedback(),
    extrato: () => abrirExtrato(),
    semana: () => abrirResumoSemana(),
    ir: () => abrirPacoteIR(),
    organizar: () => abrirOrganizarInicio(),
    tour: () => abrirTour(),
    olho: () => { fecharFolha(); alternarOlho(); },
    config: () => abrirConfiguracoes(),
    recomecar: () => location.reload(),
    menu: () => { abrirFolha().scrollTop = 0; },
    novidades: () => abrirNovidades('todas'),
    atualizar: () => { fecharFolha(); buscarAtualizacao(); buscarCarteira({ silencioso: false }); atualizarCotacoes({ forcar: true }); },
    importar: () => { fecharFolha(); escolherArquivo(); },
    orcamento: () => abrirOrcamento(),
    metas: () => abrirMeta('nova'),
    publicar,
    lancar: () => abrirLancar(),
    lancamentos: abrirLancamentos,
    categorias: () => abrirGerenciarCategorias(),
    claude: () => abrirLevarClaude(),
    lembretes: abrirLembretes,
    avisos: abrirAvisos,
    protecao: abrirProtecao,
    instalar: () => { fecharFolha(); instalarApp(); },
    github: () => abrirConfigGithub(),
    diagnostico: abrirDiagnostico,
    projeto: abrirInstrucoesProjeto,
    conector: () => abrirConector(),
    paineisTeste: mandarPaineis,
    senha: abrirSenhaFamilia,
    sair: async () => {
      if (!(await confirmar({ titulo: 'Apagar os dados deste aparelho?', texto: 'O painel e a senha saem deste celular. A versão publicada continua intacta.', sim: 'Apagar deste aparelho', perigo: true }))) return;
      await banco.limpar();
      location.reload();
    },
  };
  folha.querySelectorAll('[data-acao]').forEach(b => { b.onclick = acoes[b.dataset.acao]; });
  // chaves liga/desliga (v9.12): mudam na hora e redesenham a tela em que estão (menu ou Configurações)
  folha.querySelectorAll('[data-chave]').forEach(b => {
    b.onclick = async () => {
      const qual = b.dataset.chave, naConfig = !!folha.querySelector('[data-acao="menu"]');
      b.disabled = true;
      try {
        if (qual === 'olho') alternarOlho();
        if (qual === 'v10') { ligarV10(!v10Ligada()); document.documentElement.classList.toggle('v10', v10Ligada()); if (estado.resumoOk) renderizarApp(estado.aba); }
        if (qual === 'avisos') { if (estado.avisos) await desligarAvisos(); else await ligarAvisos({ pedir: true }); }
        if (qual === 'lembretes') { if (estado.lembretes) await desligarLembretes(); else await ligarLembretes(); }
      } catch (e) {
        aviso(e.message, { erro: true, fixo: true });
      }
      const rolagem = folha.scrollTop; // a chave muda e a tela fica onde estava
      if (naConfig) abrirConfiguracoes({ rolagem }); else abrirFolha().scrollTop = rolagem;
    };
  });
}

// ---------- lembretes de contas ----------
// O service worker acorda pela Periodic Background Sync (Chrome, app instalado) e avisa
// na véspera e no dia de cada conta da agenda. O Android decide a hora exata.
async function abrirLembretes() {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
  const suporta = !!(reg && 'periodicSync' in reg && 'Notification' in window);
  const folha = abrirFolha(`
    <h2>Lembretes de contas</h2>
    <p class="meta">Avisa <b>na véspera e no dia</b> de cada conta do mês (aluguel, condomínio, energia, mesadas…), conforme o último painel. O Android decide a hora da verificação — em geral uma vez por dia — então use como um lembrete extra. As próximas contas também aparecem no Início do app.</p>
    ${suporta ? '' : '<p class="meta erro-txt">Este navegador não permite lembretes em segundo plano. Use o Chrome com o app instalado na tela inicial.</p>'}
    ${estado.lembretes
      ? '<button type="button" class="btn" id="testar">Enviar uma notificação de teste</button><button type="button" class="btn" id="desligar">Desligar lembretes</button>'
      : `<button type="button" class="btn prim" id="ligar" ${suporta ? '' : 'disabled'}>Ligar lembretes</button>`}`);
  folha.querySelector('#ligar')?.addEventListener('click', async () => {
    try { await ligarLembretes(); } catch (e) { return aviso(e.message, { erro: true, fixo: true }); }
    fecharFolha();
    aviso('Lembretes ligados.');
  });
  folha.querySelector('#testar')?.addEventListener('click', () => {
    reg.showNotification('Lembretes funcionando', { body: 'É assim que o aviso de conta vai aparecer.', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'teste' });
  });
  folha.querySelector('#desligar')?.addEventListener('click', async () => {
    await desligarLembretes();
    fecharFolha();
    aviso('Lembretes desligados.');
  });
}

async function ligarLembretes() {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
  if (!reg || !('periodicSync' in reg) || !('Notification' in window)) throw new Error('Este navegador não permite lembretes em segundo plano. Use o Chrome com o app instalado na tela inicial.');
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notificações bloqueadas. Libere em Configurações do Android → Aplicativos → Lastro → Notificações.');
  const perm = await navigator.permissions.query({ name: 'periodic-background-sync' }).catch(() => null);
  if (perm && perm.state !== 'granted') throw new Error('Para os lembretes funcionarem, instale o app na tela inicial pelo Chrome e abra por lá.');
  try {
    await reg.periodicSync.register('lembretes', { minInterval: 12 * 60 * 60 * 1000 });
  } catch (e) {
    throw new Error(`Não deu para ligar os lembretes: ${e.message}`);
  }
  estado.lembretes = true;
  await banco.gravar('lembretes', true);
  await banco.gravar('avisados', []);
  reg.active?.postMessage('lembrar'); // já avisa se houver conta hoje ou amanhã
}

async function desligarLembretes() {
  const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null;
  await reg?.periodicSync?.unregister('lembretes').catch(() => {});
  estado.lembretes = false;
  await banco.gravar('lembretes', false);
}

// ---------- avisos de painel novo (push) ----------
// O worker/index.js confere a cada minuto se saiu painel novo e manda um push vazio para os
// aparelhos inscritos; o service worker mostra "Painel atualizado". Sem dados no push.
const suportaAvisos = () => 'PushManager' in window && 'serviceWorker' in navigator && 'Notification' in window;
const chaveBytes = t => Uint8Array.from(atob(t.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function postarInscricao(caminho, inscricao) {
  const r = await fetch(caminho, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inscricao) });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dados.erro || `erro ${r.status} do servidor de avisos`);
  return dados;
}

async function ligarAvisos({ pedir = false } = {}) {
  if (!suportaAvisos()) throw new Error('este navegador não recebe avisos');
  if (Notification.permission !== 'granted') {
    if (!pedir || (await Notification.requestPermission()) !== 'granted') throw new Error('as notificações estão bloqueadas para o app');
  }
  const reg = await navigator.serviceWorker.ready;
  const r = await fetch('push/chave', { cache: 'no-store' });
  if (!r.ok) throw new Error('o servidor de avisos ainda não está no ar');
  const { chave } = await r.json();
  let inscricao = await reg.pushManager.getSubscription();
  // chave do servidor mudou: a inscrição antiga não serve mais
  if (inscricao && (await banco.ler('avisosChave')) !== chave) {
    await inscricao.unsubscribe().catch(() => {});
    inscricao = null;
  }
  inscricao ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(chave) });
  await postarInscricao('push/inscrever', inscricao);
  await banco.gravar('avisosChave', chave);
  await banco.gravar('avisos', true);
  estado.avisos = true;
  return inscricao;
}

async function desligarAvisos() {
  const reg = await navigator.serviceWorker.ready;
  const inscricao = await reg.pushManager.getSubscription();
  if (inscricao) {
    await postarInscricao('push/cancelar', inscricao).catch(() => {});
    await inscricao.unsubscribe().catch(() => {});
  }
  await banco.gravar('avisos', false);
  estado.avisos = false;
}

// Na abertura: renova a inscrição em silêncio. No celular de quem só consulta, liga sozinho
// se as notificações já estão permitidas, ou pergunta uma única vez.
async function prepararAvisos() {
  if (!suportaAvisos() || !estado.cofre) return;
  const preferencia = await banco.ler('avisos');
  if (preferencia === false) return;
  if (preferencia === true || (!estado.github && Notification.permission === 'granted')) {
    ligarAvisos().catch(e => console.warn('Avisos de atualização:', e.message));
    return;
  }
  if (estado.github || Notification.permission !== 'default' || (await banco.ler('avisosPerguntado'))) return;
  await banco.gravar('avisosPerguntado', true);
  // espera a tela ficar livre de outros avisos (um erro ou "painel salvo" não pode ser trocado pela pergunta)
  const perguntar = () => {
    if (!$('aviso').hidden) return setTimeout(perguntar, 5000);
    aviso('Quer receber um aviso no celular quando o painel for atualizado?', {
      acao: {
        rotulo: 'Ativar',
        fn: () => ligarAvisos({ pedir: true }).then(() => aviso('Avisos ligados.')).catch(e => aviso(`Não deu: ${e.message}.`, { erro: true })),
      },
      fixo: true,
    });
  };
  setTimeout(perguntar, 4000);
}

function abrirAvisos() {
  const folha = abrirFolha(`
    <h2>Avisos de atualização</h2>
    <p class="meta">Mostra uma notificação neste celular <b>sempre que um painel novo for publicado</b> — cerca de 1 a 3 minutos depois da publicação, mesmo com o app fechado. Tocando nela, o app abre já com os números novos.</p>
    ${estado.avisos
      ? '<button type="button" class="btn" id="testar">Testar agora</button><button type="button" class="btn" id="desligar">Desligar avisos</button>'
      : '<button type="button" class="btn prim" id="ligar">Ligar avisos</button>'}`);
  folha.querySelector('#ligar')?.addEventListener('click', async () => {
    try {
      await ligarAvisos({ pedir: true });
      fecharFolha();
      aviso('Avisos ligados.');
    } catch (e) {
      aviso(`Não deu para ligar: ${e.message}.`, { erro: true, fixo: true });
    }
  });
  folha.querySelector('#testar')?.addEventListener('click', async () => {
    try {
      await postarInscricao('push/testar', await ligarAvisos());
      aviso('Enviado. A notificação deve chegar em alguns segundos.');
    } catch (e) {
      aviso(`O teste falhou: ${e.message}.`, { erro: true, fixo: true });
    }
  });
  folha.querySelector('#desligar')?.addEventListener('click', async () => {
    await desligarAvisos();
    fecharFolha();
    aviso('Avisos desligados.');
  });
}

// ---------- proteção: o app sempre abre trancado (fase B, protecao.js) ----------
const TEMPO_FORA = 60 * 1000; // fora do app por mais que isso: tranca e apaga da memória
const MODOS = {
  digital: 'a digital guarda a chave dos dados',
  porta: 'a digital tranca o app',
  senha: 'senha da família a cada abertura',
};
const ondeSalvou = salvo => (salvo?.provedor && salvo.provedor !== 'outro' ? ` (chave de acesso no ${salvo.provedor})` : '');

// O diálogo da digital pode esconder a página por um instante: enquanto ele está na tela,
// as mudanças de visibilidade não cobrem nem trancam o app.
let verificando = false;
async function comDigital(fn) {
  verificando = true;
  try {
    return await fn();
  } finally {
    setTimeout(() => { verificando = false; }, 800);
  }
}

function htmlProteger() {
  return estado.digital
    ? `<button type="button" class="btn prim" id="usarDigital">Usar a digital</button>
      <p class="erro" id="erroProteger"></p>
      <button type="button" class="link" id="usarSenhaSempre">Prefiro digitar a senha da família toda vez</button>`
    : `<p class="texto">Este celular não tem digital, rosto ou PIN liberado para apps. Sem isso, o Lastro pede a <b>senha da família</b> a cada abertura (ou configure o bloqueio de tela do Android e abra o app de novo).</p>
      <button type="button" class="btn prim" id="usarSenhaSempre">Usar a senha da família</button>
      <p class="erro" id="erroProteger"></p>`;
}

// Liga os botões de htmlProteger; resolve com { salvo, cofre } quando a proteção foi criada.
function ligarProteger(raiz, cofre) {
  return new Promise(resolve => {
    const erro = raiz.querySelector('#erroProteger');
    const botoes = [...raiz.querySelectorAll('#usarDigital, #usarSenhaSempre')];
    const criar = async modo => {
      erro.textContent = '';
      botoes.forEach(b => { b.disabled = true; });
      try {
        resolve(await comDigital(() => criarProtecao(cofre, modo)));
      } catch {
        erro.textContent = 'A digital foi cancelada. Toque de novo para tentar.';
        botoes.forEach(b => { b.disabled = false; });
      }
    };
    raiz.querySelector('#usarDigital')?.addEventListener('click', () => criar('digital'));
    raiz.querySelector('#usarSenhaSempre').addEventListener('click', () => criar('senha'));
  });
}

// Primeira senha neste aparelho (ou atualização da v4): sem proteção, os dados não aparecem.
async function configurarProtecao(cofre) {
  const t = tela(`
    <p class="olho">Lastro · segurança</p>
    <h1>Proteja o Lastro</h1>
    <p class="texto">A partir de agora o app <b>sempre abre trancado</b>. A digital (ou o rosto/PIN do celular) destranca — e é ela que guarda a chave dos dados neste aparelho.</p>
    <p class="texto">Se o celular perguntar onde salvar a <b>chave de acesso</b>, pode ser no <b>Google</b> ou no <b>Samsung Pass</b> — o app confere sozinho o que cada um consegue guardar.</p>
    ${htmlProteger()}`);
  const { salvo, cofre: novo } = await ligarProteger(t, cofre);
  telaCarregando();
  if (salvo.modo === 'porta') setTimeout(() => aviso('Protegido. Neste celular a digital tranca o app; detalhes em menu → Proteção do app.', { duracao: 9000 }), 4000);
  return gravarProtecao(salvo, novo);
}

// Grava a proteção nova e tira do aparelho o que ela passou a guardar (token do GitHub, digital da v4)
async function gravarProtecao(salvo, cofre) {
  const gh = await banco.ler('github');
  if (salvo.modo === 'digital') {
    cofre.token = gh?.token || cofre.token || null;
    if (cofre.token) salvo = await regravarProtecao(salvo, cofre); // sela também o token
  }
  await banco.gravar('cofre', salvo);
  if (salvo.modo === 'digital' && gh?.token) await banco.gravar('github', { ...gh, token: null });
  await banco.apagar('trava');
  estado.salvo = salvo;
  return cofre;
}

// Até a v4 o aparelho guardava a chave sem proteção. Refaz a chave pela senha guardada (ou pede a
// senha, em instalações antigas que não a guardavam) e passa pela tela "Proteja o Lastro".
async function migrar(antigo) {
  let cofre = null;
  if (antigo.senha) {
    telaCarregando();
    const bruta = await derivarBruta(antigo.senha, b64.para(antigo.sal), antigo.iteracoes);
    cofre = { chave: await importarChave(bruta), bruta, sal: antigo.sal, iteracoes: antigo.iteracoes, senha: antigo.senha };
  } else {
    cofre = await new Promise(resolve => {
      const t = tela(`
        <p class="olho">Lastro · segurança</p>
        <h1>Digite a senha da família</h1>
        <p class="texto">Uma vez só, para ligar a proteção nova deste aparelho.</p>
        <form id="form">
          ${USUARIO_SENHA}
          <label for="senha">Senha</label>
          <input class="campo mono" id="senha" name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required>
          <p class="erro" id="erro"></p>
          <button class="btn prim" id="entrar">Continuar</button>
        </form>`);
      t.querySelector('#form').onsubmit = async e => {
        e.preventDefault();
        try {
          resolve(await abrirComSenha(t.querySelector('#senha').value, antigo.sal, antigo.iteracoes, [estado.envelope, await banco.ler('carteiraEnvelope')]));
        } catch {
          t.querySelector('#erro').textContent = 'Senha incorreta. Confira e tente de novo.';
        }
      };
    });
  }
  return configurarProtecao(cofre);
}

function abrirProtecao() {
  const folha = abrirFolha(`
    <h2>Proteção do app</h2>
    <p class="meta">O Lastro sempre abre trancado e tranca de novo depois de 1 minuto fora dele — o que foi decifrado sai da memória. Neste celular: <b>${MODOS[estado.salvo?.modo] || '—'}</b>${esc(ondeSalvou(estado.salvo))}.</p>
    ${estado.salvo?.modo === 'porta' ? `<p class="meta">Sem a digital ou a senha da família ninguém abre o Lastro. A diferença para o modo completo: ${estado.salvo.provedor === 'Samsung Pass' ? 'o Samsung Pass' : 'o gerenciador onde a chave de acesso ficou'} não guarda a chave dos dados, então ela fica no armazenamento do app, como até a v4 — só alguém com acesso técnico ao celular (cabo e modo desenvolvedor) chegaria a ela. Para o modo completo, refaça a proteção salvando a chave de acesso no <b>Google</b>.</p>` : ''}
    <button type="button" class="btn prim" id="trancarJa">Trancar agora</button>
    <details class="refazer">
      <summary>Refazer a proteção</summary>
      <p class="meta">Cria uma chave de acesso nova — use se trocou a digital do celular ou se a antiga sumiu.</p>
      ${htmlProteger()}
    </details>`);
  folha.querySelector('#trancarJa').onclick = () => trancarEVoltar();
  ligarProteger(folha, { ...estado.cofre }).then(async ({ salvo, cofre }) => {
    estado.cofre = await gravarProtecao(salvo, cofre);
    fecharFolha();
    aviso('Proteção refeita.');
  });
}

// Apaga tudo o que foi decifrado: painéis, telas, números e a chave (os arquivos cifrados ficam).
function apagarDaMemoria() {
  fecharFolha();
  $('aviso').hidden = true;
  $('moldura').replaceChildren();
  $('moldura-carteira').replaceChildren();
  $('resumo').replaceChildren();
  $('tela').hidden = true;
  $('tela').replaceChildren();
  Object.assign(estado, { conteudo: null, frame: null, motor: null, dados: null, resumoOk: false, painelPendente: false });
  Object.assign(estado.cart, { conteudo: null, frame: null, dados: null, pendente: false });
  estado.cofre?.bruta?.fill(0);
  estado.cofre = null;
  esquecerSessao();
}

// v9.6: o Android às vezes recarrega o app que ficou em segundo plano (falta de memória, outro app pesado aberto) e
// ele voltava trancado mesmo depois de poucos segundos fora. Ao sair, o cofre aberto fica guardado por TEMPO_FORA,
// cifrado com uma chave não-exportável (o JS não lê a chave); ao voltar, a cópia é apagada antes de qualquer coisa.
// A cópia só vale na MESMA janela do app (marca no sessionStorage, que o Android guarda quando ele recarrega o app e
// apaga quando o Bruno fecha o app de propósito): fechou e abriu de novo → digital, como ele pediu.
const MARCA_SESSAO = 'lastro-sessao';
async function guardarSessao() {
  const c = estado.cofre;
  if (!c || !protegido(estado.salvo)) return;
  const marca = b64.de(crypto.getRandomValues(new Uint8Array(16)));
  try { sessionStorage.setItem(MARCA_SESSAO, marca); } catch { return; } // sem sessionStorage: não guarda nada
  const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const segredos = { bruta: c.bruta ? b64.de(c.bruta) : null, senha: c.senha ?? null, token: c.token };
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(JSON.stringify(segredos)));
  await banco.gravar('sessao', { ate: Date.now() + TEMPO_FORA, marca, k, iv, ct, chave: c.chave, embrulho: c.embrulho || null, sal: c.sal, iteracoes: c.iteracoes });
}
const esquecerSessao = () => banco.gravar('sessao', null).catch(() => {});
async function retomarSessao() {
  const s = await banco.ler('sessao').catch(() => null);
  if (!s) return null;
  await esquecerSessao();
  let marca = null;
  try { marca = sessionStorage.getItem(MARCA_SESSAO); sessionStorage.removeItem(MARCA_SESSAO); } catch { /* sem sessionStorage */ }
  const agora = Date.now();
  if (!marca || marca !== s.marca || !(agora < s.ate && s.ate - agora <= TEMPO_FORA) || s.sal !== estado.salvo?.sal) return null;
  const x = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: s.iv }, s.k, s.ct)));
  // token ausente no JSON = undefined (destrancou pela senha no modo digital), como no cofre original
  return { chave: s.chave, ...(x.bruta ? { bruta: b64.para(x.bruta) } : {}), sal: s.sal, iteracoes: s.iteracoes, senha: x.senha, token: x.token, ...(s.embrulho ? { embrulho: s.embrulho } : {}) };
}

// Tranca e resolve quando a digital (ou a senha) destrancar.
let destrancado = null;
let aoDestrancar = null;
function travar() {
  if (estado.travado) return destrancado;
  apagarDaMemoria();
  estado.travado = true;
  mostrarTrava();
  destrancado = new Promise(r => { aoDestrancar = r; });
  if (!document.hidden) destravar();
  return destrancado;
}

// Tranca no meio do uso (1 minuto fora ou "Trancar agora") e, destrancado, mostra tudo de novo.
async function trancarEVoltar() {
  if (estado.travado) return;
  await travar();
  await abrirDados();
  buscarAtualizacao({ silencioso: true });
  buscarCarteira();
}

function mostrarTrava() {
  const t = $('trava');
  const soSenha = estado.salvo?.modo === 'senha';
  t.hidden = false;
  t.innerHTML = `
    <div class="entrada">
      <img class="marca" src="icons/logo.svg" alt="">
      <h1>Lastro trancado</h1>
      <p class="texto">${soSenha ? 'Digite a senha da família para abrir.' : 'Use a digital para abrir.'}</p>
      ${soSenha ? '' : '<button type="button" class="btn prim" id="destravar">Destrancar</button>'}
      <form id="formTrava"${soSenha ? '' : ' hidden'}>
        ${USUARIO_SENHA}
        <label for="senhaTrava">Senha da família</label>
        <input class="campo mono" id="senhaTrava" name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required>
        <p class="erro" id="erroTrava"></p>
        <button class="btn${soSenha ? ' prim' : ''}">Destrancar com a senha</button>
      </form>
      ${soSenha ? '' : '<button type="button" class="link" id="usarSenha">Usar a senha da família</button>'}
    </div>`;
  t.querySelector('#destravar')?.addEventListener('click', destravar);
  t.querySelector('#usarSenha')?.addEventListener('click', () => {
    t.querySelector('#formTrava').hidden = false;
    t.querySelector('#usarSenha').hidden = true;
    t.querySelector('#senhaTrava').focus();
  });
  t.querySelector('#formTrava').onsubmit = async e => {
    e.preventDefault();
    const botao = t.querySelector('#formTrava button');
    botao.disabled = true;
    try {
      const { sal, iteracoes } = estado.salvo;
      const envelopes = [estado.envelope, estado.cart.envelope || (await banco.ler('carteiraEnvelope'))];
      liberar(await abrirComSenha(t.querySelector('#senhaTrava').value, sal, iteracoes, envelopes));
    } catch {
      t.querySelector('#erroTrava').textContent = 'Senha incorreta.';
      botao.disabled = false;
    }
  };
}

// Ao sair do app: cobre a tela (a lista de apps recentes não mostra os números)
function cobrir() {
  const t = $('trava');
  if (!t.hidden) return;
  t.hidden = false;
  t.innerHTML = '<div class="entrada"><img class="marca" src="icons/logo.svg" alt=""></div>';
}

function descobrir() {
  if (estado.travado) return;
  $('trava').hidden = true;
  $('trava').innerHTML = '';
}

function liberar(cofre) {
  medidas.destrancou = performance.now();
  medidas.aposDestrancar = null;
  pedidoDigital?.abort(); // destrancou pela senha: o pedido da digital não pode ficar pendurado
  pedidoDigital = null;
  estado.cofre = cofre;
  estado.travado = false;
  $('trava').hidden = true;
  $('trava').innerHTML = '';
  aoDestrancar?.();
  aoDestrancar = null;
}

let pedidoDigital = null;
async function destravar() {
  if (verificando || !estado.travado || estado.salvo?.modo === 'senha') return;
  const pedido = (pedidoDigital = new AbortController());
  try {
    const cofre = await comDigital(() => abrirComDigital(estado.salvo, pedido.signal));
    if (pedidoDigital === pedido) liberar(cofre);
  } catch {
    // cancelou: fica na tela de bloqueio com o botão e a senha
  } finally {
    if (pedidoDigital === pedido) pedidoDigital = null;
  }
}

// Painel e carteira guardados (cifrados) neste aparelho -> telas do app
async function abrirDados() {
  if (estado.envelope) {
    try {
      mostrarPainel(await decifrar(estado.envelope, estado.cofre.chave));
    } catch {
      estado.envelope = null;
    }
  }
  await carregarCarteiraLocal();
}

// ---------- lançamentos no app (Fase 1, lancamentos.js) ----------
// Só no celular de quem publica. Cada lançamento: versão publicada mais nova primeiro → altera o JSON
// (função pura) → guarda cifrado neste aparelho → publica. O envelope de antes fica (cifrado) para desfazer.
const MAX_DESFAZER = 10;
const virgula = v => String(v).replace('.', ',');

function podeLancar({ cartao = false } = {}) {
  if (!estado.github || !estado.dados) return false;
  try {
    validar(estado.dados, hojeBrasil(), cartao ? { cartao: true, proximoMes: true } : {});
    return true;
  } catch (e) {
    aviso(e.message, { erro: true, fixo: true });
    return false;
  }
}

// Base para editar: se o agente publicou algo mais novo, aplica antes (e pede para lançar de novo)
async function baseParaEditar() {
  const remoto = await consultarRemoto();
  if (remoto && estado.envelope && remoto.publicadoEm > estado.envelope.publicadoEm) {
    if (remoto.kdf?.sal !== estado.cofre.sal) throw new Error('A senha da família mudou em outro aparelho — busque a atualização antes de lançar.');
    if (estado.origem === 'local') throw new Error('Há uma versão publicada mais nova e este aparelho tem mudanças não publicadas. Publique ou busque a atualização antes de lançar.');
    await aplicarRemoto(remoto);
    throw new Error('Chegou uma versão nova do painel. Confira e lance de novo.');
  }
  return estado.conteudo;
}

// Carteira para editar junto (v7): se há uma publicada mais nova, aplica antes (e pede para lançar de novo)
async function baseCarteiraParaEditar() {
  if (!estado.cart.conteudo) return null;
  let remoto = null;
  try {
    const r = DEMO ? null : await fetch(`${REMOTO_CARTEIRA}?t=${Date.now()}`, { cache: 'no-store' });
    if (r?.ok) remoto = await r.json();
  } catch { /* sem conexão: segue com a do aparelho */ }
  if (remoto?.formato === 'painel-cifrado' && remoto.kdf?.sal === estado.cofre.sal && estado.cart.envelope
    && remoto.publicadoEm > estado.cart.envelope.publicadoEm) {
    if (estado.cart.origem === 'local') throw new Error('Há uma carteira publicada mais nova e este aparelho tem mudanças não publicadas na carteira. Publique ou busque a atualização antes.');
    await buscarCarteira();
    throw new Error('Chegou uma versão nova da carteira. Confira e lance de novo.');
  }
  return estado.cart.conteudo;
}

// alterar(cashflow, carteira) devolve o cashflow novo ou { cf, cart }. O que muda no caixa e mexe na carteira
// (aporte, resgate, dividendo) vai para a carteira sozinho (investimentos.js → sincronizar), e a cópia do
// patrimônio no caixa acompanha. Desfazer volta os dois.
// Um lançamento por vez: o segundo toque espera o primeiro publicar (senão as duas publicações se atropelam)
let filaLancamentos = Promise.resolve();
// v9.9.12: passo do roteiro da carteira (plano_acao, escrito pelo Claude no PLANO) marcado como feito no app
function marcarPasso(n, como = 'feito') {
  const cancelar = como === 'cancelar';
  return aplicarLancamento((cf, cart) => {
    const c = structuredClone(cart);
    const p = c?.plano_acao?.passos?.find(x => String(x.n) === String(n));
    if (!p) throw new Error('Esse passo não está mais no plano — busque a atualização.');
    Object.assign(p, cancelar ? { status: 'CANCELADO', cancelado_em: hojeBrasil() } : { status: 'CONCLUIDO', concluido_em: hojeBrasil() });
    c.plano_acao.concluidos = c.plano_acao.passos.filter(x => /conclu/i.test(x.status || '')).length;
    return { cf, cart: c };
  }, `Plano: passo ${n} ${cancelar ? 'não vou fazer' : 'feito'}`);
}

function aplicarLancamento(alterar, rotulo) {
  const vez = filaLancamentos.then(() => executarLancamento(alterar, rotulo));
  filaLancamentos = vez.catch(() => {});
  return vez;
}

async function executarLancamento(alterar, rotulo) {
  aviso({ titulo: rotulo, detalhe: 'Salvando…' }, { tom: 'carregando' });
  let sinc;
  try {
    const base = await baseParaEditar();
    const baseCart = await baseCarteiraParaEditar();
    const hoje = hojeBrasil();
    const dados0 = extrairDados(base.html);
    if (!dados0.categoriasApp && estado.categoriasCopia) dados0.categoriasApp = { lista: estado.categoriasCopia };
    if (!dados0.orcamentos && estado.orcamentosCopia?.length) dados0.orcamentos = estado.orcamentosCopia;
    const cart0 = baseCart ? extrairCarteira(baseCart.html) : null;
    if (cart0 && !cart0.metas && estado.metasCopia?.length) cart0.metas = estado.metasCopia;
    if (cart0 && !cart0.fichas_ativos && estado.fichasCopia) cart0.fichas_ativos = estado.fichasCopia;
    let r = alterar(dados0, cart0); // lança erro de validação sem mudar nada
    if (!r?.cf) r = { cf: r, cart: cart0 };
    sinc = sincronizar(dados0, r.cf, r.cart, hoje);
    const cartNovo = sinc.cart;
    const cartMudou = !!cartNovo && cartNovo !== cart0;
    if (cartMudou) copiarPatrimonio(r.cf, cartNovo, hoje);
    const antes = estado.envelope;
    const cartAntes = cartMudou ? estado.cart.envelope : null;
    if (cartMudou) await guardarCarteira({ ...baseCart, html: aplicarCarteira(baseCart.html, cartNovo), arquivo: 'lançamento no app', importadoEm: new Date().toISOString() });
    // v8.8: a cópia no aparelho acompanha o que foi salvo (inclusive quando tudo foi apagado)
    estado.orcamentosCopia = r.cf.orcamentos || null;
    banco.gravar('orcamentosCopia', estado.orcamentosCopia).catch(() => {});
    if (r.cart) { estado.metasCopia = r.cart.metas || null; banco.gravar('metasCopia', estado.metasCopia).catch(() => {}); }
    if (r.cart?.fichas_ativos) { estado.fichasCopia = r.cart.fichas_ativos; banco.gravar('fichasCopia', estado.fichasCopia).catch(() => {}); }
    await guardarLocal({ ...base, html: aplicarDados(base.html, r.cf), arquivo: 'lançamento no app', importadoEm: new Date().toISOString() }, { suave: true });
    const lista = (await banco.ler('desfazer')) || [];
    lista.push({ quando: new Date().toISOString(), rotulo, antes, depois: estado.envelope.publicadoEm, ...(cartMudou ? { cartAntes, cartDepois: estado.cart.envelope.publicadoEm } : {}) });
    await banco.gravar('desfazer', lista.slice(-MAX_DESFAZER));
  } catch (e) {
    fecharAvisoCarregando();
    throw e;
  }
  // v8.11: o envio vai para a fila (vários lançamentos seguidos viram um envio só; falha de rede tenta de novo sozinha)
  const extra = sinc.aviso ? `A carteira não mudou: ${sinc.aviso}` : sinc.resumo || '';
  aviso({ titulo: rotulo, detalhe: ['Salvo · vai para a família em instantes', extra].filter(Boolean).join(' · ') }, { tom: 'ok', acao: { rotulo: 'Desfazer', fn: desfazerUltimo }, duracao: 6000 });
  agendarEnvio(rotulo);
}

// ---------- v8.11: envio em fila ----------
// O lançamento grava no celular na hora. O envio espera ESPERA_ENVIO sem lançamento novo e manda tudo num commit só (menos
// montagens no Cloudflare; o Rafael recebe de uma vez). Falha de rede: tenta de novo sozinho, com espera crescente, e só
// mostra o selo "Aguardando envio". Erro que precisa do Bruno (token, configuração) aparece na hora, com Corrigir.
const ESPERA_ENVIO = 3000;
const ESPERAS_REENVIO = [30, 60, 120, 300, 600];
const envio = { timer: null, tentativas: 0, rotulos: [] };
const precisaDoBruno = erro => /token|configurad|permiss|repositório/i.test(erro || '');
function agendarEnvio(rotulo, atraso = ESPERA_ENVIO) {
  if (rotulo) envio.rotulos.push(rotulo);
  clearTimeout(envio.timer);
  envio.timer = setTimeout(enviarFila, atraso);
}
async function enviarFila() {
  envio.timer = null;
  const rotulos = envio.rotulos.slice();
  const mensagem = rotulos.length > 1 ? `Lastro: ${rotulos.length} lançamentos — ${rotulos.slice(0, 3).join('; ')}${rotulos.length > 3 ? '…' : ''}` : `Lastro: ${rotulos[0] || 'lançamentos pendentes deste celular'}`;
  // na mesma fila dos lançamentos: nunca envia enquanto outro lançamento está sendo salvo
  const vez = filaLancamentos.then(() => publicar({ silencioso: true, mensagem }));
  filaLancamentos = vez.catch(() => {});
  const ok = await vez.catch(() => false);
  if (ok) {
    envio.rotulos.splice(0, rotulos.length);
    envio.tentativas = 0;
    if (!envio.timer && $('aviso').hidden) aviso(rotulos.length > 1 ? `${rotulos.length} lançamentos enviados para a família` : 'Enviado para a família', { tom: 'ok', duracao: 2500 });
    return;
  }
  if (precisaDoBruno(estado.publicacao?.erro)) {
    aviso({ titulo: 'Não enviou para a família', detalhe: `Está salvo neste celular. Motivo: ${estado.publicacao.erro}.` }, { erro: true, fixo: true, acao: { rotulo: 'Corrigir', fn: resolverPendencia } });
    return;
  }
  envio.tentativas++;
  if (!envio.timer) agendarEnvio(null, ESPERAS_REENVIO[Math.min(envio.tentativas, ESPERAS_REENVIO.length) - 1] * 1000);
  marcarPendencias();
}

// Formulário de lançamento: montar() lê os campos e devolve [alterar, rotulo] (ou lança erro)
// v8.11: descrições lembradas (IDB 'descricoes': {chave: {texto, cat, n, em}}) — sugestões ao digitar, com a categoria junto
function ligarDescricoes(folha) {
  const campo = folha.querySelector('#lDesc, #cDesc');
  const lista = Object.values(estado.descricoes || {}).sort((a, b) => b.n - a.n || String(b.em).localeCompare(String(a.em))).slice(0, 60);
  if (!campo || !lista.length) return;
  folha.insertAdjacentHTML('beforeend', `<datalist id="descAnt">${lista.map(x => `<option value="${esc(x.texto)}"></option>`).join('')}</datalist>`);
  campo.setAttribute('list', 'descAnt');
  campo.addEventListener('change', () => {
    const x = estado.descricoes[chaveLoja(campo.value)];
    const cat = folha.querySelector('#lCat');
    if (!x?.cat || !cat || cat.value) return;
    cat.value = x.cat;
    const btn = folha.querySelector('#lCatBtn');
    if (btn) btn.innerHTML = `${iconeCategoria(x.cat)}<span>${esc(nomeCategoria(x.cat))}</span>`;
  });
}
async function lembrarDescricao(texto, cat) {
  texto = String(texto || '').trim();
  if (!texto) return;
  const d = (estado.descricoes ||= {});
  const k = chaveLoja(texto);
  d[k] = { texto, cat: cat || d[k]?.cat || '', n: (d[k]?.n || 0) + 1, em: hojeBrasil() };
  await banco.gravar('descricoes', d).catch(() => {});
}
async function lembrarFechamento(periodo, dia) {
  estado.fechamentoCartao = { ...estado.fechamentoCartao, [periodo]: dia };
  await banco.gravar('fechamentoCartao', estado.fechamentoCartao).catch(() => {});
}

function ligarFormLanc(folha, montar) {
  const erro = folha.querySelector('#lErro');
  const botao = folha.querySelector('#lOk');
  ligarDescricoes(folha);
  folha.querySelector('#formLanc').onsubmit = async e => {
    e.preventDefault();
    erro.textContent = '';
    const texto = botao.textContent;
    botao.disabled = true;
    botao.textContent = 'Lançando…';
    try {
      const montado = await montar();
      if (!montado) return; // desistiu na pergunta "de quando?"
      const [alterar, rotulo, depois] = montado;
      const desc = folha.querySelector('#lDesc, #cDesc')?.value, cat = folha.querySelector('#lCat, #cCat')?.value;
      await aplicarLancamento(alterar, rotulo);
      await lembrarDescricao(desc, cat);
      await depois?.();
    } catch (err) {
      if (erro.isConnected) erro.textContent = err.message;
      else aviso(err.message, { erro: true, fixo: true });
    } finally {
      botao.disabled = false;
      botao.textContent = texto;
    }
  };
}

function campoData(hoje, { valor = hoje, min = `${estado.dados.periodo}-01`, max = hoje } = {}) {
  return `<label for="lData">Data</label>
    <input class="campo" id="lData" type="date" value="${esc(valor)}" min="${min}" max="${max}" required>`;
}
// v9.8.3: tirar uma saída agendada para os próximos meses (Caixa › Contas › Agendado nos próximos meses)
async function abrirExterno(i) {
  if (!podeLancar()) return;
  const p = estado.dados.parcelamentosExternos?.[i];
  if (!p) return aviso('Esse agendamento não está mais no painel — busque a atualização.', { erro: true });
  const nome = p.descricao || String(p.item || '').replace(/\s*—.*$/, '');
  if (!(await confirmar({ titulo: `Tirar ${nome}?`, texto: `${brlTexto(p.valor || 0)} por mês, de ${mesCurto(p.primeiraParcela)} a ${mesCurto(p.ultimaParcela)}. Sai dos próximos meses e da projeção. Dá para desfazer.`, sim: 'Tirar', perigo: true }))) return;
  try { await aplicarLancamento(x => excluirExterno(x, { indice: i, itemAntes: p.item }, hojeBrasil()), `Agendamento tirado: ${nome}`); } catch (err) { aviso(err.message, { erro: true, fixo: true }); }
}

// v9.8.4: entrada agendada para um mês que vem (tocar → tirar)
async function abrirEntradaFutura(id) {
  if (!podeLancar()) return;
  const e = (estado.dados.entradasFuturasApp || []).find(x => x.id === id);
  if (!e) return aviso('Essa entrada não está mais no painel — busque a atualização.', { erro: true });
  if (!(await confirmar({ titulo: `Tirar ${e.descricao}?`, texto: `${brlTexto(e.valor)} em ${mesCurto(e.mes)}. Dá para desfazer.`, sim: 'Tirar', perigo: true }))) return;
  try { await aplicarLancamento(x => excluirEntradaFutura(x, { id }, hojeBrasil()), `Entrada agendada tirada: ${e.descricao}`); } catch (err) { aviso(err.message, { erro: true, fixo: true }); }
}

// v9.8.4 (controle total): corrigir um mês já fechado — com aviso, nunca travado
function abrirMesFechado(periodo, rascunho = null) {
  if (!podeLancar()) return;
  const m = (estado.dados.mesesFechados || []).find(x => x.periodo === periodo);
  if (!m) return aviso('Esse mês não está no histórico.', { erro: true });
  const r = m.resultado || {};
  const v = x => (Number.isFinite(x) ? virgula(x.toFixed(2)) : '');
  const f0 = rascunho || { rec: v(r.receitaTotal), fix: v(r.fixasTotal), var: v(r.variaveisTotal), itau: v(m.itau), notas: m.notas || '' };
  const folha = abrirFolha(`
    <h2>${esc(mesBonito(m.periodoLabel) || mesCurto(periodo))}</h2>
    <p class="nota">${icTom('atencao')} Mês já fechado: mudar aqui muda o histórico (médias, gráficos e comparações). O Claude vê a correção no próximo fechamento.</p>
    <form id="formLanc">
      <div class="sim-campos">
        <div><label for="mRec">Receitas (R$)</label><input class="campo" id="mRec" inputmode="decimal" value="${esc(f0.rec)}"></div>
        <div><label for="mFix">Contas fixas (R$)</label><input class="campo" id="mFix" inputmode="decimal" value="${esc(f0.fix)}"></div>
        <div><label for="mVar">Variáveis (R$)</label><input class="campo" id="mVar" inputmode="decimal" value="${esc(f0.var)}"></div>
        <div><label for="mItau">Fatura do Itaú (R$)</label><input class="campo" id="mItau" inputmode="decimal" value="${esc(f0.itau)}"></div>
      </div>
      <p class="nota" id="mSaldo"></p>
      <label for="mNotas">Anotação do mês</label>
      <textarea class="campo area-nota" id="mNotas" rows="4">${esc(f0.notas)}</textarea>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>`);
  const $m = q => folha.querySelector(q);
  const saldo = () => { const s2 = (lerValor($m('#mRec').value) || 0) - (lerValor($m('#mFix').value) || 0) - (lerValor($m('#mVar').value) || 0); $m('#mSaldo').textContent = `Saldo do mês: ${brlTexto(Math.round(s2 * 100) / 100)}`; };
  ['#mRec', '#mFix', '#mVar'].forEach(q => $m(q).addEventListener('input', saldo));
  saldo();
  ligarFormLanc(folha, () => {
    const n = q => { const t = $m(q).value.trim(); return t ? lerValor(t) : undefined; };
    return [x => editarMesFechado(x, { periodo, receitaTotal: n('#mRec'), fixasTotal: n('#mFix'), variaveisTotal: n('#mVar'), itau: n('#mItau'), notas: $m('#mNotas').value }, hojeBrasil()), `Mês fechado corrigido: ${mesCurto(periodo)}`];
  });
}

// v9.8.3: Pix/débito e conta a pagar aceitam data futura (planejamento): até 11 meses para a frente
const maxPlano = () => ultimoDiaDe(somarMeses(estado.dados.periodo, 60)); // v9.8.4: controle total — até 5 anos
const quandoSai = data => {
  const hoje = hojeBrasil();
  if (!data || data <= hoje) return 'agora';
  return data.slice(0, 7) === estado.dados.periodo ? `no dia ${data.slice(8, 10)}` : `em ${MESES_LONGOS[Number(data.slice(5, 7)) - 1]}/${data.slice(0, 4)}`;
};
function notaAgendamento(data, hoje, entrada = false) {
  if (!data || data <= hoje) return '';
  const mes = data.slice(0, 7);
  if (mes === estado.dados.periodo) return `Agendado: entra como a pagar no dia ${data.slice(8, 10)} e aparece nas Próximas contas.`;
  if (entrada) return `Fica para ${MESES_LONGOS[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}: o Claude inclui quando o mês abrir. Aviso: a projeção de 12 meses do painel ainda não soma entradas avulsas.`;
  return `Fica para ${MESES_LONGOS[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}: nada sai neste mês. Aparece em Caixa › Contas › Agendado nos próximos meses e na projeção.`;
}

// "Paguei" / "Recebi" nas próximas contas
function abrirPagar(ref) {
  if (!podeLancar()) return;
  const [lista, id] = ref.split('|');
  const it = acharItem(estado.dados, lista, id);
  if (!it) return aviso('Essa conta não está mais no painel — busque a atualização.', { erro: true });
  const receita = lista === 'receitas';
  const hoje = hojeBrasil();
  const folha = abrirFolha(`
    <h2>${receita ? 'Recebi' : 'Paguei'}</h2>
    <p class="meta">${esc(it.descricao)}</p>
    <form id="formLanc">
      <label for="lValor">Valor ${receita ? 'recebido' : 'pago'} (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" value="${esc(virgula(it.valor))}" required>
      ${campoData(hoje, { max: ultimoDiaDe(estado.dados.periodo) })}
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Confirmar e publicar</button>
    </form>`);
  ligarFormLanc(folha, () => {
    const valor = lerValor(folha.querySelector('#lValor').value);
    const data = folha.querySelector('#lData').value;
    const nome = it.descricao.replace(/\s*\(.*\)\s*$/, '');
    return [d => marcarPago(d, { lista, id, valor, data }, hojeBrasil()), `${nome}: ${receita ? 'recebido' : 'pago'} ${brlTexto(valor)}`];
  });
}


// "+": compra no cartão ou Pix/débito.
// preenchido: { valor, desc, cat, data, metodo, parcelas, pontual, recorrente, proxima, nota, sms }
// sms (Fase 2, sms.js): dados lidos do SMS do Itaú — mostra o SMS, avisa se já foi lançado e lembra a categoria da loja.
// A categoria se escolhe numa lista com ícones (abrirCategorias); trocar de aba ou de categoria redesenha a folha
// com o que já foi digitado (estadoForm).
const ultimoDiaDe = ym => { const [a, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`; };
const mesAnterior = ym => { const [a, m] = ym.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; };
const horaBrasil = () => Number(new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hourCycle: 'h23' }).format(new Date()));
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function abrirLancar(tipo = 'cartao', preenchido = {}) {
  if (!podeLancar({ cartao: true })) return;
  const d = estado.dados;
  const hoje = hojeBrasil();
  // mês virou e o agente ainda não fechou: só compras no cartão (vão para a fatura seguinte)
  const mesNovo = hoje.slice(0, 7) > d.periodo;
  let temCartao = true;
  try {
    validar(d, hoje, { cartao: true, proximoMes: true });
  } catch {
    temCartao = false;
  }
  if (!temCartao) tipo = 'pix';
  if (mesNovo) tipo = 'cartao';
  const sms = tipo === 'cartao' ? preenchido.sms : null;
  const estorno = !!sms?.estorno;
  const piso = d.regras?.pisoGastoPontual || 250;
  const metodo = preenchido.metodo || 'pix';
  const nParc = Number(preenchido.parcelas) || 1;
  const cat = preenchido.cat || '';
  const fechamento = ultimoDiaDe(d.periodo);
  const [, mesP] = d.periodo.split('-').map(Number);
  const proxNome = MESES_LONGOS[mesP % 12];
  // depois das 18h do último dia do mês a compra já cai na fatura seguinte
  // v8.11: se o Bruno já disse que a fatura fechou antes (IDB fechamentoCartao: período → 1º dia que vai para a seguinte), vale isso
  const fechouEm = estado.fechamentoCartao?.[d.periodo];
  const proxPadrao = data => (fechouEm && data >= fechouEm) || (data === fechamento && (sms?.hora ? sms.hora >= '18:00' : data === hoje && horaBrasil() >= 18));
  const ultimaSemana = data => data && data > `${d.periodo}-${String(Number(fechamento.slice(8)) - 7).padStart(2, '0')}` && data <= fechamento;
  const dataIni = preenchido.data || hoje;
  const repetido = sms && (sms.ja ? `Esse SMS já foi lançado em ${dataCurta(sms.ja)}.` : sms.parece ? `Parece que já está no painel: ${sms.parece}.` : '');
  const editar = preenchido.editar || null; // { indice, descricao, valor } da compra que está sendo corrigida
  const folha = abrirFolha(`
    <h2>${editar ? 'Editar compra' : estorno ? 'Lançar estorno' : 'Lançar gasto'}</h2>
    ${sms ? `<div class="sms-caixa"><p><b>${estorno ? 'Estorno' : sms.preAutorizacao ? 'Pré-autorização' : 'Compra'} pelo SMS do Itaú</b> ${esc(brlTexto(sms.valor))}${sms.parcelas > 1 ? ` em ${sms.parcelas}x` : ''} · ${esc(sms.loja || '?')} · ${esc(dataCurta(sms.data))}${sms.hora ? ` ${esc(sms.hora)}` : ''}${sms.final ? ` · final ${esc(sms.final)}` : ''}${sms.quem && !estorno ? ` · cartão de ${esc(sms.quem)}` : ''}</p>
      ${sms.preAutorizacao ? `<p class="sms-repetido">${IC_ATENCAO}É só uma reserva no cartão: a cobrança de verdade chega em outro SMS. Lance só se ela não vier.</p>` : ''}
      ${repetido ? `<p class="sms-repetido">${IC_ATENCAO}${esc(repetido)} Confira antes de lançar.</p>` : ''}</div>` : ''}
    ${estorno || editar ? '' : abasLancar(tipo, { temCartao, mesNovo })}
    ${mesNovo ? `<p class="nota">O painel ainda é de ${esc(mesBonito(d.periodoLabel) || d.periodo)}: compras de agora vão para a fatura de ${proxNome}. Pix, entradas e investimentos voltam depois do fechamento com o Claude.</p>` : ''}
    <form id="formLanc">
      <label for="lValor">${tipo === 'cartao' && !estorno ? 'Valor total (R$)' : 'Valor (R$)'}</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(preenchido.valor || '')}" required>
      ${!estorno ? `<label for="lParc">Parcelas</label>
      <select class="campo" id="lParc">${Array.from({ length: 12 }, (_, i) => i + 1).map(n => `<option value="${n}"${n === nParc ? ' selected' : ''}>${n === 1 ? 'À vista' : `${n}x`}</option>`).join('')}</select>
      <p class="nota parcela-nota" id="lParcNota" hidden></p>` : ''}
      <label for="lDesc">${tipo === 'cartao' ? 'Loja ou descrição' : 'Descrição'}</label>
      <input class="campo" id="lDesc" autocomplete="off" placeholder="${tipo === 'cartao' ? 'Ex.: padaria' : 'Ex.: passagem de metrô'}" value="${esc(preenchido.desc || '')}">
      <label for="lCatBtn">${estorno ? 'Categoria da compra original' : 'Categoria'}</label>
      <button type="button" class="campo campo-cat" id="lCatBtn">${cat ? `${preenchido.catNova ? iconeDe(preenchido.catNova) : iconeCategoria(cat)}<span>${esc(nomeCategoria(cat))}${preenchido.catNova ? ' <small class="opcional">nova</small>' : ''}</span>` : '<span class="ph">Escolha a categoria</span>'}</button>
      ${estorno ? '' : atalhosCategoria(d, tipo, cat)}
      <input type="hidden" id="lCat" value="${esc(cat)}">
      ${tipo === 'pix' ? `<div class="escolha pequena" role="radiogroup" aria-label="Forma">
        <button type="button" data-metodo="pix" class="${metodo === 'pix' ? 'on' : ''}">Pix</button>
        <button type="button" data-metodo="debito" class="${metodo === 'debito' ? 'on' : ''}">Débito</button>
      </div>` : ''}
      ${campoData(hoje, { valor: dataIni, min: tipo === 'cartao' ? '' : undefined, max: tipo === 'cartao' ? ultimoDiaDe(somarMeses(d.periodo, 1)) : maxPlano() })}
      ${tipo === 'pix' ? '<p class="nota" id="lAgendaNota" hidden></p>' : ''}
      ${tipo === 'cartao' ? `<p class="nota aviso-data" id="lAvisoData" hidden></p>
      <label class="marcar" id="lProxBox" hidden><input type="checkbox" id="lProx"> <span>Vai para a fatura de ${proxNome} <small>(marque se a fatura deste mês já fechou; o app lembra para as próximas compras)</small></span></label>` : ''}
      ${!estorno ? `<label class="marcar" id="lRecBox"><input type="checkbox" id="lRec"${preenchido.recorrente ? ' checked' : ''}> <span>${tipo === 'cartao' ? 'Cobrança recorrente <small>(assinatura: repete todo mês no cartão e já aparece nas próximas faturas)</small>' : 'Recorrente <small>(repete todo mês: vira uma conta fixa, que o Claude leva para os próximos meses)</small>'}</span></label>` : ''}
      ${tipo === 'cartao' && !estorno ? `<label class="marcar" id="lPontualBox" hidden><input type="checkbox" id="lPontual"> <span>Compra pontual, não se repete <small>(fica fora do ritmo diário do cartão)</small></span></label>` : ''}
      <label for="lNota">Observação <small class="opcional">(opcional)</small></label>
      <textarea class="campo area-nota" id="lNota" rows="2" placeholder="Ex.: presente de aniversário do Rafael">${esc(preenchido.nota || '')}</textarea>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">${editar ? 'Salvar e publicar' : estorno ? 'Lançar estorno e publicar' : 'Lançar e publicar'}</button>
      ${tipo === 'cartao' && !sms && !editar ? '<button type="button" class="link" id="lColar">Colar SMS do Itaú</button>' : ''}
    </form>`);
  const $f = sel => folha.querySelector(sel);
  const valor = $f('#lValor');
  // v9.19.1: no Carvão o botão já diz quanto sobra no mês depois deste gasto (o dá para gastar do painel − o valor)
  const atualizarSobra = () => {
    const s0 = estado.motor?.c?.saldo;
    if (!v10Ligada() || editar || estorno || !Number.isFinite(s0)) return;
    $f('#lOk').innerHTML = `Lançar <small>· sobra ${esc(brlTexto(s0 - (lerValor(valor.value) || 0)))}</small>`;
  };
  valor.addEventListener('input', atualizarSobra);
  atualizarSobra();
  const parc = $f('#lParc');
  const dataEl = $f('#lData');
  const pontual = $f('#lPontualBox');
  const recBox = $f('#lRecBox');
  const proxBox = $f('#lProxBox');
  let forma = metodo;
  // o que já foi digitado, para redesenhar a folha (trocar de aba ou escolher a categoria)
  const estadoForm = () => ({
    ...preenchido,
    valor: valor.value,
    desc: $f('#lDesc').value,
    cat: $f('#lCat').value,
    data: dataEl.value,
    metodo: forma,
    parcelas: Number(parc?.value) || 1,
    pontual: pontual && !pontual.hidden ? $f('#lPontual').checked : undefined,
    catNova: preenchido.catNova || null,
    recorrente: !!$f('#lRec')?.checked,
    proxima: proxBox && !proxBox.hidden ? $f('#lProx').checked : undefined,
    nota: $f('#lNota').value,
  });
  $f('.cat-rapidas')?.addEventListener('click', e => {
    const b = e.target.closest('[data-cat-rapida]');
    if (b) abrirLancar(tipo, { ...estadoForm(), cat: b.dataset.catRapida, catNova: null });
  });
  $f('#lCatBtn').onclick = () => {
    const f = estadoForm();
    abrirCategorias({
      tipo,
      atual: f.cat,
      so: estorno ? categoriasCartao(d) : null,
      titulo: estorno ? 'Categoria da compra original' : 'Categoria',
      aoEscolher: c => abrirLancar(tipo, { ...f, cat: c, catNova: null }),
      aoCriar: estorno ? null : nova => abrirLancar(tipo, { ...f, cat: nova.nome, catNova: nova }),
      aoVoltar: () => abrirLancar(tipo, f),
    });
  };
  // parcelado: só a parcela entra nesta fatura; recorrente é à vista; parcelado e acima do piso perguntam "pontual"
  const atualizar = () => {
    const v = lerValor(valor.value);
    const n = Number(parc?.value) || 1;
    const prox = !!(proxBox && !proxBox.hidden && $f('#lProx').checked);
    if (parc) {
      const nota = $f('#lParcNota');
      nota.hidden = !(n > 1 && v > 0);
      if (!nota.hidden) nota.textContent = tipo === 'cartao'
        ? `Entra ${brlTexto(parcelasItau(v, n).primeira)} ${prox ? `na fatura de ${proxNome}` : 'nesta fatura'}; as outras ${n - 1} parcelas (${brlTexto(parcelasItau(v, n).parcela)}) vão para as próximas.`
        : `A 1ª parcela (${brlTexto(Math.round((v / n) * 100) / 100)}) sai ${quandoSai(dataEl.value)}; as outras ${n - 1} no mesmo dia dos meses seguintes.`;
    }
    if (recBox) {
      recBox.hidden = n > 1 || prox;
      if (recBox.hidden) $f('#lRec').checked = false;
    }
    const rec = !!$f('#lRec')?.checked;
    if (pontual) {
      const antes = pontual.hidden;
      pontual.hidden = rec || prox || !(v >= piso || n > 1);
      if (antes && !pontual.hidden) $f('#lPontual').checked = preenchido.pontual ?? n > 1;
    }
  };
  const atualizarData = () => {
    const nAg = $f('#lAgendaNota');
    if (nAg) { nAg.textContent = notaAgendamento(dataEl.value, hoje); nAg.hidden = !nAg.textContent; }
    if (!proxBox) return;
    const dt = dataEl.value;
    const era = proxBox.hidden;
    proxBox.hidden = !ultimaSemana(dt);
    if (!proxBox.hidden && era) $f('#lProx').checked = preenchido.proxima ?? proxPadrao(dt);
    const aviso = $f('#lAvisoData');
    const antesDoFechamento = !estorno && dt && dt < ultimoDiaDe(mesAnterior(d.periodo));
    aviso.hidden = !antesDoFechamento;
    if (antesDoFechamento) aviso.textContent = `Compra de antes do fechamento de ${MESES_LONGOS[(mesP + 10) % 12]}: normalmente já está na fatura passada. Confira antes de lançar.`;
    atualizar();
  };
  valor.oninput = atualizar;
  if (parc) parc.onchange = atualizar;
  $f('#lRec')?.addEventListener('change', atualizar);
  $f('#lProx')?.addEventListener('change', atualizar);
  dataEl.addEventListener('change', atualizarData);
  atualizarData();
  ligarAbasLancar(folha, tipo, () => ({ ...estadoForm(), cat: '', sms: null }));
  folha.querySelectorAll('[data-metodo]').forEach(b => {
    b.onclick = () => {
      forma = b.dataset.metodo;
      folha.querySelectorAll('[data-metodo]').forEach(o => o.classList.toggle('on', o === b));
    };
  });
  $f('#lColar')?.addEventListener('click', colarSms);
  // categoria criada no seletor: entra no painel junto com o lançamento
  const comNova = x => (preenchido.catNova && estadoForm().cat === preenchido.catNova.nome ? salvarCategoria(x, { categoria: preenchido.catNova }, hojeBrasil()) : x);
  ligarFormLanc(folha, () => {
    const f = estadoForm();
    const v = lerValor(f.valor);
    const desc = f.desc.trim();
    const categoria = f.cat;
    const nome = desc || nomeCategoria(categoria);
    if (tipo === 'cartao') {
      const n = estorno ? 1 : f.parcelas;
      const prox = !!f.proxima || f.data.slice(0, 7) > d.periodo;
      if (f.proxima && f.data < fechamento && !(fechouEm && fechouEm <= f.data)) lembrarFechamento(d.periodo, f.data);
      if (mesNovo && f.data === ultimoDiaDe(hoje.slice(0, 7)) && horaBrasil() >= 18) throw new Error('Essa compra já é da fatura do mês que vem: feche o mês com o Claude antes de lançar.');
      const rec = !estorno && f.recorrente;
      const p = !estorno && !rec && !!f.pontual;
      // depois de lançar: lembra a categoria da loja e marca o SMS como lançado
      const depois = async () => {
        if (desc && categoria) {
          const lojas = (await banco.ler('lojas')) || {};
          lojas[chaveLoja(desc)] = categoria;
          await banco.gravar('lojas', lojas);
        }
        if (sms?.marca) {
          const feitos = (await banco.ler('smsLancados')) || [];
          feitos.push({ h: sms.marca, em: hojeBrasil() });
          await banco.gravar('smsLancados', feitos.slice(-300));
        }
      };
      const rotulo = estorno ? `Estorno: ${nome} −${brlTexto(v)}`
        : `Cartão${prox ? ` (fatura de ${proxNome})` : ''}: ${nome} ${n > 1 ? `${n}x de ${brlTexto(Math.round((v / n) * 100) / 100)}` : brlTexto(v)}${rec ? ' · recorrente' : ''}`;
      const origem = editar ? preenchido.origem || 'app' : sms ? 'sms' : 'app';
      const base = x => (editar ? excluirCompra(comNova(x), editar, hojeBrasil()) : comNova(x));
      return [x => lancarCartao(base(x), { valor: v, descricao: desc, cat: categoria, data: f.data, pontual: p, parcelas: n, estorno, recorrente: rec, proximaFatura: prox, nota: f.nota, origem }, hojeBrasil()), editar ? `Compra corrigida: ${nome} ${brlTexto(v)}` : rotulo, editar ? null : depois];
    }
    const n = f.parcelas;
    return [x => lancarPix(comNova(x), { valor: v, descricao: desc, categoria, data: f.data, metodo: forma, nota: f.nota, parcelas: n, recorrente: f.recorrente }, hojeBrasil()),
      `${forma === 'pix' ? 'Pix' : 'Débito'}: ${nome} ${n > 1 ? `${n}x de ${brlTexto(Math.round((v / n) * 100) / 100)}` : brlTexto(v)}${f.recorrente ? ' · todo mês' : ''}`];
  });
}

// ---------- v8.8: orçamento por categoria ----------
// Limites por categoria em cf.orcamentos (contrato novo; o app guarda cópia no aparelho, IDB 'orcamentosCopia').
function abrirOrcamento() {
  if (!podeLancar()) return;
  const d = estado.dados;
  const atuais = new Map((d.orcamentos || estado.orcamentosCopia || []).map(o => [o.cat, o.limite]));
  // categorias candidatas: as da fatura deste mês + as que já têm limite, das que mais pesam para as que menos
  const fatura = ((d.despesasVariaveis || []).find(x => x.id === 'var-itau')?.categorias || []).slice().sort((a, b) => b.valor - a.valor);
  const cats = [...new Set([...atuais.keys(), ...fatura.map(c => c.cat)])];
  const gastoDe = cat => fatura.filter(c => c.cat === cat).reduce((s, c) => s + c.valor, 0);
  const folha = abrirFolha(`
    <h2>Orçamento por categoria</h2>
    <p class="meta">Limite por mês. Em branco = sem limite. A sugestão é a média dos meses fechados.</p>
    <form id="formLanc">
      ${cats.map((c, i) => { const sug = sugestaoOrcamento(d, c); return `<div class="valor-linha">
        <label for="orc${i}">${iconeCategoria(c, 'peq')} ${esc(nomeCategoria(c))}<small>este mês ${esc(brlTexto(gastoDe(c)))}${sug ? ` · média ${esc(brlTexto(sug))}` : ''}</small></label>
        <input class="campo" id="orc${i}" data-cat="${esc(c)}" inputmode="decimal" placeholder="${sug ? esc(virgula(String(sug))) : 'sem limite'}" value="${atuais.has(c) ? esc(virgula(atuais.get(c).toFixed(2))) : ''}">
      </div>`; }).join('')}
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar orçamento</button>
    </form>`);
  ligarFormLanc(folha, () => {
    const lista = [...folha.querySelectorAll('[data-cat]')].map(i => ({ cat: i.dataset.cat, limite: lerValor(i.value) })).filter(o => o.limite > 0);
    return [x => definirOrcamentos(x, lista), `Orçamento: ${lista.length} ${lista.length === 1 ? 'categoria' : 'categorias'}`, async () => { estado.orcamentosCopia = lista; await banco.gravar('orcamentosCopia', lista); fecharFolha(); }];
  });
}

// ---------- v8.8: metas (na carteira) ----------
function abrirMeta(id) {
  if (!podeLancar() || !estado.cart.dados) return;
  const metas = estado.cart.dados.metas || estado.metasCopia || [];
  const m = metas.find(x => x.id === id) || { nome: '', alvo: '', prazo: '', ativos: null, guardado: '' };
  const ativos = listaAtivos(estado.cart.dados).filter(a => a.valor);
  const ligados = new Set(m.ativos || []);
  const folha = abrirFolha(`
    <h2>${id === 'nova' ? 'Nova meta' : 'Editar meta'}</h2>
    <form id="formLanc">
      <label for="mNome">Nome</label>
      <input class="campo" id="mNome" value="${esc(m.nome)}" placeholder="Ex.: Reserva de emergência, Japão, apê">
      <label for="lValor">Quanto (R$)</label>
      <input class="campo campo-valor" id="lValor" inputmode="decimal" value="${m.alvo ? esc(virgula(Number(m.alvo).toFixed(2))) : ''}" placeholder="0,00">
      <label for="mPrazo">Até quando <span class="opcional">(opcional)</span></label>
      <input class="campo" id="mPrazo" type="month" value="${esc(m.prazo || '')}">
      <p class="rotulo espaco">O que conta para a meta</p>
      <p class="nota" style="margin:0 0 8px">Marque os investimentos que são desta meta (o progresso acompanha o valor deles). Sem nenhum marcado, use "Já guardado".</p>
      <div class="meta-ativos">${ativos.map(a => `<label class="marcar"><input type="checkbox" value="${esc(a.chave)}"${ligados.has(a.chave) ? ' checked' : ''}><span>${esc(a.nome)}<small>${esc(a.rotulo)} · ${esc(brlTexto(a.valor))}</small></span></label>`).join('')}</div>
      <label for="mGuardado">Já guardado (R$) <span class="opcional">(se não marcou investimentos)</span></label>
      <input class="campo" id="mGuardado" inputmode="decimal" value="${m.guardado ? esc(virgula(Number(m.guardado).toFixed(2))) : ''}" placeholder="0,00">
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar meta</button>
      ${id !== 'nova' ? '<button type="button" class="btn perigo" id="mExcluir">Excluir meta</button>' : ''}
    </form>`);
  ligarFormLanc(folha, () => {
    const meta = {
      id: id === 'nova' ? null : id, nome: folha.querySelector('#mNome').value, alvo: lerValor(folha.querySelector('#lValor').value),
      prazo: folha.querySelector('#mPrazo').value || null, ativos: [...folha.querySelectorAll('.meta-ativos input:checked')].map(i => i.value),
      guardado: lerValor(folha.querySelector('#mGuardado').value) || 0,
    };
    return [(cf, cart) => ({ cf, cart: salvarMeta(cart, meta) }), `Meta: ${meta.nome.trim()} ${brlTexto(meta.alvo)}`, () => fecharFolha()];
  });
  folha.querySelector('#mExcluir')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: `Excluir a meta "${m.nome}"?`, sim: 'Excluir', perigo: true, manter: true }))) return abrirMeta(id);
    aplicarLancamento((cf, cart) => ({ cf, cart: excluirMeta(cart, id) }), `Meta excluída: ${m.nome}`).catch(e => aviso(e.message, { erro: true, fixo: true }));
  });
}

// ---------- v8.8: assinaturas — histórico de preço e revisão (guardados neste aparelho) ----------
async function lerAssinaturas() {
  if (!estado.dados) return;
  const hist = registrarAssinaturas((await banco.ler('assinaturasHist').catch(() => null)) || {}, estado.dados);
  await banco.gravar('assinaturasHist', hist).catch(() => {});
  estado.assinaturas = revisarAssinaturas(estado.dados, hist, (await banco.ler('assinaturasRevisao').catch(() => null)) || {}, hojeBrasil());
}
function abrirRevisarAssinaturas() {
  const lista = estado.assinaturas || [];
  const folha = abrirFolha(`
    <h2>Revisar assinaturas</h2>
    <p class="meta">${lista.length} cobranças · ${esc(brlTexto(lista.reduce((s, a) => s + a.porAno, 0)))} por ano. Marque "Uso" no que vale a pena; o que ninguém usa, cancele no app da empresa e depois aqui.</p>
    <ul class="lote">${lista.map(a => `<li>
      <span>${iconeCategoria(a.cat || adivinharCategoria(a.nome) || 'Others', 'peq')}</span>
      <div class="lote-txt"><b>${esc(a.nome)}</b>
        <small>${esc(brlTexto(a.valor))} por mês · ${esc(brlTexto(a.porAno))} por ano</small>
        ${a.subiu ? `<small class="lote-motivo">${IC_ATENCAO}subiu ${esc(brlTexto(a.subiu.diferenca))} desde ${esc(mesCurtoIR(a.subiu.mes))}</small>` : ''}
        <small>${a.revisada ? `revisada em ${esc(dataCurta(a.revisada))}` : 'nunca revisada'}</small>
        <div class="lote-acoes">
          <button type="button" class="cat-rapida" data-rev-uso="${esc(a.chave)}">Uso</button>
          ${estado.github ? `<button type="button" class="cat-rapida" data-rev-cancelar="${a.indice}">Cancelar</button>` : ''}
        </div>
      </div>
      <b class="lote-valor">${esc(brlTexto(a.valor))}</b>
    </li>`).join('')}</ul>`);
  folha.querySelectorAll('[data-rev-uso]').forEach(b => {
    b.onclick = async () => {
      const rev = (await banco.ler('assinaturasRevisao').catch(() => null)) || {};
      rev[b.dataset.revUso] = hojeBrasil();
      await banco.gravar('assinaturasRevisao', rev);
      await lerAssinaturas();
      abrirRevisarAssinaturas();
      if (estado.resumoOk) renderizarApp(estado.aba, { remendo: true });
    };
  });
  folha.querySelectorAll('[data-rev-cancelar]').forEach(b => { b.onclick = () => abrirAssinatura(Number(b.dataset.revCancelar)); });
}

// ---------- v8.8: pacote do Imposto de Renda ----------
function abrirPacoteIR(ano) {
  if (!estado.cart.dados) return aviso('O pacote do IR usa a carteira: importe o painel da carteira primeiro.', { erro: true });
  const hoje = hojeBrasil();
  const anoPadrao = Number(hoje.slice(5, 7)) <= 5 ? Number(hoje.slice(0, 4)) - 1 : Number(hoje.slice(0, 4)); // de jan a mai, o ano da declaração
  ano ||= anoPadrao;
  const anos = [...new Set(Object.keys(estado.cart.dados.historico_mensal || {}).map(m => Number(m.slice(0, 4))))].sort();
  const p = pacoteIR(estado.cart.dados, ano);
  const texto = [
    `MODO PLANO — Imposto de Renda, ano-calendário ${ano}, pelo Lastro.`, '',
    'Anexei o arquivo com o que o app registrou da carteira no ano. Monte comigo o que entra na declaração (bens e direitos, rendimentos isentos, tributação exclusiva), aponte o que preciso conferir nos informes dos bancos e corretoras, e me diga se há imposto a pagar por algum resgate ou venda.', '',
    `Dividendos e rendimentos recebidos: ${brlTexto(p.totalDiv)} (${Object.keys(p.dividendos).length} ativos).`,
    `Aportes no ano: ${brlTexto(p.aportes)} · resgates: ${brlTexto(p.resgates)}.`,
    p.mesFim ? `Posição de ${mesCurtoIR(p.mesFim)}: ${brlTexto(p.posicaoFim.reduce((s, a) => s + a.valor, 0))}.` : '',
  ].filter(x => x !== null).join('\n');
  const folha = abrirFolha(`
    <h2>Imposto de Renda ${ano}</h2>
    ${anos.length > 1 ? `<div class="cat-rapidas">${anos.map(a => `<button type="button" class="cat-rapida${a === ano ? ' on' : ''}" data-ir-ano="${a}">${a}</button>`).join('')}</div>` : ''}
    <p class="meta">Rascunho com o que o app registrou (${p.meses.length} ${p.meses.length === 1 ? 'mês' : 'meses'} de ${ano}). Os informes dos bancos e corretoras continuam sendo a fonte oficial.</p>
    <ul class="linhas">
      <li><span>Dividendos e rendimentos</span><b>${esc(brlTexto(p.totalDiv))}</b></li>
      ${Object.entries(p.dividendos).sort((a, b) => b[1] - a[1]).map(([t, v]) => `<li class="sub"><span>${esc(t.toUpperCase())}</span><b>${esc(brlTexto(v))}</b></li>`).join('')}
      <li><span>Aportes no ano</span><b>${esc(brlTexto(p.aportes))}</b></li>
      <li><span>Resgates no ano</span><b>${esc(brlTexto(p.resgates))}</b></li>
      ${p.mesFim ? `<li><span>Posição de ${esc(mesCurtoIR(p.mesFim))}</span><b>${esc(brlTexto(p.posicaoFim.reduce((s, a) => s + a.valor, 0)))}</b></li>` : ''}
    </ul>
    <button type="button" class="btn prim" id="irArquivo">Compartilhar a planilha (Excel)</button>
    <button type="button" class="btn" id="irTexto">Copiar o texto para o Claude</button>`);
  folha.querySelectorAll('[data-ir-ano]').forEach(b => { b.onclick = () => abrirPacoteIR(Number(b.dataset.irAno)); });
  folha.querySelector('#irArquivo').onclick = () => compartilharArquivo(p.nome, gerarXlsx(p.abas), TIPO_XLSX);
  folha.querySelector('#irTexto').onclick = async () => {
    try { await navigator.clipboard.writeText(texto); aviso('Texto copiado. Cole numa conversa nova do Projeto, com o arquivo anexado.', { tom: 'ok' }); } catch { aviso('Não deu para copiar.', { erro: true }); }
  };
}
const mesCurtoIR = ym => { const [a, m] = String(ym).split('-'); return `${MESES_LONGOS[Number(m) - 1]}/${a}`; };

// Compartilhar (Android) ou baixar um arquivo de texto
async function compartilharArquivo(nome, texto, tipo) {
  const arquivo = new File([texto], nome, { type: tipo });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const el = document.createElement('a');
  el.href = URL.createObjectURL(arquivo);
  el.download = nome;
  el.click();
  setTimeout(() => URL.revokeObjectURL(el.href), 5000);
  aviso({ titulo: 'Arquivo baixado', detalhe: nome }, { tom: 'ok' });
}

// ---------- v8.7: vários SMS de uma vez ----------
// O texto colado (ou compartilhado) com várias mensagens vira uma lista para conferir: cada compra com a categoria
// lembrada da loja; repetidas, já no painel ou fora do ciclo vêm desmarcadas com o motivo. "Lançar" faz um
// aplicarLancamento só (uma publicação, um Desfazer para o lote inteiro).
async function abrirLote(texto) {
  if (!estado.github) return aviso('Lançar pelo SMS só funciona no celular de quem publica.', { erro: true });
  const remoto = await consultarRemoto();
  if (remoto && estado.envelope && remoto.publicadoEm > estado.envelope.publicadoEm && remoto.kdf?.sal === estado.cofre?.sal && estado.origem !== 'local') {
    await salvarEnvelope(remoto, 'remoto');
    mostrarPainel(await decifrar(remoto, estado.cofre.chave));
  }
  await esperarPainel();
  if (!podeLancar({ cartao: true })) return;
  const hoje = hojeBrasil();
  const d = estado.dados;
  const { lidos, ignorados } = separarSms(texto, hoje);
  if (!lidos.length) return aviso('Não achei nenhum SMS do Itaú nesse texto.', { erro: true });
  const feitos = (await banco.ler('smsLancados')) || [];
  const lojas = (await banco.ler('lojas')) || {};
  const fechamento = ultimoDiaDe(d.periodo);
  const piso = d.regras?.pisoGastoPontual || 250;
  const vistas = new Set();
  const linhas = [];
  for (const l of lidos) {
    const marca = await marcaSms(l.texto);
    const ja = feitos.find(x => x.h === marca)?.em;
    const repetida = vistas.has(marca);
    vistas.add(marca);
    const parece = !ja && !repetida && pareceLancado(d, l);
    const fechouEm = estado.fechamentoCartao?.[d.periodo]; // v8.11: fechamento real aprendido
    const proxima = l.data.slice(0, 7) > d.periodo || (fechouEm && l.data >= fechouEm) || (l.data === fechamento && (l.hora || '') >= '18:00');
    const cat = lojas[chaveLoja(l.loja)] || '';
    let erro = '';
    try {
      lancarCartao(d, { valor: l.valor, descricao: l.loja || 'Compra', cat: cat || 'Outros', data: l.data, parcelas: l.estorno ? 1 : l.parcelas, estorno: l.estorno, proximaFatura: proxima, origem: 'sms' }, hoje);
    } catch (e) {
      if (!(l.estorno && !cat)) erro = e.message; // estorno sem categoria: o erro some quando ela for escolhida
    }
    // compra de antes do mês do painel é de uma fatura que o agente já fechou (exceto a do último dia depois das 18h)
    const fimAnterior = ultimoDiaDe(mesAnterior(d.periodo));
    const cicloFechado = l.data < `${d.periodo}-01` && !(l.data === fimAnterior && (l.hora || '') >= '18:00');
    const motivo = ja ? `já lançado em ${dataCurta(ja)}` : repetida ? 'colado duas vezes' : cicloFechado ? `fatura de ${MESES_LONGOS[Number(l.data.slice(5, 7)) - 1]} (já fechada)` : l.preAutorizacao ? 'pré-autorização: é só uma reserva, a cobrança vem em outro SMS' : parece ? `parece já estar no painel: ${parece}` : erro;
    linhas.push({ ...l, marca, cat, proxima, pontual: false, podePontual: !l.estorno && l.parcelas === 1 && l.valor >= piso, motivo, marcada: !motivo });
  }
  const desenhar = () => {
    const sel = linhas.filter(l => l.marcada);
    const semCat = sel.filter(l => !l.cat).length;
    const total = sel.reduce((s, l) => s + (l.estorno ? -1 : 1) * (l.parcelas > 1 ? Math.round((l.valor / l.parcelas) * 100) / 100 : l.valor), 0);
    const folha = abrirFolha(`
      <h2>Conferir ${lidos.length} SMS do Itaú</h2>
      <p class="meta">${sel.length} para lançar${ignorados ? ` · ${ignorados} ${ignorados === 1 ? 'trecho não era' : 'trechos não eram'} SMS do Itaú` : ''}. Toque na categoria para trocar; desmarque o que não quiser.</p>
      <ul class="lote">${linhas.map((l, i) => `<li class="${l.marcada ? '' : 'fora'}">
        <label class="lote-marca"><input type="checkbox" data-lote-marca="${i}"${l.marcada ? ' checked' : ''} aria-label="Lançar ${esc(l.loja || 'compra')}"></label>
        <div class="lote-txt">
          <b>${esc(l.loja || 'Compra')}</b>
          <small>${esc(dataCurta(l.data))}${l.hora ? ` ${esc(l.hora)}` : ''}${l.parcelas > 1 ? ` · ${l.parcelas}x` : ''}${l.estorno ? ' · estorno' : ''}${l.quem && !l.estorno ? ` · cartão de ${esc(l.quem)}` : ''}${l.proxima ? ' · próxima fatura' : ''}</small>
          ${l.motivo ? `<small class="lote-motivo">${IC_ATENCAO}${esc(l.motivo)}</small>` : ''}
          <div class="lote-acoes">
            <button type="button" class="cat-rapida${l.cat ? '' : ' falta'}" data-lote-cat="${i}">${l.cat ? `${iconeCategoria(l.cat)}<span>${esc(nomeCategoria(l.cat))}</span>` : '<span>Escolha a categoria</span>'}</button>
            ${l.podePontual ? `<label class="lote-pontual"><input type="checkbox" data-lote-pontual="${i}"${l.pontual ? ' checked' : ''}> pontual</label>` : ''}
          </div>
        </div>
        <b class="lote-valor ${l.estorno ? 'bom' : ''}">${l.estorno ? '−' : ''}${esc(brlTexto(l.valor))}</b>
      </li>`).join('')}</ul>
      <p class="erro" id="loteErro">${semCat ? `Falta a categoria de ${semCat} ${semCat === 1 ? 'compra marcada' : 'compras marcadas'}.` : ''}</p>
      <button type="button" class="btn prim" id="loteOk"${!sel.length || semCat ? ' disabled' : ''}>Lançar ${sel.length} ${sel.length === 1 ? 'compra' : 'compras'} · ${esc(brlTexto(total))}</button>`);
    folha.querySelectorAll('[data-lote-marca]').forEach(c => { c.onchange = () => { linhas[c.dataset.loteMarca].marcada = c.checked; desenhar(); }; });
    folha.querySelectorAll('[data-lote-pontual]').forEach(c => { c.onchange = () => { linhas[c.dataset.lotePontual].pontual = c.checked; }; });
    folha.querySelectorAll('[data-lote-cat]').forEach(b => {
      b.onclick = () => {
        const l = linhas[b.dataset.loteCat];
        abrirCategorias({ tipo: 'cartao', atual: l.cat, so: l.estorno ? categoriasCartao(d) : null, aoEscolher: c => { l.cat = c; if (!l.motivo || /categoria/i.test(l.motivo)) l.marcada = true; desenhar(); }, aoVoltar: desenhar });
      };
    });
    folha.querySelector('#loteOk').onclick = async e => {
      const botao = e.currentTarget;
      botao.disabled = true;
      const lote = linhas.filter(l => l.marcada);
      try {
        await aplicarLancamento(x => lote.reduce((dd, l) => {
          try {
            return lancarCartao(dd, { valor: l.valor, descricao: l.loja || 'Compra', cat: l.cat, data: l.data, pontual: l.pontual, parcelas: l.estorno ? 1 : l.parcelas, estorno: l.estorno, proximaFatura: l.proxima, origem: 'sms' }, hojeBrasil());
          } catch (err) {
            throw new Error(`${l.loja || 'Compra'} de ${brlTexto(l.valor)}: ${err.message}`);
          }
        }, x), `${lote.length} ${lote.length === 1 ? 'compra' : 'compras'} pelo SMS`);
        for (const l of lote) if (l.loja && l.cat) lojas[chaveLoja(l.loja)] = l.cat;
        await banco.gravar('lojas', lojas);
        const ok = (await banco.ler('smsLancados')) || [];
        ok.push(...lote.map(l => ({ h: l.marca, em: hojeBrasil() })));
        await banco.gravar('smsLancados', ok.slice(-300));
        fecharFolha();
      } catch (err) {
        botao.disabled = false;
        const p = $('folha').querySelector('#loteErro');
        if (p) p.textContent = err.message;
        else aviso(err.message, { erro: true, fixo: true });
      }
    };
  };
  desenhar();
}

// ---------- v8.7: extrato do mês com busca ----------
let filtroExtrato = { texto: '', tipo: 'tudo' };
// ---------- v9.17: fechamento pelo conector ----------
// O Claude grava o fechamento como rascunho (worker/mcp.js, ferramenta "fechamento"); aqui o Bruno vê e aplica. Aplicar =
// o mesmo caminho da importação de arquivo (conferências, etapa feita, publicar). IDB antesDoFechamento guarda os
// envelopes de antes para o Desfazer (2 dias no cartão do Início).
async function buscarRascunhos({ forcar = false } = {}) {
  if (DEMO || !estado.github || !conectorLigado()) return;
  if (!forcar && Date.now() - (estado.rascunhosEm || 0) < 5 * 60e3) return;
  estado.rascunhosEm = Date.now();
  const marca = () => JSON.stringify([estado.rascunhos && Object.entries(estado.rascunhos).map(([k, x]) => k + x.em), estado.fechamentoAplicado?.em]);
  const antes = marca();
  try {
    const j = await conectorPedido('rascunho', { acao: 'ler' });
    estado.rascunhos = j.rascunhos && Object.keys(j.rascunhos).length ? j.rascunhos : null;
  } catch { return; } // sem rede: fica o que já tinha
  const a = await banco.ler('antesDoFechamento').catch(() => null);
  estado.fechamentoAplicado = a ? { em: a.em } : null;
  if (marca() !== antes && estado.resumoOk && estado.aba === 'inicio') renderizarApp(estado.aba, { remendo: true });
}

async function abrirFechamentoPronto() {
  await buscarRascunhos({ forcar: true });
  const r = estado.rascunhos || {};
  const partes = ['carteira', 'caixa'].filter(k => r[k]);
  if (!partes.length) return aviso('Não há fechamento esperando: o Claude ainda não gravou, ou já foi aplicado.');
  const env = { caixa: await banco.ler('envelope').catch(() => null), carteira: estado.cart.envelope };
  const nome = k => (k === 'caixa' ? 'Caixa' : 'Carteira');
  const bloco = k => {
    const x = r[k], c = x.conferencia || {};
    const det = k === 'caixa'
      ? [['Mês', `${mesCurto(c.periodo?.[0])} → ${mesCurto(c.periodo?.[1])}`], ['Meses fechados', (c.mesesFechados || []).join(' → ')], ...(c.caixaInicial != null ? [['Caixa inicial', brlTexto(c.caixaInicial)]] : [])]
      : [['Mês', mesCurto(c.mes?.[1])], ['Patrimônio', `${brlTexto(c.patrimonio?.[0] || 0)} → ${brlTexto(c.patrimonio?.[1] || 0)}`]];
    const depois = x.base && env[k]?.publicadoEm && env[k].publicadoEm !== x.base;
    const quando = new Date(x.em);
    return `<p class="grupo">${nome(k)}</p>
      <ul class="linhas">${det.map(([a, b]) => `<li><span>${a}</span><b>${esc(String(b))}</b></li>`).join('')}</ul>
      ${x.resumo ? `<p class="meta">${esc(x.resumo)}</p>` : ''}
      <p class="nota">Gravado pelo Claude em ${esc(dataCurta(x.em.slice(0, 10)))} às ${quando.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.</p>
      ${depois ? `<p class="erro">${icTom('atencao')} Você lançou ou mudou algo depois que o Claude leu: aplicar perde isso. Peça para ele gravar de novo, ou aplique mesmo assim.</p>` : ''}`;
  };
  const folha = abrirFolha(`<h2 id="folhaTitulo">Fechamento pronto</h2>
    <p class="meta">O Claude deixou ${partes.length === 2 ? 'a carteira e o caixa' : partes[0] === 'caixa' ? 'o caixa' : 'a carteira'} prontos. Nada foi para a família ainda: ao aplicar, o app confere como numa importação e envia${partes.length === 2 ? ' (primeiro a carteira, depois o caixa)' : ''}.</p>
    ${partes.map(bloco).join('')}
    <button type="button" class="btn prim" id="fpAplicar">Aplicar</button>
    <button type="button" class="btn perigo" id="fpDescartar">Descartar</button>`);
  folha.querySelector('#fpDescartar').onclick = async () => {
    if (!(await confirmar({ titulo: 'Descartar o fechamento?', texto: 'O que o Claude gravou é apagado e nada muda no app. Para fechar o mês, peça a ele de novo.', sim: 'Descartar', perigo: true, manter: true }))) return abrirFechamentoPronto();
    for (const k of partes) await conectorPedido('rascunho', { acao: 'apagar', arquivo: k }).catch(() => {});
    fecharFolha();
    await buscarRascunhos({ forcar: true });
    aviso('Fechamento descartado.', { tom: 'ok' });
  };
  folha.querySelector('#fpAplicar').onclick = async e => {
    const b = e.currentTarget;
    b.disabled = true; b.textContent = 'Aplicando…';
    await banco.gravar('antesDoFechamento', { em: new Date().toISOString(), envelope: env.caixa, carteiraEnvelope: env.carteira }).catch(() => {});
    fecharFolha();
    const feitos = [];
    for (const k of partes) {
      try {
        const { dados } = await decifrar(r[k].envelope, estado.cofre.chave);
        const arq = `fechamento-${k}-${Date.now()}.json`, texto = JSON.stringify(dados);
        if (k === 'carteira') await importarCarteira(texto, arq);
        else await importar(new File([texto], arq, { type: 'application/json' }));
        // desistiu numa confirmação da importação (ex.: "carteira mais antiga"): para aqui, o rascunho fica
        if ((k === 'carteira' ? estado.cart.conteudo : estado.conteudo)?.arquivo !== arq) break;
        await conectorPedido('rascunho', { acao: 'apagar', arquivo: k }).catch(() => {});
        feitos.push(k);
      } catch (err) {
        aviso(`Não deu para aplicar ${k === 'caixa' ? 'o caixa' : 'a carteira'}: ${err.message}`, { erro: true, fixo: true });
        break;
      }
    }
    if (!feitos.length) await banco.apagar('antesDoFechamento').catch(() => {});
    await buscarRascunhos({ forcar: true });
    if (feitos.length) aviso({ titulo: 'Fechamento aplicado', detalhe: `${feitos.map(k => (k === 'caixa' ? 'Caixa' : 'Carteira')).join(' e ')} — enviado para a família.` }, { tom: 'ok', acao: { rotulo: 'Desfazer', fn: desfazerFechamento }, duracao: 12000 });
  };
}

async function desfazerFechamento() {
  const a = await banco.ler('antesDoFechamento').catch(() => null);
  if (!a) return aviso('Não há fechamento para desfazer.');
  if (!(await confirmar({ titulo: 'Desfazer o fechamento?', texto: 'O caixa e a carteira voltam a como estavam antes de aplicar, e isso vai para a família. O que foi lançado depois de aplicar também volta. Para fechar de novo, peça ao Claude.', sim: 'Desfazer', perigo: true }))) return;
  try {
    if (a.carteiraEnvelope) await guardarCarteira(await decifrar(a.carteiraEnvelope, estado.cofre.chave));
    if (a.envelope) await guardarLocal(await decifrar(a.envelope, estado.cofre.chave));
    await banco.apagar('antesDoFechamento');
    estado.fechamentoAplicado = null;
    await publicar({ mensagem: 'Lastro: fechamento desfeito' });
  } catch (err) { aviso(`Não deu para desfazer: ${err.message}`, { erro: true, fixo: true }); }
}

// v9.16: resumo da semana fora do domingo (menu) e pelo aviso de domingo às 19h (?acao=semana)
function abrirResumoSemana() {
  if (!estado.motor || !estado.dados) return aviso('O painel ainda está carregando. Tente de novo em instantes.');
  abrirFolha(`<div class="alca"></div>${resumoSemanaHtml(estado.motor, estado.dados, estado.cart.dados, contexto(estado.dados), { hoje: hojeBrasil() })}`);
}

function abrirExtrato(inicial = {}) {
  if (!estado.dados) return;
  filtroExtrato = { ...filtroExtrato, ...inicial };
  const todos = extratoDoMes(estado.dados);
  const linhaExtrato = i => {
    const pode = i.abrir.aba || (estado.github && (i.abrir.conta || ['compra', 'compraFatura', 'parcelamento', 'assinatura'].some(k => k in i.abrir)));
    const dentro = `<span class="conta-dia">${i.data ? esc(i.data.slice(8, 10)) : '·'}</span>
      <span class="rec-nome">${esc(i.descricao)}<small>${esc([i.categoria, i.detalhe].filter(Boolean).join(' · '))}</small></span>
      <b class="${i.valor > 0 ? 'bom' : ''}">${i.valor > 0 ? '+' : '−'}${esc(brlTexto(Math.abs(i.valor)))}</b>`;
    return pode ? `<li><button type="button" class="rec-linha" data-extrato="${esc(i.chave)}">${dentro}</button></li>` : `<li class="rec-linha">${dentro}</li>`;
  };
  const lista = () => {
    const r = filtrarExtrato(todos, filtroExtrato);
    return `<p class="extrato-total">${r.itens.length} ${r.itens.length === 1 ? 'item' : 'itens'}${r.entradas ? ` · entram <b class="bom">${esc(brlTexto(r.entradas))}</b>` : ''}${r.saidas ? ` · saem <b>${esc(brlTexto(r.saidas))}</b>` : ''}</p>
      ${r.itens.length ? `<ul class="recorrentes">${r.itens.map(linhaExtrato).join('')}</ul>` : '<p class="nota">Nada encontrado. Tente outra palavra ou "Tudo".</p>'}`;
  };
  const folha = abrirFolha(`
    <h2>Extrato de ${esc(mesBonito(estado.dados.periodoLabel) || estado.dados.periodo)}</h2>
    <input class="campo busca-cat" id="extBusca" type="search" enterkeyhint="search" placeholder="Buscar: uber, mercado, 45…" value="${esc(filtroExtrato.texto)}" aria-label="Buscar no extrato">
    <div class="cat-rapidas" role="tablist">${TIPOS.map(([k, n]) => `<button type="button" role="tab" class="cat-rapida${filtroExtrato.tipo === k ? ' on' : ''}" data-ext-tipo="${k}" aria-selected="${filtroExtrato.tipo === k}">${n}</button>`).join('')}</div>
    <div id="extLista">${lista()}</div>
    <p class="nota">Compras do cartão que o agente registrou só como total aparecem como "sem detalhe" — o total bate com a fatura.</p>`);
  const atualizar = () => { folha.querySelector('#extLista').innerHTML = lista(); };
  folha.querySelector('#extBusca').addEventListener('input', e => { filtroExtrato.texto = e.target.value; atualizar(); });
  folha.querySelectorAll('[data-ext-tipo]').forEach(b => {
    b.onclick = () => {
      filtroExtrato.tipo = b.dataset.extTipo;
      folha.querySelectorAll('[data-ext-tipo]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
      atualizar();
    };
  });
  folha.querySelector('#extLista').addEventListener('click', e => {
    const b = e.target.closest('[data-extrato]');
    const i = b && todos.find(x => x.chave === b.dataset.extrato);
    if (i) abrirItemExtrato(i);
  });
}
function abrirItemExtrato(i) {
  if (i.abrir.conta) return abrirConta(i.abrir.conta);
  if ('compra' in i.abrir) return abrirCompra(i.abrir.compra);
  if ('compraFatura' in i.abrir) return abrirCompraFatura(i.abrir.compraFatura);
  if ('parcelamento' in i.abrir) return abrirParcelamento(i.abrir.parcelamento);
  if ('assinatura' in i.abrir) return abrirAssinatura(i.abrir.assinatura);
  if (!i.abrir.aba) return;
  fecharFolha();
  const [aba, sub] = i.abrir.aba.split('/');
  estado.sub[aba] = sub;
  irParaAba(aba);
}

// ---------- v8.7: busca rápida (lupa no topo) ----------
function abrirBusca() {
  const telas = [];
  for (const a of ABAS) for (const [id, nome] of SUBABAS[a.id] || [[null, a.nome]]) telas.push({ aba: a.id, sub: id, nome: id ? `${a.nome} › ${nome}` : a.nome });
  const ativos = estado.cart.dados ? listaAtivos(estado.cart.dados) : [];
  const todos = estado.dados ? extratoDoMes(estado.dados) : [];
  const resultados = texto => {
    const t = norm(texto);
    if (!t) return '<p class="nota">Busque uma conta, uma loja, um ativo ou uma tela. Ex.: "uber", "HGLG11", "agenda".</p>';
    const tl = telas.filter(x => norm(x.nome).includes(t)).slice(0, 5);
    const ex = filtrarExtrato(todos, { texto });
    const at = ativos.filter(a => norm(`${a.nome} ${a.chave} ${a.rotulo}`).includes(t)).slice(0, 5);
    const grupo = (titulo, html) => (html ? `<p class="grupo">${titulo}</p><ul class="recorrentes">${html}</ul>` : '');
    const html = grupo('Telas', tl.map(x => `<li><button type="button" class="rec-linha" data-busca-tela="${x.aba}${x.sub ? `/${x.sub}` : ''}"><span class="rec-nome">${esc(x.nome)}</span></button></li>`).join(''))
      + grupo(`No extrato do mês${ex.itens.length > 6 ? ` · ${ex.itens.length}` : ''}`, ex.itens.slice(0, 6).map(i => `<li><button type="button" class="rec-linha" data-busca-extrato="${esc(i.chave)}"><span class="rec-nome">${esc(i.descricao)}<small>${esc([i.categoria, i.detalhe].filter(Boolean).join(' · '))}</small></span><b class="${i.valor > 0 ? 'bom' : ''}">${i.valor > 0 ? '+' : '−'}${esc(brlTexto(Math.abs(i.valor)))}</b></button></li>`).join('')
        + (ex.itens.length > 6 ? `<li><button type="button" class="rec-linha" data-busca-todos><span class="rec-nome"><b>Ver os ${ex.itens.length} no extrato</b></span></button></li>` : ''))
      + grupo('Investimentos', at.map(a => `<li><button type="button" class="rec-linha" data-busca-tela="carteira/ativos"><span class="rec-nome">${esc(a.nome)}<small>${esc(a.rotulo)}</small></span><b>${esc(brlTexto(a.valor))}</b></button></li>`).join(''));
    return html || '<p class="nota">Nada encontrado.</p>';
  };
  const folha = abrirFolha(`
    <h2>Buscar</h2>
    <input class="campo busca-cat" id="buscaTexto" type="search" enterkeyhint="search" placeholder="Conta, loja, ativo ou tela" aria-label="Buscar no app">
    <div id="buscaRes">${resultados('')}</div>`, { classe: 'folha-busca' });
  const campo = folha.querySelector('#buscaTexto');
  campo.focus(); // aqui o teclado é o objetivo: abrir a busca é para digitar
  campo.addEventListener('input', () => { folha.querySelector('#buscaRes').innerHTML = resultados(campo.value); });
  folha.querySelector('#buscaRes').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.buscaTela) {
      fecharFolha();
      const [aba, sub] = b.dataset.buscaTela.split('/');
      if (sub) estado.sub[aba] = sub;
      return irParaAba(aba);
    }
    if (b.hasAttribute('data-busca-todos')) return abrirExtrato({ texto: campo.value, tipo: 'tudo' });
    const i = todos.find(x => x.chave === b.dataset.buscaExtrato);
    if (i) abrirItemExtrato(i);
  });
}

// ---------- v8.7: primeira abertura guiada ----------
function passosTour() {
  const publica = !!estado.github;
  return [
    ['Dá para gastar', 'O número grande do Início é quanto ainda cabe no mês, já descontando contas e cartão. Ele muda na hora a cada lançamento.'],
    publica
      ? ['O "+" do meio', 'Compras no cartão, Pix, entradas e investimentos. Copie um ou vários SMS do Itaú e use "Colar SMS do Itaú": o app lê tudo e você só confere.']
      : ['Tudo atualizado sozinho', 'Quando o Bruno lança alguma coisa, o seu celular recebe o painel novo. Puxe a tela para baixo para buscar na hora.'],
    ['Agenda e Contas', publica ? 'Caixa › Agenda mostra o mês numa linha do tempo. Toque num item para editar, marcar como pago ou excluir.' : 'Caixa › Agenda mostra o mês numa linha do tempo: o que já foi pago e o que ainda vem.'],
    ['Lupa, Análises e menu', `A lupa acha qualquer conta, loja ou ativo. ${publica ? 'O ✦ abre as Análises.' : 'As Análises ficam na última aba.'} No menu ⋮ ficam Ideias e feedback e "Como usar o Lastro".`],
  ];
}
function abrirTour(i = 0) {
  const passos = passosTour();
  const [titulo, texto] = passos[i];
  const ultimo = i === passos.length - 1;
  const folha = abrirFolha(`<p class="sub-titulo">Como usar o Lastro · ${i + 1} de ${passos.length}</p>
    <h2>${esc(titulo)}</h2>
    <p class="meta">${esc(texto)}</p>
    <div class="tour-pontos" aria-hidden="true">${passos.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
    <button type="button" class="btn prim" id="tourOk">${ultimo ? 'Começar' : 'Próximo'}</button>
    ${ultimo ? '' : '<button type="button" class="link" id="tourPular">Pular</button>'}`);
  folha.querySelector('#tourOk').onclick = () => (ultimo ? fecharFolha() : abrirTour(i + 1));
  folha.querySelector('#tourPular')?.addEventListener('click', fecharFolha);
}

// ---------- v8.7: organizar o Início (ordem e o que aparece, guardado neste celular) ----------
const lerOrdemInicio = () => { try { return JSON.parse(localStorage.getItem('lastro-inicio') || 'null'); } catch { return null; } };
function abrirOrganizarInicio() {
  const ordem = ordemInicio(lerOrdemInicio());
  const nome = id => CARTOES_INICIO.find(([k]) => k === id)?.[1] || id;
  const salvar = () => {
    try { localStorage.setItem('lastro-inicio', JSON.stringify(ordem)); } catch { /* fica só nesta abertura */ }
    if (estado.aba === 'inicio') renderizarApp('inicio', { remendo: true });
  };
  const desenhar = () => {
    const folha = abrirFolha(`<h2>Organizar o Início</h2>
      <p class="meta">Escolha a ordem dos cartões e o que aparece. Vale só para este celular.</p>
      <ul class="organizar">${ordem.map((c, i) => `<li class="${c.on ? '' : 'fora'}">
        <label class="marcar"><input type="checkbox" data-org-on="${i}"${c.on ? ' checked' : ''}><span>${esc(nome(c.id))}</span></label>
        <button type="button" class="org-mover" data-org-sobe="${i}" aria-label="Subir ${esc(nome(c.id))}"${i ? '' : ' disabled'}>${icone('subir')}</button>
        <button type="button" class="org-mover" data-org-desce="${i}" aria-label="Descer ${esc(nome(c.id))}"${i < ordem.length - 1 ? '' : ' disabled'}>${icone('descer')}</button>
      </li>`).join('')}</ul>
      <button type="button" class="btn" id="orgPadrao">Voltar à ordem padrão</button>`);
    folha.querySelectorAll('[data-org-on]').forEach(c => { c.onchange = () => { ordem[c.dataset.orgOn].on = c.checked; salvar(); desenhar(); }; });
    const mover = (i, j) => { [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; salvar(); desenhar(); };
    folha.querySelectorAll('[data-org-sobe]').forEach(b => { b.onclick = () => mover(+b.dataset.orgSobe, +b.dataset.orgSobe - 1); });
    folha.querySelectorAll('[data-org-desce]').forEach(b => { b.onclick = () => mover(+b.dataset.orgDesce, +b.dataset.orgDesce + 1); });
    folha.querySelector('#orgPadrao').onclick = () => { ordem.splice(0, ordem.length, ...ordemInicio(null)); salvar(); desenhar(); };
  };
  desenhar();
}

// ---------- v8.7: aviso antes de o token do GitHub vencer ----------
// O GitHub manda a validade no cabeçalho github-authentication-token-expiration, mas não deixa o navegador lê-lo (fica
// fora do Access-Control-Expose-Headers). Por isso o Bruno informa a data na configuração da publicação.
let tokenConferido = false;
async function avisarToken() {
  if (tokenConferido || !estado.github) return;
  tokenConferido = true;
  const vence = await banco.ler('tokenVence').catch(() => null);
  if (!vence) return;
  const dias = Math.round((Date.parse(vence) - Date.parse(hojeBrasil())) / 86400000);
  if (dias > 7) return;
  setTimeout(() => aviso({
    titulo: dias < 0 ? 'O token do GitHub venceu' : dias === 0 ? 'O token do GitHub vence hoje' : `O token do GitHub vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
    detalhe: 'Crie um novo no GitHub e cole em Renovar; senão o app para de enviar para a família.',
  }, { erro: dias < 0, fixo: true, acao: { rotulo: 'Renovar', fn: () => abrirConfigGithub() } }), 2500);
}

// ---------- v8.6: novidades da versão ----------
// desde: a última versão que o celular viu — junta as novidades das versões puladas (ex.: da 8.6 direto para a 8.8)
const numVersao = v => String(v).split('.').reduce((s, n) => s * 1000 + Number(n || 0), 0);
// desde = versão já vista (mostra as posteriores); 'todas' = histórico inteiro, a atual aberta e as outras em dobras.
// Cada novidade: [título, texto, tipo?] — tipo 'nova' | 'melhoria' | 'correcao' (desde a v9.9.6).
const TIPO_NOVIDADE = { nova: 'Novo', melhoria: 'Melhoria', correcao: 'Correção' };
function abrirNovidades(desde) {
  const todas = desde === 'todas';
  const versoes = Object.keys(NOVIDADES).filter(v => numVersao(v) <= numVersao(VERSAO_APP) && (todas || (desde ? numVersao(v) > numVersao(desde) : v === VERSAO_APP))).sort((a, b) => numVersao(b) - numVersao(a));
  if (!versoes.length) return aviso('Sem novidades registradas para esta versão.');
  const lista = v => `<ul class="novidades">${NOVIDADES[v].map(([t, x, tipo]) => `<li>${icone('novidade')}<span>${tipo ? `<small class="nov-tipo ${tipo}">${TIPO_NOVIDADE[tipo]}</small>` : ''}<b>${esc(t)}</b>${esc(x)}</span></li>`).join('')}</ul>`;
  const corpo = versoes.length === 1 ? lista(versoes[0])
    : versoes.map((v, i) => `<details class="dobra nov-versao"${i === 0 ? ' open' : ''}><summary><span>Versão ${v}${v === VERSAO_APP ? ' · esta' : ''}</span></summary>${lista(v)}</details>`).join('');
  const folha = abrirFolha(`<p class="sub-titulo">Versão ${VERSAO_APP}</p>
    <h2>${todas ? 'Histórico de versões' : 'O que mudou no Lastro'}</h2>
    ${corpo}
    ${todas ? '' : '<button type="button" class="btn" id="novTodas">Ver o histórico de todas as versões</button>'}
    <button type="button" class="btn prim" id="novOk">Entendi</button>`);
  folha.querySelector('#novTodas')?.addEventListener('click', () => abrirNovidades('todas'));
  folha.querySelector('#novOk').onclick = fecharFolha;
}
// uma vez por versão em cada celular; no aparelho recém-configurado não aparece (não há "o que mudou" para ele)
let novidadesConferidas = false;
function mostrarNovidades() {
  if (novidadesConferidas) return;
  novidadesConferidas = true;
  let visto;
  try {
    visto = localStorage.getItem('lastro-versao');
    if (!visto && !estado.jaUsava) localStorage.setItem('lastro-versao', VERSAO_APP);
  } catch {
    return;
  }
  if (!visto && !estado.jaUsava) {
    // v8.7: aparelho recém-configurado vê a abertura guiada (uma vez)
    let viu = true;
    try { viu = !!localStorage.getItem('lastro-tour'); localStorage.setItem('lastro-tour', '1'); } catch { /* sem armazenamento */ }
    if (!viu) setTimeout(() => { if ($('veu').hidden && !estado.travado && estado.vista === 'resumo') abrirTour(); }, 900);
    return;
  }
  if (visto === VERSAO_APP || !NOVIDADES[VERSAO_APP]) return;
  setTimeout(() => {
    if (!$('veu').hidden || estado.travado || estado.vista !== 'resumo') return; // fica para a próxima abertura
    try { localStorage.setItem('lastro-versao', VERSAO_APP); } catch { /* sem armazenamento */ }
    abrirNovidades(visto);
  }, 900);
}

// ---------- v8.6: ideias e feedback ----------
// O Bruno anota melhorias no app; vão para feedback/ideias.md no repositório (fora de app/: não fica no site), que o
// Claude lê antes de mexer no app (CLAUDE.md). Sem token (Rafael) ficam no celular, com Compartilhar para mandar ao Bruno.
const CAMINHO_FEEDBACK = 'feedback/ideias.md';
const CABECALHO_FEEDBACK = '# Ideias e feedback do Lastro\n\nAnotadas no app (menu ⋮ → Ideias e feedback). O Claude lê esta lista no começo de cada sessão\ne marca [x] o que já entrou numa versão (com o número dela).\n';
const linhaFeedback = f => {
  const d = new Date(f.em);
  const quando = `${d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ${d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}`;
  const prints = (f.links || []).map((l, i) => ` ![print ${i + 1}](${l})`).join('');
  return `- [ ] ${f.texto.replace(/\s*\n\s*/g, ' / ')}${prints}\n  <sub>${quando} · v${f.versao}${f.tela ? ` · ${f.tela}` : ''}</sub>`;
};
// v9.15: prints junto da ideia (pedido do Bruno, 07/11). Encolhe para JPEG de até 1280 px antes de guardar/enviar.
const MAX_PRINTS = 3;
async function encolherImagem(arquivo) {
  const img = await createImageBitmap(arquivo);
  const f = Math.min(1, 1280 / Math.max(img.width, img.height));
  const tela = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * f), height: Math.round(img.height * f) });
  tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
  const blob = await new Promise(ok => tela.toBlob(ok, 'image/jpeg', 0.8));
  return b64.de(new Uint8Array(await blob.arrayBuffer()));
}
const semPrints = t => t.replace(/\s*!\[[^\]]*\]\([^)]*\)/g, ' 📷').trim();
async function lerListaFeedback(gh) {
  const url = `https://api.github.com/repos/${gh.repo}/contents/${CAMINHO_FEEDBACK}`;
  const cab = { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const atual = await fetch(`${url}?ref=${encodeURIComponent(gh.branch)}`, { headers: cab, cache: 'no-store' });
  if (!atual.ok && atual.status !== 404) throw erroGithub(atual);
  const j = atual.ok ? await atual.json() : null;
  return { url, cab, j, texto: j ? new TextDecoder().decode(b64.para(j.content.replace(/\s/g, ''))) : null };
}
// v9.5: só as que ainda estão abertas ("- [ ]"); as feitas o Claude marca [x] e saem da tela
function ideiasAbertas(md) {
  return (md || '').split('\n').filter(l => l.startsWith('- [ ] ')).map(l => l.slice(6).trim());
}
async function enviarFeedback(gh, entradas) {
  // os prints vão antes, num commit só; a lista (com os links) vai depois pelo caminho de sempre, que confere o sha
  const prints = entradas.flatMap(f => (f.imagens || []).map((base64, i) => {
    const nome = `imagens/${f.em.replace(/[^0-9]/g, '').slice(0, 14)}-${i + 1}.jpg`;
    (f.links = f.links || [])[i] = nome;
    return { caminho: `feedback/${nome}`, base64 };
  }));
  if (prints.length) await enviarGithubJuntos(gh, prints, `Lastro: ${prints.length === 1 ? 'print' : `${prints.length} prints`} do feedback`);
  const { url, cab, j, texto: md } = await lerListaFeedback(gh);
  const antes = md ?? CABECALHO_FEEDBACK;
  const texto = `${antes.trimEnd()}\n\n${entradas.map(linhaFeedback).join('\n')}\n`;
  const corpo = { message: `Lastro: ${entradas.length === 1 ? 'ideia anotada' : `${entradas.length} ideias anotadas`} no app`, content: b64.de(new TextEncoder().encode(texto)), branch: gh.branch, sha: j?.sha };
  const resp = await fetch(url, { method: 'PUT', headers: cab, body: JSON.stringify(corpo) });
  if (!resp.ok) throw erroGithub(resp);
}
async function abrirFeedback() {
  const lista = (await banco.ler('feedback').catch(() => null)) || [];
  const r = $('resumo');
  const tela = estado.vista === 'resumo' ? [r.querySelector('.topo h1')?.textContent, r.querySelector('.subabas button.on')?.textContent].filter(Boolean).join(' › ') : 'painel original';
  const pendentes = lista.filter(f => !f.enviado);
  const folha = abrirFolha(`
    <h2>Ideias e feedback</h2>
    <p class="meta">${DEMO ? 'Na demonstração, fica neste aparelho.' : estado.github ? 'Vai para a lista que o Claude lê antes de cada versão nova do app.' : 'Fica neste celular; toque em Compartilhar para mandar ao Bruno.'} Não escreva senhas nem números da conta.</p>
    <form id="formFb">
      <label for="fbTexto">O que melhorar?</label>
      <textarea class="campo area-nota" id="fbTexto" rows="4" maxlength="1500" placeholder="Ex.: na Agenda, queria ver o total da semana" required></textarea>
      <label for="fbImg">Prints (opcional, até ${MAX_PRINTS})</label>
      <input type="file" class="campo" id="fbImg" accept="image/*" multiple>
      <p class="nota" id="fbImgNota">${estado.github ? 'Vão para o repositório privado, junto da ideia.' : 'Ficam neste celular e vão junto ao compartilhar.'}</p>
      ${tela ? `<label class="marcar"><input type="checkbox" id="fbTela" checked><span>Sobre a tela que estava aberta<small>${esc(tela)}</small></span></label>` : ''}
      <p class="erro" id="fbErro"></p>
      <button class="btn prim" id="fbOk">${estado.github ? 'Enviar' : 'Guardar'}</button>
    </form>
    ${!estado.github && lista.length && navigator.share ? '<button type="button" class="btn" id="fbCompartilhar">Compartilhar as anotações</button>' : ''}
    ${!estado.github && lista.length ? `<p class="grupo">Anotadas neste celular</p>
    <ul class="historico-app">${lista.slice(-20).reverse().map(f => `<li><span>${esc(dataCurta(f.em))}</span><p>${esc(f.texto)}</p></li>`).join('')}</ul>` : ''}
    ${estado.github && pendentes.length ? `<p class="grupo">Ainda não ${pendentes.length === 1 ? 'enviada' : 'enviadas'}</p>
    <ul class="historico-app">${pendentes.map(f => `<li><span>${esc(dataCurta(f.em))}</span><p>${esc(f.texto)}</p></li>`).join('')}</ul>` : ''}
    ${estado.github ? '<div id="fbFila"><p class="meta">Buscando a lista…</p></div>' : ''}`);
  // com o token: a fila de verdade é a lista do GitHub; o que o Claude já fez ([x]) não aparece mais
  if (estado.github) {
    lerGithub().then(gh => gh && lerListaFeedback(gh)).then(r => {
      const abertas = r ? ideiasAbertas(r.texto) : [];
      const curto = t => (t.length > 160 ? `${t.slice(0, 157)}…` : t);
      const el = folha.querySelector('#fbFila');
      if (el) el.innerHTML = abertas.length ? `<p class="grupo">Na fila do Claude · ${abertas.length}</p><ul class="historico-app">${abertas.map(t => `<li><p>${esc(curto(semPrints(t)))}</p></li>`).join('')}</ul><p class="meta">As que já entraram numa versão saem desta lista sozinhas.</p>` : '<p class="meta">Nenhuma ideia na fila: tudo o que você anotou já entrou no app.</p>';
    }).catch(() => { const el = folha.querySelector('#fbFila'); if (el) el.innerHTML = ''; });
    // as já enviadas estão no GitHub: não precisam mais ficar no celular
    if (lista.some(f => f.enviado)) banco.gravar('feedback', pendentes).catch(() => {});
  }
  folha.querySelector('#fbCompartilhar')?.addEventListener('click', async () => {
    try {
      const files = lista.flatMap(f => (f.imagens || []).map((x, i) => new File([b64.para(x)], `print-${dataCurta(f.em).replace(/\//g, '-')}-${i + 1}.jpg`, { type: 'image/jpeg' })));
      const texto = lista.map(f => `• ${f.texto}${f.tela ? ` (${f.tela})` : ''}`).join('\n');
      await navigator.share({ title: 'Ideias para o Lastro', text: texto, ...(files.length && navigator.canShare?.({ files }) ? { files } : {}) });
      await banco.gravar('feedback', []);
      fecharFolha();
      aviso('Anotações compartilhadas: saíram deste celular.', { tom: 'ok' });
    } catch { /* cancelou: ficam */ }
  });
  folha.querySelector('#formFb').onsubmit = async e => {
    e.preventDefault();
    const texto = folha.querySelector('#fbTexto').value.trim();
    const erro = folha.querySelector('#fbErro');
    if (!texto) return;
    const botao = folha.querySelector('#fbOk');
    botao.disabled = true;
    let imagens = [];
    try {
      imagens = await Promise.all([...(folha.querySelector('#fbImg')?.files || [])].slice(0, MAX_PRINTS).map(encolherImagem));
    } catch {
      botao.disabled = false;
      erro.textContent = 'Não consegui ler uma das imagens. Tente um print (PNG ou JPEG).';
      return;
    }
    const nova = { em: new Date().toISOString(), texto, tela: folha.querySelector('#fbTela')?.checked ? tela : null, versao: VERSAO_APP, enviado: false, ...(imagens.length ? { imagens } : {}) };
    const todas = [...lista, nova];
    await banco.gravar('feedback', todas);
    if (!estado.github || DEMO) {
      fecharFolha();
      return aviso({ titulo: 'Ideia guardada neste aparelho', detalhe: DEMO ? 'Na demonstração, nada sai do aparelho.' : 'Menu ⋮ → Ideias e feedback → Compartilhar para mandar ao Bruno.' }, { tom: 'ok' });
    }
    const aEnviar = todas.filter(f => !f.enviado);
    try {
      const gh = await lerGithub();
      if (!gh) throw new Error('falta configurar a publicação (menu → Configurações)');
      await enviarFeedback(gh, aEnviar);
      aEnviar.forEach(f => { f.enviado = true; });
      await banco.gravar('feedback', todas);
      fecharFolha();
      aviso({ titulo: aEnviar.length === 1 ? 'Ideia enviada' : `${aEnviar.length} ideias enviadas`, detalhe: 'Está na lista do Claude para a próxima versão.' }, { tom: 'ok' });
    } catch (err) {
      botao.disabled = false;
      erro.textContent = `Guardada neste celular, mas não enviou: ${err.message}. Ela vai junto na próxima vez.`;
    }
  };
}

// ---------- v8.6: a carteira manda no patrimônio ----------
// O caixa guarda uma cópia do patrimônio por classe (cf.patrimonio). Sempre que chega carteira ou caixa novo no celular
// que publica, a cópia é refeita a partir da carteira — antes ela só mudava quando o Claude refazia o painel do caixa.
function patrimonioDaCarteira(html, cart = estado.cart.dados) {
  if (!cart || !estado.github) return html;
  try {
    const cf = extrairDados(html);
    const antes = JSON.stringify(cf.patrimonio);
    copiarPatrimonio(cf, cart, hojeBrasil());
    return JSON.stringify(cf.patrimonio) === antes ? html : aplicarDados(html, cf);
  } catch (e) {
    console.warn('Patrimônio da carteira:', e);
    return html;
  }
}
function igualarPatrimonio() {
  if (!estado.cart.dados) return;
  return aplicarLancamento((cf, cart) => copiarPatrimonio(cf, cart || estado.cart.dados, hojeBrasil()), 'Patrimônio do caixa igualado à carteira')
    .catch(e => aviso(e.message, { erro: true, fixo: true }));
}

// ---------- v7.2: o que só simula × o que grava ----------
// Simuladores do painel (12 meses, "posso gastar", aporte) mudam só a tela: o app os marca para não confundir.
// O acerto com o saldo do banco ganha o botão que grava a diferença.
const SIMULADORES = '[data-proxy*="proj12Scenario"], [data-proxy*="simDecisoes"], [data-proxy="#simValor"], [data-proxy="#simModo"], [data-proxy="#sim-valor"]';
function extrasDaTela(r) {
  marcarPendencias();
  for (const el of r.querySelectorAll(SIMULADORES)) {
    const cartao = el.closest('section') || el.parentElement;
    if (!cartao || cartao.querySelector('.selo-sim')) continue;
    cartao.insertAdjacentHTML('afterbegin', '<p class="selo-sim">Simulação — mexer aqui não muda os seus dados</p>');
  }
  // "Salvar alterações / Gerar JSON" do painel: no app tudo já grava sozinho — o botão leva para o Claude
  const exportar = r.querySelector('[data-proxy="#btnExport"]');
  const cartaoExp = exportar?.closest('section');
  if (cartaoExp && !cartaoExp.dataset.ajustado) {
    cartaoExp.dataset.ajustado = '1';
    cartaoExp.classList.add('so-quem-publica'); // o Rafael não marca nada: o cartão não faz sentido para ela
    exportar.textContent = 'Levar para o Claude';
    const h = cartaoExp.querySelector('h2');
    if (h) h.textContent = 'Fechamento com o Claude';
    for (const p of cartaoExp.querySelectorAll('p')) if (/JSON|Drive/i.test(p.textContent)) p.textContent = 'O que você marca na agenda já fica salvo e vai para a família. No fim do mês, leve o caixa para o Claude fechar.';
  }
  if (!estado.github) r.classList.add('so-consulta');
  else r.classList.remove('so-consulta');
  const saldo = r.querySelector('[data-proxy="#recSaldo"]');
  const caixa = saldo?.closest('section');
  caixa?.querySelector('.acertar-banco')?.remove();
  if (!saldo || !estado.github || !estado.dados || !saldo.value.trim()) return; // campo vazio não é "saldo zero"
  const v = lerValor(saldo.value);
  if (!Number.isFinite(v)) return;
  const dif = Math.round((v - caixaHoje(estado.dados, hojeBrasil())) * 100) / 100;
  if (Math.abs(dif) < 0.05) return;
  caixa.insertAdjacentHTML('beforeend', `<div class="acertar-banco"><button type="button" class="btn prim" data-ajustar-caixa="${v}">Ajustar o caixa: ${dif > 0 ? 'entrada' : 'saída'} de ${brlTexto(Math.abs(dif))} hoje</button>
    <p class="nota">Lança a diferença para o caixa bater com o banco agora. No fechamento, o Claude acha a origem.</p></div>`);
}

// Agenda: pago/a pagar de verdade no celular de quem publica (o Rafael só vê)
async function alternarAgenda(el) {
  if (!estado.github || !estado.dados) return;
  if (!podeLancar()) return;
  const [lista, i] = el.dataset.agenda.split('|');
  const it = estado.dados[lista]?.[Number(i)];
  if (!it) return aviso('Essa conta não está mais no painel — busque a atualização.', { erro: true });
  const entrada = sinalDe(lista, it) > 0;
  const vira = it.status === 'confirmado' ? (entrada ? 'a receber' : 'a pagar') : entrada ? 'recebido' : 'pago';
  el.disabled = true;
  try {
    await aplicarLancamento(x => alternarPago(x, { lista, id: it.id }, hojeBrasil()), `${it.descricao.replace(/\s*\(.*\)\s*$/, '')}: ${vira}`);
  } catch (e) {
    aviso(e.message, { erro: true, fixo: true });
  } finally {
    el.disabled = false;
  }
}

// v7.7: a agenda abre o mesmo editor de Caixa › Contas (a posição vem do botão pago/a pagar do painel)
function abrirDaAgenda(ref) {
  const [lista, i] = ref.split('|');
  const it = estado.dados?.[lista]?.[Number(i)];
  if (!it) return aviso('Esse item não está mais no painel — busque a atualização.', { erro: true });
  if (it.id === 'var-itau') {
    estado.sub.cartao = 'fatura';
    return irParaAba('cartao');
  }
  if (!LISTAS_CAIXA.includes(lista) || !it.id) return explicarCalculado(it.descricao || '');
  abrirConta(`${lista}|${it.id}`);
}
function explicarCalculado(nome) {
  abrirFolha(`
    <h2>${esc(nome || 'Item da agenda')}</h2>
    <p class="texto">Esse valor o painel do agente calcula sozinho — não é uma conta guardada, por isso não dá para editar nem excluir aqui.</p>
    <p class="texto">Para mudar ou tirar, peça ao Claude no próximo fechamento do mês (menu → Levar para o Claude).</p>`);
}

// v9.5: no destaque do Caixa — digita o saldo do app do Itaú e, se não bater, lança a diferença hoje
function abrirConferirBanco() {
  if (!podeLancar()) return;
  const hoje = hojeBrasil();
  const app = caixaHoje(estado.dados, hoje);
  const folha = abrirFolha(`
    <h2>Conferir com o banco</h2>
    <p class="meta">Abra o app do Itaú e digite o saldo da conta agora. Pelo app, o caixa hoje é <b>${esc(brlTexto(app))}</b>.</p>
    <form id="formLanc">
      <label for="lValor">Saldo no Itaú agora (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" required>
      <p class="nota" id="bDif"></p>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk" disabled>Ajustar o caixa</button>
    </form>`);
  const campo = folha.querySelector('#lValor'), ok = folha.querySelector('#lOk'), dif = folha.querySelector('#bDif');
  campo.addEventListener('input', () => {
    const v = lerValor(campo.value);
    const d = Number.isFinite(v) ? Math.round((v - app) * 100) / 100 : NaN;
    ok.disabled = !(Math.abs(d) >= 0.05);
    dif.textContent = !Number.isFinite(d) ? '' : Math.abs(d) < 0.05 ? 'Bate com o app. Nada a ajustar.' : `Diferença: ${d > 0 ? 'entrada' : 'saída'} de ${brlTexto(Math.abs(d))} hoje. No fechamento, o Claude acha a origem.`;
  });
  ligarFormLanc(folha, () => {
    const saldo = lerValor(campo.value);
    return [x => acertarComBanco(x, { saldo }, hojeBrasil()), `Caixa ajustado ao saldo do banco (${brlTexto(saldo)})`];
  });
}

async function ajustarCaixa(el) {
  const saldo = Number(el.dataset.ajustarCaixa);
  el.disabled = true;
  try {
    await aplicarLancamento(x => acertarComBanco(x, { saldo }, hojeBrasil()), `Caixa ajustado ao saldo do banco (${brlTexto(saldo)})`);
  } catch (e) {
    aviso(e.message, { erro: true, fixo: true });
  } finally {
    el.disabled = false;
  }
}

// ---------- v7.3: nada fica parado sem aviso ----------
// Lançamento que não publicou fica só neste celular: a faixa no topo mostra o motivo até publicar.
// Só depois de um envio que falhou de verdade — durante um envio normal a mudança também está "só aqui" por alguns
// segundos, e mostrar a faixa nesse intervalo era um falso alarme a cada lançamento.
function pendente() {
  const local = estado.origem === 'local' || estado.cart.origem === 'local';
  return !!estado.github && local && !estado.publicando && estado.publicacao?.ok === false;
}
function marcarPendencias() {
  const r = $('resumo');
  if (!r || r.hidden) return;
  r.querySelector('.faixa-pendente')?.remove();
  if (!pendente()) return;
  const sozinho = !precisaDoBruno(estado.publicacao?.erro);
  r.querySelector('.app-conteudo')?.insertAdjacentHTML('afterbegin', `<button type="button" class="faixa-pendente${sozinho ? ' suave' : ''}" data-resolver-pendencia>
    ${IC_NUVEM}<span><b>${sozinho ? 'Aguardando envio' : 'Não enviado para a família'}</b><small>${sozinho ? 'Salvo neste celular · o app tenta de novo sozinho' : 'Está salvo neste celular'}</small></span><span class="faixa-acao">${sozinho ? 'Enviar agora' : 'Resolver'}</span></button>`);
}
const IC_NUVEM = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18.5h-.5a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 17.5 9a4 4 0 0 1 1.9 7.5M3.5 3.5l17 17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
async function resolverPendencia() {
  const erro = estado.publicacao?.erro || '';
  if (/token|configurad|permiss|repositório/i.test(erro)) {
    aviso({ titulo: 'Não enviou para a família', detalhe: `Motivo: ${erro}. Cole um token novo do GitHub para enviar.` }, { erro: true, fixo: true });
    return abrirConfigGithub(true);
  }
  clearTimeout(envio.timer);
  envio.timer = null;
  await enviarFila();
  const ok = estado.publicacao?.ok;
  aviso(ok ? 'Publicado! Agora está nos dois celulares.' : `Ainda não publicou: ${estado.publicacao?.erro}.`, ok ? {} : { erro: true, fixo: true, acao: { rotulo: 'Configurar', fn: () => abrirConfigGithub(true) } });
}

// Diagnóstico: tudo o que ajuda a descobrir por que algo "não funcionou" no celular (sem nenhum valor financeiro)
async function textoDiagnostico() {
  const gh = await banco.ler('github');
  let remoto = null, remCart = null;
  try { remoto = await (await fetch(`${REMOTO}?t=${Date.now()}`, { cache: 'no-store' })).json(); } catch { /* sem conexão */ }
  try { remCart = await (await fetch(`${REMOTO_CARTEIRA}?t=${Date.now()}`, { cache: 'no-store' })).json(); } catch { /* sem conexão */ }
  const caches_ = await (globalThis.caches?.keys?.() || Promise.resolve([])).catch(() => []);
  const tokenAqui = !gh ? 'não configurado' : gh.token ? 'guardado no aparelho' : estado.cofre?.token ? 'selado na digital (aberto)' : estado.cofre?.token === undefined ? 'selado na digital (destrancou pela senha)' : 'AUSENTE';
  const hist = estado.dados ? historicoApp(estado.dados).slice(0, 6).map(h => `${h.data} ${h.texto.slice(0, 70)}`) : [];
  return JSON.stringify({
    app: VERSAO_APP,
    cacheServiceWorker: caches_.filter(n => n.startsWith('painel-app-')),
    controlado: !!navigator.serviceWorker?.controller,
    protecao: estado.salvo?.modo || 'nenhuma',
    provedor: estado.salvo?.provedor || null,
    publica: estado.github,
    github: gh ? { repo: gh.repo, branch: gh.branch, caminho: gh.caminho, token: tokenAqui, tokenVence: (await banco.ler('tokenVence')) || 'não informado' } : null,
    ultimaPublicacao: estado.publicacao || null,
    caixa: { origem: estado.origem, versaoAqui: estado.envelope?.publicadoEm || null, versaoPublicada: remoto?.publicadoEm || null, periodo: estado.dados?.periodo, dadosDe: estado.dados?.ultimaAtualizacao },
    carteira: { origem: estado.cart.origem, versaoAqui: estado.cart.envelope?.publicadoEm || null, versaoPublicada: remCart?.publicadoEm || null, carregada: !!estado.cart.dados },
    desfazer: ((await banco.ler('desfazer')) || []).length,
    ultimosLancamentos: hist,
    painel: estado.diagnostico || 'sem erros',
    // v9.6: abertura e fluidez (tempos em ms desde que o app começou a abrir)
    abertura: {
      tipo: performance.getEntriesByType?.('navigation')?.[0]?.type || null,
      recarregadoPeloAndroid: !!document.wasDiscarded,
      voltouSemDigital: !!estado.retomou,
      telaPronta: medidas.tela ?? null,
      destrancarAteTela: medidas.aposDestrancar ?? null,
      travadas: medidas.longas,
      piorTravadaMs: medidas.piorLonga,
      memoriaMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    },
    fluidez: estado.fluidez || 'toque em Medir a fluidez',
    hoje: new Date().toString(),
  }, null, 2);
}

async function testarPublicacao() {
  try {
    const gh = await lerGithub();
    if (!gh) return 'Não configurado: falta o token do GitHub neste celular.';
    const r = await fetch(`https://api.github.com/repos/${gh.repo}/contents/${gh.caminho}?ref=${encodeURIComponent(gh.branch)}`, {
      headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github+json' }, cache: 'no-store',
    });
    if (!r.ok) return `Falhou: ${erroGithub(r).message}.`;
    return 'OK: o token funciona e o celular consegue publicar.';
  } catch (e) {
    return `Falhou: ${e.message || 'sem conexão'}.`;
  }
}

// Uma compra do cartão lançada pelo app: ver, editar (mesmo formulário, já preenchido) ou excluir
function abrirCompra(indice) {
  if (!podeLancar({ cartao: true })) return;
  const r = comprasApp(estado.dados).find(x => x.indice === indice);
  if (!r) return aviso('Essa compra não está mais no painel — busque a atualização.', { erro: true });
  const n = Number(String(r.parcelas || '').match(/^1\/(\d+)/)?.[1]) || 1;
  const total = n > 1 ? lerValor(String(r.parcelas).split(' de ')[1] || '') || Math.round(r.valor * n * 100) / 100 : Math.abs(r.valor);
  const alvo = { indice, descricao: r.descricao, valor: r.valor };
  const folha = abrirFolha(`
    <h2>${esc(r.descricao)}</h2>
    <p class="meta">${esc([dataCurta(r.data), nomeCategoria(r.cat), n > 1 ? `${n}x de ${brlTexto(r.valor)} (total ${brlTexto(total)})` : brlTexto(Math.abs(r.valor)), r.valor < 0 ? 'estorno' : '', r.recorrente ? 'cobrança recorrente' : '', r.proximaFatura ? 'fatura seguinte' : '', r.origem === 'sms' ? 'lançada pelo SMS' : ''].filter(Boolean).join(' · '))}</p>
    ${r.nota ? `<p class="meta">Obs.: ${esc(r.nota)}</p>` : ''}
    ${r.valor < 0 ? '' : '<button type="button" class="btn prim" id="cEditar">Editar</button>'}
    <button type="button" class="btn perigo" id="cExcluir">Excluir esta compra</button>
    <p class="erro" id="cErro"></p>`);
  folha.querySelector('#cEditar')?.addEventListener('click', () => abrirLancar('cartao', {
    editar: alvo, origem: r.origem, valor: virgula(total.toFixed(2)), desc: r.descricao, cat: r.cat, data: r.data, parcelas: n,
    recorrente: !!r.recorrente, proxima: !!r.proximaFatura, pontual: undefined, nota: r.nota || '',
  }));
  folha.querySelector('#cExcluir').onclick = async e => {
    const botao = e.currentTarget;
    if (!(await confirmar({ titulo: `Excluir ${r.descricao}?`, texto: `${brlTexto(Math.abs(r.valor))} sai da fatura de ${MESES_LONGOS[Number(estado.dados.periodo.slice(5)) - 1]}. Dá para desfazer depois.`, sim: 'Excluir', perigo: true, manter: true }))) return abrirCompra(indice);
    botao.disabled = true;
    try {
      await aplicarLancamento(x => excluirCompra(x, alvo, hojeBrasil()), `Compra excluída: ${r.descricao}`);
    } catch (err) {
      if (folha.querySelector('#cErro')?.isConnected) folha.querySelector('#cErro').textContent = err.message;
      else aviso(err.message, { erro: true, fixo: true });
    }
  };
}

// ---------- categorias: seletor, gestão e editor (v6.3) ----------
// mais usadas: as maiores da fatura (cartão) ou as mais frequentes (Pix)
function categoriasUsadas(d, tipo, n = 5) {
  let usadas;
  if (tipo === 'cartao') {
    const it = (d.despesasVariaveis || []).find(x => x.id === 'var-itau');
    usadas = [...(it?.categorias || [])].sort((a, b) => b.valor - a.valor).map(c => acharCategoria(c.cat)?.nome || c.cat);
  } else {
    const conta = {};
    for (const x of d.despesasVariaveis || []) if (x.id !== 'var-itau' && x.categoria) conta[x.categoria] = (conta[x.categoria] || 0) + 1;
    usadas = Object.entries(conta).sort((a, b) => b[1] - a[1]).map(([k]) => acharCategoria(k)?.nome || k);
  }
  return [...new Set(usadas)].slice(0, n);
}
// v8.5: as mais usadas como atalhos logo abaixo do campo de categoria (um toque, sem abrir a lista)
const atalhosCategoria = (d, tipo, atual) => {
  const usadas = categoriasUsadas(d, tipo, 4);
  if (!usadas.length) return '';
  return `<div class="cat-rapidas">${usadas.map(n => `<button type="button" class="cat-rapida${atual && norm(atual) === norm(n) ? ' on' : ''}" data-cat-rapida="${esc(n)}">${iconeCategoria(n)}<span>${esc(nomeCategoria(n))}</span></button>`).join('')}</div>`;
};

// Seletor com ícones: "Mais usadas", busca e as categorias por grupo (subcategorias logo abaixo da principal).
// opcoes: { tipo: 'cartao'|'pix', atual, so (lista fechada, ex.: estorno), titulo, aoEscolher(nome), aoCriar(cat), aoVoltar() }
function abrirCategorias({ tipo = 'cartao', atual = '', so = null, titulo = 'Categoria', aoEscolher, aoCriar = null, aoVoltar }) {
  const d = estado.dados;
  const lista = categoriasAtivas();
  const linha = (valor, { sub = false } = {}) => {
    const c = acharCategoria(valor);
    const on = atual && (norm(atual) === norm(valor) || (c && c === acharCategoria(atual)));
    const busca = norm([valor, nomeCategoria(valor), c?.descricao, ...(c?.aliases || [])].join(' '));
    const nome = c ? c.nome : valor.charAt(0).toLocaleUpperCase('pt-BR') + valor.slice(1);
    return `<button type="button" class="cat-linha${sub ? ' sub' : ''}${on ? ' on' : ''}" data-cat="${esc(valor)}" data-busca="${esc(busca)}">${iconeCategoria(valor)}<span>${esc(nome)}${c?.descricao ? `<small class="cat-desc">${esc(c.descricao)}</small>` : ''}</span></button>`;
  };
  let corpo;
  if (so) corpo = `<div class="cats">${so.map(v => linha(v)).join('')}</div>`;
  else {
    const filhos = c => lista.filter(x => x.pai && norm(x.pai) === norm(c.nome));
    const temPai = c => c.pai && lista.some(x => norm(x.nome) === norm(c.pai));
    corpo = GRUPOS.map(g => {
      const doGrupo = lista.filter(c => (c.grupo || 'Outros') === g && !temPai(c));
      if (!doGrupo.length) return '';
      return `<p class="grupo" data-grupo>${esc(g)}</p><div class="cats">${doGrupo.map(c => linha(c.nome) + filhos(c).map(f => linha(f.nome, { sub: true })).join('')).join('')}</div>`;
    }).join('');
    const naFatura = tipo === 'cartao' ? categoriasCartao(d) : categoriasConta(d);
    const soNoPainel = naFatura.filter(v => !acharCategoria(v));
    if (soNoPainel.length) corpo += `<p class="grupo" data-grupo>Do painel</p><div class="cats">${soNoPainel.map(v => linha(v)).join('')}</div>`;
  }
  const usadas = so ? [] : categoriasUsadas(d, tipo);
  const folha = abrirFolha(`
    <h2>${esc(titulo)}</h2>
    <input class="campo busca-cat" id="catBusca" type="search" placeholder="Buscar categoria" autocomplete="off">
    ${usadas.length ? `<p class="grupo" data-grupo>Mais usadas</p><div class="cats">${usadas.map(v => linha(v)).join('')}</div>` : ''}
    ${corpo}
    ${aoCriar ? '<button type="button" class="link" id="catNova">Criar categoria nova</button>' : ''}
    <button type="button" class="btn" id="catVoltar">Voltar</button>`);
  folha.querySelectorAll('[data-cat]').forEach(b => { b.onclick = () => aoEscolher(b.dataset.cat); });
  folha.querySelector('#catVoltar').onclick = aoVoltar;
  const busca = folha.querySelector('#catBusca');
  busca.oninput = () => {
    const t = norm(busca.value);
    folha.querySelectorAll('[data-grupo]').forEach(g => { g.hidden = !!t; });
    const vistos = new Set();
    folha.querySelectorAll('[data-cat]').forEach(b => {
      const casa = !t || b.dataset.busca.includes(t);
      // na busca, cada categoria aparece uma vez só (sem a cópia de "Mais usadas")
      b.hidden = !casa || (t && vistos.has(b.dataset.cat));
      if (casa) vistos.add(b.dataset.cat);
    });
  };
  folha.querySelector('#catNova')?.addEventListener('click', () => abrirEditorCategoria({
    rascunho: { nome: busca.value.trim() },
    rotuloSalvar: 'Usar esta categoria',
    aoSalvar: async cat => {
      if (acharCategoria(cat.nome)) throw new Error(`Já existe a categoria ${acharCategoria(cat.nome).nome}.`);
      aoCriar(cat);
    },
    aoVoltar: () => abrirCategorias({ tipo, atual, so, titulo, aoEscolher, aoCriar, aoVoltar }),
  }));
}

// Menu → Categorias: todas por grupo; tocar edita, "Nova categoria" cria
function abrirGerenciarCategorias() {
  if (!estado.github || !estado.dados) return;
  const lista = categoriasAtivas();
  const linha = c => `<button type="button" class="cat-linha${c.pai ? ' sub' : ''}" data-editar="${esc(c.nome)}">${iconeDe(c)}<span>${esc(c.nome)}${c.descricao ? `<small class="cat-desc">${esc(c.descricao)}</small>` : ''}</span><i class="cat-editar" aria-hidden="true"></i></button>`;
  const temPai = c => c.pai && lista.some(x => norm(x.nome) === norm(c.pai));
  const corpo = GRUPOS.map(g => {
    const doGrupo = lista.filter(c => (c.grupo || 'Outros') === g && !temPai(c));
    if (!doGrupo.length) return '';
    return `<p class="grupo">${esc(g)}</p><div class="cats">${doGrupo.map(c => linha(c) + lista.filter(x => x.pai && norm(x.pai) === norm(c.nome)).map(linha).join('')).join('')}</div>`;
  }).join('');
  const folha = abrirFolha(`
    <h2>Categorias</h2>
    <p class="meta">Toque numa categoria para mudar nome, ícone (ou emoji), cor e grupo — ou para excluir. Valem para o cartão e para Pix/débito, e o Rafael vê os mesmos ícones.</p>
    <button type="button" class="btn prim" id="catCriar">Nova categoria</button>
    ${corpo}`);
  folha.querySelector('#catCriar').onclick = () => abrirEditorCategoria({});
  folha.querySelectorAll('[data-editar]').forEach(b => { b.onclick = () => abrirEditorCategoria({ original: b.dataset.editar }); });
}

// Editor de categoria. Sem aoSalvar: grava no painel e publica (gestão). Com aoSalvar: devolve a categoria (seletor).
function abrirEditorCategoria({ original = null, rascunho = null, aoSalvar = null, aoVoltar = null, rotuloSalvar = null }) {
  const base = original ? acharCategoria(original) : null;
  const c = { nome: '', grupo: 'Outros', icone: 'etiqueta', cor: CORES[12], descricao: '', emoji: '', ...(base || {}), ...(rascunho || {}) };
  if (c.emoji) c.icone = c.icone || 'etiqueta';
  const it = (estado.dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const usado = base ? (it?.categorias || []).filter(x => acharCategoria(x.cat) === base).reduce((s, x) => s + x.valor, 0) : 0;
  const folha = abrirFolha(`
    <h2>${original ? 'Editar categoria' : 'Nova categoria'}</h2>
    <div class="cat-previa"><span id="ePrevIc">${iconeDe(c)}</span><b id="ePrevNome">${esc(c.nome || 'Nome da categoria')}</b></div>
    <label for="eNome">Nome</label>
    <input class="campo" id="eNome" autocomplete="off" maxlength="40" value="${esc(c.nome)}" placeholder="Ex.: Nosso apê">
    <label for="eDesc">Descrição <small class="opcional">(opcional, aparece na lista)</small></label>
    <input class="campo" id="eDesc" autocomplete="off" maxlength="80" value="${esc(c.descricao || '')}" placeholder="Ex.: Tudo do apartamento novo">
    <label for="eGrupo">Grupo</label>
    <select class="campo" id="eGrupo">${GRUPOS.map(g => `<option${g === (c.grupo || 'Outros') ? ' selected' : ''}>${esc(g)}</option>`).join('')}</select>
    <label>Ícone</label>
    <div class="icones-grade">${Object.keys(ICONES_CAT).map(k => `<button type="button" class="ic-opcao${!c.emoji && c.icone === k ? ' on' : ''}" data-icone="${k}" aria-label="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONES_CAT[k]}</svg></button>`).join('')}</div>
    <label for="eEmoji">Ou um emoji como ícone <small class="opcional">(ex.: 🏠 🔑 🐶)</small></label>
    <input class="campo emoji-campo" id="eEmoji" autocomplete="off" maxlength="8" value="${esc(c.emoji || '')}" placeholder="toque e escolha um emoji">
    <label>Cor</label>
    <div class="cores-grade">${CORES.map(cor => `<button type="button" class="cor-opcao${cor === c.cor ? ' on' : ''}" data-cor="${cor}" style="--cat:${cor}" aria-label="cor ${cor}"></button>`).join('')}</div>
    <p class="erro" id="eErro"></p>
    <button type="button" class="btn prim" id="eSalvar">${esc(rotuloSalvar || 'Salvar e publicar')}</button>
    ${original && !aoSalvar ? '<button type="button" class="btn perigo" id="eExcluir">Excluir categoria</button>' : ''}
    <div id="eExcluirBox" hidden>
      <p class="meta">${usado > 0.004 ? `${esc(c.nome)} tem <b>${brlTexto(usado)}</b> na fatura deste mês. Para qual categoria esse valor vai?` : `Excluir ${esc(c.nome)}? Ela some da lista; lançamentos antigos continuam como estão.`}</p>
      ${usado > 0.004 ? `<select class="campo" id="eDestino"><option value="" disabled selected>Escolha a categoria</option>${categoriasAtivas().filter(x => x !== base).map(x => `<option>${esc(x.nome)}</option>`).join('')}</select>` : ''}
      <button type="button" class="btn perigo" id="eExcluirOk">Excluir e publicar</button>
    </div>
    <button type="button" class="btn" id="eVoltar">Voltar</button>`);
  const $e = sel => folha.querySelector(sel);
  const erro = $e('#eErro');
  const previa = () => {
    $e('#ePrevIc').innerHTML = iconeDe(c);
    $e('#ePrevNome').textContent = c.nome || 'Nome da categoria';
  };
  $e('#eNome').oninput = () => { c.nome = $e('#eNome').value; previa(); };
  $e('#eDesc').oninput = () => { c.descricao = $e('#eDesc').value; };
  $e('#eGrupo').onchange = () => { c.grupo = $e('#eGrupo').value; };
  $e('#eEmoji').oninput = () => {
    c.emoji = $e('#eEmoji').value.trim();
    folha.querySelectorAll('.ic-opcao').forEach(b => b.classList.toggle('on', !c.emoji && b.dataset.icone === c.icone));
    previa();
  };
  folha.querySelectorAll('.ic-opcao').forEach(b => {
    b.onclick = () => {
      c.icone = b.dataset.icone;
      c.emoji = '';
      $e('#eEmoji').value = '';
      folha.querySelectorAll('.ic-opcao').forEach(o => o.classList.toggle('on', o === b));
      previa();
    };
  });
  folha.querySelectorAll('.cor-opcao').forEach(b => {
    b.onclick = () => {
      c.cor = b.dataset.cor;
      folha.querySelectorAll('.cor-opcao').forEach(o => o.classList.toggle('on', o === b));
      previa();
    };
  });
  $e('#eVoltar').onclick = aoVoltar || abrirGerenciarCategorias;
  const executar = async (botao, fn) => {
    erro.textContent = '';
    botao.disabled = true;
    try {
      await fn();
    } catch (e) {
      if (erro.isConnected) erro.textContent = e.message;
      else aviso(e.message, { erro: true, fixo: true });
    } finally {
      botao.disabled = false;
    }
  };
  const categoria = () => ({ nome: c.nome.trim(), grupo: c.grupo, cor: c.cor, descricao: (c.descricao || '').trim(), ...(c.emoji ? { emoji: c.emoji } : { icone: c.icone }) });
  $e('#eSalvar').onclick = () => executar($e('#eSalvar'), async () => {
    const nova = categoria();
    if (aoSalvar) return aoSalvar(nova);
    const hoje = hojeBrasil();
    salvarCategoria(estado.dados, { original, categoria: nova }, hoje); // confere antes de publicar
    await aplicarLancamento(x => salvarCategoria(x, { original, categoria: nova }, hoje), original ? `Categoria: ${nova.nome}` : `Categoria nova: ${nova.nome}`);
    // a categoria lembrada por loja acompanha a troca de nome
    if (original && norm(original) !== norm(nova.nome)) {
      const lojas = (await banco.ler('lojas')) || {};
      for (const k of Object.keys(lojas)) if (norm(lojas[k]) === norm(original)) lojas[k] = nova.nome;
      await banco.gravar('lojas', lojas);
    }
  });
  $e('#eExcluir')?.addEventListener('click', () => { $e('#eExcluirBox').hidden = false; $e('#eExcluir').hidden = true; });
  $e('#eExcluirOk')?.addEventListener('click', () => executar($e('#eExcluirOk'), async () => {
    const destino = $e('#eDestino')?.value || null;
    const hoje = hojeBrasil();
    excluirCategoria(estado.dados, { nome: original, destino }, hoje); // confere antes de publicar
    await aplicarLancamento(x => excluirCategoria(x, { nome: original, destino }, hoje), `Categoria excluída: ${original}`);
  }));
}

// ---------- recorrentes do cartão (v6.3): editar, cancelar ----------
// Adicionar uma nova = lançar no cartão com "Cobrança recorrente" marcada (a 1ª cobrança entra nesta fatura).
// v9.5: quando o valor de algo que se repete muda, o app pergunta para quando vale (aparece só se o valor mudou)

// v9.5: um investimento da carteira, com as ações dele (Carteira › Ativos)
function abrirAtivo(chave) {
  const cart = estado.cart.dados;
  const a = cart && variacaoAtivos(cart).find(x => x.chave === chave);
  if (!a) return aviso('Esse investimento não está mais na carteira.', { erro: true });
  const fii = a.classe === 'fiis' || a.classe === 'etfs';
  const cm = cart.custo_medio?.ativos?.[chave];
  const pct = v => `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const folha = abrirFolha(`
    <h2>${esc(a.nome)}</h2>
    <p class="meta">${esc(a.rotulo)} · posição de ${esc(dataCurta(posicao(cart).data))}</p>
    <ul class="linhas">
      <li><span>Valor</span><b>${esc(brlTexto(a.valor))}</b></li>
      <li><span>Peso na carteira</span><b>${pct(a.pct)}</b></li>
      ${a.var == null ? '' : `<li><span>Variação no mês</span><b>${a.var >= 0 ? '+' : '−'}${pct(Math.abs(a.var))}</b></li>`}
      ${cm?.qtd ? `<li><span>Cotas</span><b>${esc(String(cm.qtd))}</b></li>` : ''}
      ${cm?.pm ? `<li><span>Preço médio</span><b>${esc(brlTexto(cm.pm))}</b></li>` : ''}
    </ul>
    ${htmlResgateAtivo(cart, a)}
    <div class="acoes-ativo">
      <button type="button" class="btn prim" data-acao-ativo="aporte">Aporte</button>
      <button type="button" class="btn" data-acao-ativo="resgate">Resgate</button>
      ${fii ? '<button type="button" class="btn" data-acao-ativo="dividendo">Dividendo</button>' : ''}
      <button type="button" class="btn" data-acao-ativo="valores">Atualizar o valor</button>
    </div>
    ${a.classe === 'renda_fixa' && estado.github ? `<button type="button" class="link" id="atSimular">Simular trocar por outra aplicação</button>` : ''}
    <button type="button" class="link" data-pesquisar="${esc(chave)}">Pesquisar este ativo com o Claude</button>`);
  folha.querySelector('[data-pesquisar]').onclick = () => abrirPesquisa(a.nome);
  folha.querySelector('#atSimular')?.addEventListener('click', () => abrirSimuladorTroca({ origem: chave }));
  folha.querySelectorAll('[data-acao-ativo]').forEach(b => {
    b.onclick = () => {
      const t = b.dataset.acaoAtivo;
      if (t !== 'valores') return abrirInvestir(t, { ativo: chave });
      abrirValores();
      const campo = $('folha').querySelector(`#v-${CSS.escape(chave)}`);
      campo?.scrollIntoView({ block: 'center' });
      campo?.select();
    };
  });
}

// v9.8: simulador de troca na renda fixa (rendafixa.js) — "e se eu tirar daqui e puser ali?". Nada é gravado.
const virgulaN = (v, c = 1) => v.toLocaleString('pt-BR', { maximumFractionDigits: c });
const TIPOS_DESTINO = [['cdi', '% do CDI'], ['ipca', 'IPCA +'], ['pre', 'Prefixado'], ['meu', 'Fundo meu']];
function abrirSimuladorTroca(r0 = {}) {
  const cart = estado.cart.dados;
  if (!cart) return aviso('Importe a carteira antes.', { erro: true });
  const rf = rendimentoRendaFixa(cart, estado.cdiHist?.cdi) || [];
  const fundos = listaAtivos(cart).filter(a => a.classe === 'renda_fixa' && a.valor > 0);
  if (!fundos.length) return aviso('Não há renda fixa na carteira para simular.', { erro: true });
  const cdiHoje = cdiAnualDe(estado.cdiHist?.cdi);
  const pior = rf[0]?.chave;
  const r = { origem: pior || fundos[0].chave, tipo: 'cdi', taxa: '100', adm: '0', isento: false, du: '0', meses: '12', ipca: '4,5', cdi: cdiHoje ? virgulaN(cdiHoje, 2) : '', destinoMeu: '', nome: '', ...r0 };
  const origemA = fundos.find(a => a.chave === r.origem) || fundos[0];
  r.valor ??= virgula(origemA.valor.toFixed(2));
  const pctDe = k => rf.find(f => f.chave === k)?.pct; // antes do IR, como as lâminas
  const pctLiqDe = k => rf.find(f => f.chave === k)?.pctLiquido; // o que rendeu de fato (as posições são líquidas)
  const opt = (lista, atual, rot) => lista.map(a => `<option value="${esc(a.chave)}"${a.chave === atual ? ' selected' : ''}>${esc(rot(a))}</option>`).join('');
  const rotulo = a => `${a.nome}${pctDe(a.chave) != null ? ` · ${Math.round(pctDe(a.chave))}% do CDI` : ''}`;
  const folha = abrirFolha(`
    <p class="selo-sim">Simulação — não muda os seus dados</p>
    <h2>Trocar de aplicação</h2>
    <p class="meta">Quanto você teria em cada caso, contando o rendimento real do fundo de hoje, os dias em que o dinheiro fica parado no resgate e o imposto.</p>
    <form id="formSim" onsubmit="return false">
      <label for="sOrigem">Sair de</label>
      <select class="campo" id="sOrigem">${opt(fundos, origemA.chave, rotulo)}</select>
      <label for="sValor">Valor (R$)</label>
      <input class="campo" id="sValor" inputmode="decimal" autocomplete="off" value="${esc(r.valor)}">
      <p class="rotulo-campo">Para</p>
      <div class="escolha pequena" role="radiogroup" aria-label="Tipo do destino">${TIPOS_DESTINO.map(([k, n]) => `<button type="button" data-tipo="${k}" class="${k === r.tipo ? 'on' : ''}" aria-pressed="${k === r.tipo}">${n}</button>`).join('')}</div>
      ${r.tipo === 'meu' ? `<label for="sMeu">Fundo de destino</label><select class="campo" id="sMeu">${opt(fundos.filter(a => a.chave !== origemA.chave), r.destinoMeu, rotulo)}</select>` : `
      <label for="sNome">Nome <small class="opcional">(opcional)</small></label>
      <input class="campo" id="sNome" autocomplete="off" placeholder="${r.tipo === 'ipca' ? 'Ex.: Tesouro IPCA+ 2029' : r.tipo === 'pre' ? 'Ex.: CDB prefixado 2027' : 'Ex.: CDB liquidez diária, LCA'}" value="${esc(r.nome)}">
      <div class="sim-campos">
        <div><label for="sTaxa">${r.tipo === 'cdi' ? '% do CDI' : r.tipo === 'ipca' ? 'IPCA + (% a.a.)' : 'Taxa (% a.a.)'}</label><input class="campo" id="sTaxa" inputmode="decimal" value="${esc(r.taxa)}"></div>
        <div><label for="sAdm">Taxa de adm. (% a.a.)</label><input class="campo" id="sAdm" inputmode="decimal" value="${esc(r.adm)}"></div>
      </div>
      <label class="marcar"><input type="checkbox" id="sIsento"${r.isento ? ' checked' : ''}> <span>Isento de IR <small>(LCI, LCA, debênture incentivada)</small></span></label>`}
      <div class="sim-campos">
        <div><label for="sMeses">Daqui a</label><select class="campo" id="sMeses">${[6, 12, 24, 36, 60].map(n => `<option value="${n}"${String(n) === String(r.meses) ? ' selected' : ''}>${n < 24 ? `${n} meses` : `${n / 12} anos`}</option>`).join('')}</select></div>
        <div><label for="sCdi">CDI (% a.a.)</label><input class="campo" id="sCdi" inputmode="decimal" value="${esc(r.cdi)}" placeholder="14,9"></div>
      </div>
      ${r.tipo === 'ipca' ? `<label for="sIpca">IPCA esperado (% a.a.)</label><input class="campo" id="sIpca" inputmode="decimal" value="${esc(r.ipca)}">` : ''}
    </form>
    <div id="simSaida" aria-live="polite"></div>
    <button type="button" class="btn" id="simClaude">Levar esta conta para o Claude</button>`, { classe: 'folha-sim' });
  const $s = q => folha.querySelector(q);
  const ler = () => ({
    ...r, origem: $s('#sOrigem').value, valor: $s('#sValor').value, meses: $s('#sMeses').value, cdi: $s('#sCdi').value,
    taxa: $s('#sTaxa')?.value ?? r.taxa, adm: $s('#sAdm')?.value ?? r.adm, isento: $s('#sIsento')?.checked ?? r.isento,
    ipca: $s('#sIpca')?.value ?? r.ipca, destinoMeu: $s('#sMeu')?.value ?? r.destinoMeu, nome: $s('#sNome')?.value ?? r.nome,
  });
  let ultimo = null;
  const calcular = () => {
    const f = ler();
    const o = fundos.find(a => a.chave === f.origem);
    const cr = creditoDe(cart, o.chave, o.classe);
    const pctO = pctDe(o.chave), pctOLiq = pctLiqDe(o.chave);
    const meu = f.tipo === 'meu' ? fundos.find(a => a.chave === f.destinoMeu) : null;
    const destino = meu ? { tipo: 'cdi', taxa: pctLiqDe(meu.chave) ?? 85, adm: 0, isento: true, du: 0 } // já líquido, como a origem
      : { tipo: f.tipo, taxa: lerValor(f.taxa), adm: lerValor(f.adm) || 0, isento: !!f.isento, du: 0 };
    const sim = simularTroca({ valor: lerValor(f.valor), meses: Number(f.meses), cdiAnual: lerValor(f.cdi), ipcaAnual: lerValor(f.ipca), origem: { pctCdi: pctOLiq ?? 85, du: cr.du || 0 }, destino });
    const nomeD = meu ? meu.nome : f.nome.trim() || TIPOS_DESTINO.find(([k]) => k === f.tipo)[1].replace(' +', `+${f.taxa}%`).replace('% do CDI', `${f.taxa}% do CDI`).replace('Prefixado', `Prefixado ${f.taxa}%`);
    ultimo = sim && { f, o, nomeD, sim, cr, pctO };
    if (!sim || !(destino.taxa >= 0)) { $s('#simSaida').innerHTML = '<p class="nota">Preencha o valor, a taxa e o CDI para ver a conta.</p>'; return; }
    const prazo = Number(f.meses) < 24 ? `${f.meses} meses` : `${Number(f.meses) / 12} anos`;
    $s('#simSaida').innerHTML = `
      <div class="sim-resultado">
        <div class="${sim.melhor === 'fica' ? 'melhor' : ''}"><span>Fica em ${esc(o.nome)}</span><b>${brlTexto(sim.fica)}</b></div>
        <div class="${sim.melhor === 'troca' ? 'melhor' : ''}"><span>Vai para ${esc(nomeD)}</span><b>${brlTexto(sim.troca)}</b></div>
      </div>
      <p class="sim-veredito">${sim.melhor === 'empate' ? 'Praticamente igual' : `${sim.melhor === 'troca' ? 'Trocar' : 'Ficar'} rende ${brlTexto(Math.abs(sim.diferenca))} a mais em ${prazo}`}</p>
      <ul class="linhas">
        <li><span>${esc(o.nome)} rendeu de verdade</span><b>${pctO != null ? `${Math.round(pctO)}% do CDI` : 'sem histórico (100%)'} antes do IR ≈ ${virgulaN(sim.liquidaOrigemAnual)}% a.a. líquido</b></li>
        <li><span>Destino, bruto</span><b>${virgulaN(sim.brutaAnual)}% a.a.</b></li>
        <li><span>Imposto no destino</span><b>${sim.aliquota ? `${virgulaN(sim.aliquota * 100)}% · ${brlTexto(sim.ir)}` : meu ? 'já líquido' : 'isento'}</b></li>
        <li><span>Dinheiro parado no resgate</span><b>${cr.du ? `${cr.du} ${cr.du === 1 ? 'dia útil' : 'dias úteis'} · cai ${diaSemana(cr.data)}, ${dataCurta(cr.data)}` : 'nenhum'}</b></li>
      </ul>
      <p class="nota">Conta aproximada: o rendimento passado do fundo não garante o futuro; o valor de hoje já é líquido de IR (como o app do Itaú mostra).${sim.marcacao ? ' IPCA+ e prefixado oscilam de preço: vender antes do vencimento pode dar mais ou menos que isso.' : ''} Resgate antes de 30 dias da aplicação paga IOF.</p>`;
  };
  folha.querySelectorAll('[data-tipo]').forEach(b => { b.onclick = () => abrirSimuladorTroca({ ...ler(), tipo: b.dataset.tipo }); });
  $s('#sOrigem').onchange = () => abrirSimuladorTroca({ ...ler(), valor: undefined, destinoMeu: '' });
  folha.querySelectorAll('#formSim input, #formSim select').forEach(el => el.addEventListener('input', calcular));
  $s('#simClaude').onclick = async () => {
    if (!ultimo) return;
    const { f, o, nomeD, sim, cr, pctO } = ultimo;
    const texto = [
      `MODO PESQUISA troca na renda fixa: ${o.nome} → ${nomeD}`,
      '',
      `O Lastro simulou tirar ${brlTexto(lerValor(f.valor))} de ${o.nome} (rendeu ${pctO != null ? `${Math.round(pctO)}% do CDI` : 's/ histórico'} de verdade, líquido de IR; resgate ${cr.texto}) e pôr em ${nomeD} (${virgulaN(sim.brutaAnual)}% a.a. bruto${f.isento ? ', isento' : ''}), por ${f.meses} meses, com CDI de ${f.cdi}% a.a.${f.tipo === 'ipca' ? ` e IPCA de ${f.ipca}%` : ''}:`,
      `- Fica: ${brlTexto(sim.fica)} · Troca: ${brlTexto(sim.troca)} · diferença ${brlTexto(sim.diferenca)}`,
      '',
      'Confira a conta, pesquise o destino (taxa real de hoje, emissor, FGC, liquidez, marcação a mercado) e diga se a troca vale, quanto e quando. Considere o IR e o come-cotas de quem sai. Devolva só o texto; se mudar o plano, a resposta pequena do Lastro.',
    ].join('\n');
    try { await navigator.clipboard.writeText(texto); aviso({ titulo: 'Conta copiada', detalhe: 'Cole numa conversa nova do Projeto "Vida financeira".' }, { tom: 'ok' }); } catch { aviso('Não deu para copiar.', { erro: true }); }
  };
  calcular();
}

// v9.7: as instruções do Projeto "Vida financeira" moram no app (projeto.txt, fonte única). Mudou o texto → subir
// VERSAO_PROJETO; o menu avisa até o Bruno copiar de novo (localStorage 'lastro-projeto' = versão copiada).
const VERSAO_PROJETO = '9.17.0';
// v9.12.4: com o conector, o Projeto guarda só este texto curto e lê as instruções completas pela ferramenta
// "instrucoes" (worker/mcp.js) — mudar as instruções não exige mais recolar ('lastro-projeto' = 'auto').
const PROJETO_CURTO = 'Sou o Bruno. Neste Projeto, antes de responder qualquer mensagem, chame a ferramenta "instrucoes" do conector Lastro e siga o texto que ela devolver: são as instruções completas e sempre atualizadas (modos CAIXA, CARTEIRA, PLANO e PESQUISA). Se o conector Lastro não estiver entre as ferramentas, não continue: me peça para ligá-lo (no app: menu → Claude direto; na conversa: ligue o conector Lastro).';
const projetoDesatualizado = () => { try { const v = localStorage.getItem('lastro-projeto'); return v === 'auto' ? !conectorLigado() : v !== VERSAO_PROJETO; } catch { return false; } };
// v9.9.6: o texto inteiro do Projeto = parte do caixa (docs/AGENTE-FINANCEIRO.md, no repositório privado — lida com o
// token do GitHub, nunca vai para o site) + parte do Lastro (projeto.txt). Sem acesso ao repositório, só a do Lastro.
async function parteCaixaDoProjeto() {
  try {
    const gh = await lerGithub();
    if (!gh?.token) return '';
    const r = await fetch(`https://api.github.com/repos/${gh.repo}/contents/docs/AGENTE-FINANCEIRO.md?ref=${encodeURIComponent(gh.branch)}`, { headers: { Authorization: `Bearer ${gh.token}`, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28' }, cache: 'no-store' });
    if (!r.ok) return '';
    const md = await r.text();
    const ini = md.indexOf('▼ (copie daqui)'), fim = md.indexOf('▲ (até aqui)');
    return ini < 0 ? '' : md.slice(md.indexOf('\n', ini) + 1, fim < 0 ? undefined : fim).trim();
  } catch { return ''; }
}
async function abrirInstrucoesProjeto() {
  let lastro = '';
  try { lastro = await (await fetch('projeto.txt', { cache: 'no-store' })).text(); } catch { /* offline: o service worker tem a cópia */ }
  if (!lastro) return aviso('Não deu para abrir as instruções agora.', { erro: true });
  const caixa = await parteCaixaDoProjeto();
  const texto = caixa ? `${caixa}\n\n---\n\n${lastro.trim()}\n` : lastro;
  const auto = conectorLigado();
  let modo = ''; try { modo = localStorage.getItem('lastro-projeto') || ''; } catch { /* sem armazenamento */ }
  const folha = abrirFolha(`
    <h2>Instruções do Projeto</h2>
    ${auto ? `<p class="meta">${modo === 'auto' ? `${icTom('bom')} <b>Automáticas.</b> O Projeto já lê as instruções pelo conector: nada para recolar quando elas mudarem.` : '<b>Jeito novo (recomendado):</b> cole uma vez só este texto curto. Ele manda o Claude ler as instruções completas pelo conector Lastro — quando elas mudarem, nada para recolar.'}</p>
    <p class="meta">No claude.ai: Projeto "Vida financeira" → Instruções do projeto → apague <b>todo</b> o texto e cole.</p>
    <button type="button" class="btn${modo === 'auto' ? '' : ' prim'}" id="pjCurto">Copiar o texto curto</button>
    <details class="dobra"><summary><span>Sem o conector: o texto inteiro</span></summary>` : ''}
    <p class="meta">${!auto && modo === 'auto' ? '<b>O conector está desligado:</b> o texto curto que está no Projeto não funciona sem ele. Ligue de novo (menu → Claude direto) ou cole o texto inteiro. ' : ''}${projetoDesatualizado() && modo !== 'auto' ? `<b>Mudaram na v${VERSAO_PROJETO}.</b> ` : ''}No claude.ai: Projeto "Vida financeira" → Instruções do projeto. ${caixa ? 'Apague <b>todo</b> o texto que está lá e cole este no lugar: ele já junta as duas partes (o caixa e o Lastro).' : 'Sem acesso ao repositório agora: este é só o bloco do Lastro — apague o bloco antigo do Lastro e cole este no lugar, depois das instruções do caixa.'}</p>
    <button type="button" class="btn${auto ? '' : ' prim'}" id="pjCopiar">Copiar as instruções</button>${auto ? '</details>' : ''}
    <details class="dobra"><summary><span>Ver o texto</span></summary><pre class="diag">${esc(texto)}</pre></details>`);
  folha.querySelector('#pjCurto')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(PROJETO_CURTO);
      try { localStorage.setItem('lastro-projeto', 'auto'); } catch { /* sem armazenamento */ }
      aviso({ titulo: 'Texto curto copiado', detalhe: 'Apague tudo nas instruções do Projeto e cole. Daqui em diante elas se atualizam sozinhas.' }, { tom: 'ok', duracao: 8000 });
    } catch { aviso('Não deu para copiar.', { erro: true }); }
  });
  folha.querySelector('#pjCopiar').onclick = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      try { localStorage.setItem('lastro-projeto', VERSAO_PROJETO); } catch { /* sem armazenamento */ }
      aviso({ titulo: 'Instruções copiadas', detalhe: 'Cole nas instruções do Projeto no claude.ai.' }, { tom: 'ok' });
    } catch { aviso('Não deu para copiar.', { erro: true }); }
  };
}

// v9.10: conector MCP (worker/mcp.js). Ligar manda ao servidor a chave da família e o token do GitHub (decisão do Bruno,
// 11/11/2026: aceitou que a chave fique no Cloudflare em troca de não ter de baixar e anexar arquivo); desligar apaga.
async function conectorPedido(acao, extra = {}) {
  const gh = await lerGithub();
  if (!gh?.token) throw new Error('Configure a publicação (token do GitHub) antes.');
  const r = await fetch(`mcp/${acao}`, { method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo: gh.repo, branch: gh.branch, caminho: gh.caminho, token: gh.token, ...extra }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.erro) throw new Error(j.erro || `o servidor respondeu ${r.status}`);
  return j;
}

async function abrirConector() {
  const folha = abrirFolha('<h2>Claude direto (conector)</h2><p class="meta">Consultando o servidor…</p>');
  let st;
  try { st = await conectorPedido('estado'); } catch (e) { st = { erro: e.message }; }
  if (!folha.isConnected || $('veu').hidden) return;
  const passos = `<ol class="passos">
      <li>No claude.ai: <b>Configurações → Conectores → Adicionar conector personalizado</b>.</li>
      <li>Nome: <b>Lastro</b>. Em URL, cole o endereço copiado. Sem OAuth (deixe em branco).</li>
      <li>No Projeto "Vida financeira", ligue o conector Lastro (ícone de ferramentas da conversa).</li>
      <li>Pronto: no PLANO ou numa análise do dia, o Claude lê e grava sozinho — ele mostra o que vai mudar e só grava depois do seu "pode gravar".</li>
    </ol>`;
  folha.innerHTML = `<div class="alca"></div><h2 id="folhaTitulo">Claude direto (conector)</h2>
    ${st.erro ? `<p class="erro">${esc(st.erro)}</p>` : st.ligado ? `
      <p class="meta"><b>Ligado</b> desde ${esc(dataCurta(st.em.slice(0, 10)))}. O Claude lê o caixa e a carteira por aqui e grava plano, análises, fichas, estratégia, meta de alocação, análise de mercado, orçamentos e valores conhecidos. Valores, posições e o mês continuam só no app e no fechamento.</p>
      <button type="button" class="btn prim" id="cnCopiar">Copiar o endereço do conector</button>
      <details class="dobra"><summary><span>Como pôr no claude.ai</span></summary>${passos}</details>
      <p class="nota">O endereço é a senha do conector: quem tiver o link lê os dados. Não mande para ninguém.</p>
      <button type="button" class="btn" id="cnLigar">Ligar de novo (token do GitHub novo)</button>
      <button type="button" class="btn" id="cnNovoLink">Trocar o endereço (se o link vazou)</button>
      <button type="button" class="btn perigo" id="cnDesligar">Desligar o Claude</button>` : `
      <p class="meta">Com o conector, o Claude lê o caixa e a carteira direto do Lastro e grava plano, análises e fichas sem você baixar, anexar ou importar nada. O fechamento do mês continua com os arquivos.</p>
      <p class="nota"><b>O que muda na segurança:</b> para o Claude ler, a chave da família fica guardada no servidor do Lastro (hoje ela só existe nos celulares). "Desligar o Claude" apaga a chave de lá na hora.</p>
      <button type="button" class="btn prim" id="cnLigar">Ligar o Claude</button>`}`;
  const copiar = async url => {
    try { await navigator.clipboard.writeText(url); aviso({ titulo: 'Endereço copiado', detalhe: 'Cole em claude.ai → Configurações → Conectores.' }, { tom: 'ok' }); } catch { aviso('Não deu para copiar.', { erro: true }); }
  };
  folha.querySelector('#cnCopiar')?.addEventListener('click', () => copiar(st.url));
  folha.querySelector('#cnLigar')?.addEventListener('click', async e => {
    const b = e.currentTarget;
    if (!estado.cofre?.bruta) return aviso('Tranque e destranque o app (digital ou senha) e tente de novo.', { erro: true, fixo: true });
    b.disabled = true; b.textContent = 'Ligando…';
    try {
      const r = await conectorPedido('ligar', { chave: b64.de(estado.cofre.bruta) });
      try { localStorage.setItem('lastro-conector', '1'); } catch { /* sem armazenamento */ }
      await abrirConector();
      await copiar(r.url);
    } catch (err) {
      b.disabled = false; b.textContent = 'Ligar o Claude';
      aviso(`Não deu para ligar: ${err.message}`, { erro: true, fixo: true });
    }
  });
  folha.querySelector('#cnNovoLink')?.addEventListener('click', async () => {
    if (!estado.cofre?.bruta) return aviso('Tranque e destranque o app (digital ou senha) e tente de novo.', { erro: true, fixo: true });
    if (!(await confirmar({ titulo: 'Trocar o endereço?', texto: 'O endereço atual para de funcionar agora. Depois, no claude.ai (Configurações → Conectores → Lastro), troque a URL pela nova — o app já copia para você.', sim: 'Trocar', manter: true }))) return abrirConector();
    try {
      const r = await conectorPedido('ligar', { chave: b64.de(estado.cofre.bruta), novoLink: true });
      await abrirConector();
      await copiar(r.url);
    } catch (err) { aviso(`Não deu para trocar: ${err.message}`, { erro: true, fixo: true }); }
  });
  folha.querySelector('#cnDesligar')?.addEventListener('click', async () => {
    if (!(await confirmar({ titulo: 'Desligar o Claude?', texto: 'A chave da família sai do servidor agora e o endereço do conector para de funcionar. Para ligar de novo, o app cria um endereço novo.', sim: 'Desligar', perigo: true, manter: true }))) return abrirConector();
    try {
      await conectorPedido('desligar');
      try { localStorage.removeItem('lastro-conector'); } catch { /* sem armazenamento */ }
      aviso('Conector desligado: a chave saiu do servidor.', { tom: 'ok' });
      abrirConector();
    } catch (err) { aviso(`Não deu para desligar: ${err.message}`, { erro: true, fixo: true }); }
  });
}

// v9.7: os dois painéis (HTML do agente, com os dados) para o Claude Code rodar a bateria de testes do app
// v9.12.4: baixa direto (Bruno, 14/11: no celular só compartilhava e não dava para guardar o arquivo). Os dois vão
// para a pasta Downloads; Compartilhar fica no aviso, como alternativa.
async function mandarPaineis() {
  const hoje = hojeBrasil();
  const arquivos = [new File([estado.conteudo.html], `painel_cashflow_${hoje}.html`, { type: 'text/html' })];
  if (estado.cart.conteudo?.html) arquivos.push(new File([estado.cart.conteudo.html], `painel_carteira_${hoje}.html`, { type: 'text/html' }));
  for (const [i, f] of arquivos.entries()) {
    if (i) await new Promise(r => setTimeout(r, 700)); // dois downloads colados o Chrome às vezes junta num só
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 30000);
  }
  const compartilhar = navigator.canShare?.({ files: arquivos }) ? { rotulo: 'Compartilhar', fn: () => navigator.share({ files: arquivos, title: 'Painéis do Lastro para testes' }).catch(() => {}) } : undefined;
  aviso({ titulo: `${arquivos.length === 2 ? 'Os dois painéis foram baixados' : 'Painel baixado'}`, detalhe: 'Estão na pasta Downloads. Anexe na conversa do Claude Code. (Se o celular perguntar, permita vários downloads.)' }, { tom: 'ok', duracao: 9000, acao: compartilhar });
}

// v9.7: quando o dinheiro de um resgate pedido agora cai na conta, e a ficha do ativo (pesquisada pelo Claude)
const FONTE_PRAZO = { ficha: 'pela ficha do ativo', fundo: 'pela carteira', b3: 'padrão da B3 — confirme na ficha', cripto: 'venda na Binance e Pix no mesmo dia' };
const diaSemana = dataISO => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${dataISO}T12:00:00`).getDay()];
function creditoDe(cart, chave, classe) {
  const hora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  return creditoResgate(cart, chave, classe, hojeBrasil(), { feriados: estado.dados?.feriados?.datas || {}, hora });
}
function htmlResgateAtivo(cart, a) {
  const r = creditoDe(cart, a.chave, a.classe);
  const linhas = linhasFicha(r.ficha);
  const fonteFicha = r.ficha?.fonte ? `Fonte: ${r.ficha.fonte}${r.ficha.atualizado_em ? ` (${dataCurta(r.ficha.atualizado_em)})` : ''}` : '';
  return `<div class="resgate-prazo">
      <span class="etapa-ic"><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/></svg></span>
      <div><b>${r.data ? `Resgate pedido agora cai ${r.du === 0 ? 'hoje' : `${diaSemana(r.data)}, ${dataCurta(r.data)}`}` : 'Prazo de resgate desconhecido'}</b>
      <small>${r.data ? `${esc(r.texto)}${r.du ? ' úteis' : ''} · ${esc(FONTE_PRAZO[r.fonte] || '')}${r.depoisDoHorario ? ` · depois das ${esc(r.horario)} conta a partir de amanhã` : ''}` : 'Peça a ficha dos seus ativos ao Claude (Carteira › Alocação).'}</small></div>
    </div>
    ${linhas.length ? `<details class="dobra"><summary><span>Ficha do ativo</span></summary>
      <ul class="linhas">${linhas.map(([k, v]) => `<li><span>${esc(k)}</span><b>${esc(v)}</b></li>`).join('')}</ul>
      ${fonteFicha ? `<p class="nota">${esc(fonteFicha)}</p>` : ''}</details>` : ''}`;
}
const alertasDoPlano = () => {
  const cart = estado.cart.dados;
  if (!cart) return [];
  const classes = new Map(listaAtivos(cart).map(a => [a.chave, a.classe]));
  const est = cart.estrategia || {};
  // v9.13: o que o Bruno pausou no app e os gatilhos que o app viu disparar vão junto para o Claude
  const extra = [
    ...(est.pausados || []).map(p => ({ tom: 'atencao', titulo: `Pausado no app em ${dataCurta(p.em)}`, texto: `"${p.item}" na ordem de aportes. Decida se continua pausado, sai da estratégia ou volta.` })),
    ...gatilhos(est, valoresGatilhos()).filter(g => g.disparou).map(g => ({ tom: 'atencao', titulo: 'Gatilho da estratégia disparou', texto: `${g.texto} (hoje: ${numBr(g.agora)}).` })),
  ];
  return [...extra, ...alertasPlano(cart, estado.cdiHist?.cdi, { liquidez: k => prazoResgate(cart, k, classes.get(k)) })];
};
// v9.13: valores de hoje para os gatilhos da estratégia (ficha.js) — dólar da rota /cotacoes, CDI do Banco Central e o
// salário do mês no caixa (o previsto conta: a renda mudou assim que o valor novo entra na agenda)
const numBr = v => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
function valoresGatilhos() {
  const sal = (estado.dados?.receitas || []).filter(r => r.categoria === 'salario').reduce((t, r) => t + (Number(r.valor) || 0), 0);
  return { dolar: estado.cot?.dados?.ptax?.agora ?? null, cdi: cdiAnualDe(estado.cdiHist?.cdi), salario: sal || null };
}

// v9.13: a estratégia que chegou (conector, resposta pequena ou fechamento) é comparada com a última vista neste celular
// (IDB 'estrategiaVista' = { estrategia, target_allocation }); mudou → aviso com o que mudou e Desfazer. Pausas são do app.
async function avisarEstrategia() {
  const cart = estado.cart.dados;
  if (!estado.github || !cart?.estrategia) return;
  const vista = await banco.ler('estrategiaVista').catch(() => null);
  const agora = { estrategia: cart.estrategia, target_allocation: cart.target_allocation };
  await banco.gravar('estrategiaVista', agora).catch(() => {});
  if (!vista?.estrategia) return;
  const linhas = mudancasEstrategia(vista.estrategia, cart.estrategia, cart.meta_dolarizacao);
  if (!linhas.length) return;
  const abrir = () => {
    const folha = abrirFolha(`
      <h2>A estratégia mudou</h2>
      <p class="meta">O Claude gravou uma estratégia nova${cart.estrategia.revisada_em ? ` (revisada em ${dataCurta(cart.estrategia.revisada_em)})` : ''}. As telas, as dicas do Investir e os gatilhos já seguem esta versão.</p>
      <ul class="passos-curtos">${linhas.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <button type="button" class="btn prim" id="estOk">Entendi</button>
      <button type="button" class="btn" id="estVolta">Desfazer: voltar à estratégia anterior</button>`);
    folha.querySelector('#estOk').onclick = () => fecharFolha();
    folha.querySelector('#estVolta').onclick = async () => {
      if (!(await confirmar({ titulo: 'Voltar à estratégia anterior?', texto: 'A carteira volta aos alvos, ordens e gatilhos de antes desta mudança. Para mudar de novo, fale com o Claude.', sim: 'Voltar', perigo: true }))) return;
      const antes = vista.estrategia;
      await aplicarLancamento((cf, c) => ({ cf, cart: { ...c, estrategia: { ...antes, pausados: c.estrategia?.pausados || [] }, target_allocation: derivarTarget(antes) || vista.target_allocation || c.target_allocation } }), 'Estratégia: voltou à anterior');
    };
  };
  aviso({ titulo: 'A estratégia mudou', detalhe: linhas.slice(0, 2).join(' · ') + (linhas.length > 2 ? ` · e mais ${linhas.length - 2}` : '') }, { acao: { rotulo: 'Ver', fn: abrir }, duracao: 15000 });
}
async function pausarItem(texto) {
  const cart = estado.cart.dados;
  const item = (cart?.estrategia?.prioridade_aporte || []).find(i => textoItem(i) === texto);
  if (!item) return;
  const pausado = (cart.estrategia.pausados || []).some(p => p.item === texto);
  await aplicarLancamento((cf, c) => ({ cf, cart: { ...c, estrategia: alternarPausa(c.estrategia, item, hojeBrasil()) } }), `Estratégia: ${pausado ? 'retomado' : 'pausado'} "${texto}"`);
}

// v9.5 (item 8): MODO PESQUISA de um ativo ou revisão da estratégia — 2 passos travados como o Levar para o Claude
function abrirPesquisa(ativo, { estrategia = false, fichas = false, passo = 0, nome = ativo || '' } = {}) {
  const cart = estado.cart.dados;
  if (!cart) return aviso('Importe a carteira antes.', { erro: true });
  const hoje = hojeBrasil();
  const arqs = [`carteira_dados_${hoje}.json`, `cashflow_dados_${hoje}.json`];
  if (fichas) estrategia = false;
  const semNome = estrategia || fichas;
  const titulo = estrategia ? 'Revisar a estratégia' : fichas ? 'Fichas dos seus ativos' : 'Pesquisar um ativo';
  const conector = conectorLigado() && passo !== -1;
  const folha = abrirFolha(conector ? `
    <h2>${titulo}</h2>
    <p class="meta">O conector Claude direto está ligado: nada de arquivo. Copie o pedido e cole numa conversa nova do Projeto "Vida financeira"${estrategia ? ', com a pesquisa na internet ligada' : ''}. ${semNome ? 'O Claude mostra o que vai mudar e só grava depois do seu "pode gravar".' : 'Uma conversa por ativo.'}</p>
    ${semNome ? '' : `<label for="pqNome">Ativo ou tema</label><input class="campo" id="pqNome" autocomplete="off" value="${esc(nome)}" placeholder="Ex.: VWRA, Tesouro IPCA+ 2029, HGLG11" required>`}
    <button type="button" class="btn prim" id="pqCopiar">Copiar o pedido</button>
    <button type="button" class="link" id="pqArquivo">Prefiro mandar o arquivo</button>` : `
    <h2>${titulo}</h2>
    <p class="meta">${estrategia ? 'Numa conversa nova do Projeto "Vida financeira", com a pesquisa na internet ligada. O Claude grava a estratégia nova na carteira; você importa de volta.' : fichas ? 'O Claude pesquisa, com fonte e data, o prazo de resgate, as taxas, o imposto e o risco de cada investimento. O app usa a ficha para dizer quando cada resgate cai na conta.' : 'Uma conversa nova do Projeto por ativo (não enche o contexto). O Claude devolve uma análise a fundo, com fonte e data de cada número.'}</p>
    ${semNome ? '' : `<label for="pqNome">Ativo ou tema</label><input class="campo" id="pqNome" autocomplete="off" value="${esc(nome)}" placeholder="Ex.: VWRA, Tesouro IPCA+ 2029, HGLG11" required>`}
    <ol class="passos-lv">
      <li class="passo-lv ${passo >= 1 ? 'feito' : 'agora'}"><div class="passo-cab"><span class="etapa-ic">${passo >= 1 ? '✓' : 1}</span><b>Mande ${estrategia ? 'os dois arquivos' : 'a carteira'} para o Claude</b></div>
        <div class="passo-corpo"><button type="button" class="btn${passo === 0 ? ' prim' : ''}" id="pqEnviar">Compartilhar com o Claude</button></div></li>
      <li class="passo-lv ${passo >= 2 ? 'feito' : passo === 1 ? 'agora' : 'trava'}"><div class="passo-cab"><span class="etapa-ic">${passo >= 2 ? '✓' : passo === 1 ? 2 : svgCadeado}</span><b>Cole o pedido na mesma conversa</b></div>
        ${passo >= 1 ? `<div class="passo-corpo"><button type="button" class="btn${passo === 1 ? ' prim' : ''}" id="pqCopiar">Copiar o pedido</button></div>` : '<p class="passo-trava">Abre depois do passo 1.</p>'}</li>
    </ol>
    ${semNome ? '<p class="nota">Quando o Claude devolver o arquivo (pequeno), importe pelo menu → Importar.</p>' : ''}`);
  const ler = () => (semNome ? '' : folha.querySelector('#pqNome').value.trim());
  folha.querySelector('#pqArquivo')?.addEventListener('click', () => abrirPesquisa(ativo, { estrategia, fichas, passo: -1, nome: ler() }));
  if (folha.querySelector('#pqEnviar')) folha.querySelector('#pqEnviar').onclick = async () => {
    if (!semNome && !ler()) return folha.querySelector('#pqNome').focus();
    const foi = estrategia ? await enviarArquivos([[arqs[0], cart], [arqs[1], estado.dados]]) : await enviarArquivo(arqs[0], cart);
    if (foi) abrirPesquisa(ativo, { estrategia, fichas, passo: Math.max(passo, 1), nome: ler() });
  };
  folha.querySelector('#pqCopiar')?.addEventListener('click', async () => {
    if (!semNome && !ler()) return folha.querySelector('#pqNome').focus();
    const t0 = estrategia ? textoEstrategia(cart, arqs, estado.cdiHist?.cdi, alertasDoPlano())
      : fichas ? textoFichas(listaAtivos(cart).filter(a => a.valor > 0), arqs[0]) : textoPesquisa(cart, ler() || ativo, arqs[0]);
    const texto = conector ? pedidoPeloConector(t0, 'carteira') : t0;
    try {
      await navigator.clipboard.writeText(texto);
      aviso({ titulo: 'Pedido copiado', detalhe: conector ? 'Cole numa conversa nova do Projeto e envie.' : 'Volte para a conversa no Claude, cole e envie.' }, { tom: 'ok' });
      if (conector) return fecharFolha();
      abrirPesquisa(ativo, { estrategia, fichas, passo: 2, nome: ler() });
    } catch { aviso('Não deu para copiar.', { erro: true }); }
  });
}

// v9.5: parcelamento do agente (Samsung, Leiturinha…) — muda as próximas faturas; a deste mês já veio do Itaú
function abrirParcelamento(i, rascunho = null) {
  if (!podeLancar()) return;
  const it = (estado.dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const p = it?.parcelamentos?.[i];
  if (!p) return aviso('Esse parcelamento não está mais no painel — busque a atualização.', { erro: true });
  const lojaP = String(p.item || '').replace(/\s*—\s*parcela.*$/i, '');
  const valorP = Number((String(p.item).match(/R\$\s*([\d.]+,\d{2})/) || [])[1]?.replace(/\./g, '').replace(',', '.')) || 0;
  const [nP, tP] = String(p.atual || '1/1').split('/').map(Number);
  // v9.6: categoria (rascunho = o que estava digitado antes de abrir o seletor de categorias)
  const r = rascunho || { loja: lojaP, valor: valorP, n: nP, t: tP, cat: p.cat || adivinharCategoria(lojaP.replace(/\s*\(compra.*$/, '')) || '' };
  const { loja, valor, n, t } = r;
  const folha = abrirFolha(`
    <h2>Parcelamento no cartão</h2>
    <p class="meta">A parcela desta fatura já veio do Itaú. O que você mudar aqui vale para as próximas faturas.</p>
    <form id="formLanc">
      <label for="pLoja">Compra</label>
      <input class="campo" id="pLoja" autocomplete="off" value="${esc(loja)}" required>
      <label for="lValor">Valor de cada parcela (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" value="${esc(virgula(valor.toFixed(2)))}" required>
      <div class="duas-colunas">
        <div><label for="pAtual">Parcela deste mês</label><input class="campo" id="pAtual" type="number" inputmode="numeric" min="1" value="${n || 1}" required></div>
        <div><label for="pTotal">De quantas</label><input class="campo" id="pTotal" type="number" inputmode="numeric" min="1" value="${t || 1}" required></div>
      </div>
      <p class="nota" id="pFim"></p>
      <label for="lCatBtn">Categoria</label>
      <button type="button" class="campo campo-cat" id="lCatBtn">${r.cat ? `${iconeCategoria(r.cat)}<span>${esc(nomeCategoria(r.cat))}</span>` : '<span class="ph">Escolha a categoria</span>'}</button>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>
    <button type="button" class="btn perigo" id="pExcluir">Já quitei / não existe mais</button>`);
  const $p = s2 => folha.querySelector(s2);
  const fim = () => {
    const a = Number($p('#pAtual').value), tt = Number($p('#pTotal').value);
    $p('#pFim').textContent = a >= 1 && tt >= a ? (tt === a ? 'Esta é a última parcela.' : `Faltam ${tt - a} depois desta: a última cai na fatura de ${mesCurto(somarMeses(estado.dados.periodo, tt - a))}.`) : '';
  };
  $p('#pAtual').oninput = fim; $p('#pTotal').oninput = fim; fim();
  const estadoP = () => ({ loja: $p('#pLoja').value, valor: lerValor($p('#lValor').value) || valor, n: Number($p('#pAtual').value) || n, t: Number($p('#pTotal').value) || t, cat: r.cat });
  $p('#lCatBtn').onclick = () => {
    const f = estadoP();
    abrirCategorias({ tipo: 'cartao', atual: f.cat, aoEscolher: c => abrirParcelamento(i, { ...f, cat: c }), aoVoltar: () => abrirParcelamento(i, f) });
  };
  ligarFormLanc(folha, () => {
    const v = lerValor($p('#lValor').value);
    return [x => editarParcelamento(x, { indice: i, itemAntes: p.item, loja: $p('#pLoja').value, valor: v, atual: $p('#pAtual').value, total: $p('#pTotal').value, cat: r.cat }, hojeBrasil()), `Parcelamento: ${$p('#pLoja').value.trim()} ${brlTexto(v)}`];
  });
  $p('#pExcluir').onclick = async () => {
    if (!(await confirmar({ titulo: `Tirar ${lojaP}?`, texto: 'Sai das próximas faturas. A desta fatura não muda. Dá para desfazer.', sim: 'Tirar', perigo: true, manter: true }))) return abrirParcelamento(i);
    try { await aplicarLancamento(x => excluirParcelamento(x, { indice: i, itemAntes: p.item }, hojeBrasil()), `Parcelamento tirado: ${lojaP}`); } catch (err) { aviso(err.message, { erro: true, fixo: true }); }
  };
}
const somarMeses = (ym, n) => { const [a, m] = ym.split('-').map(Number); const t = a * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };

// v9.5: compra que o Claude leu da fatura do Itaú — corrige o detalhe (o total da categoria não muda)
function abrirCompraFatura(i, rascunho = null) {
  if (!podeLancar()) return;
  const it = (estado.dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const c = it?.compras?.[i];
  if (!c) return aviso('Essa compra não está mais no painel — busque a atualização.', { erro: true });
  const r = rascunho || { loja: c.loja || c.descricao || '', valor: virgula(Number(c.valor).toFixed(2)), cat: c.cat || '' };
  const folha = abrirFolha(`
    <h2>Compra da fatura</h2>
    <p class="meta">Lida pelo Claude na fatura do Itaú${c.data ? ` · ${esc(dataCurta(c.data))}` : ''}. Corrigir aqui muda o detalhe; o total da fatura continua o do Itaú.</p>
    <form id="formLanc">
      <label for="fLoja">Loja</label>
      <input class="campo" id="fLoja" autocomplete="off" value="${esc(r.loja)}" required>
      <label for="lValor">Valor (R$)</label>
      <input class="campo" id="lValor" inputmode="decimal" autocomplete="off" value="${esc(r.valor)}" required>
      <label for="lCatBtn">Categoria</label>
      ${botaoCategoria(r.cat)}
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>
    <button type="button" class="btn perigo" id="fExcluir">Tirar do detalhe</button>`);
  const $f = s2 => folha.querySelector(s2);
  const estadoF = () => ({ loja: $f('#fLoja').value, valor: $f('#lValor').value, cat: r.cat });
  $f('#lCatBtn').onclick = () => { const f = estadoF(); abrirCategorias({ tipo: 'cartao', atual: f.cat, aoEscolher: k => abrirCompraFatura(i, { ...f, cat: k }), aoVoltar: () => abrirCompraFatura(i, f) }); };
  ligarFormLanc(folha, () => {
    const f = estadoF(), v = lerValor(f.valor);
    return [x => editarCompraFatura(x, { indice: i, lojaAntes: c.loja || c.descricao, loja: f.loja, valor: v, cat: f.cat }, hojeBrasil()), `Compra da fatura: ${f.loja.trim()} ${brlTexto(v)}`];
  });
  $f('#fExcluir').onclick = async () => {
    if (!(await confirmar({ titulo: 'Tirar esta compra do detalhe?', texto: 'O total da fatura não muda; o valor volta para "registrado só como total".', sim: 'Tirar', perigo: true, manter: true }))) return abrirCompraFatura(i);
    try { await aplicarLancamento(x => excluirCompraFatura(x, { indice: i, lojaAntes: c.loja || c.descricao }, hojeBrasil()), `Compra tirada do detalhe: ${c.loja || c.descricao}`); } catch (err) { aviso(err.message, { erro: true, fixo: true }); }
  };
}

function abrirAssinatura(i, rascunho = null) {
  if (!podeLancar()) return;
  const it = (estado.dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const a = it?.assinaturas?.[i];
  if (!a) return aviso('Essa recorrente não está mais no painel — busque a atualização.', { erro: true });
  const r = rascunho || { nome: a.nome, valor: virgula(a.valor.toFixed(2)), dia: a.dia || 1, cat: a.cat || adivinharCategoria(a.nome) || '', nota: a.nota || '' };
  const [, mesP] = estado.dados.periodo.split('-').map(Number);
  const folha = abrirFolha(`
    <h2>Recorrente no cartão</h2>
    <p class="meta">Já está na fatura de ${MESES_LONGOS[mesP - 1]} e se repete nas próximas.</p>
    <form id="formLanc">
      <label for="aNome">Nome</label>
      <input class="campo" id="aNome" autocomplete="off" value="${esc(r.nome)}" required>
      <label for="aValor">Valor por mês (R$)</label>
      <input class="campo" id="aValor" inputmode="decimal" autocomplete="off" value="${esc(r.valor)}" required>
      <p class="nota" id="aDif" hidden></p>
      <label for="aDia">Dia da cobrança</label>
      <input class="campo" id="aDia" type="number" inputmode="numeric" min="1" max="31" value="${esc(r.dia)}" required>
      <label for="lCatBtn">Categoria</label>
      <button type="button" class="campo campo-cat" id="lCatBtn">${r.cat ? `${iconeCategoria(r.cat)}<span>${esc(nomeCategoria(r.cat))}</span>` : '<span class="ph">Escolha a categoria</span>'}</button>
      <label for="aNota">Observação <small class="opcional">(opcional)</small></label>
      <textarea class="campo area-nota" id="aNota" rows="2">${esc(r.nota || '')}</textarea>
      <p class="erro" id="lErro"></p>
      <button class="btn prim" id="lOk">Salvar e publicar</button>
    </form>
    ${a.foraDoMes === estado.dados.periodo ? `<p class="nota">Fora da fatura de ${MESES_LONGOS[mesP - 1]}: volta na próxima. Para cobrar de novo neste mês, use Desfazer (menu → Lançamentos do app).</p>` : ''}
    <button type="button" class="btn perigo" id="aCancelar">Tirar esta recorrente</button>
    <p class="erro" id="aErro"></p>`);
  const $a = sel => folha.querySelector(sel);
  const estadoA = () => ({ nome: $a('#aNome').value, valor: $a('#aValor').value, dia: $a('#aDia').value, cat: r.cat, nota: $a('#aNota').value });
  const dif = () => {
    const v = lerValor($a('#aValor').value);
    const delta = Math.round((v - a.valor) * 100) / 100;
    $a('#aDif').hidden = !(Math.abs(delta) >= 0.01 && v > 0);
    if (!$a('#aDif').hidden) $a('#aDif').textContent = `Diferença de ${delta > 0 ? '+' : '−'}${brlTexto(Math.abs(delta))} por mês${r.cat ? `, em ${nomeCategoria(r.cat)}` : ''}.`;
  };
  $a('#aValor').oninput = dif;
  dif();
  $a('#lCatBtn').onclick = () => {
    const atual = estadoA();
    abrirCategorias({ tipo: 'cartao', atual: atual.cat, aoEscolher: c => abrirAssinatura(i, { ...atual, cat: c }), aoVoltar: () => abrirAssinatura(i, atual) });
  };
  ligarFormLanc(folha, async () => {
    const f = estadoA();
    const v = lerValor(f.valor);
    let alcance = 'todos';
    if (Math.abs(v - a.valor) >= 0.005) {
      const mes = MESES_LONGOS[mesP - 1];
      alcance = await escolherAlcance({ titulo: `Mudar ${a.nome} de quando?`, texto: `${brlTexto(a.valor)} → ${brlTexto(v)} por mês.`, rotulos: ALCANCES_EDITAR, detalhes: { mes: `Só na fatura de ${mes}; nas próximas volta a ${brlTexto(a.valor)}.`, todos: `Na fatura de ${mes} e nas próximas.`, proximos: `A fatura de ${mes} fica como está.` } });
      if (!alcance) { abrirAssinatura(i, f); return null; }
    }
    return [x => editarAssinatura(x, { indice: i, nomeAntes: a.nome, nome: f.nome, valor: v, dia: f.dia, cat: f.cat, nota: f.nota, alcance }, hojeBrasil()), `Recorrente: ${f.nome.trim()} ${brlTexto(v)}`];
  });
  $a('#aCancelar').onclick = async e => {
    const botao = e.currentTarget;
    const mes = MESES_LONGOS[mesP - 1];
    const fora = a.foraDoMes === estado.dados.periodo;
    const alcance = await escolherAlcance({
      titulo: `Tirar ${a.nome} de quando?`,
      texto: `${brlTexto(a.valor)} por mês, no cartão.`,
      opcoes: fora ? ['todos'] : ['mes', 'todos', 'proximos'],
      detalhes: {
        mes: `Não vai ser cobrada na fatura de ${mes}. Continua nas próximas.`,
        todos: fora ? 'Cancelei: não volta nas próximas faturas.' : `Cancelei antes de cobrar: sai da fatura de ${mes} e das próximas.`,
        proximos: `Já foi cobrada em ${mes}: fica nesta fatura e sai das próximas.`,
      },
    });
    if (!alcance) return abrirAssinatura(i, estadoA());
    botao.disabled = true;
    try {
      const rot = { mes: `Fora só deste mês: ${a.nome}`, todos: `Recorrente cancelada: ${a.nome}`, proximos: `Recorrente sai das próximas: ${a.nome}` }[alcance];
      await aplicarLancamento(x => removerAssinatura(x, { indice: i, nomeAntes: a.nome, alcance, cat: r.cat }, hojeBrasil()), rot);
    } catch (err) {
      aviso(err.message, { erro: true, fixo: true });
    } finally {
      botao.disabled = false;
    }
  };
}

const IC_ATENCAO = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2.5 20h19L12 3zm0 6v5m0 3v.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// SMS do Itaú (compartilhado, colado ou por ?lancar=) -> formulário do cartão já preenchido
async function abrirSms(texto) {
  if (!estado.github) return aviso('Lançar pelo SMS só funciona no celular de quem publica.', { erro: true });
  if (separarSms(texto, hojeBrasil()).lidos.length > 1) return abrirLote(texto); // v8.7: várias mensagens de uma vez
  // o formulário abre em cima da versão publicada mais nova
  const remoto = await consultarRemoto();
  if (remoto && estado.envelope && remoto.publicadoEm > estado.envelope.publicadoEm && remoto.kdf?.sal === estado.cofre?.sal && estado.origem !== 'local') {
    await salvarEnvelope(remoto, 'remoto');
    mostrarPainel(await decifrar(remoto, estado.cofre.chave));
  }
  await esperarPainel();
  if (!podeLancar()) return;
  const hoje = hojeBrasil();
  const lido = lerSms(texto, hoje);
  if (!lido) {
    abrirLancar('cartao');
    return aviso('Não reconheci esse texto como SMS do Itaú — preencha à mão.', { erro: true });
  }
  const marca = await marcaSms(texto);
  const ja = ((await banco.ler('smsLancados')) || []).find(x => x.h === marca)?.em;
  const parece = pareceLancado(estado.dados, lido);
  const lojas = (await banco.ler('lojas')) || {};
  abrirLancar('cartao', {
    valor: virgula(lido.valor.toFixed(2)),
    desc: lido.loja || '',
    cat: lojas[chaveLoja(lido.loja)] || '',
    data: lido.data,
    parcelas: lido.parcelas,
    sms: { ...lido, marca, ja, parece },
  });
}

// "Colar SMS do Itaú": lê da área de transferência; se o Android não deixar, abre um campo para colar
async function colarSms() {
  try {
    const texto = await navigator.clipboard.readText();
    if (separarSms(texto, hojeBrasil()).lidos.length) return abrirSms(texto);
  } catch { /* sem permissão: campo para colar */ }
  const folha = abrirFolha(`
    <h2>Colar SMS do Itaú</h2>
    <p class="meta">No app de Mensagens, segure o SMS, toque em <b>Copiar</b> e cole aqui. Pode colar <b>vários de uma vez</b>: o app separa e você confere antes de lançar.</p>
    <textarea class="campo area-sms" id="smsTexto" rows="5" placeholder="Compra aprovada de R$ …"></textarea>
    <p class="erro" id="smsErro"></p>
    <button type="button" class="btn prim" id="smsLer">Ler SMS</button>`);
  folha.querySelector('#smsTexto').focus();
  folha.querySelector('#smsLer').onclick = () => {
    const texto = folha.querySelector('#smsTexto').value;
    if (!separarSms(texto, hojeBrasil()).lidos.length) return (folha.querySelector('#smsErro').textContent = 'Não reconheci como SMS do Itaú. Confira o texto.');
    abrirSms(texto);
  };
}

// Desfaz o último lançamento deste aparelho (volta ao painel de antes e publica de novo)
async function desfazerUltimo() {
  const lista = (await banco.ler('desfazer')) || [];
  const reg = lista.at(-1);
  if (!reg) return aviso('Nada para desfazer neste aparelho.');
  // depois de um "desfazer", o painel atual equivale ao de antes daquele lançamento (idem para a carteira)
  const eq = await banco.ler('desfazerEquivale');
  const atual = eq?.de === estado.envelope?.publicadoEm ? eq.equivale : estado.envelope?.publicadoEm;
  const atualCart = eq?.cartDe && eq.cartDe === estado.cart.envelope?.publicadoEm ? eq.cartEquivale : estado.cart.envelope?.publicadoEm;
  if (atual !== reg.depois || (reg.cartAntes && atualCart !== reg.cartDepois)) return aviso('Não dá para desfazer: o painel mudou depois desse lançamento (atualização do agente ou importação).', { erro: true, fixo: true });
  let conteudo, conteudoCart = null;
  try {
    conteudo = await decifrar(reg.antes, estado.cofre.chave);
    if (reg.cartAntes) conteudoCart = await decifrar(reg.cartAntes, estado.cofre.chave);
  } catch {
    return aviso('Não dá para desfazer: a senha da família mudou depois desse lançamento.', { erro: true, fixo: true });
  }
  fecharFolha();
  aviso({ titulo: `Desfazendo: ${reg.rotulo}`, detalhe: 'Salvando…' }, { tom: 'carregando' });
  if (conteudoCart) await guardarCarteira(conteudoCart);
  await guardarLocal(conteudo, { suave: true });
  await banco.gravar('desfazer', lista.slice(0, -1));
  await banco.gravar('desfazerEquivale', {
    de: estado.envelope.publicadoEm,
    equivale: reg.antes.publicadoEm,
    cartDe: conteudoCart ? estado.cart.envelope.publicadoEm : eq?.cartDe,
    cartEquivale: conteudoCart ? reg.cartAntes.publicadoEm : eq?.cartEquivale,
  });
  const ok = await publicar({ silencioso: true, mensagem: `Lastro: desfeito — ${reg.rotulo}` });
  if (ok) aviso({ titulo: `Desfeito: ${reg.rotulo}`, detalhe: 'Voltou como estava · enviado para a família' }, { tom: 'ok' });
  else aviso({ titulo: `Desfeito só neste celular: ${reg.rotulo}`, detalhe: `Não publicou: ${estado.publicacao?.erro || 'sem conexão'}.` }, { erro: true, fixo: true, acao: { rotulo: 'Corrigir', fn: resolverPendencia } });
}

// ---------- instalação / service worker ----------
async function instalarApp() {
  if (!estado.instalar) return;
  estado.instalar.prompt();
  await estado.instalar.userChoice;
  estado.instalar = null;
}

function prepararAmbiente() {
  if ('serviceWorker' in navigator) {
    const tinhaVersao = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => reg.update?.().catch(() => {})).catch(() => {});
    let recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!tinhaVersao || recarregou) return;
      recarregou = true;
      const vai = () => location.reload();
      if ($('veu').hidden) vai();
      else aviso('Versão nova do app pronta.', { fixo: true, acao: { rotulo: 'Atualizar', fn: vai } });
    });
  }
  addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    estado.instalar = e;
    const t = $('tela');
    if (!t.hidden && !t.querySelector('#instalar') && !t.querySelector('#senha2')) {
      t.querySelector('.entrada')?.insertAdjacentHTML('beforeend', botaoInstalar());
      ligarInstalar(t);
    }
  });
  // tocou na notificação "Painel atualizado" com o app aberto
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data === 'semana' && estado.conteudo && !estado.travado) abrirResumoSemana(); // v9.16: aviso de domingo com o app aberto
    if (e.data === 'atualizar' && estado.conteudo) {
      buscarAtualizacao();
      buscarCarteira({ silencioso: false });
    }
  });
  addEventListener('popstate', e => {
    $('veu').hidden = true;
    if (!estado.conteudo) return;
    aplicarVista(e.state?.vista || base());
    const aba = e.state?.aba || 'inicio';
    if (e.state?.sub) estado.sub = { ...e.state.sub };
    if (estado.resumoOk && aba !== estado.aba) renderizarApp(aba);
  });
  ligarDicas($('resumo'));
  ligarApp($('resumo'));
  $('veu').addEventListener('click', e => { if (e.target === $('veu')) fecharFolha(); });
  // ao sair: cobre a tela; 1 minuto fora: tranca e apaga da memória (antes de voltar, se o Android
  // deixar o timer rodar em segundo plano). Ao voltar depois de um tempo, confere se há versão nova.
  let saiuEm = 0;
  let timerTrava;
  document.addEventListener('visibilitychange', () => {
    if (verificando || DEMO) return;
    if (document.hidden) {
      saiuEm = Date.now();
      if (estado.cofre && !estado.travado) {
        cobrir();
        guardarSessao().catch(() => {});
        clearTimeout(timerTrava);
        timerTrava = setTimeout(() => { if (document.hidden) trancarEVoltar(); }, TEMPO_FORA);
      }
      return;
    }
    clearTimeout(timerTrava);
    esquecerSessao(); // o app não foi recarregado: a cópia guardada ao sair não serve mais
    const fora = Date.now() - saiuEm;
    if (estado.travado) return destravar(); // trancou em segundo plano: pede a digital agora
    if (estado.cofre && fora > TEMPO_FORA) return trancarEVoltar();
    descobrir();
    if (estado.painelPendente && estado.conteudo) mostrarPainel(estado.conteudo);
    if (estado.cart.pendente && estado.cart.conteudo) mostrarCarteira(estado.cart.conteudo);
    if (estado.conteudo && fora > 10 * 60 * 1000) {
      buscarAtualizacao({ silencioso: true });
      buscarCarteira();
    }
    atualizarCotacoes(); // só busca de novo depois de 15 min
  });
}

async function iniciar() {
  prepararAmbiente();
  if (DEMO) return iniciarDemo();
  let github;
  [estado.salvo, estado.envelope, estado.origem, github, estado.lembretes, estado.digital, estado.avisos, estado.categoriasCopia] = await Promise.all([
    banco.ler('cofre'), banco.ler('envelope'), banco.ler('origem'), banco.ler('github'),
    banco.ler('lembretes'), digitalDisponivel(), banco.ler('avisos'), banco.ler('categoriasApp'),
  ]);
  estado.publicacao = await banco.ler('publicacao').catch(() => null);
  [estado.orcamentosCopia, estado.metasCopia, estado.fechamento, estado.descricoes, estado.fechamentoCartao, estado.binance, estado.fichasCopia] = await Promise.all(['orcamentosCopia', 'metasCopia', 'fechamento', 'descricoes', 'fechamentoCartao', 'binance', 'fichasCopia'].map(k => banco.ler(k).catch(() => null)));
  estado.binance = !!estado.binance;
  estado.pluggy = !!(await banco.ler('pluggy').catch(() => null));
  estado.github = !!github;
  estado.jaUsava = !!estado.envelope; // v8.6: aparelho que já tinha dados antes desta abertura vê as novidades
  // pede ao Android para não apagar os dados do app quando faltar espaço
  navigator.storage?.persist?.().catch(() => {});
  // v3: o app substitui o painel original — a escolha antiga "abrir no painel" (chave 'inicio') não é mais lida
  // fase B: sempre abre trancado; aparelho da v4 passa antes pela tela "Proteja o Lastro"
  if (protegido(estado.salvo)) {
    // v9.6: recarregado pelo Android menos de 1 minuto depois de sair → volta sem pedir a digital
    const sessao = await retomarSessao().catch(() => null);
    estado.retomou = !!sessao;
    if (sessao) estado.cofre = sessao;
    else await travar();
  }
  else if (estado.salvo) estado.cofre = await migrar(estado.salvo);
  if (estado.cofre) await abrirDados();
  // SMS para lançar: compartilhado pelo app de Mensagens ou aberto por ?lancar=<texto> (automação)
  const pedido = new URL(location.href).searchParams.get('lancar');
  if (pedido !== null) history.replaceState(null, '', location.pathname);
  const { arquivos, textos } = await pegarCompartilhado();
  const sms = textos[0] ?? pedido;
  if (arquivos.length) {
    for (const arquivo of arquivos) await importar(arquivo);
    if (sms == null) return;
  }
  if (sms != null && estado.cofre) {
    await abrirSms(sms);
    prepararAvisos();
    return;
  }
  // aberto pela notificação "Painel atualizado": aplica a versão nova sem perguntar
  const veioDoAviso = new URL(location.href).searchParams.has('atualizar');
  if (veioDoAviso) history.replaceState(null, '', location.pathname);
  // atalhos do ícone (segurar o ícone do Lastro): ?acao=lancar | sms | valores
  const atalho = new URL(location.href).searchParams.get('acao');
  if (atalho) history.replaceState(null, '', location.pathname);
  await buscarAtualizacao({ silencioso: !veioDoAviso });
  await buscarCarteira({ silencioso: !veioDoAviso });
  if (atalho && estado.cofre) await abrirAtalho(atalho);
  prepararAvisos();
}

// Lastro Demo (vitrine): cada abertura gera a família fictícia do dia (app/demo/gerar.js) dentro dos moldes dos painéis.
// Sem senha, sem trava, sem GitHub: publicar só confirma na tela. Recomeçar = abrir de novo.
async function iniciarDemo() {
  document.documentElement.classList.add('demo');
  await banco.limpar().catch(() => {});
  const { gerarDemo } = await import('./demo/gerar.js');
  const { cf, cart } = gerarDemo(hojeBrasil());
  const encaixar = async (arquivo, id, dados) => (await (await fetch(arquivo)).text())
    .replace(new RegExp(`(<script[^>]*id="${id}"[^>]*>)[\\s\\S]*?(</script>)`), (_, a, b) => a + JSON.stringify(dados).replace(/<\//g, '<\\/') + b);
  const bruta = crypto.getRandomValues(new Uint8Array(32)), sal = novoSal(); // chave só desta abertura
  estado.cofre = { chave: await importarChave(bruta), bruta, sal: b64.de(sal), iteracoes: ITERACOES, senha: null, token: 'demo' };
  estado.github = true;
  const html = await encaixar('demo/molde-caixa.html', 'cashflow-data', cf);
  await salvarEnvelope(await cifrar({ html, arquivo: 'demonstração' }, estado.cofre.chave, sal, ITERACOES), 'publicado');
  mostrarPainel({ html, arquivo: 'demonstração' });
  await guardarCarteira({ html: await encaixar('demo/molde-carteira.html', 'carteira-data', cart), arquivo: 'demonstração' });
  estado.cart.origem = 'publicado';
  let viu = false;
  try { viu = !!localStorage.getItem('lastro-tour'); } catch { /* sem armazenamento */ }
  if (!viu) esperarPainel().then(() => { try { localStorage.setItem('lastro-tour', '1'); } catch { /* idem */ } abrirTour(); });
}

async function abrirAtalho(atalho) {
  await esperarPainel();
  if (atalho === 'semana') return abrirResumoSemana(); // vale também para o Rafael
  if (!estado.github) return aviso('Os atalhos de lançar só funcionam no celular de quem publica.');
  if (atalho === 'lancar') return abrirLancar();
  if (atalho === 'sms') return colarSms();
  if (atalho === 'valores') {
    for (let i = 0; i < 40 && !estado.cart.dados; i++) await new Promise(ok => setTimeout(ok, 250));
    return abrirValores();
  }
}

configurarLancar({ ultimoDiaDe, estado, virgula, podeLancar, aplicarLancamento, ligarFormLanc, maxPlano, notaAgendamento, MESES_LONGOS, abrirLancar, abrirCategorias, diaSemana, creditoDe, colarSms, mesSeguinte }); // app/lancar.js: o que ele usa do app.js
configurarClaude({ estado, escolherArquivo, ultimoDiaDe, MESES_LONGOS, abrirLancar, buscarRascunhos, alertasDoPlano, desfazerUltimo }); // app/claude.js: o que ele usa do app.js
ligarEscolhas();
iniciar();
