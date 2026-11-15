// v9.20.1 — categorias com cor de novo (sem verde) e o topo que piscava ao rolar. Roda sem dados reais.
import fs from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { CATEGORIAS: CATALOGO, CORES, iconeDe, semVerde } = await import('../../app/categorias.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const matiz = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return null;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const verde = hex => { const h = matiz(hex); return h != null && h >= 70 && h <= 185; };

confere('nenhuma cor do catálogo é verde', CATALOGO.every(c => !verde(c.cor)), CATALOGO.filter(c => verde(c.cor)).map(c => c.nome).join());
confere('a paleta de escolha não tem verde', CORES.every(c => !verde(c)), CORES.filter(verde).join());
confere('cor verde salva antes vira outra', ['#16a34a', '#0f766e', '#22c55e', '#3f6212'].every(c => !verde(semVerde(c))));
confere('cor que não é verde fica igual', semVerde('#2563eb') === '#2563eb' && semVerde('#dc2626') === '#dc2626');
confere('cor inválida não quebra', semVerde('xyz') === 'xyz' && semVerde(undefined) === undefined);
const h = iconeDe({ nome: 'Velha', cor: '#16a34a', icone: 'saude' });
confere('ícone de categoria salva com verde sai sem verde', !/#16a34a/.test(h) && /--cat:#/.test(h), h.slice(0, 80));

const { htmlTopoCarvao } = await import('../../app/v10.js');
const css = fs.readFileSync(new URL('../../app/v10.css', import.meta.url), 'utf8');
const t = htmlTopoCarvao({ titulo: 'Boa noite', sub: 'nov · 16 dias', eyebrow: 'Fatura até agora', valor: 2800, pilulas: [] });
confere('cabeçalho pequeno fora do topo (o overflow do topo o escondia)', t.indexOf('topo-mini') > t.indexOf('</header>') && t.includes('R$'), t.slice(-200));
confere('o topo não encolhe mais ao rolar (era o que fazia a página pular)', !/.compacto .topo-(carvao|num|eyebrow|pilulas)/.test(css) && !/topo-carvao {[^}]*sticky/.test(css));
confere('sem âmbar forçado nos ícones de categoria', !/.cat-ic { --cat/.test(css));
console.log(`v9.20.1: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
