// v9.18 — repaginação, etapa 1: casca Carvão (topo e barra) e o CSS v10. Roda sem dados reais (família da demonstração).
import { readFileSync } from 'node:fs';
const mem = {}; // localStorage falso para a chave
globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const { gerarDemo } = await import('../../app/demo/gerar.js');
const { DESTINOS, htmlNavV10, htmlTopoCarvao, ligarV10, numerosDoTopo, v10Ligada } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const agora = new Date('2026-11-14T21:00:00-03:00');
const { cf, cart } = gerarDemo('2026-11-14');
const norm = o => JSON.parse(JSON.stringify(o).replace(/ /g, ' ')); // o formatador usa espaço que não quebra
const m = { c: { saldo: 2282.56, diasRest: 16, itau: 2812, caixa: 2127 } };

confere('quatro destinos na ordem de prioridade (v9.27)', DESTINOS.map(d => d.id).join() === 'hoje,caixa,cartao,invest');
const h = norm(numerosDoTopo('inicio', m, cf, cart, agora));
confere('Hoje: dá para gastar, hoje e semana', h.valor === 2282.56 && h.pilulas.includes('Hoje R$ 143') && h.pilulas.includes('Semana R$ 999'), JSON.stringify(h));
confere('Hoje: saudação pela hora e mês', /^Boa noite/.test(h.titulo) && /nov/.test(h.sub) && /16 dias/.test(h.sub), JSON.stringify(h));
const virado = numerosDoTopo('inicio', m, cf, cart, new Date('2026-12-02T10:00:00-03:00'));
confere('mês virado: "Falta fechar" e sem valor', /^Falta fechar/.test(virado.eyebrow) && virado.valor === null, JSON.stringify(virado));
const semCart = numerosDoTopo('carteira', m, cf, null, agora);
confere('carteira não carregada: aviso e nada de NaN/undefined', semCart.eyebrow === 'Carteira ainda não carregada' && semCart.valor === null && !/NaN|undefined/.test(JSON.stringify(semCart)));
const ct = norm(numerosDoTopo('carteira', m, cf, cart, agora));
confere('Investimentos: patrimônio, título e variação do mês (seta desenhada, v9.28)', ct.valor > 100000 && ct.titulo === 'Carteira' && ct.pilulas.some(p => p.seta && /^R\$ .* no mês$/.test(p.texto)), JSON.stringify(ct));
const cc = norm(numerosDoTopo('cartao', m, cf, cart, agora));
confere('Cartão: fatura, quanto cabe e vencimento', cc.valor === 2812 && cc.pilulas.includes(`Cabem R$ ${(5600 - 2812).toLocaleString('pt-BR')}`) && cc.pilulas.includes('Vence 07/12'), JSON.stringify(cc));
confere('outras abas: só o título', numerosDoTopo('analises', m, cf, cart, agora).valor === null);

confere('barra do Rafael sem ＋; o Mais (⋯) está no topo', !/appLancar/.test(htmlNavV10('inicio', { lancar: false })) && /id="appMenu"/.test(htmlTopoCarvao({ titulo: 'x', pilulas: [] })) && !/id="appMenu"/.test(htmlNavV10('inicio', { lancar: false })));
confere('barra de quem publica com ＋', /id="appLancar"/.test(htmlNavV10('inicio', { lancar: true })));
confere('barra marca o destino atual', /data-aba="carteira"[^>]*aria-current="page"|aria-current="page"[^>]*data-aba="carteira"/.test(htmlNavV10('carteira', { lancar: true })));
const topo = htmlTopoCarvao(h);
confere('topo: número com centavos menores', /class="cent"/.test(topo) && /topo-num/.test(topo) && /appBusca/.test(topo) && /data-olho/.test(topo));
confere('olho ligado: o número sai sem centavos', !/class="cent"/.test(htmlTopoCarvao(h, { esconder: true })));
confere('topo sem valor não mostra R$', !/R\$/.test(htmlTopoCarvao(semCart).replace(/<[^>]+>/g, '')));

confere('chave desligada por padrão', v10Ligada() === false);
ligarV10(true); confere('ligar a chave', v10Ligada() === true && mem['lastro-v10'] === '1');
ligarV10(false); confere('desligar a chave', v10Ligada() === false);

// ---------- o CSS da v10 (Task 2) ----------
let css = '';
try { css = readFileSync(new URL('../../app/v10.css', import.meta.url), 'utf8'); } catch { /* ainda não existe */ }
const semComentario = css.replace(/\/\*[\s\S]*?\*\//g, '');
const verdes = (semComentario.match(/#[0-9a-f]{6}\b/gi) || []).filter(c => { const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); return g > r + 20 && g > b + 10; });
confere('v10.css existe', css.length > 0);
confere('v10.css sem verde', css.length > 0 && !verdes.length && !/\bgreen\b|hsla?\(\s*1[0-6]\d/i.test(semComentario), verdes.join());
const pequenos = [...semComentario.matchAll(/font(?:-size)?:[^;]*?(\d+(?:\.\d+)?)px/g)].map(x => +x[1]).filter(px => px < 12);
confere('v10.css sem letra menor que 12 px', css.length > 0 && !pequenos.length, pequenos.join());
const fora = semComentario.replace(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{[\s\S]*?\n\}/g, '');
confere('movimento só para quem não desligou animações', css.length > 0 && !/(animation|transition)\s*:[^;]*\d+m?s/.test(fora));
const seletores = [...fora.matchAll(/(^|\})\s*([^{}@]+)\{/g)].map(x => x[2].trim()).filter(Boolean);
const partes = s => s.replace(/\([^()]*\)/g, '()').split(','); // v9.25: vírgulas dentro de :is(...) não separam seletores
confere('toda regra começa com html.v10', css.length > 0 && seletores.every(s => partes(s).every(p => p.trim().startsWith('html.v10'))), seletores.filter(s => !partes(s).every(p => p.trim().startsWith('html.v10'))).slice(0, 3).join(' | '));

console.log(`v9.18 casca Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
