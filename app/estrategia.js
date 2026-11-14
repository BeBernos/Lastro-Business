// v9.5 — Estratégia (item 8 do ROADMAP): alocação de hoje × alvo por classe e os textos para o Claude pesquisar.
// O alvo vem de `estrategia.alvos` (formato novo, escrito pelo Projeto no MODO PLANO — docs/PROJETO-CLAUDE.md) ou,
// enquanto ele não existe, de `target_allocation` (o alvo de hoje do gestor). Sem a reserva de emergência, como o
// painel da carteira faz. Funções puras.
import { listaAtivos } from './investimentos.js';
import { posicao, reserva } from './carteira.js';

const NOMES = { renda_fixa: 'Renda fixa', etfs_fiis: 'ETFs e FIIs', fiis: 'FIIs', etfs: 'ETFs', acoes_br: 'Ações e ETFs no Brasil', ouro: 'Ouro', dolar: 'Dólar e exterior', cripto: 'Cripto', reserva: 'Reserva' };
// classe do alvo → classes da carteira (listaAtivos)
const COMPOE = { renda_fixa: ['renda_fixa'], etfs_fiis: ['etfs', 'fiis'], fiis: ['fiis'], etfs: ['etfs'], acoes_br: ['etfs'], ouro: ['ouro'], dolar: ['dolar'], cripto: ['cripto'] };

export function alvosDa(cart) {
  const novos = cart?.estrategia?.alvos;
  if (Array.isArray(novos) && novos.length) return { fonte: 'estrategia', alvos: novos.filter(a => a?.classe && Number.isFinite(Number(a.pct))).map(a => ({ classe: a.classe, pct: Number(a.pct), tese: a.tese || '' })) };
  const t = cart?.target_allocation;
  if (t && typeof t === 'object') return { fonte: 'target', alvos: Object.entries(t).filter(([, v]) => Number.isFinite(Number(v))).map(([classe, pct]) => ({ classe, pct: Number(pct), tese: '' })) };
  return null;
}

// [{ classe, nome, atual (R$), pct (0–100), alvo (0–100), falta (R$ para chegar no alvo; negativo = acima) }]
export function alocacaoVsAlvo(cart) {
  const a = alvosDa(cart);
  if (!a) return null;
  const ativos = listaAtivos(cart);
  const porClasse = {};
  for (const x of ativos) porClasse[x.classe] = (porClasse[x.classe] || 0) + (x.valor || 0);
  const res = reserva(cart);
  const semReserva = a.alvos.some(x => x.classe === 'reserva') ? 0 : res?.atual || 0;
  if (semReserva) porClasse.renda_fixa = Math.max(0, (porClasse.renda_fixa || 0) - semReserva);
  if (a.alvos.some(x => x.classe === 'reserva')) porClasse.reserva = res?.atual || 0;
  // v9.14: o alvo de dólar mede como a meta de dólar (meta_dolarizacao.conta_como_dolar): o IVVB11/VWRA11 é dólar, não
  // "ações no Brasil" — antes "Dólar e exterior" só contava o fundo cambial (1,8% × alvo 17%, com o IVVB11 em ações BR)
  const temDolar = a.fonte === 'estrategia' && a.alvos.some(x => x.classe === 'dolar');
  const emDolar = temDolar ? ativos.filter(x => ['etfs', 'fiis'].includes(x.classe) && (cart.meta_dolarizacao?.conta_como_dolar || []).includes(x.chave)) : [];
  for (const x of emDolar) porClasse[x.classe] -= x.valor || 0;
  porClasse.dolar = (porClasse.dolar || 0) + emDolar.reduce((t, x) => t + (x.valor || 0), 0);
  const valorDe = classe => (classe === 'reserva' ? porClasse.reserva || 0 : (COMPOE[classe] || [classe]).reduce((t, k) => t + (porClasse[k] || 0), 0));
  const base = a.alvos.reduce((t, x) => t + valorDe(x.classe), 0) || 1;
  const linhas = a.alvos.map(x => {
    const atual = Math.round(valorDe(x.classe) * 100) / 100;
    return { classe: x.classe, nome: NOMES[x.classe] || x.classe, atual, pct: (atual / base) * 100, alvo: x.pct, falta: Math.round(((x.pct / 100) * base - atual) * 100) / 100, tese: x.tese };
  });
  return { fonte: a.fonte, base: Math.round(base * 100) / 100, reservaFora: semReserva, linhas, tese: cart.estrategia?.tese || '', revisada: cart.estrategia?.revisada_em || null, prioridade: cart.estrategia?.prioridade_aporte || [] };
}

const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function textoPesquisa(cart, ativo, nomeArquivo) {
  const al = alocacaoVsAlvo(cart);
  const pos = posicao(cart);
  const meu = listaAtivos(cart).find(x => x.chave === ativo || x.nome.toLowerCase() === String(ativo).toLowerCase());
  return [
    `MODO PESQUISA ${meu ? meu.nome : ativo}`,
    '',
    `Arquivo anexado: ${nomeArquivo} (carteira, posição de ${pos.data || pos.mes}).`,
    meu ? `Tenho hoje ${brl(meu.valor)} em ${meu.nome} (${meu.rotulo}).` : 'Ainda não tenho este ativo.',
    ...(al ? ['Alocação hoje × alvo: ' + al.linhas.map(l => `${l.nome} ${l.pct.toFixed(1)}% (alvo ${l.alvo}%)`).join(' · ')] : []),
    '',
    'Siga o MODO PESQUISA das instruções do Projeto: o que é e como comprar do Brasil, custos e estrutura, imposto no Brasil, números (1, 3, 5 e 10 anos), documentos, e se cabe na minha estratégia — com fonte e data de cada número.',
    'No fim, uma recomendação clara (comprar, manter, reduzir ou não entrar), quanto e em quantos meses, sem vender nada só pelo noticiário do dia.',
    'Devolva só o texto da análise (sem arquivo). Se a estratégia ou o plano de aportes mudarem, diga e eu faço uma conversa no MODO PLANO.',
    'Lembre: dólar e renda fixa nova são com ativos que eu ainda não tenho; no dólar, pense global (não só EUA).',
  ].join('\n');
}

// v9.6: o pedido do Bruno (05/11/2026) — dólar e renda fixa com ATIVOS NOVOS (não os que ele já tem), global e não só
// EUA, e remanejar a renda fixa que rende mal, olhando o rendimento real de cada fundo (rendimentoRendaFixa).
export const REGRAS_ESTRATEGIA = [
  'Regras desta revisão (decisão minha, de 05/11/2026):',
  '- Dolarização e renda fixa nova com ATIVOS QUE EU AINDA NÃO TENHO. Não conte o que já existe (dólar em conta, IVVB11, os fundos do Itaú) como o caminho da estratégia nova.',
  '- No dólar, pense global, não só EUA: ETFs de mundo todo, de outras regiões e países (na B3 ou fora, inclusive UCITS na Irlanda), comparando custo, imposto e como comprar daqui.',
  '- Na renda fixa, títulos e produtos que eu não tenho: Tesouro IPCA+ e prefixado, CDB/LCI/LCA de banco grande, debêntures incentivadas — com taxa, vencimento, liquidez, IR, FGC e marcação a mercado. Monte uma escada de vencimentos (a reserva fica em liquidez diária).',
  '- Remanejar a renda fixa que já tenho: use o rendimento real de cada fundo abaixo (calculado pelo Lastro com o CDI oficial) e as taxas; diga o que sai, para onde vai, quando, e o imposto e o prazo de resgate de cada troca.',
  '- Dinheiro com data marcada (ex.: apartamento) fica em liquidez diária e sem taxa de performance; considere o prazo de resgate (D+X úteis) de cada ativo.',
];
export const textoAlertas = lista => (lista?.length ? ['', 'O Lastro achou no plano atual (responda a cada ponto):', ...lista.map(a => `- ${a.titulo}: ${a.texto}`)] : []);
export function textoEstrategia(cart, nomes, cdi = null, alertas = []) {
  const al = alocacaoVsAlvo(cart);
  const rf = textoRendaFixaReal(rendimentoRendaFixa(cart, cdi));
  return [
    'MODO PLANO — revisão de estratégia',
    '',
    `Arquivos anexados: ${nomes.join(' e ')}.`,
    ...(al ? ['Alocação hoje × alvo: ' + al.linhas.map(l => `${l.nome} ${l.pct.toFixed(1)}% (alvo ${l.alvo}%)`).join(' · ')] : []),
    ...(rf.length ? ['', 'Rendimento real da renda fixa (posições líquidas, com o IR de 15% devolvido para comparar com o CDI bruto, como nas lâminas; o Lastro tira aportes e resgates e compara com o CDI do mesmo período):', ...rf] : []),
    ...textoAlertas(alertas),
    '',
    'Quero rever a estratégia para os próximos 4 anos: mais dólar (ETFs e ações de fora, ouro; cripto só uma parte pequena) e renda fixa bem organizada, aproveitando os juros altos. Use a pesquisa na internet.',
    ...REGRAS_ESTRATEGIA,
    '',
    '1. Grave a estratégia nova no campo "estrategia" da carteira, no formato das instruções do Projeto (alvos por classe, prazo, tese, gatilhos). A "meta_dolarizacao" precisa bater com o alvo de dólar.',
    '2. Refaça o "plano_aportes" dos próximos 3 meses dentro da sobra segura do caixa: dinheiro novo primeiro, vender só com motivo e imposto calculado.',
    '3. Liste os ativos candidatos (os novos) que valem uma conversa no MODO PESQUISA.',
    RESPOSTA_PLANO,
  ].join('\n');
}

// v9.6: o PLANO não devolve mais a carteira inteira (~75 KB, só para mudar dois campos): devolve um JSON pequeno que o
// Lastro junta à carteira atual (importarParcial em app.js). Muito mais rápido para o Claude escrever.
export const RESPOSTA_PLANO = 'Devolva só um JSON PEQUENO (plano_AAAA-MM-DD.json), não a carteira inteira: {"lastro_parcial": "carteira", "data": "AAAA-MM-DD", "plano_aportes": [...], "meta_dolarizacao": {...}, "estrategia": {...}, "plano_acao": {"passos": [...]}, "fichas_ativos": {...}, "analises": [{"data", "tipo", "titulo", "texto", "acao"}]} — só os campos que mudaram (sem "estrategia" se ela não mudou). O Lastro junta isso à carteira que já tem.';

// v9.6 — Renda fixa: quanto cada fundo rendeu DE VERDADE × o CDI do mesmo período. Usa as posições que a carteira já
// guarda a cada mês (historico_mensal[m].ativos.renda_fixa, na data `atualizado_em` ou no fim do mês), tira os aportes
// e resgates do mês (Dietz simples: o fluxo conta pela metade do período) e compara com o CDI diário oficial do Banco
// Central (série 12, pela rota /cotacoes). O histórico cresce sozinho a cada fechamento — nada a digitar.
// cdi: [{ data: 'AAAA-MM-DD', valor: % ao dia }]. Devolve [{ chave, nome, valor, pct, ret, cdiPer, meses, de, ate,
// ultimo: {pct, de, ate}, pct12m (o "% do CDI em 12 meses" que o gestor copiou do banco), taxa, liquidez, tom }],
// pior primeiro; null sem dados.
const NOMES_RF = { index_simples_selic: 'Index Simples Selic', credito_bancario_rf: 'Crédito Bancário RF', optimus_rf: 'Optimus RF', active_fix_all: 'Active Fix All' };
const nomeRF = k => NOMES_RF[k] || k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
const fimDoMes = ym => { const [a, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(a, m, 0).getDate()).padStart(2, '0')}`; };

// v9.9.12: as posições são LÍQUIDAS de IR e o CDI é bruto — comparar direto derrubava todo fundo ~15% (o Claude apontou no
// PLANO de 08/11). `pct` devolve o IR de 15% (fundo de longo prazo, mais de 2 anos) para ficar no mesmo critério das
// lâminas; `pctLiquido` é o que o dinheiro rendeu de fato (o simulador de troca usa este).
const IR_FUNDO = 0.15;
export function rendimentoRendaFixa(cart, cdi) {
  const hist = cart?.historico_mensal || {};
  const meses = Object.keys(hist).sort().filter(m => hist[m]?.ativos?.renda_fixa);
  if (meses.length < 2 || !cdi?.length) return null;
  const dataDe = m => hist[m].atualizado_em || fimDoMes(m);
  const fundos = {};
  for (let i = 1; i < meses.length; i++) {
    const a = meses[i - 1], b = meses[i];
    const d0 = dataDe(a), d1 = dataDe(b);
    const dias = cdi.filter(x => x.data > d0 && x.data <= d1);
    const fator = dias.reduce((f, x) => f * (1 + x.valor / 100), 1);
    if (dias.length < 8) continue; // janela curta (menos de ~2 semanas úteis): a cota do banco atrasa e vira ruído
    for (const [k, v1] of Object.entries(hist[b].ativos.renda_fixa)) {
      const v0 = hist[a].ativos.renda_fixa[k];
      if (!(v0 > 0) || !(v1 > 0)) continue;
      const liquido = (hist[b].fluxos || []).filter(f => f.ativo === k)
        .reduce((s, f) => s + (f.tipo === 'aporte' ? f.valor : f.tipo === 'resgate' ? -f.valor : 0), 0);
      const base = v0 + liquido / 2;
      if (!(base > 0)) continue;
      (fundos[k] ||= []).push({ de: d0, ate: d1, ret: (v1 - v0 - liquido) / base, cdi: fator - 1 });
    }
  }
  const fundosInfo = cart.fundos_renda_fixa || {};
  const ultimo = hist[meses[meses.length - 1]].ativos.renda_fixa;
  const lista = Object.entries(fundos).filter(([k]) => ultimo[k] > 0).map(([k, js]) => {
    const ret = js.reduce((f, j) => f * (1 + j.ret), 1) - 1;
    const cdiPer = js.reduce((f, j) => f * (1 + j.cdi), 1) - 1;
    const pctLiquido = cdiPer > 0 ? (ret / cdiPer) * 100 : null;
    const pct = pctLiquido == null ? null : pctLiquido / (1 - IR_FUNDO);
    const u = js[js.length - 1];
    const info = fundosInfo[k] || {};
    return {
      chave: k, nome: nomeRF(k), valor: ultimo[k], pct, pctLiquido, ret, cdiPer, meses: js.length, de: js[0].de, ate: u.ate,
      ultimo: { pct: u.cdi > 0 ? (u.ret / u.cdi) * 100 / (1 - IR_FUNDO) : null, de: u.de, ate: u.ate },
      pct12m: info.pct_cdi_12m ?? null, taxa: info.taxa_produto ?? null, liquidez: info.liquidez || '',
    };
  });
  // o tom compara cada fundo com o melhor deles no mesmo período (a volta do IR é aproximada: come-cotas e prazo mudam um pouco)
  const melhor = Math.max(...lista.map(f => f.pct ?? -Infinity));
  for (const f of lista) f.tom = f.pct == null || !(melhor > 0) ? 'info' : f.pct < melhor * 0.7 ? 'ruim' : f.pct < melhor * 0.9 ? 'atencao' : 'bom';
  return lista.length ? lista.sort((x, y) => (x.pct ?? 999) - (y.pct ?? 999)) : null;
}

// Linhas para os textos do Claude (MODO PLANO / revisão): o rendimento real de cada fundo
export const textoRendaFixaReal = lista => (lista || []).map(f => `- ${f.nome}: ${f.pct == null ? 's/d' : `${Math.round(f.pct)}% do CDI`} de ${f.de.split('-').reverse().join('/')} a ${f.ate.split('-').reverse().join('/')} (${f.meses} ${f.meses === 1 ? 'mês' : 'meses'}; último mês ${f.ultimo.pct == null ? 's/d' : `${Math.round(f.ultimo.pct)}%`})${f.pct12m != null ? ` · banco diz ${f.pct12m}% em 12 meses` : ''}${f.taxa != null ? ` · taxa ${String(f.taxa).replace('.', ',')}% a.a.` : ''}${f.liquidez ? ` · ${f.liquidez}` : ''} · hoje ${f.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

// v9.7 — O Lastro confere o plano de aportes contra as regras do Bruno e os números (o que o Claude apontou à mão em
// 05/11/2026): aporte em fundo que rende mal, dolarização num ativo que ele já tem, dinheiro com data marcada num fundo
// de resgate demorado. Devolve [{ tom, titulo, texto }] — vai na tela (Estratégia) e no texto do PLANO.
export function alertasPlano(cart, cdi = null, { liquidez = () => null } = {}) {
  const plano = (cart?.plano_aportes || []).filter(p => p?.ativo && p.valor > 0);
  if (!plano.length) return [];
  const mesAgora = posicao(cart).mes;
  const futuros = plano.filter(p => !mesAgora || p.mes >= mesAgora);
  const porAtivo = {};
  for (const p of futuros) (porAtivo[p.ativo] ||= { total: 0, meses: [], motivos: [] }), porAtivo[p.ativo].total += p.valor, porAtivo[p.ativo].meses.push(p.mes), porAtivo[p.ativo].motivos.push(p.motivo || '');
  const out = [];
  const rf = rendimentoRendaFixa(cart, cdi) || [];
  const tem = new Map(listaAtivos(cart).filter(a => a.valor > 0).map(a => [a.chave, a]));
  const reais = v => Math.round(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  for (const [k, x] of Object.entries(porAtivo)) {
    const f = rf.find(r => r.chave === k);
    if (f && f.tom !== 'bom') out.push({ tom: f.tom, titulo: `Aporte num fundo que rende pouco: ${f.nome}`, texto: `O plano põe ${reais(x.total)} em ${f.nome} (${x.meses.length} ${x.meses.length === 1 ? 'mês' : 'meses'}), que rendeu ${Math.round(f.pct)}% do CDI — abaixo dos outros fundos no mesmo período${f.taxa != null ? `, com taxa de ${String(f.taxa).replace('.', ',')}%` : ''}.` });
    const dolar = x.motivos.some(m => /dolar|dólar/i.test(m));
    if (dolar && tem.has(k)) out.push({ tom: 'atencao', titulo: 'Dólar num ativo que você já tem', texto: `A dolarização do plano (${reais(x.total)}) vai para ${tem.get(k).nome}, que já está na carteira. A sua regra é dólar com ativos novos e globais, não só EUA.` });
    // dinheiro com data (ex.: "sai em abril", "chaves abr/27") num ativo de resgate demorado
    const data = x.motivos.join(' ').match(/\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\/?\s*(\d{2,4})\b/i);
    const liq = liquidez(k);
    if (data && liq?.du >= 3) out.push({ tom: 'info', titulo: `Dinheiro com data num resgate ${liq.texto}`, texto: `${tem.get(k)?.nome || k} leva ${liq.texto} úteis para cair na conta. Para o que tem data marcada (${data[0]}), peça o resgate com folga ou prefira liquidez diária.` });
  }
  const meta = cart?.meta_dolarizacao;
  const jaTem = (meta?.conta_como_dolar || []).filter(k => tem.has(k) && !['dolar', 'cripto'].includes(k));
  if (jaTem.length) out.push({ tom: 'info', titulo: 'A meta de dólar conta o que já existe', texto: `"Em dólar" inclui ${jaTem.map(k => tem.get(k).nome).join(', ')}. Tudo bem para medir a exposição, mas o caminho novo (ETFs globais) ainda não está no plano.` });
  const peso = { ruim: 0, atencao: 1, info: 2 };
  return out.sort((a, b) => peso[a.tom] - peso[b.tom]); // o mais grave primeiro
}
