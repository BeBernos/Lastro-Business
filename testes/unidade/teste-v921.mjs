// v9.21 — repaginação, etapa 4: Investimentos no Carvão (estado da carteira no topo). Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { numerosDoTopo, saudeCarteira } = await import('../../app/v10.js');
const { gerarDemo } = await import('../../app/demo/gerar.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const aloc = (...pares) => ({ linhas: pares.map(([pct, alvo]) => ({ pct, alvo })) });
const cheia = { alvo: 40000, atual: 42000 };

const s1 = saudeCarteira(aloc([30, 30], [50, 52], [20, 18]), cheia);
confere('perto do alvo e reserva cheia: Saudável', s1.estado === 'Saudável' && s1.fiel === 98, JSON.stringify(s1));
confere('reserva incompleta segura em Atenção', saudeCarteira(aloc([30, 30], [70, 70]), { alvo: 40000, atual: 10000 }).estado === 'Atenção');
const s3 = saudeCarteira(aloc([10, 30], [70, 50], [20, 20]), cheia);
confere('20 pontos fora: Atenção', s3.estado === 'Atenção' && s3.fiel === 80, JSON.stringify(s3));
confere('longe do alvo: Fora do plano', saudeCarteira(aloc([0, 40], [90, 40], [10, 20]), cheia).estado === 'Fora do plano');
confere('sem estratégia: sem estado', saudeCarteira(null, cheia).estado === null && saudeCarteira(null, cheia).fiel === null);
confere('sem reserva configurada: só a estratégia conta', saudeCarteira(aloc([50, 50], [50, 50]), null).estado === 'Saudável');
confere('nunca abaixo de 0%', saudeCarteira(aloc([100, 0], [0, 100], [0, 100]), cheia).fiel === 0);

const agora = new Date('2026-11-14T21:00:00-03:00');
const { cf, cart } = gerarDemo('2026-11-14');
const m = { c: { saldo: 2282.56, diasRest: 16, itau: 2812, caixa: 2127 } };
const t = JSON.parse(JSON.stringify(numerosDoTopo('carteira', m, cf, cart, agora)).replace(/ /g, ' '));
confere('topo: o estado é uma pílula com ícone (v9.28)', t.eyebrow === 'Patrimônio investido' && t.pilulas.some(p => /^(Carteira saudável|Carteira pede atenção|Fora do plano)$/.test(p.texto) && p.tom), JSON.stringify(t.pilulas));
confere('topo: pílula da estratégia', t.pilulas.some(p => /^\d+% fiel ao alvo$/.test(p)), JSON.stringify(t.pilulas));
confere('topo: variação do mês e a posição (no subtítulo)', t.pilulas.some(p => /no mês$/.test(p.texto || '')) && /^valores de \d\d\/\d\d$/.test(t.sub), t.sub);
confere('topo sem NaN/undefined', !/NaN|undefined/.test(JSON.stringify(t)));

console.log(`v9.21 Investimentos no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
