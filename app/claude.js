// Levar para o Claude (saiu do app.js em 14/11/2026): os pedidos de cada modo (CAIXA, CARTEIRA, PLANO), o conector
// no lugar dos arquivos, mandar os arquivos e o fechamento em etapas (v8.10/v9.5). O que precisa do app.js chega por
// configurarClaude, chamado no fim do app.js.
import { planilhaFatura } from './extrato.js';
import { $, abrirFolha, aviso, brlTexto, dataCurta, esc } from './ui.js';
import { TIPO_XLSX, gerarXlsx } from './xlsx.js';
import { REGRAS_ESTRATEGIA, RESPOSTA_PLANO, rendimentoRendaFixa, textoAlertas, textoRendaFixaReal } from './estrategia.js';
import { historicoApp, hojeBrasil } from './lancamentos.js';
import { mesCurto } from './lancar.js';
import { posicao } from './carteira.js';
import { dolarizacao, listaAtivos, nomeAtivo, planoDoMes } from './investimentos.js';
import { banco } from './banco.js';
import { agendaClaude } from './indicadores.js';
import { icTom } from './graficos.js';

let estado, escolherArquivo, ultimoDiaDe, MESES_LONGOS, abrirLancar, buscarRascunhos, alertasDoPlano, desfazerUltimo;
export function configurarClaude(app) {
  ({ estado, escolherArquivo, ultimoDiaDe, MESES_LONGOS, abrirLancar, buscarRascunhos, alertasDoPlano, desfazerUltimo } = app);
}

// ---------- v7: levar para o Claude ----------
// O Lastro é o lugar do dia a dia; o Claude fecha o mês e faz as análises. Cada conversa recebe o seu
// arquivo (.json, o mesmo formato que o agente gera) e um texto pronto dizendo o que mudou pelo app.
export async function enviarArquivo(nome, dados, baixar = false) {
  const arquivo = new File([JSON.stringify(dados, null, 2)], nome, { type: 'application/json' });
  if (!baixar && navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(arquivo);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}

// v7.6: planilha da fatura (CSV) para bater valor por valor com a fatura do Itaú
export async function exportarPlanilhaFatura() {
  let p;
  try {
    p = planilhaFatura(estado.dados);
  } catch (e) {
    return aviso(e.message, { erro: true });
  }
  const arquivo = new File([gerarXlsx(p.abas)], p.nome, { type: TIPO_XLSX });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: p.nome });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(arquivo);
  a.download = p.nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  aviso({ titulo: 'Planilha baixada', detalhe: `${p.linhas} ${p.linhas === 1 ? 'linha' : 'linhas'}${p.semDetalhe > 0.004 ? ` · ${brlTexto(p.semDetalhe)} só como total (do agente)` : ''}` }, { tom: 'ok' });
}

export async function enviarArquivos(lista, baixar = false) {
  const arquivos = lista.map(([nome, dados]) => new File([JSON.stringify(dados, null, 2)], nome, { type: 'application/json' }));
  if (!baixar && navigator.canShare?.({ files: arquivos })) {
    try {
      await navigator.share({ files: arquivos, title: 'Lastro: caixa e carteira' });
      return true;
    } catch (e) {
      if (e.name === 'AbortError') return false;
    }
  }
  for (const [nome, dados] of lista) await enviarArquivo(nome, dados, true);
  return true;
}

const rotuloMesLongo = ym => { const [a, m] = ym.split('-').map(Number); return `${MESES_LONGOS[m - 1].toUpperCase()}/${a}`; };
const brlSemSimbolo = v => brlTexto(v).replace('R$ ', '');

// v8.10: o Claude devolve só o JSON (o HTML é a parte mais cara de gerar; o app usa o painel que já tem como molde)
const SO_JSON = base => `Devolva só o arquivo JSON (${base}_AAAA-MM-DD.json), sem o HTML: o Lastro usa o painel que já tem. Ponha as análises desta conversa no campo "analises" do JSON ([{"data": "AAAA-MM-DD", "tipo": "alerta|atencao|dica|conquista|info", "titulo", "texto", "acao"}]) — elas aparecem no app. Gere o HTML só se eu pedir uma mudança no desenho do painel.`;
// v9.6: fora do fechamento, se nenhum número mudou, a resposta é só um JSON pequeno com as análises (segundos, não minutos)
const SO_PARCIAL = (qual, base) => `Se você NÃO mudou nenhum número, devolva só um JSON pequeno (analise_AAAA-MM-DD.json): {"lastro_parcial": "${qual}", "data": "AAAA-MM-DD", "analises": [{"data": "AAAA-MM-DD", "tipo": "alerta|atencao|dica|conquista|info", "titulo", "texto", "acao"}]} — o Lastro junta às análises que já tem. Só se corrigir algum número: ${SO_JSON(base)}`;
// v9.9.5: recorrente tirada "só deste mês" (foraDoMes) — o painel antigo ainda a soma no agendado e acusa divergência.
// Enquanto o código do painel (fora o JSON) não citar foraDoMes, o fechamento pede ao Claude o HTML corrigido, uma vez só.
const painelSemForaDoMes = html => !/foraDoMes/.test(String(html || '').replace(/<script[^>]*id=["']cashflow-data["'][^>]*>[\s\S]*?<\/script>/i, ''));
const HTML_FORA_DO_MES = base => `Desta vez devolva o painel HTML completo (painel_cashflow_AAAA-MM-DD.html, com o JSON atualizado dentro), partindo do último painel e sem renomear funções nem ids, com uma correção: assinatura com "foraDoMes" igual ao período NÃO é cobrada na fatura daquele mês — fica fora da soma das assinaturas, do agendado (composicao e a conferência em faturaCartao), de assinaturasCartao e do que falta cobrar no mês; nos meses seguintes conta normalmente. Hoje o painel soma e acusa divergência na fatura. Ponha as análises no campo "analises" do JSON. Nos próximos fechamentos volte a mandar só o ${base}_AAAA-MM-DD.json.`;
// v9.12.3: com o conector ligado (v9.10), Plano, Pesquisa e Análise do dia vão sem arquivo: o Claude lê e grava sozinho.
// O fechamento CAIXA/CARTEIRA continua com arquivo (gera o painel inteiro).
export const conectorLigado = () => { try { return localStorage.getItem('lastro-conector') === '1'; } catch { return false; } };
const CONECTOR_LER = 'Não anexei arquivo: use o conector Lastro (ler_resumo para o quadro geral, ler_dados para os campos inteiros) — é a versão mais nova, com tudo o que lancei no app.';
const CONECTOR_FECHAR = arq => `Não gere arquivo: grave o mês novo de "${arq}" pelo conector Lastro com a ferramenta fechamento (mudancas e acrescentar; o JSON do caixa é grande, mande só o que muda, em partes se precisar). Primeiro com so_validar=true, me mostre o resumo e só grave depois do meu "pode gravar" — fica como rascunho até eu tocar em Aplicar no app. As análises vão no campo "analises".`;
const CONECTOR_GRAVAR = arq => `Não gere painel nem arquivo: grave pelo conector Lastro (gravar, arquivo "${arq}"; formato_escrita diz os campos). Primeiro com so_validar=true, me mostre o que vai mudar e só grave depois do meu "pode gravar". As análises vão no campo "analises".`;
export function pedidoPeloConector(texto, arq) {
  return texto
    .replace(/^(Anexei|Arquivo anexado|Arquivos anexados).*$/m, CONECTOR_LER)
    .replace(/Parta do \S+ que anexei/, 'Parta da carteira que o conector traz')
    .replace(RESPOSTA_PLANO, CONECTOR_GRAVAR(arq))
    .replace(SO_PARCIAL(arq, arq === 'caixa' ? 'cashflow_dados' : 'carteira_dados'), CONECTOR_GRAVAR(arq))
    .replace(/^Devolva só um JSON PEQUENO: \{"lastro_parcial".*$/m, CONECTOR_GRAVAR(arq))
    .replace(SO_JSON(arq === 'caixa' ? 'cashflow_dados' : 'carteira_dados'), CONECTOR_FECHAR(arq)); // v9.17: fechamento pelo conector
}
function textoCaixa(d, nome, hoje, fecharModo) {
  const fechar = fecharModo ?? (hoje.slice(0, 7) > d.periodo || hoje === ultimoDiaDe(d.periodo));
  const mes = d.periodoLabel || rotuloMesLongo(d.periodo);
  const hist = historicoApp(d).reverse();
  const linhas = hist.slice(-60).map(h => `- ${dataCurta(h.data)} ${h.texto}`);
  return [
    `MODO CAIXA — ${fechar ? 'fechamento' : 'atualização'} de ${mes} pelo Lastro.`,
    '',
    `Anexei o ${nome}, exportado do app Lastro: é a versão mais nova do painel e substitui a última que você gerou (já inclui o que eu lancei pelo app).`,
    '',
    hist.length ? `Lançado ou mudado pelo app neste mês (${hist.length}):` : 'Nada foi lançado pelo app neste mês.',
    ...(hist.length > 60 ? [`(mostrando os últimos 60; o resto está em "atualizacoes" no arquivo)`] : []),
    ...linhas,
    ...((d.valoresConhecidos || []).length ? ['', 'Valores já conhecidos dos próximos meses (campo valoresConhecidos — use na projeção e ao abrir cada mês):', ...d.valoresConhecidos.map(v => `- ${v.descricao}, ${mesCurto(v.mes)}: ${brlTexto(v.valor)}`)] : []),
    '',
    'Por favor:',
    '1. Confira os itens com origem "app" ou "sms" (e var-itau.lancamentosApp) contra a fatura e o extrato reais — se precisar, eu mando a fatura ou os prints.',
    fechar ? `2. Feche ${mes} e gere o painel do mês seguinte. Se eu mandar a fatura do Itaú (PDF), grave em var-itau.compras ([{"data": "AAAA-MM-DD", "loja", "valor", "cat"}]) as compras à vista e os estornos (valor negativo) que NÃO estão em var-itau.lancamentosApp — as parcelas continuam em parcelamentos. O app mostra a fatura item a item com isso.` : '2. Gere o painel atualizado (sem fechar o mês).',
    '3. Mantenha os campos do app: categoriasApp, lancamentosApp, faturaProximoCiclo, valoresConhecidos, orcamentos, capacidadeAporte, cat/nota nas assinaturas e nos parcelamentos, origem, editadoApp e o "ativo" nos aportes (ajustesCaixa) e resgates. Pix/débito do app: despesasFixas com recorrenteApp se repetem todo mês; parcelamentosExternos com origem "app" entram como despesa no "dia" de cada mês de primeiraParcela a ultimaParcela.',
    `4. ${fechar ? (painelSemForaDoMes(estado.conteudo?.html) ? HTML_FORA_DO_MES('cashflow_dados') : SO_JSON('cashflow_dados')) : SO_PARCIAL('caixa', 'cashflow_dados')}`,
  ].join('\n');
}

function textoCarteira(c, nome, hoje, fecharModo) {
  const p = posicao(c);
  const h = p.h;
  const fechar = fecharModo ?? (hoje.slice(0, 7) > p.mes || hoje === ultimoDiaDe(p.mes));
  const mes = rotuloMesLongo(p.mes);
  const linhas = [];
  for (const a of h.atualizacoesApp || []) {
    const tot = a.total >= 0 ? `+${brlSemSimbolo(a.total)}` : `−${brlSemSimbolo(Math.abs(a.total))}`;
    linhas.push(`- ${dataCurta(a.data)}${a.hora ? ` ${a.hora}` : ''} valores atualizados (${tot}): ${a.itens.map(i => `${nomeAtivo(i.ativo)} ${brlSemSimbolo(i.antes)} → ${brlSemSimbolo(i.depois)}`).join('; ')}`);
  }
  for (const f of (h.fluxos || []).filter(x => x.idCaixa)) linhas.push(`- ${f.data ? dataCurta(f.data) : ''} ${f.tipo === 'aporte' ? 'Aporte' : 'Resgate'} de ${brlTexto(f.valor)} ${f.tipo === 'aporte' ? 'em' : 'de'} ${nomeAtivo(f.ativo)} (${f.tipo === 'aporte' ? 'saiu do' : 'foi para o'} caixa)`);
  const div = Object.entries(h.dividendos_detalhe || {});
  if (div.length) linhas.push(`- Dividendos recebidos no mês: ${div.map(([k, v]) => `${k.toUpperCase()} ${brlSemSimbolo(v)}`).join(', ')} (total ${brlTexto(h.dividendos || 0)})`);
  return [
    `MODO CARTEIRA — ${fechar ? 'fechamento' : 'atualização parcial'} da carteira de ${mes} pelo Lastro.`,
    '',
    `Anexei o ${nome}, exportado do app Lastro: é a versão mais nova da carteira e substitui a do Drive (salve no Drive com esse nome).`,
    '',
    linhas.length ? 'Registrado no app neste mês:' : 'Nada foi registrado pelo app neste mês.',
    ...linhas,
    '',
    'Por favor:',
    fechar
      ? `1. Feche ${mes}: confira os valores de fim de mês (se precisar, eu mando os prints do Itaú), calcule o resultado de mercado, o score e o plano, e gere o painel novo.`
      : '1. Atualize o painel e as análises com esses dados (sem fechar o mês).',
    '2. Mantenha o que o app grava: atualizacoesApp, os fluxos com idCaixa (aporte/resgate que também estão no cashflow), metas, meta_dolarizacao, plano_aportes e fichas_ativos.',
    `3. ${fechar ? SO_JSON('carteira_dados') : SO_PARCIAL('carteira', 'carteira_dados')}`,
  ].join('\n');
}

// v8.1: modo PLANO — os dois arquivos juntos, para a análise da vida financeira toda (sem gerar painéis)
function textoPlano(cf, cart, nomes, hoje) {
  const p = posicao(cart);
  const dz = dolarizacao(cart);
  const pl = planoDoMes(cart, cf.periodo);
  const c = estado.motor?.c;
  const pct = v => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const rf = textoRendaFixaReal(rendimentoRendaFixa(cart, estado.cdiHist?.cdi));
  const semFicha = listaAtivos(cart).filter(a => a.valor > 0 && !cart.fichas_ativos?.[a.chave]).map(a => a.chave);
  return [
    `MODO PLANO — análise da vida financeira toda, ${dataCurta(hoje)}, pelo Lastro.`,
    '',
    `Anexei os dois arquivos mais novos do app: ${nomes[0]} (caixa) e ${nomes[1]} (carteira). Leia os dois juntos, como dizem as instruções do projeto (modo PLANO). Não gere painéis.`,
    '',
    'Hoje no app:',
    ...(c ? [`- Conta hoje ${brlTexto(c.caixa)} · cartão em aberto ${brlTexto(c.itau)}`] : []),
    `- Investimentos ${brlTexto(p.total)} (posição de ${dataCurta(p.data)})`,
    ...(dz ? [`- Em dólar: ${pct(dz.pct)} (${brlTexto(dz.valor)})${dz.alvo ? ` · meta ${pct(dz.alvo)}${dz.prazo ? ` até ${dz.prazo}` : ''}` : ' · ainda sem meta'}`] : []),
    ...(pl ? [`- Plano de aportes deste mês: ${brlTexto(pl.feito)} feitos de ${brlTexto(pl.planejado)} (${pl.itens.map(i => i.nome).join(', ')})`] : []),
    ...(rf.length ? ['', 'Rendimento real da renda fixa (calculado pelo Lastro: posições líquidas com o IR de 15% devolvido, × CDI oficial — mesmo critério das lâminas):', ...rf] : []),
    ...textoAlertas(alertasDoPlano()),
    ...((cart.plano_acao?.passos || []).some(x => /cancel/i.test(x.status || '')) ? ['', 'Passos do plano de ação que eu descartei no app (não vou fazer — tire do plano e refaça as contas sem eles):', ...cart.plano_acao.passos.filter(x => /cancel/i.test(x.status || '')).map(x => `- ${x.n}. ${x.titulo}`)] : []),
    '',
    ...REGRAS_ESTRATEGIA,
    '',
    'Por favor:',
    '1. Com a capacidade de aporte do caixa nos próximos meses, revise a meta de dolarização (ela é dinâmica: acompanha como as contas evoluem) e diga quanto e onde aportar neste mês e nos próximos 3 — em ativos novos, como nas regras acima. Se um aporte for para um fundo que rende mal na lista acima, diga por que mesmo assim ou proponha outro destino.',
    '2. Aponte qualquer risco: reserva de emergência, meses apertados no caixa, concentração.',
    // v9.8.1: o Bruno não quer conversas extras (05/11/2026) — a revisão da estratégia e as fichas vão junto no Plano do mês
    ...(!cart.estrategia?.alvos?.length ? ['3. A carteira ainda não tem a estratégia nova: monte-a agora (campo "estrategia", formato das instruções do Projeto), com a pesquisa na internet, seguindo as regras acima. Vale como a revisão de estratégia.'] : []),
    ...(semFicha.length ? [`4. Pesquise com fonte (pesquisa na internet) a ficha destes ativos e devolva em "fichas_ativos" (MODO PESQUISA fichas das instruções): ${semFicha.join(', ')}.`] : []),
    `5. Parta do ${nomes[1]} que anexei (posição de ${dataCurta(p.data)}), nunca do arquivo do Drive (pode estar mais velho). ${RESPOSTA_PLANO}`,
  ].join('\n');
}

// v8.9.1: a ordem do fechamento (carteira primeiro: o caixa recebe o patrimônio certo; plano por último: usa os dois fechados)
const ORDEM_FECH = [
  ['carteira', 'Fechar a carteira', 'O Claude fecha o mês dos investimentos.'],
  ['caixa', 'Fechar o caixa', 'O Claude fecha o mês da conta e do cartão e monta o mês seguinte.'],
  ['plano', 'Plano de aportes', 'Com os dois fechados, o Claude diz quanto e onde investir nos próximos meses.'],
];
const DE_VOLTA = {
  carteira: 'o arquivo da carteira (carteira_dados_….json). O app copia o patrimônio para o caixa sozinho.',
  caixa: 'o arquivo do caixa do mês novo (cashflow_dados_….json). Até importar, o app só deixa lançar compras no cartão.',
  plano: 'o JSON pequeno do plano (plano_….json). O app junta o plano, a meta de dólar e as análises à carteira que já tem. Se vier a carteira inteira, também funciona.',
};

// ---------- v8.10/v9.5: fechamento em etapas, cada etapa em 3 passos travados ----------
// IDB 'fechamento' = { mes: 'AAAA-MM', iniciado: {etapa: ISO}, feito: {etapa: ISO}, passo: {etapa: 0–2} }.
// Etapas: Carteira → Caixa → Plano; a seguinte só abre com a anterior feita. Passos de cada etapa: 1. mandar o arquivo,
// 2. copiar o pedido, 3. importar a resposta — cada um só abre depois do anterior (pedido do Bruno: "um block que impede
// de avançar"). A etapa fica feita quando o app importa o que o Claude devolveu; "Já fiz esta etapa" é a saída manual.
// Na Análise do dia, os mesmos 3 passos, guardados só na memória (estado.levarPasso).
const ETAPAS = ORDEM_FECH.map(([k]) => k);
export const mesSeguinte = ym => { const [a, m] = ym.split('-').map(Number); return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`; };
function mesParaFechar() {
  const d = estado.dados;
  if (!d) return null;
  const f = estado.fechamento;
  if (f && !ETAPAS.every(e => f.feito?.[e]) && (f.mes === d.periodo || mesSeguinte(f.mes) === d.periodo)) return f.mes;
  const hoje = hojeBrasil();
  return hoje.slice(0, 7) > d.periodo || hoje === ultimoDiaDe(d.periodo) ? d.periodo : null;
}
export const etapaAberta = e => !!(estado.fechamento?.iniciado?.[e] && !estado.fechamento?.feito?.[e]);
export async function marcarEtapa(etapa, campo = 'feito', valor = new Date().toISOString()) {
  const mes = mesParaFechar();
  if (!mes) return;
  const f = estado.fechamento?.mes === mes ? estado.fechamento : { mes, iniciado: {}, feito: {}, passo: {} };
  f[campo] = { ...f[campo], [etapa]: valor };
  estado.fechamento = f;
  await banco.gravar('fechamento', f).catch(() => {});
  // a folha do fechamento aberta passa para a etapa seguinte
  if (campo === 'feito' && !$('veu').hidden && $('folha').querySelector('.levar-fech')) abrirLevarClaude(undefined, { modo: 'fechamento' });
}

export async function abrirLevarClaude(qual, opcoes = {}) {
  const hoje = hojeBrasil();
  const cart = estado.cart.dados;
  if (!estado.dados) return;
  const mesF = cart ? mesParaFechar() : null;
  const modo = mesF ? opcoes.modo || 'fechamento' : 'dia';
  const fechar = modo === 'fechamento';
  const f = estado.fechamento?.mes === mesF ? estado.fechamento : { iniciado: {}, feito: {}, passo: {} };
  const proxima = ETAPAS.find(e => !f.feito?.[e]);
  qual ||= fechar ? proxima || 'plano' : 'caixa';
  if (qual !== 'caixa' && !cart) qual = 'caixa';
  const travada = e => fechar && proxima && ETAPAS.indexOf(e) > ETAPAS.indexOf(proxima);
  if (travada(qual)) qual = proxima;
  const feita = fechar && !!f.feito?.[qual];
  estado.levarPasso ||= {};
  // passos já feitos nesta etapa (0 = nenhum); etapa feita = tudo aberto, para refazer se quiser
  const passo = feita ? 3 : fechar ? f.passo?.[qual] || 0 : estado.levarPasso[qual] || 0;
  const avancar = async n => {
    if (n <= passo) return;
    if (fechar) {
      if (!f.feito?.[qual]) { await marcarEtapa(qual, 'iniciado'); await marcarEtapa(qual, 'passo', n); }
    } else estado.levarPasso[qual] = n;
    abrirLevarClaude(qual, { modo });
  };
  const nomes = [`cashflow_dados_${hoje}.json`, `carteira_dados_${hoje}.json`];
  const nome = qual === 'carteira' ? nomes[1] : qual === 'plano' ? `${nomes[0]} e ${nomes[1]}` : nomes[0];
  const dados = qual === 'carteira' ? cart : estado.dados;
  // v9.17: o fechamento também (vira rascunho; o Bruno aplica no Início), menos o caixa que ainda precisa do HTML corrigido
  const conector = conectorLigado() && !opcoes.arquivo && !(fechar && qual === 'caixa' && painelSemForaDoMes(estado.conteudo?.html));
  if (conector && fechar) buscarRascunhos({ forcar: true });
  const texto0 = qual === 'caixa' ? textoCaixa(dados, nome, hoje, fechar) : qual === 'carteira' ? textoCarteira(dados, nome, hoje, fechar) : textoPlano(estado.dados, cart, nomes, hoje);
  const texto = conector ? pedidoPeloConector(texto0, qual === 'caixa' ? 'caixa' : 'carteira') : texto0;
  const enviar = baixar => (qual !== 'plano' ? enviarArquivo(nome, dados, baixar) : enviarArquivos([[nomes[0], estado.dados], [nomes[1], cart]], baixar));
  const mesNome = mesF ? MESES_LONGOS[Number(mesF.slice(5)) - 1] : '';
  const titulo = e => ORDEM_FECH.find(([k]) => k === e)[1];
  const nEtapa = ETAPAS.indexOf(qual) + 1;
  const etapas = fechar ? `<ol class="etapas-fech">${ORDEM_FECH.map(([k, t]) => {
    const ok = f.feito?.[k], trava = travada(k);
    const txt = ok ? `feito em ${dataCurta(ok.slice(0, 10))}` : trava ? `abre depois de: ${titulo(ETAPAS[ETAPAS.indexOf(k) - 1])}` : 'agora';
    return `<li class="${ok ? 'feita' : trava ? 'trava' : 'agora'}${k === qual ? ' aqui' : ''}"><button type="button" data-levar="${k}"${trava ? ' disabled' : ''}>
      <span class="etapa-ic">${ok ? '✓' : trava ? svgCadeado : ETAPAS.indexOf(k) + 1}</span><span><b>${t}</b><small>${txt}</small></span></button></li>`;
  }).join('')}</ol>` : cart ? `<div class="escolha" role="tablist">${['caixa', 'carteira', 'plano'].map(k => `<button type="button" data-levar="${k}" class="${qual === k ? 'on' : ''}">${{ caixa: 'Caixa', carteira: 'Carteira', plano: 'Plano' }[k]}</button>`).join('')}</div>` : '';
  // um passo: feito (✓, dá para refazer), o de agora (destacado) ou travado (cadeado, botões desligados)
  const p = (n, tituloP, corpo) => {
    const st = n <= passo ? 'feito' : n === passo + 1 ? 'agora' : 'trava';
    return `<li class="passo-lv ${st}"><div class="passo-cab"><span class="etapa-ic">${st === 'feito' ? '✓' : st === 'trava' ? svgCadeado : n}</span><b>${tituloP}</b></div>
      ${st === 'trava' ? `<p class="passo-trava">Abre depois do passo ${n - 1}.</p>${n === 2 ? `<textarea id="lvTexto" hidden>${esc(texto)}</textarea>` : ''}` : `<div class="passo-corpo">${corpo}</div>`}</li>`;
  };
  const concluido = !fechar ? false : ETAPAS.every(e => f.feito?.[e]);
  const quando = (() => { try { return agendaClaude(estado.dados, estado.cart.dados, hojeBrasil()); } catch { return []; } })();
  const folha = abrirFolha(`
    <h2>Levar para o Claude</h2>
    ${quando.length ? `<details class="dobra"><summary><span>Quando rodar o Claude${quando.some(q => q.agora) ? ` · agora: ${quando.filter(q => q.agora).map(q => q.nome).join(', ')}` : ''}</span></summary><ul class="linhas">${quando.map(q => `<li><span>${esc(q.nome)}<small>${esc(q.frequencia)}${q.ultima ? ` · última vez ${esc(dataCurta(q.ultima))}` : ''}${q.agora && q.motivo ? ` · ${esc(q.motivo)}` : ''}</small></span><b>${q.agora ? 'agora' : esc(dataCurta(q.proxima))}</b></li>`).join('')}</ul><p class="nota">O app avisa no último dia do mês e quando o cenário muda (lembretes ligados).</p></details>` : ''}
    ${mesF ? `<div class="escolha levar-modo" role="tablist">
      <button type="button" data-lv-modo="fechamento" class="${fechar ? 'on' : ''}">Fechamento de ${esc(mesNome)}</button>
      <button type="button" data-lv-modo="dia" class="${fechar ? '' : 'on'}">Análise do dia</button>
    </div>` : ''}
    <p class="meta">${fechar ? `Três etapas, nesta ordem, cada uma numa <b>conversa nova</b> do Projeto "Vida financeira". Cada etapa tem 3 passos; o próximo só abre quando o anterior estiver feito.` : qual === 'plano' ? 'Os dois arquivos juntos, para olhar a vida financeira toda. Numa conversa nova do Projeto.' : `Uma análise de hoje, sem fechar o mês, numa conversa nova do Projeto (modo ${qual === 'caixa' ? 'CAIXA' : 'CARTEIRA'}).`}</p>
    <div class="${fechar ? 'levar-fech' : 'levar-dia'}">${etapas}</div>
    ${concluido ? `<p class="nota">${icTom('bom')} Fechamento de ${esc(mesNome)} concluído. Se quiser refazer uma etapa, toque nela.</p>` : ''}
    ${!fechar && !mesF && estado.fechamento?.mes && ETAPAS.every(e => estado.fechamento.feito?.[e]) && mesSeguinte(estado.fechamento.mes) === estado.dados.periodo ? `<p class="nota">${icTom('bom')} Fechamento de ${esc(MESES_LONGOS[Number(estado.fechamento.mes.slice(5)) - 1])} concluído.</p>` : ''}
    ${fechar ? `<p class="etapa-agora">Etapa ${nEtapa} de 3 · <b>${esc(titulo(qual))}</b><small>${esc(ORDEM_FECH[nEtapa - 1][2])}</small></p>` : ''}
    ${conector ? `<div class="passo-corpo">
      <p class="passo-txt">O conector Claude direto está ligado: <b>nada de arquivo</b>. Copie o pedido, cole numa conversa nova do Projeto "Vida financeira" e envie. ${fechar && qual !== 'plano' ? 'O Claude lê o Lastro, mostra o resumo e deixa o mês novo pronto como rascunho: ele aparece no Início em <b>Fechamento pronto</b> e só vai para a família quando você tocar em Aplicar.' : 'O Claude lê o Lastro, mostra o que vai mudar e só grava depois do seu "pode gravar" — o app recebe sozinho.'}</p>
      <details class="ver-texto"><summary>Ver o pedido</summary><textarea class="pn-exp modelo" id="lvTexto" spellcheck="false">${esc(texto)}</textarea></details>
      <label for="lvExtra">Quer acrescentar algo? <span class="opcional">(opcional)</span></label>
      <textarea class="campo" id="lvExtra" rows="2" placeholder="Ex.: quero entender por que o mercado subiu tanto este mês"></textarea>
      <button type="button" class="btn prim" id="lvCopiar">Copiar o pedido</button>
      <button type="button" class="link" id="lvArquivo">Prefiro mandar o arquivo</button>
    </div>` : `<ol class="passos-lv">
      ${p(1, `Mande ${qual === 'plano' ? 'os dois arquivos' : 'o arquivo'} para o Claude`, `<p class="passo-txt">Toque em Compartilhar e escolha o app do Claude: ele abre uma conversa nova com ${qual === 'plano' ? 'os arquivos' : 'o arquivo'} anexado${qual === 'plano' ? 's' : ''}. <small>${esc(nome)}</small></p>
        <button type="button" class="btn${passo === 0 ? ' prim' : ''}" id="lvEnviar">Compartilhar com o Claude</button>
        <button type="button" class="link" id="lvBaixar">Baixar em vez de compartilhar</button>`)}
      ${p(2, 'Cole o pedido na mesma conversa', `<details class="ver-texto"><summary>Ver o pedido</summary><textarea class="pn-exp modelo" id="lvTexto" spellcheck="false">${esc(texto)}</textarea></details>
        <label for="lvExtra">Quer acrescentar algo? <span class="opcional">(opcional)</span></label>
        <textarea class="campo" id="lvExtra" rows="2" placeholder="Ex.: quero entender por que o mercado subiu tanto este mês"></textarea>
        <button type="button" class="btn${passo === 1 ? ' prim' : ''}" id="lvCopiar">Copiar o pedido</button>
        <p class="passo-txt"><small>Depois de copiar, volte para a conversa no Claude, cole e envie.</small></p>`)}
      ${p(3, 'Traga a resposta de volta', `<p class="passo-txt">Quando o Claude terminar, baixe o que ele devolver: ${esc(qual === 'caixa' && fechar && painelSemForaDoMes(estado.conteudo?.html) ? 'desta vez, o painel do caixa (painel_cashflow_….html) — vem com o painel corrigido e os dados do mês novo. Até importar, o app só deixa lançar compras no cartão.' : DE_VOLTA[qual])}</p>
        <button type="button" class="btn${passo === 2 ? ' prim' : ''}" id="lvImportar">Importar o arquivo do Claude</button>`)}
    </ol>`}
    ${fechar && !feita ? '<button type="button" class="link" id="lvFeita">Já fiz esta etapa de outro jeito</button>' : ''}`);
  folha.querySelectorAll('[data-levar]').forEach(b => { b.onclick = () => b.dataset.levar !== qual && abrirLevarClaude(b.dataset.levar, { modo }); });
  folha.querySelectorAll('[data-lv-modo]').forEach(b => { b.onclick = () => b.dataset.lvModo !== modo && abrirLevarClaude(undefined, { modo: b.dataset.lvModo }); });
  const ligar = (id, fn) => folha.querySelector(id)?.addEventListener('click', fn);
  ligar('#lvEnviar', async () => { if (await enviar(false)) avancar(1); });
  ligar('#lvBaixar', async () => { if (await enviar(true)) avancar(1); });
  ligar('#lvImportar', () => escolherArquivo());
  ligar('#lvArquivo', () => abrirLevarClaude(qual, { modo, arquivo: true }));
  // dois toques: o primeiro explica, o segundo pula (folha de confirmação fecharia esta)
  ligar('#lvFeita', e => {
    const b = e.currentTarget;
    if (b.dataset.certeza) return marcarEtapa(qual);
    b.dataset.certeza = '1';
    b.textContent = `Toque de novo para pular "${titulo(qual)}" (só se já fez por outro caminho)`;
  });
  ligar('#lvCopiar', async () => {
    const extra = folha.querySelector('#lvExtra').value.trim();
    const area = folha.querySelector('#lvTexto');
    const tudo = extra ? `${area.value}\n\nAlém disso: ${extra}` : area.value;
    try {
      await navigator.clipboard.writeText(tudo);
      aviso({ titulo: 'Pedido copiado', detalhe: conector ? 'Cole numa conversa nova do Projeto e envie.' : 'Volte para a conversa no Claude, cole e envie.' }, { tom: 'ok' });
      // no fechamento pelo conector, carteira e caixa ficam feitos ao aplicar o rascunho (importação); o plano, ao copiar
      if (conector) { if (fechar) marcarEtapa(qual, qual === 'plano' ? 'feito' : 'iniciado'); return; }
      avancar(2);
    } catch {
      folha.querySelector('.ver-texto').open = true;
      area.value = tudo;
      area.select();
      aviso('Não deu para copiar sozinho: o texto ficou selecionado.');
    }
  });
}
export const svgCadeado = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

export async function abrirLancamentos() {
  const hist = estado.dados ? historicoApp(estado.dados) : [];
  const ultimo = ((await banco.ler('desfazer')) || []).at(-1);
  const folha = abrirFolha(`
    <h2>Lançamentos do app</h2>
    <p class="meta">O que foi lançado pelo app neste mês. Fica registrado no painel, então o agente também vê. No fechamento do mês, exporte os dados e leve para a conversa com o agente.</p>
    ${hist.length
      ? `<ul class="historico-app">${hist.map(h => `<li><span>${esc(dataCurta(h.data))}</span><p>${esc(h.texto)}</p></li>`).join('')}</ul>`
      : '<p class="meta">Nada lançado pelo app neste mês.</p>'}
    <button type="button" class="btn prim" id="lancarNovo">Lançar gasto</button>
    ${ultimo ? `<button type="button" class="btn" id="desfazer">Desfazer: ${esc(ultimo.rotulo)}</button>` : ''}
    <button type="button" class="btn" id="exportar">Levar para o Claude</button>`);
  folha.querySelector('#lancarNovo').onclick = () => abrirLancar();
  folha.querySelector('#desfazer')?.addEventListener('click', desfazerUltimo);
  folha.querySelector('#exportar').onclick = () => abrirLevarClaude();
}
