// "Motor" das telas do app: lê os números e as análises do painel do agente.
//
// O painel (HTML gerado pelo agente) roda escondido num iframe. Daqui o app chama as funções
// dele — calc(), timeline(), aporte(), score(), projecao12()… — e lê os textos de análise que
// ele desenha (próxima ação, alertas, leitura do mês). Nenhum cálculo é refeito aqui.
// Cada parte é lida separadamente: se uma versão futura do painel mudar alguma coisa, só a
// seção correspondente some da tela; calc() e timeline() são obrigatórios.

const pad = n => String(n).padStart(2, '0');

// Dia "de hoje" dentro do período dos dados: o dia real, se ainda estamos no mesmo mês.
export function contexto(dados, agora = new Date()) {
  const [ano, mes] = dados.periodo.split('-').map(Number);
  const [uA, uM, uD] = (dados.ultimaAtualizacao || '').split('-').map(Number);
  const diaDados = uA === ano && uM === mes ? uD : 1;
  const mesmoMes = agora.getFullYear() === ano && agora.getMonth() + 1 === mes;
  const mesPassou = agora.getFullYear() * 12 + agora.getMonth() > ano * 12 + mes - 1;
  const dias = new Date(ano, mes, 0).getDate();
  return { ano, mes, dias, diaDados, diaHoje: mesmoMes ? Math.max(diaDados, agora.getDate()) : diaDados, mesPassou };
}

// Texto de um elemento do painel convertido em HTML seguro: só texto e negrito.
function htmlSeguro(el) {
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let out = '';
  for (const no of el.childNodes) {
    if (no.nodeType === 3) out += esc(no.textContent);
    else if (no.nodeType === 1) {
      const t = esc(no.textContent);
      out += /^(B|STRONG)$/.test(no.tagName) ? `<b>${t}</b>` : t;
    }
  }
  return out.replace(/\s+/g, ' ').trim();
}

function textosDoPainel(doc) {
  const out = {};
  const tenta = (nome, fn) => {
    try {
      const v = fn();
      if (v && (!Array.isArray(v) || v.length)) out[nome] = v;
    } catch { /* bloco ausente nesta versão do painel */ }
  };
  tenta('acao', () => {
    const box = doc.querySelector('#acaoBox .acao');
    if (!box) return null;
    const tom = box.classList.contains('crit') ? 'ruim' : box.classList.contains('warn') ? 'atencao' : 'bom';
    return { tom, titulo: box.querySelector('.acao-title')?.textContent.trim(), corpo: htmlSeguro(box.querySelector('.acao-body')) };
  });
  tenta('alertas', () => [...doc.querySelectorAll('#alerts .alert')].map(a => ({
    tom: a.classList.contains('crit') ? 'ruim' : a.classList.contains('warn') ? 'atencao' : 'bom',
    titulo: a.querySelector('b')?.textContent.trim(),
    texto: htmlSeguro(a.querySelector('.desc') || a),
  })).filter(a => a.titulo));
  const paragrafos = id => [...doc.querySelectorAll(`#${id} p`)].map(htmlSeguro).filter(Boolean);
  tenta('leitura', () => paragrafos('leitura'));
  tenta('insights', () => paragrafos('insightsResumo'));
  return out;
}

export function lerMotor(janela, doc) {
  const c = janela.calc();
  const tl = janela.timeline();
  if (!c || typeof c.saldo !== 'number' || typeof c.itau !== 'number' || !tl?.porDia) throw new Error('painel sem os números esperados');
  const m = { c, tl };
  const tenta = (nome, fn) => {
    try {
      m[nome] = fn();
    } catch { /* função ausente nesta versão do painel */ }
  };
  tenta('ap', () => janela.aporte(tl));
  tenta('sc', () => janela.score(c, tl));
  tenta('ss', () => janela.sobraSegura(c, tl));
  tenta('p12', () => janela.projecao12(c, tl, 12, true));
  tenta('plp', () => janela.projecaoLongoPrazo(c.caixa));
  tenta('cf', () => janela.compromissosFuturos(6));
  tenta('assin', () => janela.assinaturasCartao());
  Object.assign(m, textosDoPainel(doc));
  return m;
}

// Próximos lançamentos ainda não confirmados: contas a pagar e salário a entrar.
// Usa os dias já ajustados pelo painel (fim de semana e feriado). Também é a agenda dos lembretes.
export function proximasContas({ tl }, dados, agora = new Date()) {
  const ctx = contexto(dados, agora);
  if (ctx.mesPassou) return [];
  const itens = [];
  for (const p of tl.porDia) {
    if (p.dia < ctx.diaHoje) continue;
    for (const e of p.eventos) {
      if (e.status === 'confirmado' || !e.valor) continue; // v9.8.2: conta fora só deste mês fica com valor 0
      const origem = e.key && e.idx !== undefined ? dados[e.key]?.[e.idx] : null;
      if (e.valor > 0 && origem?.categoria !== 'salario') continue; // dividendos e afins poluem a lista
      itens.push({
        id: `${ctx.ano}-${pad(ctx.mes)}-${pad(p.dia)}|${e.desc}`,
        data: `${ctx.ano}-${pad(ctx.mes)}-${pad(p.dia)}`,
        dia: p.dia,
        desc: e.desc,
        valor: e.valor,
        lista: e.key, // de onde veio no JSON — para "Paguei"/"Recebi" (lancamentos.js)
        item: origem?.id,
      });
    }
  }
  return itens;
}
