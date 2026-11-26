// v9.18 — a casca (topo e barra) e as regras do CSS; desde a v11.5 a da Meia-noite, a única interface. Roda sem dados
// reais (família da demonstração).
import { readFileSync } from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { gerarDemo } = await import('../../app/demo/gerar.js');
const { DESTINOS, htmlNavV10, htmlTopoCarvao, numerosDoTopo } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const agora = new Date('2026-11-14T21:00:00-03:00');
const { cf, cart } = gerarDemo('2026-11-14');
const norm = o => JSON.parse(JSON.stringify(o).replace(/ /g, ' ')); // o formatador usa espaço que não quebra
const m = { c: { saldo: 2282.56, diasRest: 16, itau: 2812, caixa: 2127 } };

confere('quatro destinos: Hoje, Mês, Patrimônio, Plano (v11.3)', DESTINOS.map(d => d.id).join() === 'hoje,mes,patrimonio,plano', DESTINOS.map(d => d.id).join());
const h = norm(numerosDoTopo('inicio', m, cf, cart, agora));
confere('Hoje: o "Livre de verdade" (o que cabe no cartão) e a gaveta', /^Livre para gastar/.test(h.eyebrow) && h.valor === 2788 && h.detalhe === 'det-livre', JSON.stringify(h));
confere('Hoje: saudação pela hora e mês', /^Boa noite/.test(h.titulo) && /nov/.test(h.sub) && /16 dias/.test(h.sub), JSON.stringify(h));
const virado = numerosDoTopo('inicio', m, cf, cart, new Date('2026-12-02T10:00:00-03:00'));
confere('mês virado: "Falta fechar" e sem valor', /^Falta fechar/.test(virado.eyebrow) && virado.valor === null, JSON.stringify(virado));
const semCart = numerosDoTopo('carteira', m, cf, null, agora);
confere('carteira não carregada: aviso e nada de NaN/undefined', semCart.eyebrow === 'Carteira ainda não carregada' && semCart.valor === null && !/NaN|undefined/.test(JSON.stringify(semCart)));
const ct = norm(numerosDoTopo('carteira', m, cf, cart, agora));
confere('Patrimônio: valor, título e variação do mês (seta desenhada, v9.28)', ct.valor > 100000 && ct.titulo === 'Patrimônio' && ct.pilulas.some(p => p.seta && /^R\$ .* no mês$/.test(p.texto)), JSON.stringify(ct));
const cc = norm(numerosDoTopo('cartao', m, cf, cart, agora));
confere('Cartão (o Tudo do painel dele): fatura, quanto cabe e vencimento', cc.valor === 2812 && cc.pilulas.includes('Cabem R$ 2.788,00') && cc.pilulas.includes('Vence 07/12'), JSON.stringify(cc));
confere('Plano: sem R$ no topo', numerosDoTopo('analises', m, cf, cart, agora).valor === null);

confere('barra do Rafael sem ＋; o Mais (⋯) está no topo', !/appLancar/.test(htmlNavV10('inicio', { lancar: false })) && /id="appMenu"/.test(htmlTopoCarvao({ titulo: 'x', pilulas: [] })) && !/id="appMenu"/.test(htmlNavV10('inicio', { lancar: false })));
confere('barra de quem publica com ＋', /id="appLancar"/.test(htmlNavV10('inicio', { lancar: true })));
confere('barra marca o destino atual', /data-aba="carteira"[^>]*aria-current="page"|aria-current="page"[^>]*data-aba="carteira"/.test(htmlNavV10('carteira', { lancar: true })));
const topo = htmlTopoCarvao(h);
confere('topo: número com centavos menores', /class="cent"/.test(topo) && /topo-num/.test(topo) && /appBusca/.test(topo) && /data-olho/.test(topo));
confere('olho ligado: o número sai sem centavos', !/class="cent"/.test(htmlTopoCarvao(h, { esconder: true })));
confere('topo sem valor não mostra R$', !/R\$/.test(htmlTopoCarvao(semCart).replace(/<[^>]+>/g, '')));

// ---------- o CSS: as partes que nasceram no Carvão e na Meia-noite (estilo.css, v11.5) ----------
const todo = readFileSync(new URL('../../app/estilo.css', import.meta.url), 'utf8');
const ini = todo.indexOf('/* ===================== o sistema de componentes'), fim = todo.indexOf('/* ===================== a base (era o <style>');
const css = ini > 0 && fim > ini ? todo.slice(ini, fim) : '';
confere('estilo.css com as partes da Meia-noite', css.length > 0 && /a Meia-noite \(v11/.test(css));
const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '');
const verdes = (semComentario.match(/#[0-9a-f]{6}\b/gi) || []).filter(c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return g > r + 20 && g > b + 10; });
confere('sem verde', css.length > 0 && !verdes.length && !/\bgreen\b|hsla?\(\s*1[0-6]\d/i.test(semComentario), verdes.join());
const pequenos = [...semComentario.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map(x => +x[1]).filter(px => px < 12);
confere('sem letra menor que 12 px', css.length > 0 && !pequenos.length, pequenos.join());
const fora = semComentario.replace(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\n\}/g, '');
const movendo = fora.match(/[^{}]*\{[^}]*(animation|transition)\s*:[^;]*\d+m?s[^}]*\}/g) || [];
confere('movimento só para quem não desligou animações', css.length > 0 && !movendo.length, movendo.slice(0, 2).join(' | ').slice(0, 300));
const seletores = [...fora.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(x => x[2].trim()).filter(Boolean).filter(s => !/^(from|to|\d+%)/.test(s));
const partes = s => s.replace(/\([^()]*\)/g, '()').split(','); // v9.25: vírgulas dentro de :is(...) não separam seletores
const soltos = seletores.filter(s => !partes(s).every(p => p.trim().startsWith('html.lastro')));
confere('toda regra começa com html.lastro', css.length > 0 && !soltos.length, soltos.slice(0, 3).join(' | '));

console.log(`v9.18 casca: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
