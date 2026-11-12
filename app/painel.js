// Leitura do arquivo gerado pelo Agente Financeiro.
//
// O painel é um HTML único que carrega os dados num
// <script type="application/json" id="cashflow-data">…</script>.
// Daqui o app tira o resumo (período, data) e, quando chega só o JSON,
// encaixa os dados novos no último HTML conhecido.

const RE_DADOS = /(<script[^>]*id=["']cashflow-data["'][^>]*>)([\s\S]*?)(<\/script>)/i;

export const ehPainel = html => RE_DADOS.test(html);

export function extrairDados(html) {
  const m = html.match(RE_DADOS);
  if (!m) throw new Error('Este HTML não é um painel do Agente Financeiro (falta o bloco cashflow-data).');
  return JSON.parse(m[2]);
}

export function aplicarDados(htmlBase, dados) {
  if (!ehPainel(htmlBase)) throw new Error('Não há um painel base para encaixar os dados.');
  // "<\/" é um escape válido em JSON e impede que o texto feche a tag <script> antes da hora
  const json = JSON.stringify(dados).replace(/<\//g, '<\\/');
  return htmlBase.replace(RE_DADOS, (_, abre, _velho, fecha) => abre + json + fecha);
}

export function resumo(html) {
  const d = extrairDados(html);
  return { periodo: d.periodo, periodoLabel: mesBonito(d.periodoLabel), ultimaAtualizacao: d.ultimaAtualizacao };
}

// Aceita o .html completo do painel ou só o .json de dados (usando htmlBase como molde).
export function lerArquivo(texto, htmlBase) {
  if (ehPainel(texto)) {
    extrairDados(texto); // valida o JSON embutido
    return texto;
  }
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    throw new Error('Arquivo não reconhecido. Use o painel (.html) ou os dados (.json) gerados pelo agente.');
  }
  if (!dados || !dados.periodo) throw new Error('Esse JSON não parece ser o cashflow (falta "periodo").');
  if (!htmlBase) throw new Error('Para importar só o JSON, importe antes um painel .html completo (ele serve de molde).');
  return aplicarDados(htmlBase, dados);
}

// "OUTUBRO/2026" (como o agente escreve) → "Outubro/2026" para as telas
export const mesBonito = s => (typeof s === 'string' && s === s.toUpperCase() ? s.toLowerCase().replace(/^\p{L}/u, c => c.toUpperCase()) : s);
