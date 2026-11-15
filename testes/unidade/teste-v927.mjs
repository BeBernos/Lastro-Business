// v9.27 — o que o Bruno pediu depois de ver a 9.26 no celular. Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { DESTINOS, htmlAberturaV10, htmlNavV10, htmlTopoCarvao } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };

const a = htmlAberturaV10({ agora: new Date('2026-11-15T21:00:00-03:00') });
confere('abertura: a tela inteira é o botão da digital (marca e saudação dentro)', /<button type="button" class="abertura-toque" id="destravar"[^>]*>[\s\S]*anel-v10[\s\S]*Boa noite[\s\S]*<\/button>/.test(a), a.slice(0, 300));
confere('abertura: sem o botão separado da digital', !a.includes('abertura-digital'));
confere('abertura: a senha da família continua', a.includes('id="usarSenha"') && a.includes('id="formTrava"'));
const s = htmlAberturaV10({ soSenha: true });
confere('só senha: sem botão de digital, formulário aberto', !s.includes('id="destravar"') && !/id="formTrava" hidden/.test(s));

const nav = htmlNavV10('inicio', { lancar: true });
const ordem = [...nav.matchAll(/data-aba="(\w+)"|id="appLancar"/g)].map(x => x[1] || '+').join(',');
confere('barra por prioridade: Hoje, Caixa, ＋, Cartão, Investimentos', ordem === 'inicio,mes,+,cartao,carteira', ordem);
confere('Caixa é um destino', DESTINOS.some(d => d.aba === 'mes' && d.nome === 'Caixa'));
confere('o ⋯ (menu) está no topo', /id="appMenu"/.test(htmlTopoCarvao({ titulo: 'x', pilulas: [] })) && !nav.includes('appMenu'));

console.log(`v9.27 ajustes do Bruno: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
