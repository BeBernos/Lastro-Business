// v9.29 — o que o Bruno pediu depois de ver a 9.28: abertura só com a digital, barra alinhada com "Carteira",
// "Tudo do painel" sem repetir as telas novas e no desenho novo, e a folha "Levar para o Claude" no lugar. Roda sem dados reais.
import fs from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { htmlAberturaV10, htmlNavV10 } = await import('../../app/v10.js');
const { tudoV10, LEITURAS_V10 } = await import('../../app/telas.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };

const a = htmlAberturaV10({ agora: new Date('2026-11-15T21:00:00-03:00') });
confere('abertura: só a marca da digital, sem "Toque para abrir"', /class="abertura-dica"><svg/.test(a) && !/Toque para abrir/i.test(a), a.match(/abertura-dica[\s\S]{0,80}/)?.[0]);
const nav = htmlNavV10('inicio', { lancar: true });
confere('barra: "Carteira" no lugar de "Investimentos"', /<span>Carteira<\/span>/.test(nav) && !/Investimentos/.test(nav));

// Tudo do painel: as peças do app que as telas novas mostram ficam de fora
const semDuplicar = { mes: ['mes/geral', 'mes/agenda', 'mes/meses'], carteira: ['carteira/visao'], analises: ['analises/saude', 'analises/conferir'] };
confere('Tudo: sem destaques, botões, metas, nota e conferência repetidos', Object.entries(semDuplicar).every(([aba, ks]) => ks.every(k => {
  const g = LEITURAS_V10[aba].find(x => x[1] === k); return Array.isArray(g[2]) && g[2].length === 0;
})));

const blocos = {
  'mes/contas': [{ titulo: 'Resumo', html: '<div class="pn-callout tom-info"><span class="pn-h">Resumo</span><p>texto do aviso</p></div>' }],
  'analises/mercado': [{ titulo: 'Por ativo', html: '<ul><li><p class="mercado-acao">Ação</p></li></ul>' }],
};
const app = () => ['<section class="cartao contas-acoes"><h2>Contas do mês</h2><button>+ Entrada</button></section><section class="cartao"><div class="cartao-topo"><h2>Entradas</h2><b>+R$ 10</b></div><p>x</p></section><section class="cartao"><div class="cartao-topo"><h2>Saídas</h2><b>−R$ 5</b></div><p>y</p></section>'];
const t = tudoV10('mes', [['Contas do mês', 'mes/contas', app, []], ['Mercado', 'analises/mercado', [], []]], k => blocos[k] || [], new Set(), []);
const titulos = [...t.matchAll(/<summary>[\s\S]*?<b>([^<]*)<\/b>/g)].map(x => x[1]);
confere('Tudo: contas do mês viram uma linha por cartão, sem os botões de lançar', titulos.includes('Entradas') && titulos.includes('Saídas') && !t.includes('+ Entrada'), titulos.join());
confere('Tudo: o mercado por ativo (já no carrossel das Análises) sai', !t.includes('mercado-acao') && !titulos.includes('Por ativo'), titulos.join());
confere('Tudo: aberto, o aviso não repete o título da linha', !/class="pn-h">Resumo/.test(t) && t.includes('texto do aviso'));

const anos = { 'carteira/futuro': [{ titulo: 'Ano a ano', html: '<section class="cartao"><details class="dobra pn-dobra"><summary>2029</summary>a</details><details class="dobra pn-dobra"><summary>2030</summary>b</details></section>' }, { titulo: 'Um só', html: '<section class="cartao"><details class="dobra pn-dobra"><summary>Como</summary>c</details></section>' }] };
const tf = tudoV10('carteira', [['Evolução', 'carteira/futuro', [], []]], k => anos[k] || [], new Set(), []);
confere('Tudo: várias dobras (ano a ano) ficam fechadas e tocáveis; dobra única já abre', (tf.match(/<details data-varias class/g) || []).length === 2 && /<details data-unica open class/.test(tf), tf.match(/<details[^>]*>/g)?.join(' '));

const css = fs.readFileSync(new URL('../../app/v10.css', import.meta.url), 'utf8');
confere('Tudo: sem o recuo de 50px', !/\.tudo-corpo \{ margin-left: 50px/.test(css));
confere('o "próximo passo" não estraga o texto da folha "Levar para o Claude"', !/^html\.v10 \.passo-txt/m.test(css) && /#folha \.passo-txt \{ display: block/.test(css));

console.log(`v9.29 ajustes do Bruno: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
