import { efeitos } from './investimentos.js';
import { somarDiasUteis } from './liquidez.js';

// v9.4 / v9.9 — Itaú pelo Open Finance (Pluggy). O celular guarda o CLIENT_ID/SECRET cifrados; o Worker só repassa
// (/pluggy/…) para api.pluggy.ai, sem guardar nada (mesma decisão da Binance). Cada investimento da Pluggy é ligado a
// um ativo da carteira (`ligacoes`: id da Pluggy → chave do ativo) e o app atualiza o valor 1× por dia.

async function pedir(base, caminho, { apiKey, corpo } = {}) {
  const r = await fetch(`${base}${caminho}`, {
    method: corpo ? 'POST' : 'GET',
    headers: { ...(corpo ? { 'Content-Type': 'application/json' } : {}), ...(apiKey ? { 'X-API-KEY': apiKey } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const texto = await r.text();
  let j = {};
  try { j = JSON.parse(texto); } catch { /* resposta que não é JSON */ }
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) throw new Error('a Pluggy não aceitou as chaves (confira o CLIENT_ID e o CLIENT_SECRET da Development Application)');
    throw new Error(`a Pluggy respondeu ${r.status}${j.message ? `: ${j.message}` : ''}`);
  }
  return j;
}

// Itens (conexões) da Application: os ids informados ou, sem nenhum, os que a Pluggy listar
async function itens(base, apiKey, ids) {
  if (ids.length) return ids;
  const j = await pedir(base, '/items', { apiKey }).catch(() => ({}));
  const achados = (j.results || []).map(x => x.id).filter(Boolean);
  if (!achados.length) throw new Error('falta o Item ID: no dashboard.pluggy.ai, abra a página Demo, toque na conexão do Itaú (coluna da esquerda) e copie o itemId que aparece no detalhe');
  return achados;
}

export async function lerItau({ clientId, clientSecret, itemIds = [] }, { base = 'pluggy' } = {}) {
  const { apiKey } = await pedir(base, '/auth', { corpo: { clientId, clientSecret } });
  if (!apiKey) throw new Error('a Pluggy não devolveu a chave de acesso');
  const contas = [], investimentos = [], conexoes = [];
  for (const id of await itens(base, apiKey, itemIds)) {
    const it = await pedir(base, `/items/${encodeURIComponent(id)}`, { apiKey }).catch(() => null);
    if (it) conexoes.push({ id, banco: it.connector?.name || 'Banco', status: it.status || '', atualizadoEm: it.lastUpdatedAt || it.updatedAt || null, sandbox: !!it.connector?.isSandbox });
    const ac = await pedir(base, `/accounts?itemId=${encodeURIComponent(id)}`, { apiKey });
    const iv = await pedir(base, `/investments?itemId=${encodeURIComponent(id)}`, { apiKey }).catch(() => ({ results: [] }));
    contas.push(...(ac.results || []));
    investimentos.push(...(iv.results || []));
  }
  return { ...resumir(contas, investimentos), conexoes };
}

// Só o que o app usa: nome, tipo e saldo (nada de número de conta)
export function resumir(contas, investimentos) {
  const n = v => Math.round((Number(v) || 0) * 100) / 100;
  return {
    contas: contas.map(c => ({ id: c.id, nome: c.name || c.marketingName || 'Conta', tipo: c.type === 'CREDIT' ? 'cartao' : 'conta', saldo: n(c.balance), limite: c.creditData?.creditLimit != null ? n(c.creditData.creditLimit) : null })),
    // v9.9.10 (conferido pelo Bruno, 08/11, Active Fix All): balance = LÍQUIDO (já sem o IR) — é o que a carteira
    // guarda; amountWithdrawal = BRUTO, só para mostrar. As v9.9.7–9.9.10 trocaram os dois; não inverter de novo.
    investimentos: investimentos.map(i => ({ id: i.id, nome: i.name || i.code || 'Investimento', tipo: String(i.type || '').toLowerCase(), subtipo: String(i.subtype || '').toLowerCase(), liquido: n(i.balance ?? i.amount), bruto: i.amountWithdrawal != null ? n(i.amountWithdrawal) : null, data: i.date || null })),
  };
}

const palavras = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/)
  .filter(w => w.length > 2 && !/^(fic|fia|fim|fundo|fundos|investimento|investimentos|de|do|da|em|cotas|multimercado|renda|fixa|itau|ltda|credito|privado|referenciado)$/.test(w));
// Palpite: o ativo da carteira com mais palavras em comum com o nome da Pluggy (pelo menos uma). ativos: [{chave, nome}]
export function sugerirLigacao(nome, ativos) {
  const p = new Set(palavras(nome));
  let melhor = null, pontos = 0;
  for (const a of ativos) {
    const n = palavras(`${a.nome} ${a.chave.replace(/_/g, ' ')}`).filter(w => p.has(w)).length;
    if (n > pontos) { melhor = a.chave; pontos = n; }
  }
  return melhor;
}
// Investimentos ligados → { chave: valor líquido } (vários investimentos no mesmo ativo somam)
export function valoresDoItau(investimentos, ligacoes = {}) {
  const v = {};
  for (const i of investimentos) {
    const chave = ligacoes[i.id];
    if (!chave) continue;
    v[chave] = Math.round(((v[chave] || 0) + i.liquido) * 100) / 100;
  }
  return v;
}

// Data do saldo de cada ativo ligado: `data` do investimento ou, sem ela, a atualização da conexão (a mais velha vale)
export function dataDoSaldo(investimentos, ligacoes = {}, dataConexao = null) {
  const dataDe = {};
  for (const i of investimentos) {
    const chave = ligacoes[i.id];
    const d = (i.data || dataConexao || '').slice(0, 10);
    if (chave && d && (!dataDe[chave] || d < dataDe[chave])) dataDe[chave] = d;
  }
  return dataDe;
}
// Automático × manual (vale para o Itaú e a Binance): o banco só sobrescreve um ativo se o saldo dele for mais novo que
// o que você fez à mão. Devolve { chave: 'aporte'|'resgate'|'manual' } dos ativos a pular por ora:
// - aporte/resgate lançado no app que o saldo ainda pode não mostrar: o Itaú leva até `dias` dias úteis para refletir
//   (v9.12.3: aporte de 09/11 ainda fora do saldo de 12/11); a Binance passa dias = 0 (só o próprio dia);
// - valor digitado em Atualizar valores depois da data do saldo (`atualizadoEm` = ativos_atualizado_em da carteira; a
//   atualização automática grava ali a data do saldo, não a de hoje, para não se bloquear sozinha).
// Passado o prazo, a atualização volta sozinha.
export const DIAS_BANCO = 3;
export function esperandoBanco(cf, investimentos, ligacoes = {}, dataConexao = null, atualizadoEm = {}, { dias = DIAS_BANCO, feriados = {} } = {}) {
  const dataDe = dataDoSaldo(investimentos, ligacoes, dataConexao);
  const fora = {};
  for (const [chave, d] of Object.entries(dataDe)) if (atualizadoEm?.[chave] > d) fora[chave] = 'manual';
  for (const e of efeitos(cf || {}).values()) {
    if (e.tipo === 'dividendo' || !(e.ativo in dataDe) || !cf.periodo) continue;
    const dia = `${cf.periodo}-${String(e.dia).padStart(2, '0')}`;
    if ((dias ? somarDiasUteis(dia, dias, feriados) : dia) >= dataDe[e.ativo]) fora[e.ativo] = e.tipo;
  }
  return fora;
}

// v9.12.3 — FIIs, ETFs e GLDI11 não vêm do Itaú: o Itaú mostra o preço com 2–3 pregões de atraso e demora dias a mostrar
// as cotas compradas. Valor = cotas da carteira (custo_medio, que o app ajusta a cada aporte/resgate) × preço da B3
// (rota /cotacoes). b3: { TICKER: {agora, hora} } → { valores: {chave: R$}, datas: {chave: data do preço} }
export function valoresB3(cart, b3 = {}, hoje = '') {
  const valores = {}, datas = {};
  for (const [k, c] of Object.entries(cart?.custo_medio?.ativos || {})) {
    const q = b3?.[k.toUpperCase()];
    if (!(c?.qtd > 0) || !(q?.agora > 0)) continue;
    valores[k] = Math.round(c.qtd * q.agora * 100) / 100;
    const h = String(q.hora || '');
    datas[k] = /^\d{4}-\d{2}-\d{2}/.test(h) ? h.slice(0, 10) : hoje;
  }
  return { valores, datas };
}
