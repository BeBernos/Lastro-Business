// Lastro Demo — dados de uma família fictícia, gerados na hora (as datas andam com o calendário: a demo nunca envelhece).
// Marina Duarte, 36, arquiteta autônoma (PJ, renda que varia) em Curitiba; Rafael, professor (CLT); Theo, 7; a gata Mia.
// Determinístico: a mesma data dá os mesmos dados. Nada aqui vem da vida real de ninguém.
// gerarDemo('AAAA-MM-DD') → { cf (contrato cashflow-data), cart (contrato carteira-data) }

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CAP = MESES.map(m => m[0].toUpperCase() + m.slice(1));
const c2 = v => Math.round(v * 100) / 100;
const pad = n => String(n).padStart(2, '0');
const somaMes = (ym, n) => { const [a, m] = ym.split('-').map(Number), t = a * 12 + m - 1 + n; return `${Math.floor(t / 12)}-${pad((t % 12) + 1)}`; };
const diasDo = ym => new Date(Number(ym.slice(0, 4)), Number(ym.slice(5)), 0).getDate();
// gerador pseudoaleatório com semente (o mesmo mês dá as mesmas compras)
function sorteio(semente) {
  let s = [...semente].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Compras do dia a dia no cartão (loja, categoria, valor típico, vezes por mês)
const ROTINA = [
  ['Mercado Bom Preço', 'Supermarket', 210, 4], ['Hortifruti Batel', 'Supermarket', 58, 4], ['Padaria Aurora', 'Supermarket', 26, 6],
  ['iFood', 'Food Delivery', 74, 3], ['Restaurante Madalosso', 'Restaurant', 168, 1], ['Café do Largo', 'Restaurant', 32, 3],
  ['Uber', 'Transportation', 23, 6], ['Posto Ipiranga', 'Transportation', 190, 2], ['Drogaria Raia', 'Health', 64, 2],
  ['Petz', 'Mia', 118, 1], ['Livraria Curitiba', 'Theo', 72, 1], ['Leroy Merlin', 'Home', 143, 1], ['Renner', 'Clothing', 189, 1],
];
const ASSINATURAS = [
  ['Netflix', 44.9, 8, 'Streaming'], ['Spotify Família', 34.9, 12, 'Streaming'], ['Adobe Creative Cloud', 124, 3, 'Services'],
  ['Google One', 9.99, 15, 'Services'], ['Academia Rafael', 119.9, 5, 'Gym'], ['Ballet do Theo', 210, 10, 'Theo'], ['Plano pet Mia', 59.9, 20, 'Mia'],
];

function cartaoDoMes(periodo, ate, hojeDia) {
  const rnd = sorteio(`cartao-${periodo}`);
  const lanc = [];
  for (const [loja, cat, base, vezes] of ROTINA) {
    for (let i = 0; i < vezes; i++) {
      const dia = 1 + Math.floor(rnd() * diasDo(periodo));
      if (dia > ate) continue;
      lanc.push({ data: `${periodo}-${pad(dia)}`, descricao: loja, valor: c2(base * (0.7 + rnd() * 0.6)), cat, origem: 'sms' });
    }
  }
  lanc.sort((a, b) => a.data.localeCompare(b.data));
  const assinaturas = ASSINATURAS.map(([nome, valor, dia, cat]) => ({ nome, valor, dia, cat }));
  // parcelas de compras de meses anteriores (geladeira 10x e notebook 12x), contadas a partir de hoje
  const parcelamentos = [
    { item: 'Geladeira Brastemp — parcela R$389,90', atual: '4/10', ultimaParcela: somaMes(periodo, 6), saiDaFaturaA_partir_de: somaMes(periodo, 7), cat: 'Home' },
    { item: 'Notebook do escritório — parcela R$412,50', atual: '9/12', ultimaParcela: somaMes(periodo, 3), saiDaFaturaA_partir_de: somaMes(periodo, 4), cat: 'Electronics' },
  ];
  const valParc = [389.9, 412.5];
  const porCat = {};
  const somar = (cat, v) => { porCat[cat] = c2((porCat[cat] || 0) + v); };
  lanc.forEach(l => somar(l.cat, l.valor));
  assinaturas.forEach(a => somar(a.cat, a.valor));
  parcelamentos.forEach((p, i) => somar(p.cat, valParc[i]));
  const categorias = Object.entries(porCat).map(([cat, valor]) => ({ cat, valor })).sort((a, b) => b.valor - a.valor);
  const total = c2(categorias.reduce((s, c) => s + c.valor, 0));
  const parcelas = c2(valParc.reduce((s, v) => s + v, 0));
  const agendado = c2(assinaturas.reduce((s, a) => s + a.valor, 0));
  return {
    id: 'var-itau', descricao: `Cartão Itaú — ciclo de ${MESES[Number(periodo.slice(5)) - 1]}`, categoria: 'cartao', valor: total, dia: null,
    status: 'parcial', cicloSeguinte: true, atualizadoDia: hojeDia, categorias,
    composicao: { parcelas, agendado, gastoLivre: c2(total - parcelas - agendado) },
    parcelamentos, assinaturas, reembolsos: [], pontuaisGrandes: [], lancamentosApp: lanc,
  };
}

export function gerarDemo(hoje = new Date().toISOString().slice(0, 10)) {
  const periodo = hoje.slice(0, 7), dia = Number(hoje.slice(8, 10)), ano = Number(hoje.slice(0, 4)), mesN = Number(hoje.slice(5, 7));
  const st = d => (d <= dia ? 'confirmado' : 'pendente');
  const ultimoDia = diasDo(periodo);
  const receitas = [
    { id: 'rec-adiantamento', descricao: 'Salário Rafael — adiantamento', categoria: 'salario', valor: 2310, dia: 15, status: st(15) },
    { id: 'rec-salario', descricao: 'Salário Rafael — 2ª parcela', categoria: 'salario', valor: 3185.4, dia: ultimoDia, status: st(ultimoDia) },
    { id: 'rec-pj-marina', descricao: 'Marina — projetos de arquitetura (PJ)', categoria: 'salario', valor: 8400, dia: 20, status: st(20), nota: 'Renda que varia com os projetos fechados no mês.' },
    { id: 'rec-rendimento', descricao: 'Rendimento — aplicação automática', categoria: 'extraordinaria', valor: 3.12, dia: 2, status: st(2) },
    { id: 'rec-dividendo-xpml11', descricao: 'Dividendo XPML11', categoria: 'extraordinaria', valor: 46.8, dia: 14, status: st(14) },
    { id: 'rec-dividendo-visc11', descricao: 'Dividendo VISC11', categoria: 'extraordinaria', valor: 38.4, dia: 16, status: st(16) },
  ];
  const fixa = (id, descricao, categoria, valor, d) => ({ id, descricao, categoria, valor, dia: d, status: st(d) });
  const despesasFixas = [
    fixa('fix-aluguel', 'Aluguel', 'moradia', 3200, 5), fixa('fix-escola', 'Escola do Theo', 'educacao', 1450, 5),
    fixa('fix-plano-saude', 'Plano de saúde', 'saude', 1380, 8), fixa('fix-condominio', 'Condomínio', 'moradia', 780, 10),
    fixa('fix-coworking', 'Coworking (escritório da Marina)', 'trabalho', 650, 10), fixa('fix-energia', 'Energia', 'contas', 238.4, 12),
    fixa('fix-internet', 'Internet e celulares', 'contas', 189.9, 15), fixa('fix-das', 'DAS do Simples (Marina)', 'impostos', 504, 20),
    fixa('fix-mesada-rafael', 'Mesada pessoal — Rafael', 'familia', 300, ultimoDia), fixa('fix-mesada-theo', 'Mesada — Theo (poupança dele)', 'familia', 100, ultimoDia),
  ];
  const cartao = cartaoDoMes(periodo, dia, dia);
  const anterior = somaMes(periodo, -1);
  const faturaAnterior = 5368.2;
  const despesasVariaveis = [cartao,
    { id: 'var-feira', descricao: 'Pix — Feira de orgânicos', categoria: 'mercado', valor: 96, dia: Math.min(dia, 7), status: 'confirmado', metodo: 'pix' }];
  const obrigacoesCaixa = [{ id: `pag-fatura-itau-${MESES[Number(anterior.slice(5)) - 1]}`, descricao: `Pagamento fatura Itaú — ciclo de ${MESES[Number(anterior.slice(5)) - 1]}`, valor: faturaAnterior, dia: 7, status: st(7) }];
  // fechamentos dos 6 meses anteriores (totais) e a fatura de cada um
  const historicoFaturas = [4920.4, 5610.15, 6140.8, 5230.6, 4988.1, faturaAnterior];
  const mesesFechados = historicoFaturas.map((f, i) => {
    const p = somaMes(periodo, i - 6);
    const receitaTotal = c2(13800 + (i % 3) * 950 - (i === 2 ? 2600 : 0)); // um mês apertado (poucos projetos) e a volta
    const fixasTotal = 8792.3, variaveisTotal = c2(f + 120);
    return { periodo: p, periodoLabel: `${MESES[Number(p.slice(5)) - 1].toUpperCase()}/${p.slice(0, 4)}`, fechadoEm: `${p}-${pad(diasDo(p))}`,
      resultado: { receitaTotal, fixasTotal, variaveisTotal, saldo: c2(receitaTotal - fixasTotal - variaveisTotal), saldoSalario: c2(5495.4 - fixasTotal - variaveisTotal + 8400), statusFinal: receitaTotal - fixasTotal - variaveisTotal < 0 ? 'CRÍTICO' : 'OK' },
      itau: f, resgates: 0, resgatesCaixa: 0, notas: i === 2 ? 'Mês com poucos projetos fechados pela Marina: a reserva cobriu a diferença e os aportes pararam.' : 'Mês fechado e conferido com o extrato.' };
  });
  const historicoItau = historicoFaturas.map((valor, i) => ({ mes: MESES_CAP[Number(somaMes(periodo, i - 6).slice(5)) - 1], valor, status: 'fechado' }));
  const patrimonio = { fundos: 98250, fiis: 31420, etfs: 46830, ouro: 0, dolar: 0, cripto: 6120 };
  const feriados = { nota: 'Feriados nacionais (demonstração).', datas: Object.fromEntries([[1, 1, 'Confraternização Universal'], [4, 21, 'Tiradentes'], [5, 1, 'Dia do Trabalho'], [9, 7, 'Independência'], [10, 12, 'Nossa Senhora Aparecida'], [11, 2, 'Finados'], [11, 15, 'Proclamação da República'], [12, 25, 'Natal']].flatMap(([m, d, n]) => [ano, ano + 1].map(a => [`${a}-${pad(m)}-${pad(d)}`, n]))) };
  const cf = {
    periodo, periodoLabel: `${MESES[mesN - 1].toUpperCase()}/${ano}`, ultimaAtualizacao: hoje, caixaInicial: 15240.55,
    caixaInicialNota: 'Saldo da conta no fim do mês anterior, conferido com o banco.',
    regras: { metaSalario: 1500, limiteSaudavelItau: 5600, tetoSugeridoMin: 5000, tetoSugeridoMax: 5400, bufferCaixaDesejado: 2000, diasCarenciaJuros: 0,
      mesadaRafaelAlvo: 300, mesadaObrigatoria: { rafael: 300, theo: 100, nota: 'Mesadas da família.' }, pisoGastoPontual: 400 },
    folha: { nota: 'Salário do Rafael (CLT).', salarioBruto: 6800, trienio: 0, inssTeto: 908.86, dependentes: 1, deducaoPorDependente: 189.59, aliquotaIRRF: 0.225, parcelaDeduzirIRRF: 662.77, adiantamentoFixo: 2310 },
    calendario: { nota: 'Dias de cada conta.', salario1: 15, salario2: ultimoDia, aluguel: 5, faturaCartao: 7, condominio: 10, energia: 12, internet: 15 },
    receitas, despesasFixas, despesasVariaveis, obrigacoesCaixa, resgates: [], ajustesCaixa: [], patrimonio,
    patrimonioNota: 'Cópia da carteira (classes).', historicoItau, mesesFechados,
    prioridadeResgate: ['Tesouro Selic (reserva)', 'CDB liquidez diária'], prioridadeAporte: ['Dólar', 'Renda fixa'], naoAportarEm: ['Ações Brasil'],
    naoAportarNota: 'Enquanto estiverem acima do alvo.', targetAlocacao: { fundos: 50, etfsFiis: 35, ouro: 0, dolar: 10, cripto: 5 }, feriados,
    projecaoConfig: { nota: 'Projeção dos próximos meses.', gastoLivreReferencia: 3600, mesesBaseGastoLivre: 3, variaveisForaCartao: [], irParcelas: {}, irValor: 0, irUltimoMes: periodo },
    premissas: { taxaRetornoMensal: { definidoEm: `${anterior}-01`, revisarACadaDias: 180, descricao: 'Retorno mensal assumido (0,7%/mês) na projeção de 5 anos.' } },
    pendencias: ['Confirmar o valor da nota fiscal do projeto residencial do Batel (Marina).'],
    atualizacoes: [{ data: `${periodo}-01`, acao: `Abertura de ${MESES[mesN - 1]} depois do fechamento de ${MESES[Number(anterior.slice(5)) - 1]}.` }],
    parcelamentosExternos: [], valoresConhecidos: [], reconciliacoes: [],
    orcamentos: [{ cat: 'Supermarket', limite: 1400 }, { cat: 'Food Delivery', limite: 300 }, { cat: 'Restaurant', limite: 350 }, { cat: 'Transportation', limite: 600 }, { cat: 'Clothing', limite: 250 }],
    capacidadeAporte: { calculadoEm: hoje, meses: Array.from({ length: 12 }, (_, i) => ({ mes: somaMes(periodo, i), sobraSegura: [1850, 1200, 2100, 1650, 1900, 2300, 1400, 2000, 2150, 1700, 2250, 2400][i] })), nota: 'Quanto dá para investir por mês sem deixar a conta abaixo da reserva.' },
    analises: [
      { data: hoje, tipo: 'alerta', titulo: 'Delivery acima do combinado', texto: 'O iFood já passou de 80% do orçamento do mês. Nas outras semanas do mês, cozinhar em casa nos dias de escritório resolve.', acao: 'Segurar o delivery até o dia 20.' },
      { data: hoje, tipo: 'oportunidade', titulo: 'Sobra boa para o Japão', texto: 'Com os projetos do mês confirmados, sobra para o aporte da meta da viagem sem tocar na reserva.', acao: 'Aportar no Tesouro IPCA+ depois do dia 20.' },
    ],
  };
  return { cf, cart: gerarCarteira(hoje, patrimonio) };
}

// ---------- carteira ----------
function gerarCarteira(hoje, p) {
  const periodo = hoje.slice(0, 7);
  const ativos = { renda_fixa: { tesouro_selic: 42000, tesouro_ipca_2035: 31250, cdb_banco_inter: 25000 }, fiis: { xpml11: 16020, visc11: 15400 },
    etfs: { ivvb11: 28430, bova11: 18400 }, ouro: 0, dolar: 0, cripto: p.cripto };
  const soma = o => Object.values(o).reduce((s, v) => s + (typeof v === 'number' ? v : soma(v)), 0);
  const composicao = a => {
    const cls = { renda_fixa: soma(a.renda_fixa), etfs_fiis: soma(a.fiis) + soma(a.etfs), ouro: a.ouro, dolar: a.dolar, cripto: a.cripto };
    const t = soma(cls);
    return Object.fromEntries(Object.entries(cls).map(([k, v]) => [k, { valor: c2(v), percentual: c2((v / t) * 100) }]));
  };
  const historico_mensal = {};
  for (let i = 12; i >= 1; i--) {
    // patrimônio crescendo ~1,2% ao mês (aportes + mercado); cada ativo num ritmo seu, senão "melhor" e "pior" empatam
    const m = somaMes(periodo, -i), ritmo = k => 0.004 + ([...k].reduce((s, c) => s + c.charCodeAt(0), 0) % 13) * 0.0012;
    const a = JSON.parse(JSON.stringify(ativos), (k, v) => (typeof v === 'number' ? c2(v * (1 - i * ritmo(k))) : v));
    historico_mensal[m] = { status: 'fechado', atualizado_em: `${m}-${pad(diasDo(m))}`, dividendos: 81.6, aportes: 1500, resgates: 0, resultado_mercado: c2(soma(a) * 0.004),
      fluxos: [{ tipo: 'aporte', ativo: 'tesouro_ipca_2035', valor: 1500, data: `${m}-21`, origem: 'caixa' }], composicao: composicao(a), ativos: a,
      dividendos_detalhe: { xpml11: 43.2, visc11: 38.4 }, patrimonio_total: c2(soma(a)) };
  }
  historico_mensal[periodo] = { status: 'em_andamento', atualizado_em: hoje, patrimonio_parcial: c2(soma(ativos)), dividendos: 0, aportes: 0, resgates: 0, resultado_mercado: null,
    fluxos: [], composicao: composicao(ativos), ativos, ativos_atualizado_em: {}, nota: 'Mês aberto pelo app.',
    fontes_app: { itau: ['tesouro_selic', 'tesouro_ipca_2035', 'xpml11', 'visc11', 'ivvb11', 'bova11'], binance: ['cripto'] } }; // v9.30: onde cada ativo está
  return {
    meta_arquivo: { versao: hoje, nota: 'Carteira de demonstração (dados fictícios).' },
    perfil: { idade: 36, horizonte_aposentadoria_anos: 24, objetivo: 'Viagem ao Japão em 2 anos, troca de carro e independência financeira aos 60.', reserva_emergencia: { alvo: 42000, veiculo: 'Tesouro Selic', regra: 'Seis meses de custo da casa.', ativos_que_compoem: ['tesouro_selic'] } },
    target_allocation: { renda_fixa: 40, etfs_fiis: 50, ouro: 0, dolar: 5, cripto: 5 },
    estrategia: { prioridade_aporte: ['Dólar', 'Renda fixa'], prioridade_resgate: ['Tesouro Selic (reserva)', 'CDB Banco Inter'], alvos: [{ classe: 'reserva', pct: 20 }, { classe: 'renda_fixa', pct: 30 }, { classe: 'fiis', pct: 15 }, { classe: 'acoes_br', pct: 10 }, { classe: 'dolar', pct: 20 }, { classe: 'cripto', pct: 5 }], revisada_em: hoje, tese: 'Reserva primeiro, depois dólar com dinheiro novo; FIIs pagam parte das contas fixas.',
      evitar_retirar_de: ['Tesouro IPCA+ 2035'], regra_saque: 'Primeiro o Tesouro Selic; o resto só com decisão.', prazo: '4 anos', escada_renda_fixa: [], gatilhos: [] },
    fundos_renda_fixa: { tesouro_selic: { taxa_produto: 0, liquidez: 'D+0', pct_cdi_12m: 100 }, cdb_banco_inter: { taxa_produto: 0, liquidez: 'D+0', pct_cdi_12m: 102 }, tesouro_ipca_2035: { taxa_produto: 0, liquidez: 'D+1', pct_cdi_12m: 110, vencimento: '2035-05-15' } },
    historico_mensal,
    custo_medio: { atualizado_em: hoje, ativos: { xpml11: { qtd: 150, pm: 102.4, pm_prov: 102.4 }, visc11: { qtd: 160, pm: 93.1, pm_prov: 93.1 }, ivvb11: { qtd: 82, pm: 312.5, pm_prov: 312.5 }, bova11: { qtd: 150, pm: 118.2, pm_prov: 118.2 } } },
    projecao_dividendos: { [periodo]: { atualizado_em: hoje, ativos: { xpml11: { cotas: 150, valor_cota: 0.312, total: 46.8, confirmado: true, pagamento: `14/${periodo.slice(5)}/${periodo.slice(0, 4)}`, pago: false }, visc11: { cotas: 160, valor_cota: 0.24, total: 38.4, confirmado: true, pagamento: `16/${periodo.slice(5)}/${periodo.slice(0, 4)}`, pago: false } } } },
    meta_dolarizacao: { alvo_pct: 20, prazo: `${Number(periodo.slice(0, 4)) + 3}-12`, ritmo_mensal: 600, conta_como_dolar: ['dolar', 'cripto', 'ivvb11'], regra: 'Só dinheiro novo, sem vender nada.', revisado_em: hoje },
    plano_aportes: [{ mes: periodo, ativo: 'tesouro_ipca_2035', valor: 1200, motivo: 'meta da viagem ao Japão' }, { mes: periodo, ativo: 'ivvb11', valor: 600, motivo: 'dolarização com dinheiro novo' }],
    metas: [{ id: 'japao', nome: 'Viagem ao Japão', alvo: 38000, prazo: `${Number(periodo.slice(0, 4)) + 2}-04`, ativos: ['tesouro_ipca_2035'], guardado: null }, { id: 'reserva', nome: 'Reserva de 6 meses', alvo: 42000, prazo: null, ativos: ['tesouro_selic'], guardado: null }],
    analises: [{ data: hoje, tipo: 'info', titulo: 'Dólar abaixo do alvo', texto: 'A carteira tem 18% em dólar (IVVB11 e cripto) para um alvo de 20%: o aporte do mês em IVVB11 aproxima sem vender nada.', acao: 'Seguir o plano de aportes.' }],
    score_historico: { nota: 'Score no fechamento de cada mês.', [somaMes(periodo, -2)]: { total: 81, reserva: 24, aderencia: 36, disciplina: 21 }, [somaMes(periodo, -1)]: { total: 86, reserva: 27, aderencia: 37, disciplina: 22 } },
    projecao_aposentadoria: { nota: 'Premissas da projeção.', taxa_retorno_anual: 0.08, taxa_e_nominal: true, cenarios_aporte_mensal: [1000, 1800, 2500], aviso: 'Retorno de 8% a.a. é premissa, não promessa.', inflacao_anual: 0.04 },
    limites_concentracao: { nota: 'Limites dos alertas.', por_classe_atencao_pct: 40, por_classe_critico_pct: 55, por_ativo_no_patrimonio_atencao_pct: 25, por_ativo_no_patrimonio_critico_pct: 35, gap_alocacao_acima_pp: 4, gap_alocacao_abaixo_pp: 2 },
    limites_entrada: { nota: 'Variação acima disso pede conferência.', renda_fixa_pct: 5, cotas_pct: 30, fundos_pct: 20, cripto_usd_pct: 50 },
    regras_calculo: { dividendos: 'saem_para_caixa', resultado_mercado: 'variacao_patrimonial - aportes + resgates', retorno_total: 'resultado_mercado + dividendos', rentabilidade: 'Dietz modificado mensal' },
    cambio_referencia: { usd_brl_fim_ano_anterior: 5.42, ano: Number(periodo.slice(0, 4)) - 1, fonte: 'PTAX (demonstração)' },
    fundos_protecao: {},
    cripto_ativos: ['bitcoin', 'ethereum'],
    evolucao_ativos: { nota: 'Cotação de referência.', atualizado_em: hoje, fiis: { xpml11: { cotacao_inicio_ano: 101.2 }, visc11: { cotacao_inicio_ano: 92.4 } }, etfs: { ivvb11: { cotacao_atual: 346.7, var_12m_pct: 9.8 }, bova11: { cotacao_atual: 122.6, var_12m_pct: 6.1 } } },
    benchmark: { nota: 'Índices externos.', indices: { cdi: { ytd_pct: 11.2, data_ref: hoje, fonte: 'Banco Central (demonstração)' }, ifix: { ytd_pct: 2.4, data_ref: hoje, fonte: 'B3 (demonstração)' }, ibovespa: { ytd_pct: 6.8, data_ref: hoje, fonte: 'B3 (demonstração)' } } },
    panorama_mensal: { nota: 'Narrativa do mês.', [periodo]: { parcial_ate: hoje, indicadores: [{ nome: 'Selic', valor: 'estável', cor: 'gold', peso: 50 }, { nome: 'Ibovespa', valor: '+1,2% no mês', cor: 'green', peso: 60 }, { nome: 'Dólar', valor: '~R$5,40', cor: 'green', peso: 40 }], fases: [{ periodo: 'Até hoje', texto: 'Mês tranquilo: juros parados, bolsa subindo um pouco e os FIIs pagando em dia.' }], conclusao: 'Carteira andando junto com o mercado; o plano de aportes segue.' } },
    analise_mercado: { nota: 'Análise por ativo.', data_geral: hoje, ativos: [
      { dado: 'direto', d7: null, bench7: null, data_ref: hoje, urgencia: 'baixa', n: 'XPML11', ativo: 'xpml11', classe: 'FII · Shoppings', badge: 'b-green', dm: 3.1, bench: 'IFIX', benchm: 1.2, expl: 'Vacância baixa e dividendo estável.', acao: 'Manter.' },
      { dado: 'direto', d7: null, bench7: null, data_ref: hoje, urgencia: 'baixa', n: 'IVVB11', ativo: 'ivvb11', classe: 'ETF · S&P 500 em reais', badge: 'b-green', dm: 2.4, bench: 'S&P 500', benchm: 2.1, expl: 'Segue o índice americano mais o dólar: é o caminho da dolarização.', acao: 'Aportar pelo plano.' }] },
    // v10.0: a projeção de cada ativo (no Lastro de verdade, o Claude calcula no fechamento)
    projecao_ativos: { atualizado_em: hoje, horizonte_anos: 5, ativos: [
      ['tesouro_selic', 'Tesouro Selic', 42000, 10.5, 'Selic média de 10,5% a.a. nos próximos anos, sem aportes'],
      ['tesouro_ipca_2035', 'Tesouro IPCA+ 2035', 31250, 10.8, 'IPCA de 4% + taxa contratada de 6,5% a.a., sem aportes'],
      ['ivvb11', 'IVVB11', 28430, 9, 'Premissa de longo prazo da carteira para bolsa americana em reais: 9% a.a.'],
      ['xpml11', 'XPML11', 16020, 8.5, 'Cota estável + dividendos reinvestidos pelo yield atual (8,5% a.a.)'],
      ['cripto', 'Cripto', p.cripto, 12, 'Premissa de longo prazo da carteira para cripto: 12% a.a., com muita oscilação'],
    ].map(([ativo, nome, v0, taxa, premissa]) => ({ ativo, nome, taxa_anual: taxa, premissa, anos: [1, 2, 3, 4, 5].map(n => ({ ano: Number(periodo.slice(0, 4)) + n, valor: c2(v0 * (1 + taxa / 100) ** n) })) })) },
    plano_acao: { atualizado_em: hoje, concluidos: 1, total: 3, passos: [
      { n: 1, titulo: 'Conferir os dividendos do mês', status: 'CONCLUIDO', quando: `${periodo}-05`, valor: 85.2, valor_ref: 'xpml11' },
      { n: 2, titulo: 'Aportar no Tesouro IPCA+ 2035 (meta do Japão)', status: 'pendente', quando: `${periodo}-21`, valor: 1200, valor_ref: 'tesouro_ipca_2035' },
      { n: 3, titulo: 'Comprar IVVB11 com dinheiro novo', status: 'pendente', quando: `${periodo}-21`, valor: 600, valor_ref: 'ivvb11' }] },
  };
}
