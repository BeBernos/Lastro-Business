// v9.0 — Conciliação caixa × carteira: cada número tem um dono, e o app iguala a cópia sozinho.
// - Previsão de dividendos (quanto e quando): a CARTEIRA (`projecao_dividendos[mês].ativos`, com `pagamento`) manda;
//   a agenda do caixa ganha/atualiza a receita "Dividendo TICKER" pendente. (Na virada de out → nov/2026 o modo CAIXA
//   esqueceu os cinco dividendos de FIIs e a conferência acusou a diferença.)
// - Dividendo recebido: o CAIXA manda (receita confirmada); o `sincronizar` já leva para a carteira ao lançar.
// - Patrimônio por classe: a CARTEIRA manda (`copiarPatrimonio`, desde a v8.6).
// Função pura: devolve { cf, mudancas }; sem nada a fazer devolve o mesmo cf (mesma referência).
import { tickerDividendo } from './lancamentos.js';
import { acharCategoria, adivinharCategoria, mesmaCategoria } from './categorias.js';
import { extratoDoMes } from './extrato.js';

const MES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const centavos = v => Math.round(v * 100) / 100;
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// "16/11/2026" ou "2026-11-16" → 16, se for do mês do caixa
export function diaPagamento(pagamento, periodo) {
  const s = String(pagamento || '');
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/) || s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [d, mm, a] = m[1].length === 4 ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  return `${a}-${mm}` === periodo ? Number(d) : null;
}

export function conciliar(cf, cart) {
  const mudancas = [];
  const prev = cart?.projecao_dividendos?.[cf?.periodo]?.ativos;
  if (!prev) return { cf, mudancas };
  let novo = null;
  const copia = () => (novo ||= structuredClone(cf));
  const mes3 = MES3[Number(cf.periodo.slice(5)) - 1];
  for (const [t, p] of Object.entries(prev)) {
    const valor = centavos(p.total ?? p.valor ?? 0);
    if (!(valor > 0) || p.pago) continue;
    const dia = diaPagamento(p.pagamento, cf.periodo);
    const lista = (novo || cf).receitas || [];
    const i = lista.findIndex(x => tickerDividendo(x.descricao) === t);
    if (i < 0) {
      const d = copia();
      d.receitas ||= [];
      let id = `rec-dividendo-${t}-${mes3}`;
      while (d.receitas.some(x => x.id === id)) id += '-2';
      d.receitas.push({ id, descricao: `Dividendo ${t.toUpperCase()}`, valor, dia: dia ?? 15, ...(dia == null ? { diaEstimado: true } : {}), status: 'pendente', categoria: 'extraordinaria', origem: 'conciliacao' });
      mudancas.push({ tipo: 'dividendo-novo', ativo: t, valor, texto: `Dividendo ${t.toUpperCase()} ${brl(valor)}${dia ? ` no dia ${dia}` : ''}` });
    } else if (lista[i].status !== 'confirmado' && (Math.abs((lista[i].valor || 0) - valor) > 0.05 || (dia && lista[i].dia !== dia))) {
      const r = copia().receitas[i];
      const antes = r.valor, diaAntes = r.dia;
      r.valor = valor;
      if (dia) { r.dia = dia; delete r.diaEstimado; }
      r.origem ||= 'conciliacao';
      const muda = [Math.abs((antes || 0) - valor) > 0.05 ? `${brl(antes || 0)} → ${brl(valor)}` : '', dia && diaAntes !== dia ? `dia ${diaAntes} → ${dia}` : ''].filter(Boolean).join(', ');
      mudancas.push({ tipo: 'dividendo-valor', ativo: t, valor, texto: `Dividendo ${t.toUpperCase()} ${muda}` });
    }
  }
  return { cf: novo || cf, mudancas };
}

// v9.6: recorrentes e parcelas do cartão sem categoria (vindas do agente ou de versões antigas do app) ganham a
// categoria que o app reconhece pelo nome; o que ele não reconhece fica para o Bruno escolher no editor.
export function categorizar(cf) {
  const mudancas = [];
  const it = (cf?.despesasVariaveis || []).find(x => x.id === 'var-itau');
  if (!it) return { cf, mudancas };
  let novo = null;
  const alvo = () => (novo ||= structuredClone(cf)).despesasVariaveis.find(x => x.id === 'var-itau');
  const app = it.lancamentosApp || [];
  (it.assinaturas || []).forEach((a, i) => {
    if (a.cat) return;
    const cat = app.find(r => r.recorrente && r.descricao === a.nome)?.cat || adivinharCategoria(a.nome);
    if (!cat) return;
    alvo().assinaturas[i].cat = cat;
    mudancas.push({ tipo: 'categoria', ativo: a.nome, valor: cat, texto: `${a.nome} → ${cat}` });
  });
  (it.parcelamentos || []).forEach((p, i) => {
    if (p.cat) return;
    const loja = String(p.item || '').replace(/\s*—\s*parcela.*$/i, '').replace(/\s*\(compra.*$/, '');
    const cat = app.find(r => r.parcelas && String(p.item).startsWith(`${r.descricao} (compra`))?.cat || adivinharCategoria(loja);
    if (!cat) return;
    alvo().parcelamentos[i].cat = cat;
    mudancas.push({ tipo: 'categoria', ativo: loja, valor: cat, texto: `${loja} → ${cat}` });
  });
  // v9.9.7: o painel repete na projeção de 12 meses toda receita com categoria "salario"; 13º, retroativo, PPR, bônus e
  // férias marcados assim viravam R$ 8 mil a mais por mês (novembro/2026). Passam a "extraordinaria" (não se repetem).
  (cf.receitas || []).forEach((r, i) => {
    if (r.categoria !== 'salario' || !NAO_REPETE.test(r.descricao || '')) return;
    Object.assign((novo ||= structuredClone(cf)).receitas[i], { categoria: 'extraordinaria', categoriaAntesApp: 'salario' });
    mudancas.push({ tipo: 'categoria', ativo: r.descricao, valor: 'extraordinaria', texto: `${r.descricao}: entrada de um mês só (contava como salário em todos os meses)` });
  });
  return { cf: novo || cf, mudancas };
}
const NAO_REPETE = /13[º°o]|d[ée]cimo|retroativo|\bppr\b|\bplr\b|b[ôo]nus|f[ée]rias|rescis|restitui/i;

// v9.9.4: um nome só por categoria. O Claude fecha o mês com os nomes dele ("Mercado") e o app lança com os do catálogo
// ("Supermarket"); o painel compara pelo nome exato, então "Onde cortar gasto" e o ritmo por categoria viam o mês
// anterior zerado. Troca cada nome pelo do catálogo (aliases) na fatura, no histórico e onde a categoria é citada;
// nomes repetidos numa mesma lista viram uma linha só (o total não muda).
export function unificarCategorias(cf) {
  const mudancas = [];
  const novo = structuredClone(cf);
  const nomeDe = n => { const c = acharCategoria(n); return c && c.nome !== n ? c.nome : null; };
  const trocadas = new Map();
  const renomear = o => { const para = o?.cat && nomeDe(o.cat); if (para) { trocadas.set(o.cat, para); o.cat = para; } };
  const juntar = lista => {
    if (!Array.isArray(lista)) return lista;
    lista.forEach(renomear);
    const por = new Map();
    return lista.filter(c => { const j = por.get(c.cat); if (!j) { por.set(c.cat, c); return true; } j.valor = centavos((j.valor || 0) + (c.valor || 0)); return false; });
  };
  const it = (novo.despesasVariaveis || []).find(x => x.id === 'var-itau');
  if (it) {
    it.categorias = juntar(it.categorias);
    for (const k of ['assinaturas', 'parcelamentos', 'compras', 'lancamentosApp']) (it[k] || []).forEach(renomear);
  }
  for (const h of novo.historicoItau || []) h.categorias = juntar(h.categorias);
  (novo.faturaProximoCiclo?.comprasNovas || []).forEach(renomear);
  (novo.orcamentos || []).forEach(renomear);
  for (const [de, para] of trocadas) mudancas.push({ tipo: 'categoria', ativo: de, valor: para, texto: `${de} → ${para}` });
  return { cf: mudancas.length ? novo : cf, mudancas };
}

// v9.12.3 — o total por categoria da fatura segue as compras. Trocar a categoria de uma parcela ou recorrente no app
// (ex.: a parcela da Amazon, que o Claude tinha posto em Others, foi para Electronics) não movia o valor, e a planilha
// mostrava "com detalhe" maior que "na fatura" numa categoria e "só o total" sobrando na outra. Aqui: categoria com
// mais compras detalhadas do que valor recebe a diferença das que têm valor sem detalhe.
// O total da fatura não muda.
export function acertarCategorias(cf) {
  const it = (cf.despesasVariaveis || []).find(x => x.id === 'var-itau');
  if (!Array.isArray(it?.categorias) || !it.categorias.length) return { cf, mudancas: [] };
  const det = extratoDoMes(cf).filter(i => i.tipo === 'cartao' && i.categoria && !/^semdetalhe\|/.test(i.chave) && !/próxima fatura/.test(i.detalhe));
  const nomes = [...new Set(det.map(i => acharCategoria(i.categoria)?.nome || i.categoria))];
  const novo = structuredClone(cf);
  const cats = novo.despesasVariaveis.find(x => x.id === 'var-itau').categorias;
  for (const n of nomes) if (!cats.some(c => mesmaCategoria(c.cat, n))) cats.push({ cat: n, valor: 0 });
  const detalhe = c => det.filter(i => mesmaCategoria(i.categoria, c.cat)).reduce((s, i) => s - i.valor, 0);
  const saldo = cats.map(c => ({ c, sobra: centavos(c.valor - detalhe(c)) }));
  const mudancas = [];
  for (const falta of saldo.filter(x => x.sobra < -0.004)) {
    // primeiro a sobra que cobre a falta com o valor mais parecido (Services −35,79 ↔ Streaming +36,00), depois a maior
    const cobre = x => x.sobra >= -falta.sobra - 0.004;
    for (const de of saldo.filter(x => x.sobra > 0.004).sort((a, b) => (cobre(b) - cobre(a)) || (cobre(a) ? a.sobra - b.sobra : b.sobra - a.sobra))) {
      const v = centavos(Math.min(-falta.sobra, de.sobra));
      if (v < 0.01) break;
      de.c.valor = centavos(de.c.valor - v); de.sobra = centavos(de.sobra - v);
      falta.c.valor = centavos(falta.c.valor + v); falta.sobra = centavos(falta.sobra + v);
      mudancas.push({ tipo: 'categoria', ativo: falta.c.cat, valor: v, texto: `${brl(v)} de ${de.c.cat} para ${falta.c.cat} na fatura` });
      if (falta.sobra > -0.005) break;
    }
  }
  const lista = novo.despesasVariaveis.find(x => x.id === 'var-itau');
  lista.categorias = cats.filter(c => c.valor > 0.004);
  return mudancas.length ? { cf: novo, mudancas } : { cf, mudancas };
}

// v9.6: resposta parcial do Claude — em app/parcial.js (o servidor do conector MCP usa a mesma regra)
export { CAMPOS_PARCIAIS, lerParcial, juntarParcial } from './parcial.js';

// Para lembrar o que já foi conciliado (e não refazer o que o Bruno desfez)
export const assinatura = (periodo, mudancas) => `${periodo}|${mudancas.map(m => `${m.tipo}:${m.ativo}:${m.valor}`).sort().join(',')}`;
