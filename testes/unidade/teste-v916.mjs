// v9.16 — resumo da semana (domingo). Roda sem os painéis reais: usa a família fictícia da demonstração.
import { gerarDemo } from '../../app/demo/gerar.js';
import { gastoDoDia, resumoSemana } from '../../app/extrato.js';

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const somar = (iso, n) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

const hoje = '2026-11-15'; // domingo
const { cf } = gerarDemo(hoje);
const r = resumoSemana(cf, hoje);
const dias = ns => Math.round(ns.reduce((s, i) => s + gastoDoDia(cf, somar(hoje, -i)).total, 0) * 100) / 100;
const esperado = dias([0, 1, 2, 3, 4, 5, 6]);
confere('dia a dia + contas fixas = soma dos "gasto de hoje" dos 7 dias', Math.abs(r.total + r.fixas.total - esperado) < 0.01 && r.inicio === '2026-11-09' && !r.parcial, `${r.total} + ${r.fixas.total} × ${esperado}`);
confere('a demo tem conta fixa na semana e ela não entra no total do dia a dia', r.fixas.n > 0 && r.fixas.total > 0);
confere('semana anterior: só o dia a dia, dentro do mês', r.anterior && r.anterior.total <= dias([7, 8, 9, 10, 11, 12, 13]) + 0.01);
confere('categorias: no máximo 3, da maior para a menor', r.categorias.length <= 3 && r.categorias.every((c, i, a) => !i || a[i - 1].total >= c.total));
confere('categorias somam no máximo o total', r.categorias.reduce((s, c) => s + c.total, 0) <= r.total + 0.01);

const r3 = resumoSemana(gerarDemo('2026-11-03').cf, '2026-11-03');
confere('começo do mês: semana parcial desde o dia 1 e sem a anterior', r3.parcial && r3.inicio === '2026-11-01' && r3.anterior === null);

const proximas = [{ data: '2026-11-16', desc: 'Luz', valor: -200 }, { data: '2026-11-22', desc: 'Salário', valor: 5000 }, { data: '2026-11-23', desc: 'Depois', valor: -50 }, { data: '2026-11-15', desc: 'Hoje', valor: -10 }];
const rp = resumoSemana(cf, hoje, proximas);
confere('próximos 7 dias: só de amanhã até daqui a 7', rp.proximos.itens.map(p => p.desc).join() === 'Luz,Salário' && rp.proximos.saem === 200 && rp.proximos.entram === 5000);
confere('semana que vem atravessa o mês → avisa', resumoSemana(gerarDemo('2026-11-29').cf, '2026-11-29').proximos.ateFimDoMes === true && !rp.proximos.ateFimDoMes);

console.log(`v9.16 resumo da semana: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
