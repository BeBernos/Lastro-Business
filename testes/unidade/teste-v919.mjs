// v9.19 — repaginação, etapa 2: o Hoje no Carvão (quatro blocos + faixas de ação). Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { faixasDoHoje, htmlHojeV10 } = await import('../../app/v10.js');
const { linhasDoHoje } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const c = { saldo: 2282.56, diasRest: 16, itau: 2812, caixa: 2127 };
const base = { c, limite: 5600, venceDia: 7, mesProx: 12, investido: { total: 182620, mercado: 1400 }, faixas: [], github: true };

const h = htmlHojeV10(base);
confere('quatro blocos com os destinos', /data-aba="cartao"[\s\S]*data-aba="cartao"[\s\S]*data-ir-aba="mes\/geral"[\s\S]*data-aba="carteira"/.test(h), h.slice(0, 300));
confere('textos dos blocos', ['Fatura', 'Cabe no cartão', 'No banco', 'Investido', 'vence 07/12'].every(t => h.includes(t)));
const semCart = htmlHojeV10({ ...base, investido: null });
confere('carteira não carregada: aviso e sem destino', semCart.includes('Carteira ainda não carregada') && !semCart.includes('data-aba="carteira"'));
confere('sem nada a fazer: nenhuma faixa', !/faixa-v10/.test(h));
const acao = { tom: 'bom', texto: 'Aporte do mês R$ 1.800', ir: 'carteira/visao', acao: { rotulo: 'Investir', attr: 'data-aporte-plano' } };
confere('com token: botão da ação', /data-aporte-plano/.test(htmlHojeV10({ ...base, faixas: [acao] })));
const rafael = htmlHojeV10({ ...base, faixas: [acao], github: false });
confere('Rafael: faixa sem botão que grava', /faixa-v10/.test(rafael) && !/data-aporte-plano/.test(rafael));
confere('sem NaN/undefined e sem verde', !/NaN|undefined|green|#0ca30c/.test(h + semCart + rafael));

const linhas = [
  { tom: 'info', texto: 'Metas', ir: 'carteira/visao' },
  { tom: 'atencao', texto: 'Orçamento perto', ir: 'cartao/gastos' },
  { tom: 'bom', texto: 'Aporte', ir: 'carteira/visao', acao: { rotulo: 'Investir', attr: 'data-aporte-plano' } },
  { tom: 'ruim', texto: 'Alerta forte', ir: 'analises/saude' },
  { tom: 'info', texto: 'Renda', ir: 'carteira/renda' },
];
const f = faixasDoHoje(linhas, []);
confere('no máximo 3 faixas, a mais urgente primeiro', f.length === 3 && f[0].tom === 'ruim' && f[1].tom === 'atencao' && f[2].acao, f.map(x => x.texto).join());
const comExtra = faixasDoHoje([{ tom: 'info', texto: 'Metas', ir: 'x' }], [{ tom: 'atencao', texto: 'Fechamento pronto', attr: 'data-fech-pronto' }]);
confere('extras entram e respeitam a urgência', comExtra[0].texto === 'Fechamento pronto' && comExtra.length === 2);
confere('sem linhas e sem extras: vazio', faixasDoHoje([], []).length === 0);

const ctx = { diaHoje: 14, dias: 30, mes: 11, mesPassou: false };
const ls = linhasDoHoje({ c, alertas: [{ tom: 'ruim', titulo: 'Caixa negativo dia 20' }] }, { periodo: '2026-11' }, null, ctx, { hoje: '2026-11-14', github: true });
confere('linhasDoHoje devolve as linhas ordenadas', Array.isArray(ls) && ls[0]?.tom === 'ruim' && /Caixa negativo/.test(ls[0].texto), JSON.stringify(ls).slice(0, 200));

console.log(`v9.19 Hoje no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
