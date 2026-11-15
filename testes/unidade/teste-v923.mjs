// v9.23 — repaginação, etapa 6: a abertura (marca acesa, anéis que acendem, digital embaixo). Roda sem dados reais.
import fs from 'node:fs';
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { htmlAberturaV10 } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const noite = new Date('2026-11-14T21:00:00-03:00'), manha = new Date('2026-11-15T08:00:00-03:00');
const extra = '<input id="usuarioX" hidden>';

const d = htmlAberturaV10({ soSenha: false, agora: noite, usuario: extra });
confere('saudação pela hora de Brasília (madrugada = Boa noite)', htmlAberturaV10({ agora: new Date('2026-11-15T02:30:00-03:00') }).includes('Boa noite') && d.includes('Boa noite') && htmlAberturaV10({ soSenha: false, agora: manha, usuario: '' }).includes('Bom dia'));
confere('três anéis em volta da marca', (d.match(/class="anel-v10 a\d"/g) || []).length === 3 && d.includes('icons/logo.svg'));
confere('digital: botão de destrancar e o link da senha', d.includes('id="destravar"') && d.includes('id="usarSenha"') && /id="formTrava" hidden/.test(d));
confere('campos que o app já usa', ['id="senhaTrava"', 'id="erroTrava"', 'autocomplete="current-password"', 'usuarioX'].every(t => d.includes(t)));
const s = htmlAberturaV10({ soSenha: true, agora: noite, usuario: '' });
confere('só senha: formulário aberto, sem digital', !s.includes('id="destravar"') && !s.includes('id="usarSenha"') && !/id="formTrava" hidden/.test(s));
const css = fs.readFileSync(new URL('../../app/v10.css', import.meta.url), 'utf8');
confere('anéis só acendem com movimento permitido', /@media \(prefers-reduced-motion: no-preference\)[\s\S]*anel-v10/.test(css));

console.log(`v9.23 abertura no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
