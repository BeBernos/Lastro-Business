// Armazenamento local do app (IndexedDB, banco "painel-familia", tabela "kv").
// O service worker lê as mesmas chaves (agenda, lembretes) para os lembretes de contas.
//
// cofre    -> proteção do aparelho (v5, protecao.js): { v: 2, modo: 'digital' | 'porta' | 'senha', sal, iteracoes, … }
//             no modo digital a chave, a senha e o token do GitHub ficam cifrados pela digital (PRF).
//             Até a v4: { chave: CryptoKey não-exportável, sal, iteracoes, senha } — migrado na abertura.
// envelope -> painel atual, sempre cifrado com a senha da família
// origem   -> 'remoto' | 'local' (importado aqui, ainda não publicado) | 'publicado'
// github   -> { token, repo, branch, caminho } — só no aparelho de quem publica (token: null no modo digital: fica no cofre)
// inicio   -> (até a v2) tela em que o app abria; não é mais lida
// agenda   -> próximas contas [{ id, data, desc, valor }], refeita a cada abertura do painel
// lembretes-> true quando os lembretes de contas estão ligados; avisados -> ids já notificados
// trava    -> (até a v4) id da digital do bloqueio opcional; apagada na migração
// avisos   -> true/false (push de painel novo); avisosChave -> chave VAPID usada; avisosPerguntado -> já perguntou
// carteiraEnvelope / carteiraOrigem -> painel da carteira cifrado e de onde veio (como envelope/origem)
// desfazer -> últimos lançamentos do app [{ quando, rotulo, antes (envelope cifrado de antes), depois (publicadoEm) }]
// desfazerEquivale -> { de, equivale }: o painel atual (desfeito) equivale ao de antes daquele lançamento
// lojas -> { 'nome da loja': 'categoria' } — última categoria usada por loja (sugestão no SMS do Itaú)
// smsLancados -> [{ h: impressão digital do texto do SMS, em }] — avisa quando o mesmo SMS volta (até 300)
// cotacoes -> { em, url, dados } últimas cotações da rota /cotacoes (só preços públicos, nada da família)
// publicacao -> { em, ok, erro } última tentativa de publicar (o motivo aparece na faixa "só neste celular" e no Diagnóstico)
export const banco = (() => {
  let conexao;
  const abrir = () => conexao ??= new Promise((ok, falha) => {
    const r = indexedDB.open('painel-familia', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => falha(r.error);
  });
  const operar = async (modo, fn) => {
    const db = await abrir();
    return new Promise((ok, falha) => {
      const t = db.transaction('kv', modo);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => ok(req.result);
      t.onerror = () => falha(t.error);
    });
  };
  return {
    ler: k => operar('readonly', s => s.get(k)),
    gravar: (k, v) => operar('readwrite', s => s.put(v, k)),
    apagar: k => operar('readwrite', s => s.delete(k)),
    limpar: () => operar('readwrite', s => s.clear()),
  };
})();
