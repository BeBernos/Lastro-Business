// v9.10 — conector MCP: ligar (token + chave conferidos), ler, validar, gravar (commit cifrado), desligar.
// GitHub falso em memória; dados fictícios (nunca os da família).
import { rotaConector, servidorMcp } from '../../worker/mcp.js';
import { b64, cifrar, decifrar, derivarBruta, importarChave, novoSal } from '../../app/cofre.js';
let n = 0, f = 0; const ok = (nome, c, x = '') => { n++; if (!c) f++; console.log((c ? 'PASSA ' : 'FALHA ') + nome + (x ? ' — ' + x : '')); };

const sal = novoSal();
const bruta = await derivarBruta('senha-de-teste', sal, 1000);
const chave = await importarChave(bruta);
const cf = { periodo: '2026-11', ultimaAtualizacao: '2026-11-11', receitas: [{ id: 'r1', descricao: 'Salário', valor: 1000, dia: 15, status: 'pendente' }], despesasFixas: [], despesasVariaveis: [], atualizacoes: [], analises: [] };
const cart = { historico_mensal: { '2026-11': { status: 'em_andamento', patrimonio_parcial: 500, ativos: { renda_fixa: { x: 500 } } } }, target_allocation: { renda_fixa: 25 }, plano_aportes: [] };
const html = (id, d) => `<html><script type="application/json" id="${id}">${JSON.stringify(d)}</script></html>`;
const arquivos = {
  'app/data/painel.enc': JSON.stringify(await cifrar({ html: html('cashflow-data', cf) }, chave, sal, 1000)),
  'app/data/carteira.enc': JSON.stringify(await cifrar({ html: html('carteira-data', cart) }, chave, sal, 1000)),
};
const TOKEN_BOM = 'tok-bom', TOKEN_LEITURA = 'tok-leitura';
let commits = 0;
globalThis.fetch = async (url, op = {}) => {
  const u = new URL(url); const auth = op.headers?.Authorization;
  const resp = (b, s = 200) => new Response(typeof b === 'string' ? b : JSON.stringify(b), { status: s });
  if (![`Bearer ${TOKEN_BOM}`, `Bearer ${TOKEN_LEITURA}`].includes(auth)) return resp({ message: 'Bad credentials' }, 401);
  if (u.pathname === '/repos/fam/antigo') return resp({ full_name: 'fam/lastro', permissions: { push: true } }); // nome antigo: o GitHub redireciona
  const p = u.pathname.replace('/repos/fam/lastro', '');
  if (p === '') return resp({ full_name: 'fam/lastro', permissions: { push: auth === `Bearer ${TOKEN_BOM}` } });
  if (p.startsWith('/contents/')) return resp(arquivos[p.slice(10)] ?? '', arquivos[p.slice(10)] ? 200 : 404);
  if (p === '/git/ref/heads/main') return resp({ object: { sha: 'c' + commits } });
  if (p.startsWith('/git/commits/')) return resp({ tree: { sha: 't' } });
  if (p === '/git/trees') { const b = JSON.parse(op.body); for (const t of b.tree) arquivos[t.path] = t.content; return resp({ sha: 't2' }); }
  if (p === '/git/commits') return resp({ sha: 'c' + (commits + 1) });
  if (p === '/git/refs/heads/main') { commits++; return resp({}); }
  return resp({}, 404);
};
let guardado = null;
const armazem = { lerConector: async () => guardado, gravarConector: async c => { guardado = c; }, apagarConector: async () => { guardado = null; } };
const post = (url, corpo) => new Request(url, { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json' } });
const base = { repo: 'fam/lastro', branch: 'main', caminho: 'app/data/painel.enc' };

let erro = ''; try { await rotaConector('ligar', post('https://x/mcp/ligar', { ...base, token: TOKEN_LEITURA, chave: b64.de(bruta) }), {}, armazem); } catch (e) { erro = e.message; }
ok('token sem permissão de escrita não liga', /não pode publicar/.test(erro) && !guardado, erro);
erro = ''; try { await rotaConector('ligar', post('https://x/mcp/ligar', { ...base, token: TOKEN_BOM, chave: b64.de(crypto.getRandomValues(new Uint8Array(32))) }), {}, armazem); } catch (e) { erro = e.message; }
ok('chave errada não liga', /não abre o painel/.test(erro) && !guardado, erro);
const lig = await (await rotaConector('ligar', post('https://x/mcp/ligar', { ...base, token: TOKEN_BOM, chave: b64.de(bruta) }), {}, armazem)).json();
ok('liga e devolve o endereço secreto', lig.ligado && /^https:\/\/x\/mcp\/[\w-]{40,}$/.test(lig.url), lig.url);
const lig2 = await (await rotaConector('ligar', post('https://x/mcp/ligar', { ...base, token: TOKEN_BOM, chave: b64.de(bruta) }), {}, armazem)).json();
ok('ligar de novo mantém o mesmo endereço', lig2.url === lig.url);
const segredo = lig.url.split('/').pop();

const rpc = async (corpo, seg = segredo) => { const r = await servidorMcp(seg, post('https://x/mcp/' + seg, corpo), armazem); return { status: r.status, j: r.status === 200 ? await r.json() : null }; };
ok('endereço errado não responde', (await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, 'x'.repeat(43))).status === 404);
const ini = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't' } } });
ok('initialize com instruções', ini.j.result.serverInfo.name === 'lastro' && ini.j.result.protocolVersion === '2025-03-26' && /so_validar/.test(ini.j.result.instructions));
ok('notificação = 202', (await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).status === 202);
const lista = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
ok('4 ferramentas', lista.j.result.tools.map(t => t.name).join() === 'ler_resumo,ler_dados,formato_escrita,gravar');
const texto = r => JSON.parse(r.j.result.content[0].text);
const res = texto(await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'ler_resumo', arguments: {} } }));
ok('ler_resumo traz caixa e carteira', res.caixa.periodo === '2026-11' && res.caixa.receitas[0].valor === 1000 && res.carteira.patrimonio === 500);
const ld = texto(await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'ler_dados', arguments: { arquivo: 'carteira', campos: ['target_allocation'] } } }));
ok('ler_dados traz o campo', ld.target_allocation.renda_fixa === 25);
const val = texto(await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'gravar', arguments: { arquivo: 'carteira', campos: { target_allocation: { renda_fixa: 28 }, ativos: {} }, so_validar: true } } }));
ok('validar não grava e avisa o que ignora', val.valido && commits === 0 && val.ignorados.includes('ativos') && val.vai_mudar.target_allocation, JSON.stringify(val));
const g = texto(await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'gravar', arguments: { arquivo: 'carteira', campos: { target_allocation: { renda_fixa: 28 } }, resumo: 'meta alinhada', so_validar: false } } }));
const novo = await decifrar(JSON.parse(arquivos['app/data/carteira.enc']), chave);
const dadosNovos = JSON.parse(novo.html.match(/id="carteira-data">([\s\S]*?)<\/script>/)[1]);
ok('gravar faz um commit cifrado com a mesma chave e o mesmo sal', g.gravado && commits === 1 && dadosNovos.target_allocation.renda_fixa === 28 && dadosNovos.historico_mensal['2026-11'].patrimonio_parcial === 500 && JSON.parse(arquivos['app/data/carteira.enc']).kdf.sal === b64.de(sal));
const ga = texto(await rpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'gravar', arguments: { arquivo: 'caixa', campos: { analises: [{ data: '2026-11-11', titulo: 'Teste', texto: 'x' }] }, so_validar: false } } }));
const cfNovo = JSON.parse((await decifrar(JSON.parse(arquivos['app/data/painel.enc']), chave)).html.match(/id="cashflow-data">([\s\S]*?)<\/script>/)[1]);
ok('análise no caixa entra com o rastro "[app] Do Claude"', ga.gravado && cfNovo.analises.length === 1 && /\[app\] Do Claude: análises no caixa/.test(cfNovo.atualizacoes.at(-1).acao));
const proibido = await rpc({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'gravar', arguments: { arquivo: 'caixa', campos: { receitas: [] }, so_validar: true } } });
ok('campo proibido é recusado', proibido.j.result.isError && /nada que o Lastro saiba juntar/.test(proibido.j.result.content[0].text));
guardado.repo = 'fam/antigo'; // o repositório foi renomeado depois de ligar
const est = await (await rotaConector('estado', post('https://x/mcp/estado', { repo: 'fam/lastro', token: TOKEN_BOM }), {}, armazem)).json();
ok('repositório renomeado: continua ligado e guarda o nome novo', est.ligado && est.url === lig.url && guardado.repo === 'fam/lastro');
erro = ''; try { await rotaConector('desligar', post('https://x/mcp/desligar', { repo: 'fam/lastro', token: TOKEN_LEITURA }), {}, armazem); } catch (e) { erro = e.message; }
ok('desligar exige o token de quem publica', guardado && /não pode publicar/.test(erro));
await rotaConector('desligar', post('https://x/mcp/desligar', { repo: 'fam/lastro', token: TOKEN_BOM }), {}, armazem);
ok('desligado: o endereço antigo para de responder', !guardado && (await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/list' })).status === 404);
console.log(`${n - f}/${n}`); process.exit(f ? 1 : 0);
