// v9.20 — repaginação, etapa 3: o Cartão no Carvão (composição + ritmo). Roda sem dados reais.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const { htmlComposicaoV10 } = await import('../../app/v10.js');

let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASSA', nome); } else { falhas++; console.log('FALHA', nome, extra); } };
const nb = s => s.replace(/ /g, ' ');
const c = { itau: 3000, parcelas: 1000, agendado: 500, gastoLivre: 1500, itauProjetado: 4200, diaEstouro: 0, limiteJaRompido: false, margemAteLimite: 2600, tetoPorDia: 162.5, diasRest: 16 };

const h = nb(htmlComposicaoV10({ c, limite: 5600 }));
confere('três partes; o que cabe só na barra (v9.28: o topo já diz)', ['Parcelas', 'Fixos', 'Gastos do mês'].every(t => h.includes(t)) && !h.includes('Ainda cabe') && /class="livre"/.test(h), h.slice(0, 400));
confere('larguras proporcionais ao limite', /width:17\.9%/.test(h) && /width:8\.9%/.test(h) && /width:26\.8%/.test(h) && /width:46\.4%/.test(h), h.match(/width:[\d.]+%/g)?.join());
confere('ritmo dentro do limite', h.includes('No ritmo atual fecha em R$ 4.200') && !h.includes('passa do limite'));
confere('cabe por dia', h.includes('R$ 162,50 por dia'));

const estoura = nb(htmlComposicaoV10({ c: { ...c, itauProjetado: 6500, diaEstouro: 24 }, limite: 5600 }));
confere('ritmo passa do limite: aviso coral com o dia', /class="[^"]*cai[^"]*"[^>]*>[^<]*No ritmo atual fecha em R\$ 6\.500/.test(estoura) && estoura.includes('por volta do dia 24'), estoura.slice(-500));

const passou = nb(htmlComposicaoV10({ c: { ...c, itau: 6000, gastoLivre: 4500, limiteJaRompido: true, margemAteLimite: -400, itauProjetado: 7000 }, limite: 5600 }));
confere('passou do limite: acima do limite em coral', /cai[^>]*>[\s\S]*Acima do limite[\s\S]*R\$ 400/.test(passou) && !passou.includes('Ainda cabe'), passou.slice(0, 600));
confere('passou do limite: marca na barra', passou.includes('marca-v10'));

const sem = nb(htmlComposicaoV10({ c, limite: 0 }));
confere('sem limite: sem "cabe" nem ritmo, sem NaN', !sem.includes('Ainda cabe') && !sem.includes('ritmo') && !/NaN|undefined|Infinity/.test(sem), sem);
confere('sem limite: partes proporcionais à fatura', /width:33\.3%/.test(sem) && /width:50%/.test(sem), sem.match(/width:[\d.]+%/g)?.join());
confere('vazio sem fatura e sem limite', htmlComposicaoV10({ c: { itau: 0 }, limite: 0 }) === '');
confere('sem verde', !/green|#0ca30c|class="[^"]*bom/.test(h + estoura + passou + sem));

console.log(`v9.20 Cartão no Carvão: ${ok} ok, ${falhas} falhas`);
process.exitCode = falhas ? 1 : 0;
