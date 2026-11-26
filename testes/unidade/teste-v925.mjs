// v9.25 — o sistema de componentes para todo o conteúdo + o topo do Mês (era o Caixa). Roda sem dados reais.
import fs from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { numerosDoTopo } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const nb = o => JSON.parse(JSON.stringify(o).replace(/ /g, ' '));
const agora = new Date('2026-11-14T21:00:00-03:00');
const dados = { periodo: '2026-11', calendario: {}, regras: {} };
// um ponto por dia, como no motor: até o dia 13 R$ 900, hoje (14) R$ 4.247,97, dia 20 o mínimo, dia 30 o salário
const tl = { porDia: Array.from({ length: 30 }, (_, i) => ({ dia: i + 1, saldo: i < 13 ? 900 : i === 19 ? 3100 : i === 29 ? 14968 : 4247.97 })) };
const t = nb(numerosDoTopo('mes', { c: { caixa: 4000, diasRest: 16 }, tl }, dados, null, agora));
confere('Mês: o saldo de hoje pela agenda (v11.1), não o último lançado', t.eyebrow === 'Na conta hoje' && t.valor === 4247.97, JSON.stringify(t));
confere('Caixa: mínimo daqui em diante e como fecha', t.pilulas.includes('Mínimo R$ 3.100,00 · dia 20') && t.pilulas.includes('Fecha com R$ 14.968,00'), t.pilulas.join(' | '));
const neg = nb(numerosDoTopo('mes', { c: { caixa: 100 }, tl: { porDia: [{ dia: 14, saldo: 100 }, { dia: 22, saldo: -350 }, { dia: 30, saldo: 200 }] } }, dados, null, agora));
confere('Caixa: dia no vermelho vira "Pior momento"', neg.pilulas.some(p => /^Pior momento [−-]R\$ 350,00 · dia 22$/.test(p)), neg.pilulas.join(' | '));
const sem = numerosDoTopo('mes', { c: {} }, dados, null, agora);
confere('Caixa sem motor: só o título, sem NaN', sem.valor === null && !/NaN|undefined/.test(JSON.stringify(sem)), JSON.stringify(sem));

const css = fs.readFileSync(new URL('../../app/estilo.css', import.meta.url), 'utf8');
confere('sem cartão dentro de cartão', /\.cartao :is\(\.cartao, \.pn-solto\) \{ background: none; border: 0/.test(css));
confere('barras na cor de dado da Meia-noite (azul, v11.0)', /--dado: var\(--cv-ambar\)/.test(css) && /--cv-ambar: #7C9CFF/.test(css));
confere('botões em pílula e o principal em brasa', /\.btn\.prim \{ background: var\(--v10-brasa\)/.test(css));
confere('dobra sem "Toque para abrir"', /details\.dobra > summary \.cartao-sub \{ display: none; \}/.test(css));

console.log(`v9.25 sistema Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
