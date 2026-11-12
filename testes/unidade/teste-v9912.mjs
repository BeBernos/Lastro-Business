// v9.9.12 — renda fixa no critério das lâminas (IR devolvido) e plano_acao na resposta pequena
import { rendimentoRendaFixa } from '../../app/estrategia.js';
import { juntarParcial } from '../../app/conciliar.js';
let n = 0, f = 0; const ok = (nome, c, x = '') => { n++; if (!c) f++; console.log((c ? 'PASSA ' : 'FALHA ') + nome + (x ? ' — ' + x : '')); };
// fundo que rendeu líquido 0,85 × o CDI do período (CDI de 1% em 10 dias úteis)
const cdi = Array.from({ length: 10 }, (_, i) => ({ data: `2026-10-${String(i + 10).padStart(2, '0')}`, valor: 0.0995 }));
const fator = cdi.reduce((x, d) => x * (1 + d.valor / 100), 1) - 1;
const cart = { historico_mensal: { '2026-09': { atualizado_em: '2026-10-01', ativos: { renda_fixa: { fundo_x: 10000 } } }, '2026-10': { atualizado_em: '2026-10-31', ativos: { renda_fixa: { fundo_x: 10000 * (1 + fator * 0.85) } } } } };
const r = rendimentoRendaFixa(cart, cdi)[0];
ok('líquido × CDI = 85%; com o IR de volta = 100% (critério da lâmina)', Math.abs(r.pctLiquido - 85) < 0.01 && Math.abs(r.pct - 100) < 0.01, `${r.pctLiquido} / ${r.pct}`);
const j = juntarParcial({ plano_acao: { passos: [{ n: 1, titulo: 'velho' }] } }, { lastro_parcial: 'carteira', plano_acao: { passos: [{ n: 1, titulo: 'novo', status: 'PENDENTE' }, { n: 2, titulo: 'outro', status: 'PENDENTE' }] } });
ok('resposta pequena aceita plano_acao (troca o plano inteiro)', j.mudou.includes('plano_acao') && j.dados.plano_acao.passos.length === 2 && j.dados.plano_acao.passos[0].titulo === 'novo');
// resgate que o banco já descontou (o ativo já está em zero na carteira): só o fluxo entra, sem erro "tem só R$ 0,00"
const { novoResgate } = await import('../../app/lancamentos.js');
const { sincronizar } = await import('../../app/investimentos.js');
const { agendaClaude } = await import('../../app/indicadores.js');
const cf0 = { periodo: '2026-11', ultimaAtualizacao: '2026-11-08', receitas: [], despesasFixas: [], despesasVariaveis: [], resgates: [], ajustesCaixa: [], atualizacoes: [] };
const cart0 = { target_allocation: {}, historico_mensal: { '2026-10': { status: 'fechado', ativos: { renda_fixa: { fundo_x: 5000 }, ouro: 1082.19 }, ativos_ouro_detalhe: { itau_index_gold: 1082.19 } },
  '2026-11': { status: 'em_andamento', atualizado_em: '2026-11-08', ativos: { renda_fixa: { fundo_x: 5000 }, ouro: 0 }, ativos_ouro_detalhe: { itau_index_gold: 0 }, fluxos: [] } } };
let erroNormal = ''; try { sincronizar(cf0, novoResgate(cf0, { ativo: 'itau_index_gold', nome: 'Itaú Index Gold', valor: 1094.66, dia: 9, motivo: 'estrategico' }, '2026-11-10'), cart0, '2026-11-10'); } catch (e) { erroNormal = e.message; }
ok('sem a marca, o resgate é recusado (o ativo está em zero)', /tem só/.test(erroNormal), erroNormal);
const cf1 = novoResgate(cf0, { ativo: 'itau_index_gold', nome: 'Itaú Index Gold', valor: 1094.66, dia: 9, motivo: 'estrategico', jaSaiu: true }, '2026-11-10');
const s1 = sincronizar(cf0, cf1, cart0, '2026-11-10'); const h1 = s1.cart.historico_mensal['2026-11'];
ok('com a marca: caixa recebe, carteira ganha o fluxo e o ativo continua em zero', cf1.resgates[0].valor === 1094.66 && cf1.resgates[0].jaNaCarteira && h1.fluxos.length === 1 && h1.fluxos[0].valor === 1094.66 && h1.resgates === 1094.66 && h1.ativos_ouro_detalhe.itau_index_gold === 0, JSON.stringify(h1.fluxos));
const s2 = sincronizar(cf1, cf0, s1.cart, '2026-11-10');
ok('desfazer tira o fluxo e não mexe no ativo', s2.cart.historico_mensal['2026-11'].fluxos.length === 0 && s2.cart.historico_mensal['2026-11'].ativos_ouro_detalhe.itau_index_gold === 0);
// quando rodar o Claude
const comPlano = { ...cart0, meta_dolarizacao: { revisado_em: '2026-11-08' }, plano_acao: { passos: [{ n: 1, titulo: 'Arquiteta', status: 'PENDENTE' }] } };
let ag = agendaClaude(cf0, comPlano, '2026-11-10');
ok('no meio do mês, sem mudança: nada para rodar; próximo = último dia', ag.every(x => !x.agora && x.proxima === '2026-11-30') && ag.map(x => x.qual).join() === 'carteira,caixa,plano');
comPlano.plano_acao.passos[0] = { n: 1, titulo: 'Arquiteta', status: 'CANCELADO', cancelado_em: '2026-11-10' };
ag = agendaClaude(cf0, comPlano, '2026-11-10');
ok('passo descartado depois da última revisão: rodar o Plano agora (só o Plano)', ag.find(x => x.qual === 'plano').agora && /Arquiteta/.test(ag.find(x => x.qual === 'plano').motivo) && !ag.find(x => x.qual === 'caixa').agora);
ok('no último dia do mês: os três', agendaClaude(cf0, comPlano, '2026-11-30').every(x => x.agora));
console.log(`${n - f}/${n}`); process.exit(f ? 1 : 0);
