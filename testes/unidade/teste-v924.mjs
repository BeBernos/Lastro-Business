// v9.24 — repaginação, etapa 5 (parte 2): Caixa e Análises numa leitura só; links levam à seção certa. Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { leituraV10, LEITURAS_V10 } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const blocos = { 'mes/agenda': [{ html: '<section>agenda</section>' }, { html: '<p>como ler</p>', explicacao: true, titulo: 'Como ler' }], 'mes/meses': [] };
const lugar = k => blocos[k] || [];

const h = leituraV10([['', 'mes/geral', ['<section>saldo</section>']], ['Contas a pagar', 'mes/agenda', []], ['Próximos 12 meses', 'mes/meses', [], []]], lugar, new Set(), 'nada');
confere('cada seção com âncora para os links', h.includes('<h3 class="secao-v10" id="v10-mes-agenda">Contas a pagar</h3>'), h);
confere('seção vazia some com o título', !h.includes('Próximos 12 meses'));
confere('explicações vão para o Entenda do fim', h.indexOf('Como ler') > h.indexOf('agenda</section>') && /Entenda/.test(h));
confere('tudo vazio: a mensagem', leituraV10([['', 'x/y']], () => [], new Set(), 'Nada aqui.').includes('Nada aqui.'));

const subsDe = aba => LEITURAS_V10[aba].map(g => g[1].split('/')[1]);
confere('Caixa cobre as 4 sub-abas', ['geral', 'agenda', 'contas', 'meses'].every(s => subsDe('mes').includes(s)), subsDe('mes').join());
confere('Análises cobre as 4 sub-abas', ['saude', 'mercado', 'historico', 'conferir'].every(s => subsDe('analises').includes(s)), subsDe('analises').join());
confere('Cartão e Investimentos também', ['fatura', 'gastos', 'parcelas'].every(s => subsDe('cartao').includes(s)) && ['visao', 'aloc', 'ativos', 'renda', 'futuro'].every(s => subsDe('carteira').includes(s)));

console.log(`v9.24 Caixa e Análises no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
