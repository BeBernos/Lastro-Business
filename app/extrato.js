// v8.7 — Extrato do mês e busca: tudo o que entra e sai numa lista só (entradas, contas, cartão, investimentos), com
// busca por texto e filtro por tipo. Funções puras sobre o JSON do painel; o app só desenha.
// O cartão tem detalhe só do que o app lançou (lancamentosApp), das parcelas e das recorrentes; o resto da fatura o
// agente registra como total por categoria, e aparece aqui como "sem detalhe" (assim o total do extrato bate com o painel).

import { CATEGORIAS_RECEITA, comprasApp, LISTAS_CAIXA, sinalDe } from './lancamentos.js';
import { acharCategoria, adivinharCategoria, categoriaDoItem, listaDoPainel, mesmaCategoria, nomeCategoria, norm } from './categorias.js';

const TIPO_LISTA = { receitas: 'entrada', resgates: 'investimento', ajustesCaixa: 'investimento', despesasFixas: 'conta', despesasVariaveis: 'conta', obrigacoesCaixa: 'conta' };
export const TIPOS = [['tudo', 'Tudo'], ['entrada', 'Entradas'], ['conta', 'Contas'], ['cartao', 'Cartão'], ['investimento', 'Investimentos']];

const dataDoDia = (periodo, dia) => (dia ? `${periodo}-${String(dia).padStart(2, '0')}` : '');
// v9.12.3: data da compra de um parcelamento pelo texto "Loja (compra 06/10, 5x)" (mês depois do período = ano anterior)
export function dataDaCompra(item, periodo) {
  const m = String(item || '').match(/compra\s+(\d{1,2})\/(\d{1,2})/i);
  if (!m || !periodo) return '';
  const [a, mp] = periodo.split('-').map(Number);
  const mes = Number(m[2]);
  return `${mes > mp ? a - 1 : a}-${String(mes).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}
// "Loja — parcela R$X" ou, sem a palavra parcela, o último valor do texto ("Leiturinha — Theo — R$42,19")
const valorParcela = p => (Number.isFinite(p.valor) ? p.valor : Number((String(p.item || '').match(/parcela\s*R\$\s*([\d.]+,\d{2})/i) || String(p.item || '').match(/R\$\s*([\d.]+,\d{2})(?!.*R\$)/))?.[1].replace(/\./g, '').replace(',', '.')) || 0);

// Cada item: { chave, tipo, data, descricao, detalhe, categoria, valor (entrada +, saída −), abrir }
// abrir: { conta: 'lista|id' } | { compra: indice } | { aba: 'cartao/fatura' } — o que tocar no item abre
export function extratoDoMes(dados) {
  const itens = [];
  for (const lista of LISTAS_CAIXA) {
    for (const it of dados[lista] || []) {
      if (it.id === 'var-itau' || !Number.isFinite(it.valor) || !it.valor) continue;
      const tipo = it.categoria === 'investimento' || /^dividendo\s/i.test(it.descricao || '') ? 'investimento' : TIPO_LISTA[lista];
      itens.push({
        chave: `${lista}|${it.id}`, tipo, data: dataDoDia(dados.periodo, it.dia), descricao: it.descricao || '',
        detalhe: it.status === 'confirmado' ? (sinalDe(lista, it) > 0 ? 'recebido' : 'pago') : 'previsto',
        categoria: (lista === 'receitas' && CATEGORIAS_RECEITA.find(([k]) => k === it.categoria)?.[1]) || categoriaDoItem(it) || '', valor: Math.abs(it.valor) * sinalDe(lista, it), abrir: { conta: `${lista}|${it.id}` },
      });
    }
  }
  const cartao = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  if (cartao) {
    const app = comprasApp(dados);
    for (const r of app) {
      itens.push({
        chave: `compra|${r.indice}`, tipo: 'cartao', data: r.data || '', descricao: r.descricao || '',
        detalhe: [r.valor < 0 ? 'estorno' : r.parcelas ? `parcela ${r.parcelas}` : r.recorrente ? 'recorrente' : '', r.origem === 'sms' ? 'SMS' : 'app', r.proximaFatura ? 'próxima fatura' : ''].filter(Boolean).join(' · '),
        categoria: nomeCategoria(r.cat || ''), valor: -r.valor, abrir: { compra: r.indice },
      });
    }
    for (const [ip, p] of (cartao.parcelamentos || []).entries()) {
      if (p.saiDaFaturaA_partir_de && p.saiDaFaturaA_partir_de <= dados.periodo) continue;
      if (p.atual?.startsWith('1/') && app.some(r => r.parcelas && String(p.item).startsWith(`${r.descricao} (compra`))) continue;
      const v = valorParcela(p);
      if (!v) continue;
      const loja = String(p.item || '').replace(/\s*—\s*parcela.*$/i, '');
      // v9.6: categoria gravada ou, sem ela, o palpite pelo nome da loja (o Bruno pode trocar no editor)
      const cat = p.cat || adivinharCategoria(loja.replace(/\s*\(compra.*$/, ''));
      itens.push({ chave: `parcela|${p.item}`, tipo: 'cartao', data: p.dataCompra || dataDaCompra(p.item, dados.periodo), descricao: loja, detalhe: `parcela ${p.atual || ''}`.trim(), categoria: cat ? nomeCategoria(cat) : '', valor: -v, abrir: { parcelamento: ip } });
    }
    for (const [ia, s] of (cartao.assinaturas || []).entries()) {
      if (app.some(r => r.recorrente && r.descricao === s.nome) || s.foraDoMes === dados.periodo) continue; // fora só deste mês: não está nesta fatura
      itens.push({ chave: `assinatura|${s.nome}`, tipo: 'cartao', data: dataDoDia(dados.periodo, s.dia), descricao: s.nome, detalhe: 'recorrente', categoria: nomeCategoria(s.cat || adivinharCategoria(s.nome) || ''), valor: -(s.valor || 0), abrir: { assinatura: ia } });
    }
    // v8.12: compras que o Claude leu da fatura do Itaú (PDF) no fechamento — só as que o app não tinha lançado
    const lidas = (cartao.compras || []).map((c, indice) => ({ ...c, indice })).filter(c => Number.isFinite(c.valor) && c.valor);
    lidas.forEach((c, i) => itens.push({ chave: `fatura|${i}`, tipo: 'cartao', data: c.data || '', descricao: c.loja || c.descricao || 'Compra', detalhe: 'fatura do Itaú', categoria: c.cat ? nomeCategoria(c.cat) : '', valor: -c.valor, abrir: { compraFatura: c.indice } }));
    // o resto da fatura, que o agente registrou só como total por categoria (parcelas e recorrentes já estão acima)
    // v9.12.3: parcelas e recorrentes descontam da própria categoria; só as sem categoria (ou a sobra de uma categoria
    // com mais detalhe do que valor) saem do "sem detalhe" da maior — assim o total continua batendo com a fatura
    const cats = [...(cartao.categorias || [])].sort((a, b) => b.valor - a.valor);
    const listados = itens.filter(i => /^(parcela|assinatura)\|/.test(i.chave));
    const daCat = (i, cat) => i.categoria && mesmaCategoria(i.categoria, cat);
    const detalhadoPorCat = cat => app.filter(r => !r.proximaFatura && mesmaCategoria(r.cat, cat)).reduce((s, r) => s + r.valor, 0)
      + lidas.filter(c => mesmaCategoria(c.cat, cat)).reduce((s, c) => s + c.valor, 0)
      + listados.filter(i => daCat(i, cat)).reduce((s, i) => s - i.valor, 0);
    const restos = cats.map(c => ({ c, resto: c.valor - detalhadoPorCat(c.cat) }));
    let semCat = listados.filter(i => !cats.some(c => daCat(i, c.cat))).reduce((s, i) => s - i.valor, 0)
      + restos.filter(r => r.resto < 0).reduce((s, r) => s - r.resto, 0);
    for (const { c, resto: r0 } of restos) {
      let resto = r0;
      const tira = Math.min(semCat, Math.max(0, resto));
      resto -= tira;
      semCat -= tira;
      if (resto < 0.005) continue;
      itens.push({ chave: `semdetalhe|${c.cat}`, tipo: 'cartao', data: '', descricao: `Compras no cartão sem detalhe · ${nomeCategoria(c.cat)}`, detalhe: 'registradas pelo agente como total', categoria: nomeCategoria(c.cat), valor: -Math.round(resto * 100) / 100, abrir: { aba: 'cartao/gastos' } });
    }
  }
  // a busca também acha a categoria pelos outros nomes dela ("mercado" acha Supermarket)
  for (const i of itens) {
    const c = i.categoria && acharCategoria(i.categoria);
    i.termos = norm([i.descricao, i.detalhe, i.categoria, ...(c?.aliases || []), c?.descricao || ''].join(' '));
  }
  // mais recente primeiro; sem data (totais e parcelas) no fim
  return itens.sort((a, b) => (b.data || '0').localeCompare(a.data || '0'));
}

// Busca: cada palavra precisa aparecer em descrição, detalhe ou categoria (sem acento, sem maiúscula); valor também
// casa ("45" acha R$ 45,50). Devolve os itens e os totais do que sobrou.
export function filtrarExtrato(itens, { texto = '', tipo = 'tudo' } = {}) {
  const palavras = norm(texto).split(/\s+/).filter(Boolean);
  const lista = itens.filter(i => (tipo === 'tudo' || i.tipo === tipo) && palavras.every(p => {
    if ((i.termos || norm(`${i.descricao} ${i.detalhe} ${i.categoria}`)).includes(p)) return true;
    const n = Number(p.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 && Math.abs(i.valor).toFixed(2).startsWith(String(n));
  }));
  const entradas = lista.filter(i => i.valor > 0).reduce((s, i) => s + i.valor, 0);
  const saidas = lista.filter(i => i.valor < 0).reduce((s, i) => s - i.valor, 0);
  return { itens: lista, entradas: Math.round(entradas * 100) / 100, saidas: Math.round(saidas * 100) / 100 };
}

// v8.11: quanto foi gasto num dia (cartão e contas pagas com data daquele dia; recorrentes, parcelas e previstos ficam de fora)
const ehGasto = i => i.valor < 0 && (i.tipo === 'conta' || (i.tipo === 'cartao' && 'compra' in i.abrir)) && i.detalhe !== 'previsto';
export function gastoDoDia(dados, dia) {
  const itens = extratoDoMes(dados).filter(i => i.data === dia && ehGasto(i));
  return { total: Math.round(itens.reduce((s, i) => s - i.valor, 0) * 100) / 100, n: itens.length };
}

// v9.16: resumo da semana (domingo) — os 7 dias até `hoje`, com a mesma regra do "gasto de hoje"; a semana anterior só
// quando cabe inteira no mês do painel (dos meses fechados só existem os totais). `proximas` = proximasContas (resumo.js).
const somarDias = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
export function resumoSemana(dados, hoje, proximas = []) {
  const inicioMes = `${dados.periodo}-01`;
  // contas fixas (aluguel, plano, condomínio) ficam numa linha à parte: dominariam o total e a comparação entre semanas
  const fixa = i => /^(despesasFixas|obrigacoesCaixa)\|/.test(i.abrir?.conta || '');
  const todos = extratoDoMes(dados).filter(ehGasto);
  const gastos = todos.filter(i => !fixa(i));
  const entre = (a, b) => gastos.filter(i => i.data >= a && i.data <= b);
  const total = l => Math.round(l.reduce((s, i) => s - i.valor, 0) * 100) / 100;
  const inicio = somarDias(hoje, -6) < inicioMes ? inicioMes : somarDias(hoje, -6);
  const semana = entre(inicio, hoje);
  const antIni = somarDias(hoje, -13);
  const anterior = antIni >= inicioMes ? entre(antIni, somarDias(hoje, -7)) : null;
  const porCat = {};
  for (const i of semana) { const c = i.categoria || 'Sem categoria'; porCat[c] = (porCat[c] || 0) - i.valor; }
  const categorias = Object.entries(porCat).map(([nome, v]) => ({ nome, total: Math.round(v * 100) / 100 })).sort((a, b) => b.total - a.total);
  const fimProx = somarDias(hoje, 7);
  const prox = proximas.filter(p => p.data > hoje && p.data <= fimProx);
  return {
    inicio, fim: hoje, parcial: inicio !== somarDias(hoje, -6),
    total: total(semana), n: semana.length,
    fixas: (l => ({ total: total(l), n: l.length }))(todos.filter(i => fixa(i) && i.data >= inicio && i.data <= hoje)),
    anterior: anterior && { total: total(anterior), n: anterior.length },
    categorias: categorias.slice(0, 3),
    maiores: [...semana].sort((a, b) => a.valor - b.valor).slice(0, 3).map(i => ({ data: i.data, descricao: i.descricao, valor: -i.valor })),
    proximos: {
      itens: prox, ateFimDoMes: fimProx.slice(0, 7) !== dados.periodo,
      saem: Math.round(prox.filter(p => p.valor < 0).reduce((s, p) => s - p.valor, 0) * 100) / 100,
      entram: Math.round(prox.filter(p => p.valor > 0).reduce((s, p) => s + p.valor, 0) * 100) / 100,
    },
  };
}

// v8.12: o que compõe a fatura do mês, em grupos (compras, parcelas, recorrentes, só o total) — a soma bate com a fatura
export const GRUPOS_FATURA = [['compra', 'Compras lançadas'], ['fatura', 'Da fatura do Itaú'], ['parcela', 'Parcelas'], ['assinatura', 'Recorrentes'], ['semdetalhe', 'Registrado só como total']];
export function composicaoFatura(dados) {
  const itens = extratoDoMes(dados).filter(i => i.tipo === 'cartao' && !/próxima fatura/.test(i.detalhe));
  const grupos = GRUPOS_FATURA.map(([k, nome]) => {
    const lista = itens.filter(i => i.chave.startsWith(`${k}|`)).sort((a, b) => (b.data || '').localeCompare(a.data || '') || a.valor - b.valor);
    return { k, nome, itens: lista, total: Math.round(lista.reduce((s, i) => s - i.valor, 0) * 100) / 100 };
  }).filter(g => g.itens.length);
  return { grupos, total: Math.round(grupos.reduce((s, g) => s + g.total, 0) * 100) / 100 };
}

// ---------- planilha da fatura para conferir com o Itaú (v7.6; v9.9.11 em Excel de verdade, linha por linha) ----------
// Aba 1: cada item que compõe a fatura do mês (a mesma lista de "O que compõe a fatura": compras, fatura do Itaú,
// parcelas, recorrentes e o que o Claude registrou só como total), com a linha de total = fatura. Aba 2: por categoria.
// Aba 3 (se houver): compras que já vão para a fatura seguinte.
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const COLUNAS_FATURA = [{ titulo: 'Data', tipo: 'data', largura: 12 }, { titulo: 'Descrição', tipo: 'texto', largura: 34 }, { titulo: 'Categoria', tipo: 'texto', largura: 18 }, { titulo: 'Valor (R$)', tipo: 'valor', largura: 14 }, { titulo: 'Tipo', tipo: 'texto', largura: 22 }, { titulo: 'Detalhe', tipo: 'texto', largura: 26 }];
export function planilhaFatura(dados) {
  const it = (dados.despesasVariaveis || []).find(x => x.id === 'var-itau');
  if (!it || !Array.isArray(it.categorias)) throw new Error('O painel não tem a fatura do cartão por categorias.');
  const [a, m] = dados.periodo.split('-').map(Number);
  const nomeGrupo = Object.fromEntries(GRUPOS_FATURA);
  const linha = i => [i.data || '', i.descricao, i.categoria || '', -i.valor, nomeGrupo[i.chave.split('|')[0]] || '', i.detalhe || ''];
  // v9.30 (pedido do Bruno): das mais novas para as mais antigas; sem data no fim
  const porData = (x, y) => (y.data || '0000').localeCompare(x.data || '0000') || x.descricao.localeCompare(y.descricao);
  const comp = composicaoFatura(dados);
  const itens = comp.grupos.flatMap(g => g.itens).sort(porData);
  const proximas = extratoDoMes(dados).filter(i => i.tipo === 'cartao' && /próxima fatura/.test(i.detalhe)).sort(porData);
  const semDetalhe = comp.grupos.find(g => g.k === 'semdetalhe')?.total || 0;
  const lista = listaDoPainel(dados) || undefined; // sem a lista do painel, vale a ativa
  const porCategoria = it.categorias.map(c => {
    const detalhado = itens.filter(i => !i.chave.startsWith('semdetalhe|') && mesmaCategoria(i.categoria, c.cat, lista)).reduce((s, i) => s - i.valor, 0);
    return [nomeCategoria(c.cat, lista), c.valor, Math.round(detalhado * 100) / 100, Math.round((c.valor - detalhado) * 100) / 100];
  }).sort((x, y) => y[1] - x[1]);
  const abas = [
    { nome: `Fatura ${MESES_LONGOS[m - 1]} ${a}`, colunas: COLUNAS_FATURA, linhas: itens.map(linha), total: 'Total da fatura' },
    { nome: 'Por categoria', total: 'Total', linhas: porCategoria, colunas: [{ titulo: 'Categoria', tipo: 'texto', largura: 22 }, { titulo: 'Na fatura (R$)', tipo: 'valor', largura: 16 }, { titulo: 'Com detalhe (R$)', tipo: 'valor', largura: 16 }, { titulo: 'Só o total, sem detalhe (R$)', tipo: 'valor', largura: 26 }] },
    ...(proximas.length ? [{ nome: 'Próxima fatura', colunas: COLUNAS_FATURA, linhas: proximas.map(linha), total: 'Total' }] : []),
  ];
  return { nome: `fatura_itau_${dados.periodo}_conferir.xlsx`, abas, linhas: itens.length, total: comp.total, semDetalhe };
}
