// v9.28 — gráficos no Carvão, telas enxutas e o "Tudo do painel" como índice. Roda sem dados reais.
import fs from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { areaCv, colunasCv } = await import('../../app/carvao.js');
const { tudoV10 } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };

const pts = [{ x: 1, y: 900, dica: 'dia 1' }, { x: 10, y: -350, dica: 'dia 10' }, { x: 15, y: 4248, dica: 'dia 15' }, { x: 30, y: 14968, dica: 'dia 30' }];
const a = areaCv(pts, { hojeX: 15, fim: true, rotulosX: [{ x: 1, texto: '1' }, { x: 30, texto: '30' }] });
confere('linha sem grade nem números no eixo Y', !/g-grade|text-anchor="end" class="g-eixo"/.test(a) && /class="gcv-linha"/.test(a));
confere('dia de hoje aceso e o fim rotulado', /gcv-halo/.test(a) && /gcv-ponto/.test(a) && a.includes('R$'));
confere('ponto mais baixo negativo em coral com o valor', /gcv-min/.test(a) && /gcv-val cai/.test(a));
confere('toques de sempre (dica e cursor)', (a.match(/class="g-toque"/g) || []).length === 4 && /g-cursor/.test(a) && /data-dica="dia 15"/.test(a));
confere('sem pontos suficientes: nada', areaCv([{ x: 1, y: 1 }]) === '');
const c = colunasCv([{ rotulo: 'Set', valor: 1200 }, { rotulo: 'Out', valor: -300 }, { rotulo: 'Nov', valor: 800 }]);
confere('colunas arredondadas, negativa em coral, valor em cima', (c.match(/class="gcv-col/g) || []).length === 3 && /gcv-col neg/.test(c) && /rx="/.test(c) && /gcv-val cai/.test(c));

const blocos = { 'cartao/fatura': [{ titulo: 'Projeção de fechamento', html: '<section class="cartao"><div class="cartao-topo"><h2>Projeção de fechamento</h2></div><p class="cartao-sub">4 jeitos de olhar</p><div class="pn-tab">x</div></section>' },
  { html: '<details class="dobra" data-chave="bloco:x"><summary><div><h2>Se a fatura fechar</h2><p class="cartao-sub">Toque para abrir</p></div></summary> <section class="cartao"><h2>Se a fatura fechar</h2><p>conteúdo</p></section></details>' },
  { explicacao: true, titulo: 'Como ler', corpo: '<p>explica</p>' }], 'cartao/gastos': [] };
const t = tudoV10('cartao', [['', 'cartao/fatura', [], []], ['Por categoria', 'cartao/gastos', [], []]], k => blocos[k] || [], new Set(), []);
// v10.1: o índice virou assuntos (F + G) — um quadradinho por assunto com blocos, os blocos já abertos
confere('assuntos com contagem e um quadradinho cada', /<h2>Fatura<small>1<\/small><\/h2>/.test(t) && /<h2>Fechamento<small>1<\/small><\/h2>/.test(t) && (t.match(/class="assunto-cv"/g) || []).length === 2, t.slice(0, 300));
confere('um bloco aberto por bloco do painel, com o resumo', (t.match(/class="tudo-bloco"/g) || []).length === 2 && t.includes('4 jeitos de olhar'));
confere('bloco recolhido perde a dobra de dentro e o "Toque para abrir"', !/Toque para abrir/.test(t) && !/<details class="dobra"/.test(t), t);
confere('grupo vazio some; as explicações vão para "Entenda"', !t.includes('Gastos') && /<h2>Entenda<small>1<\/small>/.test(t));

const css = fs.readFileSync(new URL('../../app/v10.css', import.meta.url), 'utf8');
confere('movimento dos gráficos só com animações permitidas', /@media \(prefers-reduced-motion: no-preference\)[\s\S]*v10-traco/.test(css));

console.log(`v9.28 gráficos, telas enxutas e índice: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
