// v9.30 — o que o Bruno anotou no app (16–18/11/2026). Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const R = new URL('../../app/', import.meta.url).href;
const L = await import(R + 'lancamentos.js');
const { planilhaFatura, extratoDoMes } = await import(R + 'extrato.js');
const { parcelaNoMes } = await import(R + 'telas.js');
const { valorPorFonte } = await import(R + 'investimentos.js');
const { htmlTopoCarvao, numerosDoTopo } = await import(R + 'v10.js');
const { gerarDemo } = await import(R + 'demo/gerar.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const nb = s => String(s).replace(/ /g, ' ');
const hoje = '2026-10-22';
const base = {
  periodo: '2026-10', ultimaAtualizacao: '2026-10-20', receitas: [], despesasFixas: [], obrigacoesCaixa: [],
  despesasVariaveis: [{ id: 'var-itau', descricao: 'Fatura Itaú', valor: 1000, dia: 10, status: 'pendente',
    categorias: [{ cat: 'Mercado', valor: 600 }, { cat: 'Streaming', valor: 55.9 }, { cat: 'Parcelas', valor: 344.1 }],
    composicao: { parcelas: 344.1, agendado: 55.9, gastoLivre: 600 },
    assinaturas: [{ nome: 'Netflix', valor: 55.9, dia: 5 }],
    parcelamentos: [{ item: 'Samsung — parcela R$169,90', atual: '17/21', ultimaParcela: '2027-02', saiDaFaturaA_partir_de: '2027-03' }] }],
};

// 1. o número da parcela muda de mês para mês nas próximas faturas
const p = { atual: '3/4', ultimaParcela: '2026-12' };
confere('parcela de novembro 3/4, de dezembro 4/4', parcelaNoMes(p, '2026-11').num === 3 && parcelaNoMes(p, '2026-12').num === 4 && parcelaNoMes(p, '2026-12').tot === 4);
confere('sem a última parcela: nada (não inventa)', parcelaNoMes({ atual: '2/5' }, '2026-11') === null);

// 2. planilha da fatura: das mais novas para as mais antigas
let d = L.lancarCartao(base, { valor: 10, descricao: 'Velha', cat: 'Mercado', data: '2026-10-02' }, hoje);
d = L.lancarCartao(d, { valor: 20, descricao: 'Nova', cat: 'Mercado', data: '2026-10-21' }, hoje);
const datas = planilhaFatura(d).abas[0].linhas.map(l => l[0]).filter(Boolean);
confere('planilha: a mais nova primeiro', datas[0] === '2026-10-21' && datas.indexOf('2026-10-02') > 0 && datas.every((x, i) => i === 0 || datas[i - 1] >= x), datas.join());

// 3. mudar o valor de UMA parcela de uma compra parcelada do app
d = L.lancarCartao(base, { valor: 300, descricao: 'Tênis', cat: 'Mercado', data: '2026-10-20', parcelas: 3 }, hoje);
const r0 = L.comprasApp(d).find(x => x.descricao === 'Tênis');
const merc = x => x.despesasVariaveis[0].categorias.find(c => c.cat === 'Mercado').valor;
const parc = x => x.despesasVariaveis[0].parcelamentos.find(q => q.item.startsWith('Tênis')).item;
const so = L.editarParcelaCompra(d, { indice: r0.indice, descricao: 'Tênis', valor: r0.valor, novo: 101.5, alcance: 'mes' }, hoje);
confere('só esta parcela: a fatura muda, as próximas não', Math.abs(merc(so) - merc(d) - 1.5) < 0.005 && parc(so) === parc(d) && L.comprasApp(so).find(x => x.descricao === 'Tênis').valor === 101.5);
const todas = L.editarParcelaCompra(d, { indice: r0.indice, descricao: 'Tênis', valor: r0.valor, novo: 101.5, alcance: 'todos' }, hoje);
confere('esta e as próximas: fatura e parcelamento', Math.abs(merc(todas) - merc(d) - 1.5) < 0.005 && nb(parc(todas)).includes('R$101,50') && nb(L.comprasApp(todas).find(x => x.descricao === 'Tênis').parcelas).includes('R$ 304,50'), nb(parc(todas)));
const prox = L.editarParcelaCompra(d, { indice: r0.indice, descricao: 'Tênis', valor: r0.valor, novo: 101.5, alcance: 'proximos' }, hoje);
confere('só as próximas: a fatura fica igual', merc(prox) === merc(d) && nb(parc(prox)).includes('R$101,50'));
let erro = '';
try { L.editarParcelaCompra(d, { indice: r0.indice, descricao: 'Outra', valor: r0.valor, novo: 50 }, hoje); } catch (e) { erro = e.message; }
confere('compra que mudou: recusa com explicação', /não está mais no painel/.test(erro));

// 4. data da compra num parcelamento do agente (com o ano), e aviso de data no futuro
const e1 = L.editarParcelamento(base, { indice: 0, itemAntes: 'Samsung — parcela R$169,90', loja: 'Samsung', valor: 169.9, atual: 17, total: 21, dataCompra: '2025-06-12' }, hoje);
const pe = e1.despesasVariaveis[0].parcelamentos[0];
confere('data guardada com o ano e no texto do agente', pe.dataCompra === '2025-06-12' && pe.item.includes('(compra 12/06, 21x)'), pe.item);
const ext = extratoDoMes(e1).find(i => i.descricao.startsWith('Samsung'));
confere('extrato usa a data com o ano certo (2025, não 2026)', ext?.data === '2025-06-12', JSON.stringify(ext));
erro = '';
try { L.editarParcelamento(base, { indice: 0, itemAntes: 'Samsung — parcela R$169,90', loja: 'Samsung', valor: 169.9, atual: 17, total: 21, dataCompra: '2027-01-01' }, hoje); } catch (e) { erro = e.message; }
confere('data depois de hoje: recusa', /depois de hoje/.test(erro));

// 5. Hoje: passou do limite mostra quanto; valores exatos com centavos (v11.5: o topo da Meia-noite, o "Livre de verdade")
const c = { saldo: 100, diasRest: 10, itau: 6123.45, caixa: 4247.97 };
const tHoje = numerosDoTopo('inicio', { c }, { periodo: '2026-11', regras: { limiteSaudavelItau: 5600 }, calendario: { faturaCartao: 7 }, receitas: [] }, null, new Date('2026-11-18T12:00:00-03:00'));
confere('passou do limite: quanto, não "cabe R$ 0"', tHoje.eyebrow === 'O cartão passou do limite' && tHoje.valor === -523.45, JSON.stringify(tHoje));
confere('valores exatos no topo', nb(htmlTopoCarvao(tHoje)).includes('−R$ 523<span class="cent">,45</span>') || nb(htmlTopoCarvao(tHoje)).includes('-R$ 523<span class="cent">,45</span>'), nb(htmlTopoCarvao(tHoje)).match(/topo-num[^<]*<[^<]*<[^<]*/)?.[0]);
const { cf, cart } = gerarDemo('2026-11-18');
const topoC = JSON.parse(nb(JSON.stringify(numerosDoTopo('cartao', { c: { ...c, itau: 6000 } }, { ...cf, regras: { ...cf.regras, limiteSaudavelItau: 5600 } }, cart, new Date('2026-11-18T12:00:00-03:00')))));
confere('topo do cartão: "acima do limite" em vez de "cabem"', topoC.pilulas.some(x => x.texto === 'R$ 400,00 acima do limite' && x.tom === 'ruim'), JSON.stringify(topoC.pilulas));

// 6. Itaú e Binance embaixo do total da carteira
const f = valorPorFonte(cart);
confere('Itaú e Binance pelas marcações das atualizações (e o resto, v10.0.1)', f?.length === 3 && f[2].nome === 'Outros' && f[0].nome === 'Itaú' && f[0].valor > 0 && f[1].nome === 'Binance', JSON.stringify(f));
confere('sem marcação: nada', valorPorFonte({ historico_mensal: { '2026-11': { ativos: {} } } }) === null);
const topoInv = numerosDoTopo('carteira', { c }, cf, cart, new Date('2026-11-18T12:00:00-03:00'));
confere('o topo da Carteira leva as fontes', topoInv.fontes?.length === 3);

console.log(`v9.30 anotações do Bruno: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;

// ---------- v10.0: o que o Bruno pediu no áudio de 18/11 ----------
const { roteiroCv, tudoV10: tudo, TELAS_CV } = await import(R + 'telas.js');
let ok2 = 0, falhas2 = 0;
const c2 = (nome, cond, extra = '') => { if (cond) { ok2++; console.log('PASSA', nome); } else { falhas2++; console.log('FALHA', nome, extra); } };
const plano = { plano_acao: { atualizado_em: '2026-11-16', passos: [
  { n: 1, titulo: 'Resgatar o Optimus', status: 'CONCLUIDO', quando: '2026-11-11', valor: 3899.26 },
  { n: 8, titulo: 'Seg 30/11: conferir as entradas', status: 'pendente', quando: '2026-11-30', valor: 18686.08, nota: 'Salário e 13º' },
  { n: 10, titulo: 'Seg 30/11: comprar VWRA11', status: 'pendente', quando: '2026-11-30', valor: 600 },
  { n: 12, titulo: 'Rever o plano', status: 'pendente', quando: '2026-11-10' }] } };
const rot = nb(roteiroCv(plano, true, '2026-11-18'));
c2('roteiro: resumo "a fazer · feitos"', rot.includes('3 a fazer</b> · 1 feito'));
c2('roteiro: agrupado por dia, com quanto falta e o atrasado', rot.includes('seg, 30/11 · daqui a 12 dias') && rot.includes('atrasado 8 dias') && rot.indexOf('atrasado') < rot.indexOf('daqui a 12'));
c2('roteiro: o título sem repetir o dia; o valor e o Feito', rot.includes('<b>comprar VWRA11</b>') && rot.includes('R$ 600,00') && /data-passo="10"/.test(rot));
c2('roteiro: feitos numa linha que abre', /<details class="feitos-cv"><summary>1 passo feito ou descartado<\/summary>/.test(rot));
c2('roteiro: o Rafael não marca nada', !/data-passo/.test(roteiroCv(plano, false, '2026-11-18')));
const blocosT = { 'carteira/visao': [
  { titulo: 'Consumo de patrimônio', html: '<section class="cartao"><p>consumo</p></section>' },
  { titulo: 'Aportes do mês', html: '<section class="cartao"><p>aportes</p></section>' },
  { titulo: 'Score da carteira', html: '<section class="cartao"><div class="cartao-topo"><h2>Score da carteira</h2></div>—</section>' }] };
const tt = tudo('carteira', [['', 'carteira/visao', [], []]], k => blocosT[k] || [], new Set(), []);
c2('Tudo: consumo e aportes numa linha só', tt.includes('Consumo de patrimônio e aportes do mês') && !/<b>Aportes do mês<\/b>/.test(tt) && tt.includes('aportes') && tt.includes('consumo'));
c2('Tudo: bloco sem dados diz isso (não abre em branco)', tt.includes('não trouxe dados para este bloco') && tt.includes('sem dados agora'));
const { cf: cfD, cart: cartD } = gerarDemo('2026-11-18');
const tela = nb(TELAS_CV.carteira({ c: {} }, cfD, { hoje: '2026-11-18' }, { carteira: cartD, github: true, abertos: new Set(), hoje: '2026-11-18' }));
c2('projeção de cada ativo: total + um cartão por ativo, com a taxa', tela.includes('Projeção de cada ativo') && tela.includes('Carteira toda') && (tela.match(/data-detalhe="det-proj-\d"/g) || []).length === 5 && tela.includes('10,5% a.a.'));
const semProj = TELAS_CV.carteira({ c: {} }, cfD, { hoje: '2026-11-18' }, { carteira: { ...cartD, projecao_ativos: undefined }, github: true, abertos: new Set(), hoje: '2026-11-18' });
c2('sem o campo do Claude: a seção não aparece', !semProj.includes('Projeção de cada ativo'));
console.log(`v10.0 áudio do Bruno: ${ok2} ok, ${falhas2} falhas`);
if (falhas2) process.exitCode = 1;

// v10.0.1: Itaú + Binance + o resto fecham com o total (o Bruno: "os dados não batem")
{
  const cartF = { historico_mensal: { '2026-11': { ativos: { renda_fixa: { active_fix_all: 14113.59, tesouro_prefixado_2029: 8897.28, tesouro_ipca_2032: 4981.96 }, fiis: { hglg11: 8559 }, cripto: 1221.93 },
    fontes_app: { itau: ['active_fix_all', 'hglg11'], binance: ['cripto'] } } } };
  const f2 = valorPorFonte(cartF);
  const soma = f2.reduce((s, x) => s + x.valor, 0);
  const okF = f2.map(x => x.nome).join() === 'Itaú,Binance,Tesouro Direto' && f2[2].valor === 13879.24 && Math.abs(soma - 37773.76) < 0.005;
  console.log(okF ? 'PASSA' : 'FALHA', 'fontes: o Tesouro sem ligação entra à parte e a soma fecha com o total', JSON.stringify(f2));
  if (!okF) process.exitCode = 1;
}

// v10.0.1: ligação automática do Itaú (ativo novo liga sozinho; o resto vira aviso)
{
  const { revisarLigacoes } = await import(R + 'pluggy.js');
  const inv = [{ id: 'a', nome: 'ITAU ACTIVE FIX ALL' }, { id: 't1', nome: 'Tesouro Prefixado 2029' }, { id: 't2', nome: 'Tesouro IPCA+ 2032' }, { id: 't3', nome: 'Tesouro Prefixado 2031' }];
  const ativos = [{ chave: 'active_fix_all', nome: 'Active Fix All', valor: 14113 }, { chave: 'tesouro_prefixado_2029', nome: 'Tesouro Prefixado 2029', valor: 8897 }, { chave: 'tesouro_ipca_2032', nome: 'Tesouro IPCA+ 2032', valor: 4981 },
    { chave: 'cripto', nome: 'Cripto', valor: 1221 }, { chave: 'cdb_inter', nome: 'CDB Inter', valor: 500 }, { chave: 'optimus_rf', nome: 'Optimus RF', valor: 3000 }];
  const r = revisarLigacoes(inv, { a: 'active_fix_all', velho: 'optimus_rf' }, ativos);
  const t = (nome, cond, extra = '') => { console.log(cond ? 'PASSA' : 'FALHA', nome, cond ? '' : extra); if (!cond) process.exitCode = 1; };
  t('Itaú: os Tesouros novos ligam sozinhos ao ativo certo', r.ligacoes.t1 === 'tesouro_prefixado_2029' && r.ligacoes.t2 === 'tesouro_ipca_2032', JSON.stringify(r.ligacoes));
  t('Itaú: nunca liga dois investimentos ao mesmo ativo (o 2031 fica sem par)', r.ligacoes.t3 === '', JSON.stringify(r.ligacoes));
  t('Itaú: a cripto (Binance) não vira aviso; o CDB sem par vira', r.semLigacao.join() === 'cdb_inter', JSON.stringify(r.semLigacao));
  t('Itaú: investimento ligado que sumiu do banco vira aviso', r.sumiram.join() === 'optimus_rf');
  t('Itaú: "está em outro lugar" tira do aviso', revisarLigacoes(inv, r.ligacoes, ativos, ['cdb_inter']).semLigacao.length === 0);
}
