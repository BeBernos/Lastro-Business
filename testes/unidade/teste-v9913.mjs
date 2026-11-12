// v9.9.13 — aporte em investimento que a carteira ainda não tem (Tesouro, VWRA11 do plano)
import { novoAporte } from '../../app/lancamentos.js';
import { sincronizar, listaAtivos } from '../../app/investimentos.js';
let n = 0, f = 0; const ok = (nome, c, x = '') => { n++; if (!c) f++; console.log((c ? 'PASSA ' : 'FALHA ') + nome + (x ? ' — ' + x : '')); };
const cf0 = { periodo: '2026-11', ultimaAtualizacao: '2026-11-11', receitas: [], despesasFixas: [], despesasVariaveis: [], resgates: [], ajustesCaixa: [], atualizacoes: [] };
const cart0 = { target_allocation: {}, custo_medio: { ativos: {} }, historico_mensal: { '2026-10': { status: 'fechado', ativos: { renda_fixa: { fundo_x: 5000 }, etfs: { ivvb11: 1000 } } },
  '2026-11': { status: 'em_andamento', atualizado_em: '2026-11-11', ativos: { renda_fixa: { fundo_x: 5000 }, etfs: { ivvb11: 1000 } }, fluxos: [] } } };
const cf1 = novoAporte(cf0, { ativo: 'tesouro_prefixado_2029', nome: 'Tesouro prefixado 2029', valor: 3900, dia: 13, classe: 'renda_fixa' }, '2026-11-11', 1);
const s1 = sincronizar(cf0, cf1, cart0, '2026-11-11'); const h1 = s1.cart.historico_mensal['2026-11'];
ok('Tesouro novo entra na renda fixa com o valor do aporte', h1.ativos.renda_fixa.tesouro_prefixado_2029 === 3900 && h1.aportes === 3900 && h1.patrimonio_parcial === 9900, JSON.stringify(h1.ativos.renda_fixa));
ok('e aparece na lista do Investir', listaAtivos(s1.cart).some(a => a.chave === 'tesouro_prefixado_2029' && a.classe === 'renda_fixa'));
const cf2 = novoAporte(cf1, { ativo: 'vwra11', nome: 'VWRA11', valor: 660, dia: 30, cotas: 5, classe: 'etfs' }, '2026-11-11', 2);
const s2 = sincronizar(cf1, cf2, s1.cart, '2026-11-11'); const h2 = s2.cart.historico_mensal['2026-11'];
const cm = s2.cart.custo_medio.ativos.vwra11;
ok('ETF novo: entra em ETFs com 5 cotas e preço médio R$ 132', h2.ativos.etfs.vwra11 === 660 && cm.qtd === 5 && cm.pm === 132, JSON.stringify(cm));
const s3 = sincronizar(cf2, cf1, s2.cart, '2026-11-11'); const h3 = s3.cart.historico_mensal['2026-11'];
ok('desfazer o aporte tira o ativo novo e as cotas', !('vwra11' in h3.ativos.etfs) && !s3.cart.custo_medio.ativos.vwra11 && h3.ativos.renda_fixa.tesouro_prefixado_2029 === 3900);
const cf4 = novoAporte(cf1, { ativo: 'tesouro_prefixado_2029', nome: 'Tesouro prefixado 2029', valor: 100, dia: 14 }, '2026-11-11', 3);
const s4 = sincronizar(cf1, cf4, s1.cart, '2026-11-11');
const so2 = { ...cf4, ajustesCaixa: cf4.ajustesCaixa.slice(1) };
const s5 = sincronizar(cf4, so2, s4.cart, '2026-11-11'); const h5 = s5.cart.historico_mensal['2026-11'];
ok('segundo aporte soma; desfazer só o primeiro deixa o ativo com o segundo', s4.cart.historico_mensal['2026-11'].ativos.renda_fixa.tesouro_prefixado_2029 === 4000 && h5.ativos.renda_fixa.tesouro_prefixado_2029 === 100, JSON.stringify(h5.ativos.renda_fixa));
ok('caixa: o aporte sai do caixa e guarda a classe', cf1.ajustesCaixa[0].valor === -3900 && cf1.ajustesCaixa[0].classe === 'renda_fixa');
console.log(`${n - f}/${n}`); process.exit(f ? 1 : 0);
