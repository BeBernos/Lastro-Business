// v9.22 — repaginação, etapa 5: Mais com Caixa e Análises e uma linha de situação em cada item. Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { situacoesMais } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const agora = new Date('2026-11-14T21:00:00-03:00');
const dados = { periodo: '2026-11', contasFixas: [], receitas: [], analises: [{ titulo: 'a' }, { titulo: 'b' }] };
const ev = (desc, valor, status = 'previsto') => ({ desc, valor, status });
const m = { c: {}, tl: { porDia: [{ dia: 10, eventos: [ev('Luz', -200)] }, { dia: 18, eventos: [ev('Escola', -1500), ev('Salário', 9000)] }, { dia: 25, eventos: [ev('Aluguel', -3000), ev('Água', -90, 'confirmado')] }] } };

const s = situacoesMais(m, dados, null, agora);
confere('contas a pagar: quantas e a próxima', s.contas === '2 contas até o fim do mês · próxima 18/11', s.contas);
confere('análises do Claude: quantas', s.analises === '2 análises do Claude', s.analises);
confere('sem carteira: conferir explica', /carteira/i.test(s.conferir), s.conferir);
const nada = situacoesMais({ c: {}, tl: { porDia: [] } }, { periodo: '2026-11' }, null, agora);
confere('nada a pagar', nada.contas === 'Nada a pagar até o fim do mês', nada.contas);
confere('sem análises', nada.analises === 'Saúde, mercado e histórico', nada.analises);
const virou = situacoesMais(m, dados, null, new Date('2026-12-03T10:00:00-03:00'));
confere('mês virado: pede o fechamento', /fechar/i.test(virou.contas), virou.contas);
confere('nunca NaN/undefined', !/NaN|undefined/.test(JSON.stringify([s, nada, virou])));

console.log(`v9.22 Mais no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
