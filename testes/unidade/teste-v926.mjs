// v9.26 — redesenho "Carteira de cartões": componentes puros (app/carvao.js). Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const cv = await import('../../app/carvao.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };

confere('códigos dos ativos', [['XPML11 Shopping', 'XPML11'], ['Tesouro Selic', 'SELIC'], ['Tesouro IPCA+ 2035', 'IPCA+35'], ['CDB Banco Inter', 'CDB'], ['Bitcoin', 'BTC'], ['Itaú Index Gold', 'OURO'], ['Fundo Cambial Dólar', 'USD']]
  .every(([n, c]) => cv.codigoAtivo(n) === c), ['XPML11 Shopping', 'Tesouro Selic', 'Tesouro IPCA+ 2035', 'CDB Banco Inter', 'Bitcoin', 'Itaú Index Gold', 'Fundo Cambial Dólar'].map(cv.codigoAtivo).join());

const c1 = cv.cartaoCv({ codigo: 'SELIC', nome: 'Tesouro Selic', valor: 'R$ 42.000', destaque: true, attr: 'data-ativo-abrir="selic"' });
confere('cartão com toque é botão e o destaque acende', /^<button type="button" class="cartao-cv brasa" data-ativo-abrir="selic"/.test(c1), c1.slice(0, 120));
const c2 = cv.cartaoCv({ codigo: 'IPCA+35', valor: 'R$ 31.250' });
confere('cartão sem toque (Rafael) é só leitura', c2.startsWith('<div') && !c2.includes('data-'), c2.slice(0, 80));
confere('carrossel é uma lista com rótulo', /role="list" aria-label="Seus ativos"/.test(cv.carrosselCv([c1, c2], 'Seus ativos')) && cv.carrosselCv([], 'x') === '');

const b = cv.barrasAlvoCv([{ rotulo: 'Renda fixa', valor: '44%', atual: 44, alvo: 30 }, { rotulo: 'Dólar', valor: '13%', atual: 13, alvo: 20, tom: 'atencao' }]);
confere('barras: o maior vira 90% e o alvo é um traço', /width:90\.0%/.test(b) && /left:61\.4%/.test(b) && /class="tom-atencao"/.test(b), b.match(/(width|left):[\d.]+%/g)?.join());
confere('barras sem alvo não desenham traço', !cv.barrasAlvoCv([{ rotulo: 'Mercado', valor: 'R$ 300', atual: 300, alvo: null }]).includes('<em'));

const l = cv.linhaCv({ titulo: 'Luz', sub: 'dia 20', valor: 'R$ 200', attr: 'data-conta="despesasFixas|luz"', acao: { rotulo: 'Paguei', attr: 'data-pagar="despesasFixas|luz"' } });
confere('linha com toque e ação separados', /class="li-corpo" data-conta="despesasFixas\|luz"/.test(l) && /class="li-acao" data-pagar="despesasFixas\|luz">Paguei/.test(l));
confere('linha só leitura sem botão', !cv.linhaCv({ titulo: 'Luz', valor: 'R$ 200' }).includes('<button'));
confere('variação desenhada: sobe âmbar, cai coral, sem glifo', /var-cv sobe/.test(cv.variacaoCv(1, '0,9%')) && /var-cv cai/.test(cv.variacaoCv(-2, '2%')) && !/[▲▼]/.test(cv.variacaoCv(1, 'x')) && cv.variacaoCv(null, 'x') === '');
confere('seção com âncora e contagem', cv.secaoCv('Seus ativos', { id: 'v10-carteira-ativos', contagem: 8 }) === '<div class="secao-cv" id="v10-carteira-ativos"><h2>Seus ativos<small>8</small></h2></div>');
confere('tudo do painel leva à leitura antiga', /data-tudo="cartao"/.test(cv.tudoDoPainelCv('cartao', 'O cartão')));
confere('textos escapados', !cv.linhaCv({ titulo: '<script>' }).includes('<script>'));

const pl = cv.barrasAlvoCv([{ rotulo: 'Caixa sem negativos', valor: '10/10', atual: 10, alvo: 10 }, { rotulo: 'Fixas', valor: '6/10', atual: 6, alvo: 10 }, { rotulo: 'Salário', valor: '20/20', atual: 20, alvo: 20 }], { porLinha: true });
confere('critérios na própria escala: cheio = 100%, 6/10 = 60%, sem traço', (pl.match(/width:100\.0%/g) || []).length === 2 && /width:60\.0%/.test(pl) && !pl.includes('<em'), pl.match(/width:[\d.]+%/g)?.join());
confere('barras numa linha só (compacto)', /class="barras-cv compacto"/.test(cv.barrasAlvoCv([{ rotulo: 'x', valor: '1%', atual: 1, alvo: 2 }], { compacto: true })));
confere('botões em grade 2×2', /class="acoes-cv grade2"/.test(cv.acoesCv([{ rotulo: 'a', attr: '' }], 'grade2')));
confere('ação redonda tem nome acessível', /aria-label="Paguei"/.test(cv.linhaCv({ titulo: 'Luz', acao: { rotulo: 'Paguei', attr: 'data-pagar="x"', icone: cv.CHECK } })));

const { numerosDoTopo, htmlTopoCarvao } = await import('../../app/v10.js');
// v11.3: a nota de saúde saiu; o Plano mostra os passos feitos — um número que não é dinheiro
const plano = numerosDoTopo('analises', { c: {} }, { periodo: '2026-11' }, { plano_acao: { passos: [{ status: 'CONCLUIDO', quando: '2026-11-10' }, { status: 'PENDENTE', quando: '2026-11-30' }] } }, new Date('2026-11-14T21:00:00-03:00'));
confere('Plano: os passos feitos no topo (não é dinheiro)', plano.valor === null && plano.numeroTexto === '1' && plano.numeroSufixo === ' de 2', JSON.stringify(plano));
const th = htmlTopoCarvao(plano);
confere('topo desenha o número sem R$', /class="topo-num num">1<span class="cent"> de 2/.test(th) && !th.includes('R$'), th.slice(0, 400));
confere('sem plano: só o título', numerosDoTopo('analises', { c: {} }, { periodo: '2026-11' }, null, new Date()).numeroTexto === '');

console.log(`v9.26 componentes Carteira de cartões: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
