// v9.11 — seletor de mês: quais meses aparecem, mês fechado, projeção (conta que se repete tocável) e fatura do mês
import { mesesDoSeletor, seletorMes, telaDoMes } from '../../app/telas.js';
let n = 0, f = 0; const ok = (nome, c, x = '') => { n++; if (!c) f++; console.log((c ? 'PASSA ' : 'FALHA ') + nome + (x ? ' — ' + x : '')); };
const dados = {
  periodo: '2026-11', despesasFixas: [{ id: 'fix-aluguel', descricao: 'Aluguel', valor: 2000, dia: 7 }], receitas: [], obrigacoesCaixa: [],
  mesesFechados: [{ periodo: '2026-09', resultado: { saldo: 10 } }, { periodo: '2026-10', fechadoEm: '2026-10-31', itau: 5000, resultado: { receitaTotal: 9000, fixasTotal: 4000, variaveisTotal: 5100, saldo: -100 }, lancamentosApp: [{ data: '2026-10-22', descricao: 'Loja X', valor: 26.7, cat: 'Games' }] }],
  valoresConhecidos: [{ mes: '2026-12', lista: 'despesasFixas', id: 'fix-aluguel', valor: 2100 }],
};
const mes = (abertura, final, evs) => ({ label: 'x', abertura, final, min: abertura - 500, minDia: 10, evs });
const m = { p12: { meses: [mes(1000, 1500, [{ dia: 7, desc: 'Aluguel', valor: -2000 }, { dia: 30, desc: 'Salário', valor: 2500 }]), mes(1500, 1400, [{ dia: 7, desc: 'Aluguel', valor: -2000 }])] }, cf: { meses: [{ chave: '2026-12', ano: 2026, mes: 12, total: 700, ativas: [] }], recorrentes: [] } };
ok('meses: fechados, o atual e os da projeção', mesesDoSeletor(dados, m).join() === '2026-09,2026-10,2026-11,2026-12,2027-01');
const sel = seletorMes(dados, m, '2026-12');
ok('seletor no mês que vem: setas para nov e jan e "voltar"', /data-mes-ver="2026-11"/.test(sel) && /data-mes-ver="2027-01"/.test(sel) && /projeção/.test(sel) && /data-mes-ver=""/.test(sel));
ok('último mês: seta para frente desligada', /disabled aria-label="Próximo mês"/.test(seletorMes(dados, m, '2027-01')));
const fechado = telaDoMes('mes', '2026-10', m, dados, { github: true });
ok('mês fechado: sobra, totais e "Corrigir"', /Sobra de Outubro 2026/.test(fechado) && /data-mes-fechado="2026-10"/.test(fechado) && /9\.000,00/.test(fechado));
ok('Rafael (sem token) não vê "Corrigir"', !/data-mes-fechado/.test(telaDoMes('mes', '2026-10', m, dados)));
const fut = telaDoMes('mes', '2026-12', m, dados, { github: true, hoje: '2026-11-12' });
ok('projeção: sobra prevista e a conta que se repete abre o valor só daquele mês', /\+R\$\s?500/.test(fut) && /data-valor-futuro="despesasFixas\|fix-aluguel\|2026-12"/.test(fut) && /valor deste mês já informado/.test(fut), fut.match(/hero-valor[^<]*>([^<]*)/)?.[1]);
ok('projeção: lançar já com a data daquele mês', /data-nova-data="2026-12-12"/.test(fut));
ok('cartão no mês que vem: só a fatura daquele mês, sem gráfico de uma coluna', /fatura:2026-12/.test(telaDoMes('cartao', '2026-12', m, dados)) && !/hero-grafico/.test(telaDoMes('cartao', '2026-12', m, dados)));
ok('cartão no mês fechado: fatura e compras do app', /5\.000,00/.test(telaDoMes('cartao', '2026-10', m, dados)) && /Loja X/.test(telaDoMes('cartao', '2026-10', m, dados)));
console.log(`${n - f}/${n}`); process.exit(f ? 1 : 0);
