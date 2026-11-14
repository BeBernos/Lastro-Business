// v9.17 — fechamento pelo conector: conferência do JSON e mudanças por partes. Roda com a família fictícia da demonstração.
import { gerarDemo } from '../../app/demo/gerar.js';
import { aplicarMudancas, CAMPOS_PROTEGIDOS, conferirFechamento } from '../../app/parcial.js';
import { fechamentoPronto } from '../../app/telas.js';

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const copia = x => JSON.parse(JSON.stringify(x));
const { cf, cart } = gerarDemo('2026-11-30');

// caixa que fecha novembro e abre dezembro
const novoCx = copia(cf);
novoCx.mesesFechados.push({ periodo: '2026-11', resultado: {} });
novoCx.periodo = '2026-12';
novoCx.caixaInicial = 4210;
let r = conferirFechamento(cf, novoCx, 'caixa');
confere('caixa válido: sem erros', r.erros.length === 0, r.erros.join('; '));
confere('caixa: resumo do período e dos meses', r.resumo.periodo.join('→') === '2026-11→2026-12' && r.resumo.mesesFechados.join('→') === '6→7' && r.resumo.caixaInicial === 4210, JSON.stringify(r.resumo));

const semMes = copia(novoCx); semMes.mesesFechados = semMes.mesesFechados.filter(m => m.periodo !== '2026-08');
confere('caixa sem um mês fechado: recusa citando o mês', conferirFechamento(cf, semMes, 'caixa').erros.some(e => e.includes('2026-08')));
const voltou = copia(novoCx); voltou.periodo = '2026-10';
confere('período para trás: recusa', conferirFechamento(cf, voltou, 'caixa').erros.length > 0);
const semOrc = copia(novoCx); delete semOrc.orcamentos;
confere('campo protegido sumiu: recusa com o nome', CAMPOS_PROTEGIDOS.caixa.includes('orcamentos') && conferirFechamento(cf, semOrc, 'caixa').erros.some(e => e.includes('orcamentos')));

// carteira
const novaCt = copia(cart); novaCt.historico_mensal['2026-11'].status = 'fechado'; novaCt.historico_mensal['2026-11'].patrimonio_total = 184050;
r = conferirFechamento(cart, novaCt, 'carteira');
confere('carteira válida: sem erros e patrimônio no resumo', r.erros.length === 0 && r.resumo.patrimonio[1] === 184050, r.erros.join('; ') + JSON.stringify(r.resumo));
const semHist = copia(novaCt); delete semHist.historico_mensal['2026-03'];
confere('carteira sem um mês do histórico: recusa', conferirFechamento(cart, semHist, 'carteira').erros.some(e => e.includes('2026-03')));
const semFluxo = copia(novaCt); semFluxo.historico_mensal['2026-10'].fluxos = [];
cart.historico_mensal['2026-10'].fluxos[0].idCaixa = 'aj-1'; // um aporte que veio do caixa
confere('fluxo com idCaixa sumiu: recusa', conferirFechamento(cart, semFluxo, 'carteira').erros.some(e => e.includes('2026-10')));

// texto JSON
confere('string JSON válida = objeto', conferirFechamento(cf, JSON.stringify(novoCx), 'caixa').erros.length === 0);
confere('string cortada: recusa "cortado ou inválido"', conferirFechamento(cf, JSON.stringify(novoCx).slice(0, 500), 'caixa').erros.some(e => /cortado ou inválido/.test(e)));

// mudanças por partes (o caixa real tem ~200 KB: o Claude manda só o que muda)
const m = aplicarMudancas(cf, { mudancas: { periodo: '2026-12', caixaInicial: 4210, 'receitas/0/valor': 1 }, acrescentar: { mesesFechados: [{ periodo: '2026-11' }] } });
confere('aplicarMudancas: troca, caminho com índice e acrescenta', m.periodo === '2026-12' && m.receitas[0].valor === 1 && m.mesesFechados.at(-1).periodo === '2026-11' && m.mesesFechados.length === cf.mesesFechados.length + 1);
confere('aplicarMudancas não mexe no original', cf.periodo === '2026-11' && cf.mesesFechados.length === 6);
const mc = aplicarMudancas(cart, { mudancas: { 'historico_mensal/2026-12': { status: 'em_andamento' } } });
confere('aplicarMudancas cria chave nova num objeto', mc.historico_mensal['2026-12'].status === 'em_andamento');
confere('aplicarMudancas com dados completos troca tudo', aplicarMudancas(cf, { dados: novoCx }).periodo === '2026-12');
let erro = ''; try { aplicarMudancas(cf, { acrescentar: { periodo: [1] } }); } catch (e) { erro = e.message; }
confere('acrescentar em algo que não é lista: erro claro', /não é uma lista/.test(erro), erro);

// cartão do Início
const rs = { caixa: { conferencia: { periodo: ['2026-11', '2026-12'], mesesFechados: [6, 7] } }, carteira: { conferencia: { mes: ['2026-11', '2026-11'], patrimonio: [182620, 184050] } } };
const h = fechamentoPronto(rs);
confere('cartão: período, meses e botão', h.includes('nov/26 → dez/26') && /meses fechados 6 → 7/.test(h) && /data-fech-pronto/.test(h));
confere('cartão só com a carteira avisa que falta o caixa', /Falta o caixa/.test(fechamentoPronto({ carteira: rs.carteira })));
confere('sem rascunho: nada, ou Desfazer por 2 dias depois de aplicar', fechamentoPronto(null) === '' && /data-fech-desfazer/.test(fechamentoPronto(null, { em: new Date().toISOString() })) && fechamentoPronto(null, { em: '2026-01-01T00:00:00Z' }) === '');

console.log(`v9.17 fechamento pelo conector: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
