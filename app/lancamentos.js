// Lançamentos feitos no app (Fase 1): contas pagas/recebidas, compras no cartão e Pix/débito.
//
// Funções puras JSON -> JSON novo (o original não é alterado). Seguem as convenções do agente para o
// painel recalcular tudo sozinho:
// - uma conta só entra no saldo de hoje se `status: "confirmado"` e `dia` <= dia de `ultimaAtualizacao`
//   (o "HOJE" do painel) — por isso pagar grava o dia real e toda alteração avança `ultimaAtualizacao`;
// - a fatura do cartão é a soma de `var-itau.categorias`; o gasto livre é derivado por diferença
//   (total − parcelas − assinaturas) e guardado em `composicao.gastoLivre` para não gerar alerta;
// - cada ação deixa rastro: `atualizacoes` ("[app] …"), `origem: "app"` nos itens novos,
//   `confirmadoApp` nos itens pagos e `var-itau.lancamentosApp` nas compras (para o agente conferir
//   com a fatura real no fechamento do mês).

import { acharCategoria, categoriaDeConta, categoriasAtivas, GRUPOS, ICONES, listaDoPainel, mesmaCategoria, norm } from './categorias.js';

export const LISTAS_PAGAVEIS = ['receitas', 'despesasFixas', 'despesasVariaveis', 'obrigacoesCaixa'];

const centavos = v => Math.round(v * 100) / 100;
// v9.12.3: parcelado no cartão como o Itaú faz — as parcelas truncam os centavos e a 1ª leva a sobra
// (R$ 264,90 em 4x = 66,24 + 3 × 66,22). → { parcela (2ª em diante), primeira }
export function parcelasItau(valor, n) {
  const parcela = Math.floor((valor / n) * 100 + 1e-6) / 100;
  return { parcela, primeira: centavos(valor - parcela * (n - 1)) };
}
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\s/g, ' ');
const ddmm = iso => iso.slice(8, 10) + '/' + iso.slice(5, 7);
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Data de hoje no Brasil, AAAA-MM-DD
export const hojeBrasil = (agora = new Date()) => agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

// "1.234,56", "R$ 50", "50,9" ou "50.90" -> número (NaN se não der)
export function lerValor(texto) {
  let t = String(texto ?? '').replace(/[R$\s]/g, '');
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const v = Number(t);
  return Number.isFinite(v) ? centavos(v) : NaN;
}

// Confere se dá para lançar: formato que o app conhece e mês do painel = mês de hoje.
// Lança erro com mensagem para o usuário.
// proximoMes: compra no cartão já no mês seguinte (antes do fechamento com o agente) — vai para a próxima fatura.
export function validar(d, hoje, { cartao = false, proximoMes = false } = {}) {
  const ok = d && /^\d{4}-\d{2}$/.test(d.periodo || '') && LISTAS_PAGAVEIS.slice(0, 3).every(k => Array.isArray(d[k]));
  if (!ok) throw new Error('O painel está num formato que o app não conhece — lance pela conversa com o agente.');
  const mes = hoje.slice(0, 7);
  // v9.8.4 (controle total, pedido do Bruno): mês virado sem o fechamento com o Claude não trava mais — o que é do mês
  // aberto entra nele; o que é do mês novo vai para os próximos meses (Pix/conta) ou para a próxima fatura (cartão)
  void proximoMes;
  if (mes < d.periodo) throw new Error(`O painel já é de ${d.periodoLabel || d.periodo}: confira a data do celular.`);
  if (cartao) {
    const it = cartaoDo(d);
    if (!it || !Array.isArray(it.categorias)) throw new Error('O painel não tem a fatura do cartão por categorias — lance pela conversa com o agente.');
  }
}

const diasDo = ym => { const [a, m] = ym.split('-').map(Number); return new Date(a, m, 0).getDate(); };
const cartaoDo = d => (d.despesasVariaveis || []).find(x => x.id === 'var-itau');
const listaDe = d => listaDoPainel(d) || categoriasAtivas();
const diaDe = iso => Number(iso.slice(8, 10));

function conferirValor(valor) {
  if (!(valor > 0) || valor >= 1e6) throw new Error('Confira o valor.');
}

function conferirData(d, data, hoje) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '') || data.slice(0, 7) !== d.periodo) throw new Error(`A data precisa ser de ${d.periodoLabel || d.periodo}.`);
}

// Avança o "hoje" do painel e registra a ação no histórico do mês
// (nunca além do último dia do período: o painel usa o dia 1 se a data for de outro mês)
export function registrar(d, hoje, texto) {
  const limite = `${d.periodo}-${String(diasDo(d.periodo)).padStart(2, '0')}`;
  const ate = hoje > limite ? limite : hoje;
  if (!d.ultimaAtualizacao || ate > d.ultimaAtualizacao) d.ultimaAtualizacao = ate;
  (d.atualizacoes ||= []).push({ data: hoje, acao: `[app] ${texto}` });
  return d;
}

// Categorias que já existem: as da fatura (cartão) e as das despesas de conta (Pix/débito)
export function categoriasCartao(d) {
  return (cartaoDo(d)?.categorias || []).map(c => c.cat);
}
export function categoriasConta(d) {
  const todas = [...(d.despesasVariaveis || []), ...(d.despesasFixas || [])]
    .filter(x => x.id !== 'var-itau' && x.categoria).map(x => x.categoria);
  return [...new Set(todas)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

// Item de conta pelo id, em uma das listas
export function acharItem(d, lista, id) {
  if (!LISTAS_PAGAVEIS.includes(lista)) return null;
  return (d[lista] || []).find(x => x.id === id) || null;
}

// "Paguei" / "Recebi": status confirmado, valor e dia reais
export function marcarPago(dados, { lista, id, valor, data }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const it = acharItem(d, lista, id);
  if (!it || it.id === 'var-itau') throw new Error('Essa conta não está mais no painel — busque a atualização.');
  if (it.status === 'confirmado') throw new Error(`${it.descricao} já está marcada como ${lista === 'receitas' ? 'recebida' : 'paga'}.`);
  conferirValor(valor);
  conferirData(d, data, hoje);
  const antes = it.valor;
  Object.assign(it, { status: 'confirmado', valor: centavos(valor), dia: diaDe(data), confirmadoApp: hoje });
  const verbo = lista === 'receitas' ? 'recebido' : 'pago';
  const dif = Math.abs(antes - valor) > 0.004 ? ` (previsto ${brl(antes)})` : '';
  return registrar(d, hoje, `${it.descricao}: ${verbo} ${brl(valor)} em ${ddmm(data)}${dif}.`);
}

// Compra no cartão: soma na categoria, refaz o total e o gasto livre, guarda em lancamentosApp.
// parcelas (n > 1): só a parcela (total / n) entra nesta fatura e o parcelamento vai para
//   `parcelamentos` no formato do agente ("Loja (compra dd/mm, Nx) — parcela R$115,80", atual "1/N"),
//   que o painel usa para projetar as próximas faturas.
// estorno: tira o valor da categoria da compra original (que precisa existir).
// recorrente: cobrança que se repete todo mês (assinatura) — entra também em `assinaturas`, então conta
//   como "agendado" (não infla o ritmo do gasto livre) e o painel a projeta nas próximas faturas.
// proximaFatura: compra depois do fechamento (último dia do mês, ~18h) — vai para `faturaProximoCiclo`
//   (que o painel já soma na fatura seguinte), sem mexer na fatura deste mês.
// A categoria casa pelo catálogo (categorias.js): "Supermarket" soma em "Mercado", se for a que existe.
// A data pode ser do mês anterior: o ciclo do cartão atravessa a virada do mês.
export function lancarCartao(dados, { valor, descricao, cat, data, pontual = false, parcelas = 1, estorno = false, recorrente = false, proximaFatura = false, nota = '', origem = 'app' }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true, proximoMes: true });
  conferirValor(valor);
  conferirDataCartao(data, hoje);
  // mês virou e o agente ainda não fechou: compra deste mês novo é da fatura seguinte
  if (data.slice(0, 7) > d.periodo) {
    if (recorrente) throw new Error('Cadastre a recorrente depois de fechar o mês com o agente.');
    proximaFatura = true;
  }
  const nome = String(cat || '').trim();
  if (!nome) throw new Error('Escolha a categoria.');
  const n = Math.max(1, Math.floor(Number(parcelas) || 1));
  if (n > 48) throw new Error('Confira o número de parcelas.');
  if (recorrente && (n > 1 || estorno)) throw new Error('Cobrança recorrente é sempre à vista.');
  const desc = String(descricao || '').trim() || nome;
  const obs = String(nota || '').trim();
  const { parcela, primeira } = parcelasItau(valor, n);
  const it = cartaoDo(d);
  const fonte = origem === 'sms' ? ' (SMS)' : '';
  const comNota = t => (obs ? `${t} Obs.: ${obs}` : t);

  if (proximaFatura) {
    // fatura seguinte: parcelado vira só o parcelamento (o painel já soma a parcela daquele mês)
    const ciclo = somaMeses(d.periodo, 1);
    const fpc = d.faturaProximoCiclo;
    if (!fpc || !fpc.ciclo || fpc.ciclo < ciclo) d.faturaProximoCiclo = { ciclo, comprasNovas: [] };
    else if (fpc.ciclo > ciclo) throw new Error('O painel já tem compras de uma fatura mais à frente — lance pela conversa com o agente.');
    if (n > 1) {
      (it.parcelamentos ||= []).push({
        item: `${desc} (compra ${ddmm(data)}, ${n}x) — parcela ${brl(parcela).replace(' ', '')}`,
        atual: `1/${n}`,
        ultimaParcela: somaMeses(ciclo, n - 1),
        saiDaFaturaA_partir_de: somaMeses(ciclo, n),
        cat: nome,
      });
    } else {
      d.faturaProximoCiclo.comprasNovas ||= [];
      d.faturaProximoCiclo.comprasNovas.push({ data, descricao: desc, valor: estorno ? -valor : valor, cat: nome, origem, ...(obs ? { nota: obs } : {}) });
    }
    (it.lancamentosApp ||= []).push({ data, descricao: desc, valor: estorno ? -valor : primeira, cat: nome, origem, proximaFatura: ciclo, ...(n > 1 ? { parcelas: `1/${n} de ${brl(valor)}` } : {}), ...(obs ? { nota: obs } : {}) });
    const [a, m] = ciclo.split('-').map(Number);
    return registrar(d, hoje, comNota(`Cartão${fonte} → fatura de ${MESES[m - 1]}/${a} (depois do fechamento): ${desc} ${estorno ? `−${brl(valor)}` : n > 1 ? `${n}x de ${brl(parcela)}` : brl(valor)} em ${nome}, ${ddmm(data)}.`));
  }

  const igual = it.categorias.find(c => mesmaCategoria(c.cat, nome, listaDe(d)));
  if (estorno) {
    if (!igual) throw new Error('Escolha a categoria da compra original (o estorno sai dela).');
    if (igual.valor - valor < -0.004) throw new Error(`O estorno é maior que o total de ${igual.cat} nesta fatura (${brl(igual.valor)}) — escolha a categoria da compra original.`);
    igual.valor = centavos(igual.valor - valor);
  } else if (igual) igual.valor = centavos(igual.valor + primeira);
  else it.categorias.push({ cat: nome, valor: primeira });
  it.valor = centavos(it.categorias.reduce((s, c) => s + c.valor, 0));
  // dia 1 para compra fora do mês do painel (fim do mês passado, já neste ciclo), como o agente faz
  const dia = data.slice(0, 7) === d.periodo ? diaDe(data) : 1;
  // v9.6: a recorrente e o parcelamento levam a categoria (antes ficavam "sem categoria" nas próximas faturas)
  if (recorrente) (it.assinaturas ||= []).push({ nome: desc, valor: centavos(valor), dia, origem, cat: igual ? igual.cat : nome, ...(obs ? { nota: obs } : {}) });
  const comp = (it.composicao ||= {});
  const agendado = (it.assinaturas || []).length ? it.assinaturas.filter(a => cobradaNoMes(a, d.periodo)).reduce((s, a) => s + a.valor, 0) : (comp.agendado || 0);
  if (recorrente) comp.agendado = centavos(agendado);
  comp.gastoLivre = centavos(it.valor - (comp.parcelas || 0) - agendado);
  it.atualizadoDia = Math.max(it.atualizadoDia || 0, diaDe(hoje));
  const categoria = igual ? igual.cat : nome;
  const registro = { data, descricao: desc, valor: estorno ? -valor : primeira, cat: categoria, origem };
  if (n > 1) registro.parcelas = `1/${n} de ${brl(valor)}`;
  if (recorrente) registro.recorrente = true;
  if (obs) registro.nota = obs;
  (it.lancamentosApp ||= []).push(registro);
  if (n > 1) {
    (it.parcelamentos ||= []).push({
      item: `${desc} (compra ${ddmm(data)}, ${n}x) — parcela ${brl(parcela).replace(' ', '')}`,
      atual: `1/${n}`,
      ultimaParcela: somaMeses(d.periodo, n - 1),
      saiDaFaturaA_partir_de: somaMeses(d.periodo, n),
      cat: categoria,
    });
  }
  if (pontual && !estorno && !recorrente) (it.pontuaisGrandes ||= []).push({ descricao: n > 1 ? `${desc} ${n}x — 1ª parcela (total ${brl(valor)})` : desc, valor: primeira, dia, nota: obs || 'Compra pontual lançada pelo app.' });
  const texto = estorno
    ? `Estorno no cartão${fonte}: ${desc} −${brl(valor)} em ${categoria}, ${ddmm(data)}.`
    : `Cartão${fonte}: ${desc} ${n > 1 ? `${n}x de ${brl(parcela)} (total ${brl(valor)})` : brl(valor)} em ${categoria}${recorrente ? ' (recorrente, todo mês)' : pontual ? ' (pontual)' : ''}, ${ddmm(data)}.`;
  return registrar(d, hoje, comNota(texto));
}

// AAAA-MM + n meses
export function somaMeses(ym, n) {
  const [a, m] = ym.split('-').map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
}

// Cartão: até ~70 dias para trás (o ciclo atravessa a virada do mês; estornos chegam depois)
function conferirDataCartao(data, hoje) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) throw new Error('Confira a data.');
}

// Parece já lançado? (mesma data e valor em lancamentosApp, ou parcela igual em parcelamentos)
export function pareceLancado(d, { valor, data, parcelas = 1, estorno = false }) {
  const it = cartaoDo(d);
  if (!it) return null;
  const n = Math.max(1, parcelas);
  const { parcela, primeira } = parcelasItau(valor, n);
  const alvo = estorno ? -valor : primeira;
  const app = (it.lancamentosApp || []).find(l => l.data === data && Math.abs(l.valor - alvo) < 0.005);
  if (app) return `${app.descricao}, ${ddmm(app.data)}`;
  const prox = (d.faturaProximoCiclo?.comprasNovas || []).find(l => l.data === data && Math.abs(l.valor - alvo) < 0.005);
  if (prox) return `${prox.descricao}, ${ddmm(prox.data)} (próxima fatura)`;
  if (n === 1 && !estorno) {
    const assin = (it.assinaturas || []).find(a => Math.abs(a.valor - valor) < 0.005);
    if (assin) return `a assinatura ${assin.nome}, que já entra na fatura todo mês`;
  }
  if (n > 1) {
    const txt = brl(parcela).replace(' ', '');
    const p = (it.parcelamentos || []).find(x => String(x.item).replace(/\s/g, '').includes(txt.replace(/\s/g, '')));
    if (p) return p.item.split(' — ')[0];
  }
  return null;
}

// Pix ou débito: despesa variável nova, já confirmada
// v9.6.1: Pix/débito também recorrente (vira conta fixa: o agente repete todo mês) ou parcelado (a 1ª parcela sai
// agora; as outras ficam em `parcelamentosExternos`, o array que o painel já soma na projeção, com `idCaixa`).
// v9.8.3: data no futuro é planejamento (pedido do Bruno: "Pix parcelado que só começo a pagar dia 30") —
// depois de hoje neste mês = a pagar (pendente) no dia; num mês que vem (até 11) = vai inteiro para os próximos meses.
const MAX_MESES_FUTURO = 60; // 5 anos (a projeção do painel mostra 12 meses; o resto fica guardado)
function conferirDataPlano(d, data, hoje) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) throw new Error('Confira a data.');
  const mes = data.slice(0, 7);
  if (mes < d.periodo) throw new Error(`A data precisa ser de ${d.periodoLabel || d.periodo} em diante.`);
  if (mes > somaMeses(d.periodo, MAX_MESES_FUTURO)) throw new Error('Dá para agendar até 5 anos para a frente.');
  return { mes, futuroMes: mes > d.periodo, agendado: data > hoje };
}
// Saída combinada para os próximos meses (vale para Pix/débito e conta a pagar): o painel soma na projeção
function agendarExterno(d, { desc, valor, mes, dia, n = 1, forma = '', cat, idCaixa = null, primeira = 1 }) {
  (d.parcelamentosExternos ||= []).push({
    item: `${desc}${forma ? ` (${forma === 'pix' ? 'Pix' : forma === 'debito' ? 'Débito' : forma})` : ''}${n > 1 ? `, ${n}x` : ''} — parcela ${brl(valor).replace(' ', '')}`,
    descricao: desc, valor, dia, ...(forma ? { metodo: forma } : {}), categoria: cat,
    atual: `${primeira}/${n}`,
    primeiraParcela: mes,
    ultimaParcela: somaMeses(mes, n - primeira),
    saiA_partir: somaMeses(mes, n - primeira + 1),
    ...(idCaixa ? { idCaixa } : {}), origem: 'app',
  });
}
export function lancarPix(dados, { valor, descricao, categoria, data, metodo = 'pix', nota = '', parcelas = 1, recorrente = false }, hoje, agora = Date.now()) {
  const d = structuredClone(dados);
  validar(d, hoje);
  conferirValor(valor);
  const { mes, futuroMes, agendado } = conferirDataPlano(d, data, hoje);
  const cat = categoriaDeConta(String(categoria || '').trim(), listaDe(d)); // "Transportation" → "transporte", como o agente usa
  if (!cat) throw new Error('Escolha a categoria.');
  const obs = String(nota || '').trim();
  const forma = metodo === 'debito' ? 'debito' : 'pix';
  const nomeForma = forma === 'pix' ? 'Pix' : 'Débito';
  const desc = String(descricao || '').trim() || cat;
  const n = Math.round(Number(parcelas) || 1);
  if (!(n >= 1 && n <= 48)) throw new Error('Parcelas: de 1 a 48.');
  if (n > 1 && recorrente) throw new Error('Escolha parcelado ou recorrente, não os dois.');
  const parcela = centavos(valor / n);
  const dia = diaDe(data);
  const quando = futuroMes ? `a partir de ${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}` : agendado ? `agendado para ${ddmm(data)}` : ddmm(data);
  const como = recorrente ? ' — todo mês' : n > 1 ? ` — ${n}x de ${brl(parcela)} (total ${brl(valor)})` : '';
  const texto = `${nomeForma}: ${desc} ${brl(n > 1 ? parcela : valor)}${como} (${cat}), ${quando}.${obs ? ` Obs.: ${obs}` : ''}`;
  // num mês que vem: nada neste mês
  if (futuroMes && !recorrente) {
    agendarExterno(d, { desc, valor: parcela, mes, dia, n, forma, cat });
    return registrar(d, hoje, texto);
  }
  const id = `${recorrente ? 'fix' : 'var'}-app-${agora}`;
  const item = {
    id,
    descricao: `${nomeForma} — ${desc}${n > 1 ? ` (1/${n})` : ''}`,
    categoria: cat,
    valor: futuroMes ? 0 : parcela,
    dia,
    status: agendado ? 'pendente' : 'confirmado',
    metodo: forma,
    origem: 'app',
    ...(recorrente ? { recorrenteApp: true } : {}),
    // recorrente que só começa num mês que vem: fica com 0 até lá (o Claude lê `comecaEm` e o histórico)
    ...(futuroMes ? { valorProximos: parcela, comecaEm: mes, puladoApp: d.periodo } : {}),
    ...(agendado && !futuroMes ? { agendadoApp: true } : {}),
    ...(n > 1 ? { parcelas: `1/${n} de ${brl(valor)}` } : {}),
    ...(obs ? { nota: obs } : {}),
  };
  (recorrente ? d.despesasFixas : d.despesasVariaveis).push(item);
  if (n > 1) agendarExterno(d, { desc, valor: parcela, mes: somaMeses(d.periodo, 1), dia, n, forma, cat, idCaixa: id, primeira: 2 }); // a 1ª está nas despesas deste mês
  const y = registrar(d, hoje, texto);
  return futuroMes && mes <= somaMeses(d.periodo, 11) ? valorConhecido(y, { lista: 'despesasFixas', id, mes, valor: parcela }, hoje) : y;
}

// Tirar uma saída agendada para os próximos meses (parcelamentosExternos) — a lista "Agendado nos próximos meses"
export function excluirExterno(dados, { indice, itemAntes }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const p = d.parcelamentosExternos?.[indice];
  if (!p || p.item !== itemAntes) throw new Error('Esse agendamento não está mais no painel — busque a atualização.');
  d.parcelamentosExternos.splice(indice, 1);
  return registrar(d, hoje, `Agendamento tirado dos próximos meses: ${p.item} (${p.atual || ''}, a partir de ${p.primeiraParcela}).`);
}

// O que já foi lançado pelo app neste mês (mais recente primeiro), para o histórico
export function historicoApp(d) {
  return (d.atualizacoes || []).filter(a => String(a.acao).startsWith('[app] '))
    .map(a => ({ data: a.data, texto: a.acao.slice(6) })).reverse();
}

// ---------- recorrentes do cartão (v6.3): editar e remover assinaturas ----------
// As assinaturas já estão somadas na fatura do mês (dentro das categorias) e formam o "agendado". Por isso:
// - mudar o valor ajusta também a categoria (a diferença vale desta fatura em diante);
// - cancelar uma já cobrada: sai da lista (não se repete), mas a cobrança deste mês continua na fatura e vira
//   "pontual" — sem isso o gasto livre subiria e o ritmo diário do cartão ficaria inflado;
// - cancelar antes de cobrar: sai da lista e o valor sai da categoria (a fatura diminui).
// `cat` (categoria da assinatura) é um campo do app; as que vieram do agente sem ela ganham na primeira edição.
function achaAssinatura(d, indice, nomeAntes) {
  const it = cartaoDo(d);
  const a = it?.assinaturas?.[indice];
  if (!a || norm(a.nome) !== norm(nomeAntes)) throw new Error('A lista de recorrentes mudou — busque a atualização e tente de novo.');
  return { it, a };
}

function ajustarCategoria(d, it, cat, delta) {
  if (Math.abs(delta) < 0.005) return;
  const nome = String(cat || '').trim();
  if (!nome) throw new Error('Escolha a categoria da assinatura (é nela que a diferença entra).');
  const c = it.categorias.find(x => mesmaCategoria(x.cat, nome, listaDe(d)));
  if (delta < 0) {
    if (!c) throw new Error(`A fatura não tem ${nome} — escolha a categoria em que essa assinatura está.`);
    if (c.valor + delta < -0.004) throw new Error(`${c.cat} tem só ${brl(c.valor)} nesta fatura — escolha a categoria em que essa assinatura está.`);
    c.valor = centavos(c.valor + delta);
  } else if (c) c.valor = centavos(c.valor + delta);
  else it.categorias.push({ cat: nome, valor: centavos(delta) });
}

// v9.8.2: recorrente com `foraDoMes` = período do painel não é cobrada nesta fatura (volta nas próximas)
export const cobradaNoMes = (a, periodo) => a?.foraDoMes !== periodo;
function refazerTotais(it, periodo) {
  it.valor = centavos(it.categorias.reduce((s, c) => s + c.valor, 0));
  const comp = (it.composicao ||= {});
  const agendado = (it.assinaturas || []).filter(a => cobradaNoMes(a, periodo)).reduce((s, a) => s + a.valor, 0);
  comp.agendado = centavos(agendado);
  comp.gastoLivre = centavos(it.valor - (comp.parcelas || 0) - agendado);
}

// alcance: 'todos' = esta fatura e as próximas; 'mes' = só esta fatura (a diferença entra como gasto pontual, a
// recorrente continua com o valor de antes); 'proximos' = esta fatura fica como está e o valor novo vale nas próximas
export function editarAssinatura(dados, { indice, nomeAntes, nome, valor, dia, cat, nota = '', alcance = 'todos' }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { it, a } = achaAssinatura(d, indice, nomeAntes);
  const novoNome = String(nome || '').trim();
  if (!novoNome) throw new Error('Dê um nome para a assinatura.');
  conferirValor(valor);
  const novoDia = Math.round(Number(dia));
  if (!(novoDia >= 1 && novoDia <= 31)) throw new Error('O dia da cobrança vai de 1 a 31.');
  const delta = centavos(valor - a.valor);
  if (alcance !== 'proximos') ajustarCategoria(d, it, cat, delta);
  const antes = { ...a };
  Object.assign(a, { nome: novoNome, valor: alcance === 'mes' ? a.valor : centavos(valor), dia: novoDia, ...(cat ? { cat } : {}) });
  if (String(nota).trim()) a.nota = String(nota).trim();
  else delete a.nota;
  refazerTotais(it, d.periodo);
  const mudou = [
    antes.nome !== novoNome ? `nome ${antes.nome} → ${novoNome}` : '',
    Math.abs(delta) >= 0.005 ? `valor ${brl(antes.valor)} → ${brl(valor)} (${alcance === 'mes' ? `só nesta fatura, diferença em ${cat}` : alcance === 'proximos' ? 'a partir da próxima fatura' : `diferença em ${cat}, desta fatura em diante`})` : '',
    antes.dia !== novoDia ? `dia ${antes.dia} → ${novoDia}` : '',
    cat && antes.cat !== cat ? `categoria ${cat}` : '',
  ].filter(Boolean).join('; ');
  return registrar(d, hoje, `Recorrente no cartão editada: ${novoNome}${mudou ? ` (${mudou})` : ''}.`);
}

// Tirar uma recorrente do cartão (v9.8.2, pedido do Bruno: "perguntar só desse mês ou desse e dos próximos"):
// - 'mes': não é cobrada nesta fatura e continua nas próximas (`foraDoMes`; sai da categoria e do agendado);
// - 'todos': cancelada antes de cobrar — sai desta fatura e das próximas;
// - 'proximos': já foi cobrada nesta fatura — sai só das próximas (a cobrança do mês vira pontual, o ritmo não infla).
// `cobrada` (antigo): true = 'proximos', false = 'todos'.
export function removerAssinatura(dados, { indice, nomeAntes, cobrada, cat, alcance }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { it, a } = achaAssinatura(d, indice, nomeAntes);
  alcance ??= cobrada ? 'proximos' : 'todos';
  const jaFora = !cobradaNoMes(a, d.periodo);
  if (alcance === 'mes') {
    if (jaFora) throw new Error(`${a.nome} já está fora desta fatura.`);
    ajustarCategoria(d, it, cat || a.cat, -a.valor);
    a.foraDoMes = d.periodo;
    refazerTotais(it, d.periodo);
    return registrar(d, hoje, `Recorrente fora só deste mês: ${a.nome} (${brl(a.valor)}) — não cobrada nesta fatura (${cat || a.cat}); continua nas próximas.`);
  }
  it.assinaturas.splice(indice, 1);
  if (alcance === 'proximos' && !jaFora) {
    (it.pontuaisGrandes ||= []).push({ descricao: `${a.nome} — última cobrança (assinatura cancelada)`, valor: a.valor, dia: a.dia || 1, nota: 'Cancelada pelo app: não se repete nas próximas faturas.' });
  } else if (!jaFora) {
    ajustarCategoria(d, it, cat || a.cat, -a.valor);
  }
  refazerTotais(it, d.periodo);
  return registrar(d, hoje, alcance === 'proximos'
    ? `Recorrente cancelada: ${a.nome} (${brl(a.valor)}) — já cobrada nesta fatura, sai das próximas.`
    : `Recorrente cancelada antes de cobrar: ${a.nome} (${brl(a.valor)}) — saiu desta fatura (${cat || a.cat}) e das próximas.`);
}

// ---------- categorias editáveis (v6.3) ----------
// A lista editada vai para `categoriasApp.lista` no painel. Renomear guarda o nome antigo nos aliases e renomeia
// a categoria da fatura (o que o agente escreveu, ex.: "Mercado"), das assinaturas e das compras da próxima fatura.
// Excluir uma categoria com valor nesta fatura exige um destino: o valor passa para ela (o total não muda).
function comLista(d, hoje) {
  const lista = structuredClone(listaDe(d));
  d.categoriasApp = { ...(d.categoriasApp || {}), lista, atualizadoEm: hoje };
  return lista;
}

function conferirCategoria(c) {
  if (!String(c.nome || '').trim()) throw new Error('Dê um nome para a categoria.');
  if (String(c.nome).length > 40) throw new Error('Nome muito longo (até 40 letras).');
  if (!c.emoji && !ICONES[c.icone]) throw new Error('Escolha um ícone ou um emoji.');
  if (!/^#[0-9a-f]{6}$/i.test(c.cor || '')) throw new Error('Escolha uma cor.');
  if (c.grupo && !GRUPOS.includes(c.grupo)) throw new Error('Escolha um grupo.');
}

// original: nome da categoria que está sendo editada (null = categoria nova)
export function salvarCategoria(dados, { original = null, categoria }, hoje) {
  const d = structuredClone(dados);
  const lista = comLista(d, hoje);
  const nova = {
    nome: String(categoria.nome || '').trim(),
    grupo: categoria.grupo || 'Outros',
    cor: categoria.cor,
    ...(categoria.emoji ? { emoji: String(categoria.emoji).trim().slice(0, 8) } : { icone: categoria.icone }),
    ...(String(categoria.descricao || '').trim() ? { descricao: String(categoria.descricao).trim().slice(0, 80) } : {}),
  };
  conferirCategoria(nova);
  const i = original === null ? -1 : lista.findIndex(c => norm(c.nome) === norm(original));
  if (original !== null && i < 0) throw new Error('Essa categoria não existe mais — busque a atualização.');
  const conflito = acharCategoria(nova.nome, lista);
  if (conflito && (i < 0 || conflito !== lista[i])) throw new Error(`Já existe a categoria ${conflito.nome}${norm(conflito.nome) !== norm(nova.nome) ? ` (que também atende por "${nova.nome}")` : ''}.`);
  if (i < 0) {
    lista.push({ ...nova, aliases: [] });
    return registrar(d, hoje, `Categoria criada: ${nova.nome} (${nova.grupo}).`);
  }
  const antiga = lista[i];
  const renomeou = norm(antiga.nome) !== norm(nova.nome);
  const aliases = [...(antiga.aliases || [])];
  if (renomeou && !aliases.some(a => norm(a) === norm(antiga.nome))) aliases.push(antiga.nome);
  lista[i] = { ...antiga, ...nova, aliases, ...(nova.emoji ? { icone: undefined } : { emoji: undefined }), ...(nova.descricao ? {} : { descricao: undefined }) };
  for (const k of ['icone', 'emoji', 'descricao']) if (lista[i][k] === undefined) delete lista[i][k];
  if (renomeou) {
    for (const c of lista) if (c.pai && norm(c.pai) === norm(antiga.nome)) c.pai = nova.nome;
    renomearUsos(d, antiga, nova.nome, lista);
  }
  return registrar(d, hoje, renomeou ? `Categoria renomeada: ${antiga.nome} → ${nova.nome}.` : `Categoria editada: ${nova.nome}.`);
}

// Troca a categoria `de` por `para` onde ela aparece no painel; somar: junta valores na fatura (excluir)
function renomearUsos(d, de, para, lista, somar = false) {
  const casa = nome => norm(nome) === norm(de.nome) || (de.aliases || []).some(a => norm(a) === norm(nome));
  const it = cartaoDo(d);
  if (it?.categorias) {
    const destino = somar ? it.categorias.find(c => !casa(c.cat) && mesmaCategoria(c.cat, para, lista)) : null;
    for (const c of [...it.categorias]) {
      if (!casa(c.cat)) continue;
      if (destino) {
        destino.valor = centavos(destino.valor + c.valor);
        it.categorias.splice(it.categorias.indexOf(c), 1);
      } else c.cat = para;
    }
  }
  // v9.12.4: compras, parcelas e compras da fatura também (senão acertarCategorias recriava a categoria excluída)
  for (const k of ['assinaturas', 'lancamentosApp', 'parcelamentos', 'compras']) for (const a of it?.[k] || []) if (a.cat && casa(a.cat)) a.cat = para;
  for (const c of d.faturaProximoCiclo?.comprasNovas || []) if (c.cat && casa(c.cat)) c.cat = para;
  // v9.9.4: no histórico também (o painel compara o mês anterior pelo nome exato); nome repetido no mês vira uma linha
  for (const h of d.historicoItau || []) {
    if (!h.categorias?.some(c => casa(c.cat))) continue;
    const por = new Map();
    h.categorias = h.categorias.filter(c => { if (casa(c.cat)) c.cat = para; const j = por.get(c.cat); if (!j) { por.set(c.cat, c); return true; } j.valor = centavos(j.valor + c.valor); return false; });
  }
}

export function excluirCategoria(dados, { nome, destino = null }, hoje) {
  const d = structuredClone(dados);
  const lista = comLista(d, hoje);
  const i = lista.findIndex(c => norm(c.nome) === norm(nome));
  if (i < 0) throw new Error('Essa categoria não existe mais — busque a atualização.');
  const alvo = lista[i];
  const casa = n => norm(n) === norm(alvo.nome) || (alvo.aliases || []).some(a => norm(a) === norm(n));
  const it = cartaoDo(d);
  const usada = (it?.categorias || []).filter(c => casa(c.cat)).reduce((s, c) => s + c.valor, 0);
  const emUso = usada > 0.004 || (it?.assinaturas || []).some(a => a.cat && casa(a.cat)) || (d.faturaProximoCiclo?.comprasNovas || []).some(c => c.cat && casa(c.cat));
  if (emUso && !destino) throw new Error(`${alvo.nome} tem ${brl(usada)} nesta fatura — escolha para qual categoria esse valor vai.`);
  if (destino) {
    const dest = acharCategoria(destino, lista);
    if (!dest || dest === alvo) throw new Error('Escolha outra categoria como destino.');
    renomearUsos(d, alvo, dest.nome, lista, true);
  }
  lista.splice(i, 1);
  for (const c of lista) if (c.pai && norm(c.pai) === norm(alvo.nome)) delete c.pai;
  if (it) refazerTotaisSemAgendado(it);
  return registrar(d, hoje, `Categoria excluída: ${alvo.nome}${destino ? ` (valores passaram para ${destino})` : ''}.`);
}

// Juntar categorias não muda o total; só garante o total = soma das categorias
function refazerTotaisSemAgendado(it) {
  it.valor = centavos((it.categorias || []).reduce((s, c) => s + c.valor, 0));
}

// ---------- v7: qualquer conta do caixa — editar, excluir, criar ----------
// Listas que entram no saldo do painel. A fatura do cartão (var-itau) fica de fora: ela é a soma das
// categorias e muda pelos lançamentos do cartão. Aportes (ajustesCaixa) e resgates criados pelo app levam
// `ativo` e mexem também na carteira (investimentos.js → sincronizar).
export const LISTAS_CAIXA = ['receitas', 'despesasFixas', 'despesasVariaveis', 'obrigacoesCaixa', 'resgates', 'ajustesCaixa'];
export const CATEGORIAS_RECEITA = [['salario', 'Salário'], ['bonus', 'Bônus, 13º ou PLR'], ['extraordinaria', 'Outra entrada']];
const RE_DIVIDENDO = /^dividendo\s+([a-z]{4}\d{2})\b/i;
export const tickerDividendo = desc => RE_DIVIDENDO.exec(String(desc || ''))?.[1].toLowerCase() || null;

// Entrada (+) ou saída (−) do caixa
export const sinalDe = (lista, it) => (lista === 'receitas' || lista === 'resgates' ? 1 : lista === 'ajustesCaixa' ? Math.sign(it.valor) || 1 : -1);

function achar(d, lista, id) {
  if (!LISTAS_CAIXA.includes(lista)) return null;
  return (d[lista] || []).find(x => x.id === id) || null;
}

function conferirDia(d, dia) {
  if (!Number.isInteger(dia) || dia < 1 || dia > diasDo(d.periodo)) throw new Error(`O dia precisa estar entre 1 e ${diasDo(d.periodo)}.`);
}

// pago: true = pago/recebido (confirmado); false = a pagar/a receber (volta ao status previsto de antes ou "pendente")
// alcance (v9.5) quando o valor muda numa conta que se repete: 'todos' = este mês e os próximos (padrão); 'mes' = só
// este mês (guarda valorBase para o Claude voltar ao valor de sempre no mês seguinte); 'proximos' = este mês fica
// como está e o valor novo vale do mês que vem em diante (valorProximos). Mês já fechado não muda (é histórico).
export function editarItem(dados, { lista, id, descricao, valor, dia, pago, categoria, nota, alcance = 'todos' }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const it = achar(d, lista, id);
  if (!it || it.id === 'var-itau') throw new Error('Essa conta não está mais no painel — busque a atualização.');
  conferirValor(valor);
  conferirDia(d, dia);
  const desc = String(descricao || '').trim();
  if (!desc) throw new Error('Escreva a descrição.');
  const mud = [];
  if (desc !== it.descricao) { mud.push(`nome "${it.descricao}" → "${desc}"`); it.descricao = desc; }
  const novoValor = centavos(lista === 'ajustesCaixa' && it.valor < 0 ? -valor : valor);
  // v9.8.4: a mesma pergunta para valor E data. Pix/débito parcelado (parcelas futuras em parcelamentosExternos com
  // idCaixa): 'mes' = só esta parcela, 'todos' = esta e as próximas, 'proximos' = só as próximas.
  const futuras = (d.parcelamentosExternos || []).filter(p => p.idCaixa === it.id);
  const repete = LISTAS_CONHECIDAS.includes(lista);
  if (futuras.length && alcance !== 'mes') {
    for (const p of futuras) {
      if (Math.abs(centavos(valor) - p.valor) > 0.004) {
        p.valor = centavos(valor);
        p.item = String(p.item || '').replace(/parcela R\$\s?[\d.,]+/, `parcela ${brl(valor).replace(' ', '')}`);
      }
      p.dia = dia;
    }
    mud.push(alcance === 'proximos' ? 'próximas parcelas' : 'esta e as próximas parcelas');
  }
  const mexeNoMes = !(futuras.length && alcance === 'proximos');
  if (mexeNoMes && Math.abs(novoValor - it.valor) > 0.004) {
    if (repete && alcance === 'proximos') {
      it.valorProximos = centavos(valor);
      mud.push(`do mês que vem em diante: ${brl(Math.abs(it.valor))} → ${brl(valor)}`);
    } else {
      if (repete && alcance === 'mes') { it.valorBase ??= centavos(Math.abs(it.valor)); mud.push(`só neste mês: ${brl(Math.abs(it.valor))} → ${brl(valor)} (depois volta a ${brl(it.valorBase)})`); }
      else { delete it.valorBase; delete it.valorProximos; mud.push(`${brl(Math.abs(it.valor))} → ${brl(valor)}`); }
      it.valor = novoValor;
    }
  }
  if (mexeNoMes && dia !== it.dia) {
    if (repete && alcance === 'proximos') { it.diaProximos = dia; mud.push(`do mês que vem em diante: dia ${it.dia ?? '—'} → ${dia}`); }
    else if (repete && alcance === 'mes') { it.diaBase ??= it.dia; mud.push(`só neste mês: dia ${it.dia ?? '—'} → ${dia} (depois volta ao dia ${it.diaBase})`); it.dia = dia; }
    else { delete it.diaBase; delete it.diaProximos; mud.push(`dia ${it.dia ?? '—'} → ${dia}`); it.dia = dia; }
  }
  const entrada = sinalDe(lista, it) > 0;
  if (pago && it.status !== 'confirmado') {
    it.statusAntesApp = it.status;
    it.status = 'confirmado';
    it.confirmadoApp = hoje;
    mud.push(entrada ? 'recebido' : 'pago');
  } else if (!pago && it.status === 'confirmado') {
    it.status = it.statusAntesApp || 'pendente';
    delete it.statusAntesApp;
    delete it.confirmadoApp;
    mud.push(entrada ? 'a receber' : 'a pagar');
  }
  if (categoria !== undefined && categoria !== null && String(categoria).trim() && categoria !== it.categoria) {
    const cat = lista === 'receitas' ? String(categoria).trim() : categoriaDeConta(String(categoria).trim(), listaDe(d)) || String(categoria).trim();
    if (norm(cat) !== norm(it.categoria || '')) { mud.push(`categoria ${it.categoria || '—'} → ${cat}`); it.categoria = cat; }
  }
  const obs = String(nota ?? '').trim();
  if (nota !== undefined && obs !== String(it.nota || '').trim()) {
    if (obs) it.nota = obs;
    else delete it.nota;
    mud.push('observação');
  }
  if (!mud.length) throw new Error('Nada mudou.');
  it.editadoApp = hoje;
  return registrar(d, hoje, `Editado: ${desc} — ${mud.join(', ')}.`);
}

// alcance (v9.8.2, contas que se repetem): 'mes' = fica fora só deste mês (valor 0 agora, `valorBase` e o valor já
// conhecido do mês que vem guardam o de sempre); 'proximos' = este mês fica, não se repete (`valorProximos` 0, como a
// regra da v9.5 que o Claude já segue); 'todos' = sai de vez.
export function excluirItem(dados, { lista, id, alcance = 'todos' }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const it = achar(d, lista, id);
  if (!it || it.id === 'var-itau') throw new Error('Essa conta não está mais no painel — busque a atualização.');
  // v9.8.4: Pix/débito parcelado — 'mes' = só esta parcela, 'proximos' = só as próximas, 'todos' = esta e as próximas
  if (d.parcelamentosExternos?.some(p => p.idCaixa === it.id)) {
    if (alcance === 'proximos') {
      d.parcelamentosExternos = d.parcelamentosExternos.filter(p => p.idCaixa !== it.id);
      return registrar(d, hoje, `Próximas parcelas tiradas: ${it.descricao} — esta parcela fica.`);
    }
    if (alcance === 'mes') {
      d[lista] = d[lista].filter(x => x !== it);
      return registrar(d, hoje, `Só esta parcela tirada: ${it.descricao} (${brl(Math.abs(it.valor))}) — as próximas continuam.`);
    }
  } else if (alcance !== 'todos' && !LISTAS_CONHECIDAS.includes(lista)) throw new Error('Essa conta não se repete: dá só para excluir.');
  if (alcance === 'mes') {
    if (it.puladoApp === d.periodo) throw new Error(`${it.descricao} já está fora deste mês.`);
    const base = it.valorBase ?? centavos(Math.abs(it.valor));
    Object.assign(it, { valorBase: base, valor: 0, puladoApp: d.periodo });
    const y = registrar(d, hoje, `Fora só deste mês: ${it.descricao} (${brl(base)}) — volta no mês que vem.`);
    return valorConhecido(y, { lista, id, mes: somaMeses(d.periodo, 1), valor: base }, hoje);
  }
  if (alcance === 'proximos') {
    it.valorProximos = 0;
    it.encerradoApp = d.periodo;
    return registrar(d, hoje, `Não se repete mais: ${it.descricao} (${brl(Math.abs(it.valor))}) — fica neste mês e sai a partir do mês que vem.`);
  }
  d[lista] = d[lista].filter(x => x !== it);
  // Pix/débito parcelado: as próximas parcelas saem junto
  if (d.parcelamentosExternos?.some(p => p.idCaixa === it.id)) d.parcelamentosExternos = d.parcelamentosExternos.filter(p => p.idCaixa !== it.id);
  return registrar(d, hoje, `Excluído: ${it.descricao} (${brl(Math.abs(it.valor))}, dia ${it.dia ?? '—'}).`);
}

// Receita ou despesa nova (a receber/a pagar ou já paga). Despesa vai para as variáveis, como as do agente.
export function novoItem(dados, { tipo, descricao, valor, dia, data = null, pago, categoria, metodo = '', nota = '' }, hoje, agora = Date.now()) {
  const d = structuredClone(dados);
  validar(d, hoje);
  conferirValor(valor);
  const receita = tipo === 'receita';
  const desc = String(descricao || '').trim();
  if (!desc) throw new Error('Escreva a descrição.');
  // v9.8.3: conta a pagar num mês que vem = planejamento; vai para os próximos meses (o painel soma na projeção)
  if (data && data.slice(0, 7) > d.periodo) {
    const { mes } = conferirDataPlano(d, data, hoje);
    if (receita) {
      const cat = String(categoria || '').trim() || 'extraordinaria';
      (d.entradasFuturasApp ||= []).push({ id: `rec-fut-app-${agora}`, mes, dia: diaDe(data), descricao: desc, valor: centavos(valor), categoria: cat, origem: 'app' });
      return registrar(d, hoje, `Entrada agendada para ${MESES[Number(mes.slice(5)) - 1]}/${mes.slice(0, 4)}: ${desc} ${brl(valor)}, dia ${diaDe(data)} — incluir em receitas quando o mês abrir.`);
    }
    const cat = categoriaDeConta(String(categoria || '').trim(), listaDe(d));
    if (!cat) throw new Error('Escolha a categoria.');
    agendarExterno(d, { desc, valor: centavos(valor), mes, dia: diaDe(data), forma: metodo, cat });
    return registrar(d, hoje, `Conta a pagar agendada: ${desc} ${brl(valor)} (${cat}), ${ddmm(data)}/${data.slice(0, 4)}.`);
  }
  if (data) dia = diaDe(data);
  conferirDia(d, dia);
  if (receita && tickerDividendo(desc)) throw new Error('Dividendo se lança em Investimentos (ele entra também na carteira).');
  const cat = receita ? (String(categoria || '').trim() || 'extraordinaria') : categoriaDeConta(String(categoria || '').trim(), listaDe(d));
  if (!cat) throw new Error('Escolha a categoria.');
  const obs = String(nota || '').trim();
  const item = {
    id: `${receita ? 'rec' : 'var'}-app-${agora}`,
    descricao: desc,
    categoria: cat,
    valor: centavos(valor),
    dia,
    status: pago ? 'confirmado' : 'pendente',
    ...(metodo ? { metodo } : {}),
    origem: 'app',
    ...(pago ? { confirmadoApp: hoje } : {}),
    ...(obs ? { nota: obs } : {}),
  };
  (receita ? d.receitas : d.despesasVariaveis).push(item);
  const estado = pago ? (receita ? 'recebida' : 'paga') : receita ? 'a receber' : 'a pagar';
  return registrar(d, hoje, `${receita ? 'Receita' : 'Despesa'} nova (${estado}): ${desc} ${brl(valor)}, dia ${dia}.${obs ? ` Obs.: ${obs}` : ''}`);
}

// ---------- v7: movimentos entre o caixa e a carteira (o lado da carteira: investimentos.js) ----------
// Aporte: sai do caixa (ajustesCaixa, categoria "investimento", valor negativo — o painel conta como aporte do mês).
// cotas: quantas cotas foram compradas/vendidas (FIIs, ETFs, GLDI11 — o preço médio da carteira depende disso)
const conferirCotas = cotas => {
  if (cotas && (!Number.isInteger(cotas) || cotas < 0 || cotas > 1e6)) throw new Error('Confira o número de cotas.');
};
// classe (v9.9.13): só para investimento que ainda não está na carteira — a carteira cria o ativo nessa classe
export function novoAporte(dados, { ativo, nome, valor, dia, cotas = 0, classe = null }, hoje, agora = Date.now()) {
  const d = structuredClone(dados);
  validar(d, hoje);
  conferirValor(valor);
  conferirDia(d, dia);
  if (!ativo) throw new Error('Escolha o investimento.');
  conferirCotas(cotas);
  (d.ajustesCaixa ||= []).push({ id: `aju-aporte-app-${agora}`, descricao: `Aporte — ${nome}`, categoria: 'investimento', valor: -centavos(valor), dia, status: 'confirmado', ativo, ...(cotas ? { cotas } : {}), ...(classe ? { classe } : {}), origem: 'app' });
  return registrar(d, hoje, `Aporte: ${brl(valor)} do caixa para ${nome}${cotas ? ` (${cotas} cotas)` : ''}, dia ${dia}.`);
}

// Resgate: entra no caixa no dia do crédito (D+X). motivo: necessidade_caixa (cobrir o caixa) ou estrategico.
// jaSaiu (v9.9.12): o banco já tirou o valor do investimento antes de o resgate ser lançado (o Itaú automático
// zerou o fundo) — a carteira só registra o fluxo, sem descontar de novo.
export function novoResgate(dados, { ativo, nome, valor, dia, motivo = 'necessidade_caixa', cotas = 0, jaSaiu = false }, hoje, agora = Date.now()) {
  const d = structuredClone(dados);
  validar(d, hoje);
  conferirValor(valor);
  conferirDia(d, dia);
  if (!ativo) throw new Error('Escolha o investimento.');
  conferirCotas(cotas);
  (d.resgates ||= []).push({ id: `res-app-${agora}`, descricao: `Resgate — ${nome}`, valor: centavos(valor), dia, status: 'confirmado', motivo, ativo, ...(cotas ? { cotas } : {}), ...(jaSaiu ? { jaNaCarteira: true } : {}), origem: 'app' });
  return registrar(d, hoje, `Resgate: ${brl(valor)} de ${nome}${cotas ? ` (${cotas} cotas)` : ''} para o caixa, crédito dia ${dia}${motivo === 'necessidade_caixa' ? '' : ' (estratégico)'}.`);
}

// Dividendo recebido: confirma o previsto do mês (se houver) ou cria a receita "Dividendo TICKER".
export function novoDividendo(dados, { ativo, valor, data }, hoje, agora = Date.now()) {
  const d = structuredClone(dados);
  validar(d, hoje);
  conferirValor(valor);
  conferirData(d, data, hoje);
  const t = String(ativo || '').toLowerCase();
  if (!/^[a-z]{4}\d{2}$/.test(t)) throw new Error('Escolha o FII ou ETF que pagou.');
  const T = t.toUpperCase();
  const doAtivo = d.receitas.filter(r => tickerDividendo(r.descricao) === t);
  const recebido = doAtivo.find(r => r.status === 'confirmado');
  if (recebido) throw new Error(`O dividendo de ${T} deste mês já está como recebido (${brl(recebido.valor)}, dia ${recebido.dia}). Para mudar, edite em Caixa › Contas.`);
  const previsto = doAtivo[0];
  if (previsto) {
    const antes = previsto.valor;
    Object.assign(previsto, { valor: centavos(valor), dia: diaDe(data), status: 'confirmado', confirmadoApp: hoje });
    return registrar(d, hoje, `Dividendo ${T}: recebido ${brl(valor)} em ${ddmm(data)}${Math.abs(antes - valor) > 0.004 ? ` (previsto ${brl(antes)})` : ''}.`);
  }
  d.receitas.push({ id: `rec-dividendo-${t}-app-${agora}`, descricao: `Dividendo ${T}`, categoria: 'extraordinaria', valor: centavos(valor), dia: diaDe(data), status: 'confirmado', origem: 'app', confirmadoApp: hoje });
  return registrar(d, hoje, `Dividendo ${T}: recebido ${brl(valor)} em ${ddmm(data)}.`);
}

// ---------- v7.2: agenda de verdade e acerto com o banco ----------
// Toque em pago/a pagar na agenda: vira lançamento. Pagar algo com dia no futuro = pago hoje.
export function alternarPago(dados, { lista, id }, hoje) {
  const it = achar(dados, lista, id);
  if (!it || it.id === 'var-itau') throw new Error('Essa conta não está mais no painel — busque a atualização.');
  const pago = it.status !== 'confirmado';
  const dia = pago && (it.dia ?? 0) > diaDe(hoje) ? diaDe(hoje) : it.dia ?? diaDe(hoje);
  return editarItem(dados, { lista, id, descricao: it.descricao, valor: Math.abs(it.valor), dia, pago }, hoje);
}

// Caixa de hoje como o painel calcula (calc().caixa): confirmados com dia até hoje
export function caixaHoje(d, hoje) {
  const H = hoje.slice(0, 7) === d.periodo ? diaDe(hoje) : diasDo(d.periodo);
  const conf = x => x.status === 'confirmado' && (x.dia === null || x.dia === undefined || x.dia <= H);
  const soma = l => (d[l] || []).filter(conf).reduce((s, x) => s + (Number(x.valor) || 0), 0);
  return centavos((d.caixaInicial || 0) + soma('receitas') - soma('despesasFixas') - soma('despesasVariaveis') - soma('obrigacoesCaixa') + soma('resgates') + soma('ajustesCaixa'));
}

// Saldo do app do banco ≠ caixa do painel: lança a diferença (entrada ou saída de hoje) e registra a conferência
export function acertarComBanco(dados, { saldo }, hoje, agora = Date.now()) {
  const d0 = structuredClone(dados);
  validar(d0, hoje);
  if (!Number.isFinite(saldo) || Math.abs(saldo) >= 1e7) throw new Error('Confira o saldo.');
  const caixa = caixaHoje(d0, hoje);
  const dif = centavos(saldo - caixa);
  if (Math.abs(dif) < 0.05) throw new Error('O caixa já bate com o banco.');
  const d = novoItem(d0, { tipo: dif > 0 ? 'receita' : 'despesa', descricao: 'Ajuste com o saldo do banco', valor: Math.abs(dif), dia: diaDe(hoje), pago: true, categoria: dif > 0 ? 'extraordinaria' : 'Others', nota: `Banco ${brl(saldo)} × painel ${brl(caixa)}.` }, hoje, agora);
  (d.reconciliacoes ||= []).push({ data: hoje, saldoBanco: centavos(saldo), saldoPainel: caixa, diferenca: dif, tratamento: `Diferença lançada pelo app Lastro como ${dif > 0 ? 'entrada' : 'saída'} de hoje — o agente deve achar a origem no fechamento.` });
  return d;
}

// ---------- v7.5: compras do cartão lançadas pelo app — ver, editar e excluir ----------
// Cada compra fica em `var-itau.lancamentosApp`. Excluir desfaz tudo o que lancarCartao fez: tira da categoria
// (ou da próxima fatura), do parcelamento, das assinaturas (recorrente) e das pontuais, e refaz os totais.
// Editar = excluir + lançar de novo com os dados novos (numa publicação só).
// As compras que vieram do agente existem só como total por categoria — não há o que listar uma a uma.
const mesmoValor = (a, b) => Math.abs((a || 0) - (b || 0)) < 0.005;

export function comprasApp(d) {
  const it = cartaoDo(d);
  return (it?.lancamentosApp || []).map((r, indice) => ({ ...r, indice }));
}

export function excluirCompra(dados, { indice, descricao, valor }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true, proximoMes: true });
  const it = cartaoDo(d);
  const r = it.lancamentosApp?.[indice];
  if (!r || r.descricao !== descricao || !mesmoValor(r.valor, valor)) throw new Error('Essa compra não está mais no painel — busque a atualização.');
  const n = Number(String(r.parcelas || '').match(/^1\/(\d+)/)?.[1]) || 1;
  const prefixoParc = `${r.descricao} (compra ${ddmm(r.data)}, ${n}x)`;
  const tirarParcelamento = () => {
    const i = (it.parcelamentos || []).findIndex(p => String(p.item).startsWith(prefixoParc) && p.atual === `1/${n}`);
    if (i >= 0) it.parcelamentos.splice(i, 1);
  };
  if (r.proximaFatura) {
    if (n > 1) tirarParcelamento();
    else {
      const l = d.faturaProximoCiclo?.comprasNovas || [];
      const i = l.findIndex(c => c.data === r.data && c.descricao === r.descricao && mesmoValor(c.valor, r.valor));
      if (i >= 0) l.splice(i, 1);
    }
  } else {
    const c = it.categorias.find(x => mesmaCategoria(x.cat, r.cat, listaDe(d)));
    if (!c) throw new Error(`A fatura não tem mais a categoria ${r.cat} — busque a atualização.`);
    if (c.valor - r.valor < -0.004) throw new Error(`${c.cat} tem só ${brl(c.valor)} nesta fatura — o agente pode ter mudado essa categoria.`);
    c.valor = centavos(c.valor - r.valor);
    if (Math.abs(c.valor) < 0.005) it.categorias = it.categorias.filter(x => x !== c);
    if (n > 1) tirarParcelamento();
    if (r.recorrente) {
      const i = (it.assinaturas || []).findIndex(a => a.nome === r.descricao && mesmoValor(a.valor, r.valor));
      if (i >= 0) it.assinaturas.splice(i, 1);
    }
    const p = (it.pontuaisGrandes || []).findIndex(x => mesmoValor(x.valor, r.valor) && (x.descricao === r.descricao || String(x.descricao).startsWith(`${r.descricao} ${n}x`)));
    if (p >= 0) it.pontuaisGrandes.splice(p, 1);
    refazerTotais(it, d.periodo);
  }
  it.lancamentosApp.splice(indice, 1);
  return registrar(d, hoje, `Compra no cartão excluída: ${r.descricao} ${r.valor < 0 ? `−${brl(-r.valor)}` : brl(r.valor)}${n > 1 ? ` (parcela 1/${n})` : ''} em ${r.cat}, ${ddmm(r.data)}.`);
}

// ---------- v7.9: valores já conhecidos dos próximos meses (contrato com o agente: `valoresConhecidos`) ----------
// Ex.: a conta de energia de novembro já chegou. O app só guarda; a projeção de 12 meses do painel usa o valor quando o
// agente gera o painel lendo este campo (`valoresConhecidosLidos: true`), e ao abrir o mês o agente o aplica e tira daqui.
export const LISTAS_CONHECIDAS = ['despesasFixas', 'receitas', 'obrigacoesCaixa'];
export function valorConhecido(dados, { lista, id, mes, valor }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { proximoMes: true });
  const it = LISTAS_CONHECIDAS.includes(lista) && (d[lista] || []).find(x => x.id === id);
  if (!it) throw new Error('Essa conta não está mais no painel — busque a atualização.');
  if (!/^\d{4}-\d{2}$/.test(mes || '') || mes <= d.periodo || mes > somaMeses(d.periodo, 60)) throw new Error('Escolha um mês dos próximos 5 anos.');
  const [a, m] = mes.split('-').map(Number);
  const rotulo = `${it.descricao} de ${MESES[m - 1]}/${a}`;
  const lista2 = (d.valoresConhecidos ||= []);
  const i = lista2.findIndex(v => v.lista === lista && v.id === id && v.mes === mes);
  if (valor === null) {
    if (i < 0) throw new Error('Esse valor já tinha saído.');
    lista2.splice(i, 1);
    return registrar(d, hoje, `${rotulo}: valor conhecido retirado (volta ao previsto).`);
  }
  conferirValor(valor);
  const novo = { mes, lista, id, descricao: it.descricao, valor: centavos(valor), data: hoje, origem: 'app' };
  if (i >= 0) lista2[i] = novo;
  else lista2.push(novo);
  lista2.sort((x, y) => x.mes.localeCompare(y.mes));
  return registrar(d, hoje, `${rotulo} já conhecido: ${brl(valor)} (previsto ${brl(Math.abs(it.valor))}).`);
}

// ---------- v9.5: parcelamentos do agente e compras da fatura do Itaú, editáveis ----------
// Parcelamento: { item: "Loja — parcela R$169,90", atual: "18/21", ultimaParcela, saiDaFaturaA_partir_de }. A fatura
// deste mês já veio do Itaú (composicao.parcelas): editar muda só as próximas faturas (é o que o painel projeta).
const brlParcela = v => `R$${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function achaParcelamento(d, indice, itemAntes) {
  const it = (d.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const p = it?.parcelamentos?.[indice];
  if (!p || (itemAntes && p.item !== itemAntes)) throw new Error('Esse parcelamento não está mais no painel — busque a atualização.');
  return { it, p };
}
export function editarParcelamento(dados, { indice, itemAntes, loja, valor, atual, total, cat }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { p } = achaParcelamento(d, indice, itemAntes);
  const nome = String(loja || '').trim();
  if (!nome) throw new Error('Escreva o nome da compra.');
  conferirValor(valor);
  const n = Math.round(Number(atual)), t = Math.round(Number(total));
  if (!(t >= 1 && t <= 99 && n >= 1 && n <= t)) throw new Error('A parcela de agora vai de 1 até o total de parcelas.');
  const antes = `${p.item} (${p.atual})`;
  p.item = `${nome} — parcela ${brlParcela(centavos(valor))}`;
  p.atual = `${n}/${t}`;
  p.ultimaParcela = somaMeses(d.periodo, t - n);
  p.saiDaFaturaA_partir_de = somaMeses(d.periodo, t - n + 1);
  if (cat) p.cat = cat;
  p.editadoApp = hoje;
  return registrar(d, hoje, `Parcelamento editado (vale para as próximas faturas): ${antes} → ${p.item} (${p.atual}).`);
}
export function excluirParcelamento(dados, { indice, itemAntes }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { it, p } = achaParcelamento(d, indice, itemAntes);
  it.parcelamentos.splice(indice, 1);
  return registrar(d, hoje, `Parcelamento retirado das próximas faturas (quitado ou não existe): ${p.item} (${p.atual}).`);
}
// var-itau.compras = o detalhe que o Claude leu da fatura do Itaú; o total por categoria não muda (só o detalhe)
function achaCompraFatura(d, indice, lojaAntes) {
  const it = (d.despesasVariaveis || []).find(x => x.id === 'var-itau');
  const c = it?.compras?.[indice];
  if (!c || (lojaAntes && (c.loja || c.descricao) !== lojaAntes)) throw new Error('Essa compra não está mais no painel — busque a atualização.');
  return { it, c };
}
export function editarCompraFatura(dados, { indice, lojaAntes, loja, valor, cat, data }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { c } = achaCompraFatura(d, indice, lojaAntes);
  const nome = String(loja || '').trim();
  if (!nome) throw new Error('Escreva o nome da compra.');
  conferirValor(valor);
  const antes = `${c.loja || c.descricao} ${brl(c.valor)}`;
  Object.assign(c, { loja: nome, valor: centavos(valor), ...(cat ? { cat } : {}), ...(data ? { data } : {}), editadoApp: hoje });
  return registrar(d, hoje, `Compra da fatura corrigida: ${antes} → ${nome} ${brl(valor)}${cat ? ` (${cat})` : ''}.`);
}
export function excluirCompraFatura(dados, { indice, lojaAntes }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje, { cartao: true });
  const { it, c } = achaCompraFatura(d, indice, lojaAntes);
  it.compras.splice(indice, 1);
  return registrar(d, hoje, `Compra tirada do detalhe da fatura: ${c.loja || c.descricao} ${brl(c.valor)} (o total da categoria não muda).`);
}

// v9.8.4 (controle total): tirar uma entrada agendada para um mês que vem
export function excluirEntradaFutura(dados, { id }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const e = (d.entradasFuturasApp || []).find(x => x.id === id);
  if (!e) throw new Error('Essa entrada não está mais no painel — busque a atualização.');
  d.entradasFuturasApp = d.entradasFuturasApp.filter(x => x !== e);
  return registrar(d, hoje, `Entrada agendada tirada: ${e.descricao} (${e.mes}).`);
}

// v9.8.4 (controle total): corrigir um mês já fechado (histórico). O saldo é refeito (receitas − fixas − variáveis) e o
// "saldo só do salário" anda junto; o motor do painel usa esses números nas médias e no histórico.
export function editarMesFechado(dados, { periodo, receitaTotal, fixasTotal, variaveisTotal, itau, notas }, hoje) {
  const d = structuredClone(dados);
  validar(d, hoje);
  const m = (d.mesesFechados || []).find(x => x.periodo === periodo);
  if (!m) throw new Error('Esse mês não está no histórico.');
  const r = (m.resultado ||= {});
  const mud = [];
  const num = (v, nome, atual, aplicar) => {
    if (v === undefined || v === null || v === '') return;
    if (!Number.isFinite(v) || v < 0) throw new Error(`Confira o valor de ${nome}.`);
    if (Math.abs(v - (atual || 0)) > 0.004) { mud.push(`${nome} ${brl(atual || 0)} → ${brl(v)}`); aplicar(centavos(v)); }
  };
  num(receitaTotal, 'receitas', r.receitaTotal, v => { r.receitaTotal = v; });
  num(fixasTotal, 'contas fixas', r.fixasTotal, v => { r.fixasTotal = v; });
  num(variaveisTotal, 'variáveis', r.variaveisTotal, v => { r.variaveisTotal = v; });
  num(itau, 'fatura do Itaú', m.itau, v => { m.itau = v; });
  if (notas !== undefined && String(notas).trim() !== String(m.notas || '').trim()) { m.notas = String(notas).trim(); mud.push('anotação'); }
  if (!mud.length) throw new Error('Nada mudou.');
  const saldo = centavos((r.receitaTotal || 0) - (r.fixasTotal || 0) - (r.variaveisTotal || 0));
  if (Number.isFinite(r.saldo) && Number.isFinite(r.saldoSalario)) r.saldoSalario = centavos(r.saldoSalario + (saldo - r.saldo));
  r.saldo = saldo;
  m.editadoApp = hoje;
  return registrar(d, hoje, `Mês fechado ${m.periodoLabel || periodo} corrigido: ${mud.join(', ')} (saldo ${brl(saldo)}).`);
}
