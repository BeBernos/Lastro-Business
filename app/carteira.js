// Leitura do painel da carteira (gerado pela skill gestor de carteira no Claude).
//
// Mesmo modelo do painel de cashflow (painel.js): um HTML único com os dados em
// <script type="application/json" id="carteira-data">…</script>. Quando chega só o JSON,
// ele é encaixado no último HTML da carteira conhecido.
// Aqui também ficam as leituras simples dos dados (somas e buscas) que o app usa no Início
// e na conferência cruzada — nenhuma conta de rentabilidade é refeita (isso é do painel).

const RE_CARTEIRA = /(<script[^>]*id=["']carteira-data["'][^>]*>)([\s\S]*?)(<\/script>)/i;

export const ehCarteira = html => RE_CARTEIRA.test(html);

// JSON solto da carteira: tem alocação-alvo e histórico mensal
export const ehDadosCarteira = d => !!d && typeof d === 'object' && !!d.target_allocation && !!d.historico_mensal;

export function extrairCarteira(html) {
  const m = html.match(RE_CARTEIRA);
  if (!m) throw new Error('Este HTML não é um painel da carteira (falta o bloco carteira-data).');
  return JSON.parse(m[2]);
}

export function aplicarCarteira(htmlBase, dados) {
  if (!ehCarteira(htmlBase)) throw new Error('Não há um painel da carteira base para encaixar os dados.');
  const json = JSON.stringify(dados).replace(/<\//g, '<\\/');
  return htmlBase.replace(RE_CARTEIRA, (_, abre, _velho, fecha) => abre + json + fecha);
}

// Aceita o .html completo da carteira ou só o .json (usando htmlBase como molde).
export function lerArquivoCarteira(texto, htmlBase) {
  if (ehCarteira(texto)) {
    extrairCarteira(texto);
    return texto;
  }
  const dados = JSON.parse(texto);
  if (!ehDadosCarteira(dados)) throw new Error('Esse JSON não parece ser a carteira.');
  if (!htmlBase) throw new Error('Para importar só o JSON da carteira, importe antes o painel da carteira (.html) completo.');
  return aplicarCarteira(htmlBase, dados);
}

// Mês mais recente do histórico (o aberto, se houver) e o valor da posição registrada.
export function posicao(d) {
  const meses = Object.keys(d.historico_mensal || {}).sort();
  const chave = meses[meses.length - 1];
  const h = d.historico_mensal[chave] || {};
  const total = h.patrimonio_parcial ?? h.patrimonio_total
    ?? Object.values(h.composicao || {}).reduce((s, c) => s + (c.valor || 0), 0);
  const data = h.atualizado_em || d.meta_arquivo?.versao || `${chave}-01`;
  return { mes: chave, h, total, data, emAndamento: h.status === 'em_andamento' };
}

export function resumoCarteira(html) {
  const d = extrairCarteira(html);
  const p = posicao(d);
  return { data: p.data, total: p.total, mes: p.mes };
}

// Valor de cada ativo na posição registrada: { chave: valor } (renda fixa, FIIs, ETFs e classes soltas)
export function valoresAtivos(h) {
  const out = {};
  for (const [k, v] of Object.entries(h.ativos || {})) {
    if (typeof v === 'number') out[k] = v;
    else if (v && typeof v === 'object') Object.assign(out, v);
  }
  return out;
}

// Reserva de emergência: soma dos ativos que a compõem × alvo do perfil
export function reserva(d) {
  const r = d.perfil?.reserva_emergencia;
  if (!r) return null;
  const vals = valoresAtivos(posicao(d).h);
  const atual = (r.ativos_que_compoem || []).reduce((s, k) => s + (vals[k] || 0), 0);
  return { alvo: r.alvo || 0, atual, veiculo: r.veiculo, regra: r.regra };
}

// Próximo passo pendente do plano de ação
export function proximoPasso(d) {
  return (d.plano_acao?.passos || []).find(p => /pendente/i.test(p.status || '')) || null;
}
