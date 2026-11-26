// v9.19 — as linhas do "Hoje" (linhasDoHoje, telas.js), que o Hoje da Meia-noite ainda usa. O desenho do Carvão (quatro
// blocos + faixas) saiu na v11.5. Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { linhasDoHoje } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const c = { saldo: 2282.56, diasRest: 16, itau: 2812, caixa: 2127 };

const ctx = { diaHoje: 14, dias: 30, mes: 11, mesPassou: false };
const ls = linhasDoHoje({ c, alertas: [{ tom: 'ruim', titulo: 'Caixa negativo dia 20' }] }, { periodo: '2026-11' }, null, ctx, { hoje: '2026-11-14', github: true });
confere('linhasDoHoje devolve as linhas ordenadas', Array.isArray(ls) && ls[0]?.tom === 'ruim' && /Caixa negativo/.test(ls[0].texto), JSON.stringify(ls).slice(0, 200));

console.log(`v9.19 linhas do Hoje: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
