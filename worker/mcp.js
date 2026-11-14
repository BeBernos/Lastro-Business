// v9.10 — Conector MCP do Lastro (decisão do Bruno, 11/11/2026): o Claude (claude.ai) lê caixa e carteira e grava o que
// hoje vai pela "resposta pequena" (plano, análises, fichas, estratégia, orçamentos…), sem baixar nem anexar arquivo.
//
// Custo aceito pelo Bruno: para isso a chave da família fica guardada aqui (Durable Object), junto com o token do
// GitHub do celular dele. Antes o servidor nunca via dado financeiro. Proteções:
// - o endereço do conector tem um segredo aleatório (/mcp/<segredo>); quem não tem o link não lê nada;
// - ligar, ver e desligar exigem o token do GitHub com permissão de escrita no repositório (só o celular do Bruno);
// - "Desligar o Claude" no app apaga chave, token e segredo daqui na hora (o link antigo para de funcionar);
// - o Claude só grava os campos de CAMPOS_PARCIAIS (nunca valores, posições ou o mês) e só depois de validar.
// Os dados são lidos do GitHub (a versão mais nova, mesmo antes de o Cloudflare montar o site) e gravados lá cifrados,
// do mesmo jeito que o celular publica: os aparelhos recebem pelo caminho de sempre (push → buscar → decifrar).

import { b64, cifrar, decifrar, importarChave, salDo } from '../app/cofre.js';
import { CAMPOS_PARCIAIS, NOME_CAMPO, aplicarMudancas, conferirFechamento, juntarParcial } from '../app/parcial.js';

const VERSAO = '9.17.0';
const ARQ = { caixa: { re: /(<script[^>]*id=["']cashflow-data["'][^>]*>)([\s\S]*?)(<\/script>)/i }, carteira: { re: /(<script[^>]*id=["']carteira-data["'][^>]*>)([\s\S]*?)(<\/script>)/i } };
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
const b64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const caminhoDe = (cfg, qual) => (qual === 'caixa' ? cfg.caminho : cfg.caminho.replace(/[^/]*$/, 'carteira.enc'));

// ---------- GitHub ----------
const gh = (cfg, token = cfg.token) => async (caminho, op = {}) => {
  const r = await fetch(`https://api.github.com/repos/${cfg.repo}${caminho}`, {
    ...op,
    headers: { Authorization: `Bearer ${token}`, Accept: op.raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lastro-mcp', ...(op.body ? { 'Content-Type': 'application/json' } : {}) },
  });
  if (!r.ok) {
    const e = new Error(r.status === 401 ? 'o token do GitHub guardado no conector venceu ou foi trocado — no app: menu → Claude direto → Ligar de novo' : `GitHub respondeu ${r.status}`);
    e.status = r.status;
    throw e;
  }
  return op.raw ? r.text() : r.json();
};

// O token tem de poder escrever no repositório do app: é o que separa o celular do Bruno de qualquer outra pessoa
async function conferirToken({ repo, token }) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '') || !token) throw new Error('faltam o repositório ou o token');
  let r;
  try {
    r = await gh({ repo }, token)('');
  } catch (e) {
    if (e.status === 401) throw new Error('o token do GitHub do app venceu ou está errado: troque em menu → Avançado → Configurar publicação');
    throw e;
  }
  if (!r?.permissions?.push) throw new Error('este token não pode publicar no repositório do Lastro');
  return String(r.full_name || repo).toLowerCase(); // nome atual (o GitHub redireciona nomes antigos)
}

async function lerEnvelope(cfg, qual) {
  return JSON.parse(await gh(cfg)(`/contents/${caminhoDe(cfg, qual)}?ref=${encodeURIComponent(cfg.branch)}`, { raw: true }));
}

async function abrir(cfg, qual) {
  const envelope = await lerEnvelope(cfg, qual);
  const chave = await importarChave(b64.para(cfg.chave));
  const conteudo = await decifrar(envelope, chave);
  const m = conteudo.html?.match(ARQ[qual].re);
  if (!m) throw new Error(`o arquivo da ${qual} publicado não tem os dados`);
  return { envelope, conteudo, chave, dados: JSON.parse(m[2]) };
}

// Um commit só com o arquivo novo (mesmo caminho do celular: ref → árvore → commit → ref), refeito uma vez se outro
// envio entrar no meio
async function publicar(cfg, arquivos, mensagem) {
  const api = gh(cfg);
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const ref = await api(`/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
    const pai = ref.object.sha;
    const base = await api(`/git/commits/${pai}`);
    const arvore = await api('/git/trees', { method: 'POST', body: JSON.stringify({ base_tree: base.tree.sha, tree: arquivos.map(a => ({ path: a.caminho, mode: '100644', type: 'blob', content: JSON.stringify(a.envelope) })) }) });
    const commit = await api('/git/commits', { method: 'POST', body: JSON.stringify({ message: mensagem, tree: arvore.sha, parents: [pai] }) });
    try {
      await api(`/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
      return commit.sha;
    } catch (e) {
      if (e.status !== 422 || tentativa) throw e;
    }
  }
}

// ---------- ligar / ver / desligar (chamadas do app, com o token do GitHub) ----------
export async function rotaConector(acao, request, env, armazem) {
  const corpo = await request.json().catch(() => ({}));
  const origem = new URL(request.url).origin;
  const guardado = await armazem.lerConector();
  if (acao === 'ligar') {
    const cfg = { repo: corpo.repo, branch: corpo.branch || 'main', caminho: corpo.caminho || 'app/data/painel.enc', token: corpo.token, chave: corpo.chave };
    if (!/^app\/data\/[\w.-]+\.enc$/.test(cfg.caminho)) throw new Error('caminho do painel inesperado');
    await conferirToken(cfg);
    try {
      await abrir(cfg, 'caixa'); // a chave tem de abrir o painel publicado
    } catch (e) {
      if (e.status) throw e;
      throw new Error('a chave mandada pelo app não abre o painel publicado');
    }
    // religar (token novo) mantém o mesmo endereço: o conector no claude.ai continua funcionando;
    // v9.15: "novoLink" sorteia outro (o antigo para de funcionar na hora — para quando o link vazou)
    cfg.segredo = (!corpo.novoLink && guardado?.segredo) || b64url(crypto.getRandomValues(new Uint8Array(32)));
    cfg.em = new Date().toISOString();
    await armazem.gravarConector(cfg);
    return json({ ligado: true, url: `${origem}/mcp/${cfg.segredo}`, em: cfg.em });
  }
  const nome = await conferirToken({ repo: corpo.repo, token: corpo.token });
  if (guardado && nome !== guardado.repo.toLowerCase()) {
    if (nome !== (await conferirToken({ repo: guardado.repo, token: corpo.token }))) throw new Error('o conector está ligado a outro repositório');
    await armazem.gravarConector({ ...guardado, repo: corpo.repo }); // mesmo repositório, renomeado
  }
  if (acao === 'estado') return json(guardado ? { ligado: true, url: `${origem}/mcp/${guardado.segredo}`, em: guardado.em } : { ligado: false });
  if (acao === 'rascunho') {
    if (corpo.acao === 'apagar') {
      if (!ARQ[corpo.arquivo]) throw new Error('arquivo tem de ser "caixa" ou "carteira"');
      await armazem.apagarRascunho(corpo.arquivo);
      return json({ ok: true });
    }
    return json({ rascunhos: guardado ? await armazem.lerRascunhos() : {} });
  }
  if (acao === 'desligar') {
    await armazem.apagarConector();
    for (const a of Object.keys(ARQ)) await armazem.apagarRascunho(a);
    return json({ ligado: false });
  }
  return json({ erro: 'ação desconhecida' }, 404);
}

// ---------- o servidor MCP (Streamable HTTP, sem sessão; respostas em JSON) ----------
const INSTRUCOES = `Este conector é o Lastro, o app de finanças da família do Bruno (caixa do mês no Itaú + carteira de investimentos).
No começo de toda conversa do Projeto "Vida financeira", chame instrucoes e siga o texto que ela devolve (é a versão mais nova das instruções).
Use-o no lugar dos arquivos anexados: nos modos PLANO, PESQUISA e na análise do dia, leia por aqui e grave por aqui.
1. ler_resumo dá o mês, as contas, a fatura, o patrimônio e o plano; ler_dados traz campos inteiros (caixa ou carteira).
2. formato_escrita diz o que dá para gravar e como.
3. gravar com so_validar=true; mostre ao Bruno o que vai mudar e só grave (so_validar=false) depois do "pode gravar" dele.
No fechamento do mês (modos CAIXA e CARTEIRA), grave com fechamento: fica como rascunho até o Bruno tocar em Aplicar no app (mudança no desenho do painel continua com arquivo).
Valores, posições e o mês nunca são gravados por aqui: são do app e do fechamento.`;

const FERRAMENTAS = [
  {
    name: 'instrucoes',
    description: 'As instruções completas e atualizadas do Projeto "Vida financeira" (modos CAIXA, CARTEIRA, PLANO e PESQUISA). Chame no começo de toda conversa do Projeto e siga o texto.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ler_resumo',
    description: 'Resumo do Lastro de hoje: mês do caixa, entradas, contas, fatura do cartão por categoria, patrimônio por ativo, plano de ação, plano de aportes, pendências e a lista dos campos que ler_dados traz inteiros.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'ler_dados',
    description: 'Campos inteiros do JSON do caixa (cashflow-data) ou da carteira (carteira-data), no formato do painel. Sem "campos", lista os campos que existem e o tamanho de cada um.',
    inputSchema: { type: 'object', properties: { arquivo: { type: 'string', enum: ['caixa', 'carteira'] }, campos: { type: 'array', items: { type: 'string' } } }, required: ['arquivo'] },
  },
  {
    name: 'formato_escrita',
    description: 'O que o Claude pode gravar no Lastro por este conector (campos do caixa e da carteira) e as regras de cada um.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'gravar',
    description: 'Grava no Lastro só os campos permitidos (ver formato_escrita). Use so_validar=true primeiro, mostre ao Bruno o resultado e grave com so_validar=false só depois que ele confirmar. Chega nos celulares em 1 a 5 minutos.',
    inputSchema: {
      type: 'object',
      properties: {
        arquivo: { type: 'string', enum: ['caixa', 'carteira'] },
        campos: { type: 'object', description: 'Campo → valor novo (lista ou objeto inteiro, como no painel).' },
        resumo: { type: 'string', description: 'Uma linha para o histórico do app (ex.: "plano de dezembro revisto").' },
        so_validar: { type: 'boolean' },
      },
      required: ['arquivo', 'campos', 'so_validar'],
    },
  },
  {
    name: 'fechamento',
    description: 'Fechamento do mês (modos CAIXA e CARTEIRA): grava o JSON do mês novo como RASCUNHO — nada vai para a família até o Bruno tocar em Aplicar no app. O JSON do caixa é grande: mande só o que muda (mudancas e acrescentar, em quantas chamadas precisar; cada uma soma ao rascunho) ou o JSON inteiro em dados. Use so_validar=true primeiro, mostre o resumo ao Bruno e grave com so_validar=false depois do "pode gravar". O conector recusa o que perde meses, volta o período ou apaga campos do Lastro.',
    inputSchema: {
      type: 'object',
      properties: {
        arquivo: { type: 'string', enum: ['caixa', 'carteira'] },
        dados: { description: 'O JSON inteiro (objeto ou texto), como no painel. Troca o rascunho todo.' },
        mudancas: { type: 'object', description: 'Caminho → valor novo, com "/" entre as partes (ex.: {"periodo": "2026-12", "receitas": [...], "historico_mensal/2026-12": {...}}).' },
        acrescentar: { type: 'object', description: 'Caminho de uma lista → itens a somar no fim (ex.: {"mesesFechados": [{...novembro...}]}).' },
        resumo: { type: 'string', description: 'Uma linha para o Bruno ver no app (ex.: "novembro fechado, dezembro aberto").' },
        so_validar: { type: 'boolean' },
      },
      required: ['arquivo', 'so_validar'],
    },
  },
];

const tamanho = v => { const n = JSON.stringify(v ?? null).length; return n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`; };
const soma = l => Math.round((l || []).reduce((s, x) => s + (Number(x?.valor) || 0), 0) * 100) / 100;

function resumoCaixa(d) {
  const linha = x => ({ descricao: x.descricao, valor: x.valor, dia: x.dia, status: x.status });
  const itau = (d.despesasVariaveis || []).find(x => x.id === 'var-itau');
  return {
    periodo: d.periodo, ultimaAtualizacao: d.ultimaAtualizacao, caixaInicial: d.caixaInicial,
    receitas: (d.receitas || []).map(linha), despesasFixas: (d.despesasFixas || []).map(linha),
    despesasVariaveis: (d.despesasVariaveis || []).filter(x => x.id !== 'var-itau').map(linha),
    obrigacoesCaixa: (d.obrigacoesCaixa || []).map(linha), resgates: (d.resgates || []).map(linha), ajustesCaixa: (d.ajustesCaixa || []).map(linha),
    cartao: itau && { total: itau.valor, composicao: itau.composicao, categorias: itau.categorias, parcelamentos: (itau.parcelamentos || []).map(p => `${p.item} (${p.atual})`), recorrentes: (itau.assinaturas || []).map(a => `${a.nome} R$ ${a.valor} dia ${a.dia}${a.foraDoMes ? ' (fora deste mês)' : ''}`) },
    totais: { receitas: soma(d.receitas), despesasFixas: soma(d.despesasFixas) },
    patrimonio: d.patrimonio, pendencias: d.pendencias, orcamentos: d.orcamentos, valoresConhecidos: d.valoresConhecidos,
  };
}
function resumoCarteira(c) {
  const meses = Object.keys(c.historico_mensal || {}).sort();
  const atual = c.historico_mensal?.[meses.at(-1)] || {};
  return {
    mes: meses.at(-1), status: atual.status, atualizado_em: atual.atualizado_em, patrimonio: atual.patrimonio_parcial ?? atual.patrimonio_total,
    ativos: atual.ativos, ouro_detalhe: atual.ativos_ouro_detalhe, fluxos_do_mes: atual.fluxos, dividendos_do_mes: atual.dividendos_detalhe,
    target_allocation: c.target_allocation, estrategia_alvos: c.estrategia?.alvos, prioridade_aporte: c.estrategia?.prioridade_aporte,
    meta_dolarizacao: c.meta_dolarizacao, plano_aportes: c.plano_aportes,
    plano_acao: c.plano_acao && { atualizado_em: c.plano_acao.atualizado_em, passos: (c.plano_acao.passos || []).map(p => ({ n: p.n, titulo: p.titulo, status: p.status, quando: p.quando, valor: p.valor, ativo: p.valor_ref })) },
    analise_mercado_de: c.analise_mercado?.data_geral, meses_no_historico: meses,
  };
}

const REGRAS = {
  analises: 'Lista [{data:"AAAA-MM-DD", tipo, titulo, texto, acao}]. Soma às que já existem; mesmo título troca a antiga.',
  plano_acao: 'Objeto {atualizado_em, concluidos, total, passos:[{n, titulo, status:"pendente"|"CONCLUIDO"|"CANCELADO", quando:"AAAA-MM-DD", valor, valor_ref, nota}], anteriores}. Troca o plano inteiro; mantenha os passos que o Bruno já marcou como feitos ou descartados. valor_ref = chave do ativo; ativo novo = nome em minúsculas com _ (ex.: tesouro_prefixado_2029, vwra11), que é a chave que o app cria em "+ Investimento novo".',
  plano_aportes: 'Lista [{mes:"AAAA-MM", ativo, valor, motivo}]. Troca a lista inteira.',
  fichas_ativos: 'Objeto ativo → ficha. Só troca a ficha dos ativos enviados.',
  target_allocation: 'Não mande: com estrategia.alvos, o Lastro calcula sozinho (soma os alvos por grupo do painel).',
  estrategia: 'Objeto inteiro (troca a estratégia; leia antes). alvos [{classe, pct, tese?, painel?}] somando 100 — classes reserva, renda_fixa, fiis, etfs, acoes_br, dolar, ouro, cripto; alvo que cai em mais de um grupo do painel (renda_fixa, etfs_fiis, dolar, ouro, cripto) leva "painel" com a divisão (ex.: dolar 17 com VWRA11/IVVB11 = {"etfs_fiis": 15, "dolar": 2}). prioridade_aporte, prioridade_resgate e evitar_retirar_de: listas de {ativo: chave, nome} (ou classe por extenso: "FIIs"). gatilhos: texto, ou {texto, se: {indicador: "dolar"|"cdi"|"salario", op: ">"|"<", valor}} para o app vigiar. Não mande "pausados" (é do Bruno; o Lastro mantém).',
  analise_mercado: 'Objeto inteiro (como no painel), com data_geral do dia. Em ativos, cada um com urgencia "alta" precisa de d7 ou dm com número (0 se ainda não há histórico) — sem isso o painel da carteira quebra.',
};

function formatoEscrita() {
  return {
    campos: Object.fromEntries(Object.entries(CAMPOS_PARCIAIS).map(([arq, c]) => [arq, Object.fromEntries(Object.entries(c).map(([k, tipo]) => [k, { tipo, nome: NOME_CAMPO[k] || k, ...(REGRAS[k] ? { regra: REGRAS[k] } : {}) }]))])),
    regras_gerais: [
      'Leia o valor atual (ler_dados) antes de trocar um campo inteiro: o que não vier, some.',
      'Nada de valores de conta, posições, mês ou fluxos: isso é do app e do fechamento.',
      'Grave primeiro com so_validar=true e mostre ao Bruno; grave de verdade só depois do "pode gravar".',
    ],
  };
}

async function gravar(cfg, { arquivo, campos, resumo, so_validar }) {
  if (!ARQ[arquivo]) throw new Error('arquivo tem de ser "caixa" ou "carteira"');
  if (!campos || typeof campos !== 'object' || Array.isArray(campos)) throw new Error('campos tem de ser um objeto campo → valor');
  const atual = await abrir(cfg, arquivo);
  const { dados, mudou, ignorados, estrategia } = juntarParcial(atual.dados, { ...campos, lastro_parcial: arquivo });
  const rotulo = `Do Claude: ${mudou.map(k => NOME_CAMPO[k] || k).join(', ')}${arquivo === 'carteira' ? ' na carteira' : ' no caixa'}${resumo ? ` (${String(resumo).slice(0, 120)})` : ''}`;
  const antesDepois = Object.fromEntries(mudou.map(k => [k, { antes: tamanho(atual.dados[k]), depois: tamanho(dados[k]), ...(Array.isArray(dados[k]) ? { itens: `${(atual.dados[k] || []).length} → ${dados[k].length}` } : {}) }]));
  if (so_validar) return { valido: true, vai_mudar: antesDepois, ...(estrategia.length ? { estrategia_muda: estrategia } : {}), ignorados, historico: rotulo, proximo_passo: 'Mostre ao Bruno e chame gravar de novo com so_validar=false depois do "pode gravar".' };
  if (arquivo === 'caixa') (dados.atualizacoes ||= []).push({ data: hojeBR(), acao: `[app] ${rotulo}` });
  if (arquivo === 'carteira') (dados.meta_arquivo ||= {}).alterado_app = hojeBR();
  const html = atual.conteudo.html.replace(ARQ[arquivo].re, (_, abre, _v, fecha) => abre + JSON.stringify(dados).replace(/<\//g, '<\\/') + fecha);
  const envelope = await cifrar({ ...atual.conteudo, html }, atual.chave, salDo(atual.envelope), atual.envelope.kdf.iteracoes);
  const sha = await publicar(cfg, [{ caminho: caminhoDe(cfg, arquivo), envelope }], `Lastro: ${rotulo} (conector)`);
  return { gravado: true, mudou, ...(estrategia.length ? { estrategia_mudou: estrategia } : {}), ignorados, commit: sha, aviso: 'Chega no app em 1 a 5 minutos (o site é remontado a cada envio).' };
}

// v9.17: fechamento como rascunho — o conector confere e guarda cifrado no Durable Object; quem publica é o app (Aplicar).
// As partes se somam ao rascunho que já existe; a conferência é sempre contra o PUBLICADO (é o que não pode se perder).
async function fechamento(cfg, armazem, { arquivo, dados, mudancas, acrescentar, resumo, so_validar }) {
  if (!ARQ[arquivo]) throw new Error('arquivo tem de ser "caixa" ou "carteira"');
  if (dados == null && !mudancas && !acrescentar) throw new Error('mande dados (o JSON inteiro) ou mudancas/acrescentar');
  const atual = await abrir(cfg, arquivo);
  const guardado = (await armazem.lerRascunhos())[arquivo];
  const base = guardado ? (await decifrar(guardado.envelope, atual.chave)).dados : atual.dados;
  let novo = dados;
  if (typeof novo === 'string') { try { novo = JSON.parse(novo); } catch { return { valido: false, erros: ['o JSON veio cortado ou inválido'] }; } }
  novo = aplicarMudancas(base, { dados: novo, mudancas, acrescentar });
  const c = conferirFechamento(atual.dados, novo, arquivo);
  if (c.erros.length) return { valido: false, erros: c.erros, proximo_passo: 'Corrija e chame de novo (nada foi guardado).' };
  if (so_validar) return { valido: true, vai_mudar: c.resumo, ...(guardado ? { soma_ao_rascunho_de: guardado.em } : {}), proximo_passo: 'Mostre ao Bruno e chame de novo com so_validar=false depois do "pode gravar".' };
  const envelope = await cifrar({ dados: novo, arquivo, gravadoEm: new Date().toISOString() }, atual.chave, salDo(atual.envelope), atual.envelope.kdf.iteracoes);
  await armazem.gravarRascunho(arquivo, { envelope, em: new Date().toISOString(), resumo: String(resumo || guardado?.resumo || '').slice(0, 200), conferencia: c.resumo, base: guardado?.base || atual.envelope.publicadoEm });
  return { guardado: true, vai_mudar: c.resumo, proximo_passo: 'Pronto. O Bruno aplica no app: Início → Fechamento pronto → Aplicar (é aí que vai para a família).' };
}

// carteira do rascunho do fechamento (para a etapa Caixa ver a carteira já fechada)
async function carteiraAtual(cfg, armazem) {
  const pub = await abrir(cfg, 'carteira');
  const r = armazem && (await armazem.lerRascunhos())?.carteira;
  return r ? { dados: (await decifrar(r.envelope, pub.chave)).dados, rascunho: true } : { dados: pub.dados, rascunho: false };
}
const AVISO_RASCUNHO = 'carteira do rascunho do fechamento, ainda não aplicado pelo Bruno';

// v9.12.4: as instruções do Projeto vêm do repositório (a mesma fonte do menu → Instruções do Projeto do app): parte do
// caixa (docs/AGENTE-FINANCEIRO.md, entre ▼ e ▲) + parte do Lastro (app/projeto.txt). O Projeto guarda só um texto curto
// que manda chamar esta ferramenta — mudar as instruções não exige mais recolar nada.
async function instrucoes(cfg) {
  const ler = c => gh(cfg)(`/contents/${c}?ref=${encodeURIComponent(cfg.branch)}`, { raw: true });
  const [md, lastro] = await Promise.all([ler('docs/AGENTE-FINANCEIRO.md').catch(() => ''), ler('app/projeto.txt')]);
  const ini = md.indexOf('▼ (copie daqui)'), fim = md.indexOf('▲ (até aqui)');
  const caixa = ini < 0 ? '' : md.slice(md.indexOf('\n', ini) + 1, fim < 0 ? undefined : fim).trim();
  return [caixa, lastro.trim()].filter(Boolean).join('\n\n---\n\n');
}

async function chamar(cfg, nome, args = {}, armazem = null) {
  if (nome === 'instrucoes') return instrucoes(cfg);
  if (nome === 'ler_resumo') {
    const [cx, ct] = await Promise.all([abrir(cfg, 'caixa'), carteiraAtual(cfg, armazem).catch(() => null)]);
    return { hoje: hojeBR(), caixa: resumoCaixa(cx.dados), carteira: ct ? resumoCarteira(ct.dados) : null, ...(ct?.rascunho ? { rascunho_do_fechamento: AVISO_RASCUNHO } : {}), campos_do_caixa: Object.keys(cx.dados), campos_da_carteira: ct ? Object.keys(ct.dados) : [] };
  }
  if (nome === 'ler_dados') {
    if (!ARQ[args.arquivo]) throw new Error('arquivo tem de ser "caixa" ou "carteira"');
    const { dados, rascunho } = args.arquivo === 'carteira' ? await carteiraAtual(cfg, armazem) : await abrir(cfg, args.arquivo);
    const extra = rascunho ? { rascunho_do_fechamento: AVISO_RASCUNHO } : {};
    if (!args.campos?.length) return { ...Object.fromEntries(Object.entries(dados).map(([k, v]) => [k, tamanho(v)])), ...extra };
    return { ...Object.fromEntries(args.campos.map(k => [k, k in dados ? dados[k] : '(não existe)'])), ...extra };
  }
  if (nome === 'formato_escrita') return formatoEscrita();
  if (nome === 'gravar') return gravar(cfg, args);
  if (nome === 'fechamento') return fechamento(cfg, armazem, args);
  throw Object.assign(new Error(`ferramenta desconhecida: ${nome}`), { codigo: -32602 });
}

async function responder(cfg, msg, armazem) {
  const { id, method, params } = msg || {};
  const ok = result => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') {
    return ok({ protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'lastro', version: VERSAO }, instructions: INSTRUCOES });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: FERRAMENTAS });
  if (method === 'tools/call') {
    try {
      const r = await chamar(cfg, params?.name, params?.arguments, armazem);
      return ok({ content: [{ type: 'text', text: typeof r === 'string' ? r : JSON.stringify(r, null, 1) }] });
    } catch (e) {
      if (e.codigo) return { jsonrpc: '2.0', id, error: { code: e.codigo, message: e.message } };
      return ok({ content: [{ type: 'text', text: `Não deu: ${e.message}` }], isError: true });
    }
  }
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `método desconhecido: ${method}` } };
}

export async function servidorMcp(segredo, request, armazem) {
  const cfg = await armazem.lerConector();
  // comparação de tamanho fixo (o segredo é o que protege a leitura)
  const esperado = new TextEncoder().encode(cfg?.segredo || '');
  const veio = new TextEncoder().encode(segredo);
  let dif = esperado.length !== veio.length || !cfg ? 1 : 0;
  for (let i = 0; i < Math.min(esperado.length, veio.length); i++) dif |= esperado[i] ^ veio[i];
  if (dif) return new Response('Conector desligado ou endereço errado.', { status: 404 });
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  const corpo = await request.json().catch(() => null);
  if (!corpo) return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, 400);
  const lote = Array.isArray(corpo) ? corpo : [corpo];
  const respostas = (await Promise.all(lote.filter(m => m && m.id !== undefined && m.id !== null).map(m => responder(cfg, m, armazem))));
  if (!respostas.length) return new Response(null, { status: 202 }); // só notificações (ex.: notifications/initialized)
  return json(Array.isArray(corpo) ? respostas : respostas[0]);
}
