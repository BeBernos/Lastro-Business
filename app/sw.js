// Service worker: deixa o app abrir offline, recebe arquivos do "Compartilhar" do Android,
// mostra os lembretes de contas e o aviso de painel novo (push do worker/index.js).
//
// Arquivos do app: devolve o que está em cache na hora e atualiza em segundo plano
// (a versão nova do app passa a valer na próxima abertura).
// data/ (painel publicado) nunca passa pelo cache — o app guarda a cópia dele cifrada.

const CACHE = 'painel-app-v114';
const ARQUIVOS = [
  './', 'app.js', 'banco.js', 'cofre.js', 'painel.js', 'resumo.js', 'telas.js', 'graficos.js', 'traduzir.js', 'carteira.js', 'cotacoes.js', 'trava.js', 'protecao.js', 'lancamentos.js', 'sms.js', 'categorias.js', 'investimentos.js', 'v8.js', 'v8.css', 'extrato.js', 'conciliar.js', 'binance.js', 'pluggy.js', 'xlsx.js', 'escolha.js', 'parcial.js', 'novidades.js', 'ui.js', 'v10.js', 'carvao.js', 'v10.css', 'integracoes.js', 'lancar.js', 'claude.js', 'ficha.js', 'modo.js', 'estrategia.js', 'indicadores.js', 'liquidez.js', 'rendafixa.js', 'projeto.txt', 'fontes/bricolage.woff2', 'fontes/figtree.woff2', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/badge-96.png', 'icons/logo.svg',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(n => n.startsWith('painel-app-') && n !== CACHE).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

// Aceita um ou mais arquivos (os painéis de cashflow e de carteira podem vir juntos).
async function receberCompartilhado(request) {
  const form = await request.formData();
  const cache = await caches.open('compartilhado');
  let n = 0;
  for (const arquivo of form.getAll('arquivo')) {
    if (!arquivo || typeof arquivo === 'string') continue;
    await cache.put(`arquivo-${n++}`, new Response(arquivo, { headers: { 'X-Nome': encodeURIComponent(arquivo.name || 'painel') } }));
  }
  // texto compartilhado (SMS do Itaú → lançamento no cartão)
  const texto = [form.get('texto'), form.get('titulo')].find(t => typeof t === 'string' && t.trim());
  if (texto) await cache.put('texto-0', new Response(texto, { headers: { 'X-Tipo': 'texto' } }));
  return Response.redirect('./?compartilhado=1', 303);
}

// O Cloudflare redireciona /index.html para / (307). Navegador não aceita resposta
// "redirecionada" para abrir uma página, então a página do app fica sempre na chave './'
// e qualquer resposta que tenha passado por redirecionamento é regravada limpa.
async function limpa(resp) {
  if (!resp || !resp.redirected) return resp;
  return new Response(await resp.blob(), { status: resp.status, statusText: resp.statusText, headers: resp.headers });
}

async function doCacheAtualizando(request) {
  const cache = await caches.open(CACHE);
  const chave = request.mode === 'navigate' ? './' : request;
  const emCache = await limpa(await cache.match(chave, { ignoreSearch: true }));
  const daRede = fetch(request)
    .then(limpa)
    .then(resp => {
      if (resp.ok) cache.put(chave, resp.clone());
      return resp;
    })
    .catch(() => null);
  if (emCache) {
    daRede.catch(() => {});
    return emCache;
  }
  return (await daRede) || new Response('Sem conexão', { status: 503 });
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const escopo = new URL(self.registration.scope);
  if (e.request.method === 'POST' && url.pathname === escopo.pathname + 'compartilhar') {
    e.respondWith(receberCompartilhado(e.request));
    return;
  }
  // painel publicado, cotações e push vão sempre à rede (sem cache)
  if (e.request.method !== 'GET' || /^(data\/|cotacoes|push\/)/.test(url.pathname.slice(escopo.pathname.length))) return;
  e.respondWith(doCacheAtualizando(e.request));
});

// ---------- lembretes de contas ----------
// A agenda (próximas contas) é gravada pelo app no IndexedDB toda vez que o painel abre.
function kv(modo, fn) {
  return new Promise((ok, falha) => {
    const r = indexedDB.open('painel-familia', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => falha(r.error);
    r.onsuccess = () => {
      const t = r.result.transaction('kv', modo);
      const req = fn(t.objectStore('kv'));
      t.oncomplete = () => ok(req.result);
      t.onerror = () => falha(t.error);
    };
  });
}
const ler = k => kv('readonly', s => s.get(k));
const gravar = (k, v) => kv('readwrite', s => s.put(v, k));
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// "Salário — 1ª parcela (adiantamento)" -> "Salário — 1ª parcela"
const nome = i => i.desc.replace(/\s*\([^)]*\)/g, '').trim();

async function lembrar() {
  if (!(await ler('lembretes'))) return;
  const agenda = (await ler('agenda')) || [];
  const avisados = new Set((await ler('avisados')) || []);
  const agora = new Date();
  const dias = [[iso(agora), 'Hoje'], [iso(new Date(agora.getTime() + 86400000)), 'Amanhã']];
  // v9.9.12: lembretes de rodar o Claude (fechamento, Plano) têm aviso próprio, só no dia
  for (const i of agenda.filter(x => x.claude && x.data === iso(agora) && !avisados.has(`claude|${x.id}`))) {
    await self.registration.showNotification(i.desc, { body: i.detalhe || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: i.id });
    avisados.add(`claude|${i.id}`);
  }
  for (const [data, quando] of dias) {
    const itens = agenda.filter(i => !i.claude && i.data === data && !avisados.has(`${quando}|${i.id}`));
    if (!itens.length) continue;
    const total = itens.reduce((s, i) => s - i.valor, 0);
    const titulo = itens.length === 1 ? `${quando}: ${nome(itens[0])} · ${brl(total)}` : `${quando}: ${itens.length} contas · ${brl(total)}`;
    await self.registration.showNotification(titulo, {
      body: itens.map(i => `${nome(i)} — ${brl(-i.valor)}`).join('\n'),
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: `contas-${data}`,
    });
    itens.forEach(i => avisados.add(`${quando}|${i.id}`));
  }
  await gravar('avisados', [...avisados].slice(-200));
}

self.addEventListener('periodicsync', e => {
  if (e.tag === 'lembretes') e.waitUntil(lembrar());
});
self.addEventListener('message', e => {
  if (e.data === 'lembrar') e.waitUntil(lembrar());
});
// ---------- aviso de painel novo ----------
// O push chega vazio (o carteiro do Cloudflare não vê dados). Aqui o service worker baixa o
// painel publicado e, com a chave guardada no aparelho (só no modo "porta" da proteção; nos outros a
// chave não fica legível e a notificação sai sem a descrição), lê só o período e a data dos dados.
const b64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function descreverPainel() {
  try {
    const r = await fetch(`data/painel.enc?t=${Date.now()}`, { cache: 'no-store' });
    const envelope = await r.json();
    const cofre = await ler('cofre');
    if (!cofre || cofre.sal !== envelope.kdf.sal) return null;
    const gz = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64(envelope.iv), additionalData: new TextEncoder().encode(envelope.publicadoEm) },
      cofre.chave,
      b64(envelope.dados),
    );
    const texto = await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    const m = JSON.parse(texto).html.match(/id=["']cashflow-data["'][^>]*>([\s\S]*?)<\/script>/i);
    const dados = JSON.parse(m[1]);
    const [, mes, dia] = (dados.ultimaAtualizacao || '').split('-');
    const n = novidadesDoPainel(dados, await ler('avisoVisto'));
    await gravar('avisoVisto', n.ultimo);
    return { texto: `${dados.periodoLabel} · dados de ${dia}/${mes}`, novos: n.novos };
  } catch {
    return null;
  }
}

// v9.2: o que o Bruno lançou pelo app desde o último aviso (rastro "[app] …" em `atualizacoes`). `visto` = o último já avisado.
function novidadesDoPainel(dados, visto) {
  const app = (dados.atualizacoes || []).map(a => String(a.acao || '')).filter(t => t.startsWith('[app] '));
  const ultimo = app[app.length - 1] || null;
  const i = visto ? app.lastIndexOf(visto) : -1;
  // primeira vez: só o último; o já avisado sumiu (painel novo do Claude): nada a contar
  const novos = (i >= 0 ? app.slice(i + 1) : visto ? [] : app.slice(-1))
    .map(t => t.slice(6).replace(/\s*\(total[^)]*\)|,? \d{2}\/\d{2}\.$|\.$/g, '').trim());
  return { novos, ultimo };
}

// v9.16: domingo às 19h o servidor manda o push do resumo da semana (também vazio). O motivo vem de /push/motivo;
// a notificação não leva valores (no modo digital o service worker nem tem a chave) — o resumo abre no app.
async function motivoDoPush() {
  try {
    const m = await (await fetch(`push/motivo?t=${Date.now()}`, { cache: 'no-store' })).json();
    return m?.tipo === 'semana' && Date.now() - m.em < 3 * 3600e3 ? 'semana' : 'painel';
  } catch {
    return 'painel';
  }
}

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    if ((await motivoDoPush()) === 'semana') {
      return self.registration.showNotification('Resumo da semana', {
        body: 'Quanto saiu nos últimos 7 dias, o ritmo do mês e o que vence na semana que vem. Toque para ver.',
        icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: 'resumo-semana', data: { semana: true },
      });
    }
    const d = await descreverPainel();
    const novos = d?.novos || [];
    await self.registration.showNotification(novos.length === 1 ? `Bruno lançou: ${novos[0]}` : novos.length ? `Bruno lançou ${novos.length} coisas` : 'Lastro atualizado', {
      body: novos.length > 1 ? novos.slice(0, 4).join('\n') + (novos.length > 4 ? `\n+ ${novos.length - 4}` : '') : `${d ? `${d.texto}. ` : ''}Toque para ver quanto dá para gastar.`,
      icon: 'icons/icon-192.png',
      badge: 'icons/badge-96.png',
      tag: 'painel-atualizado',
      data: { atualizar: true },
    });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const atualizar = !!e.notification.data?.atualizar;
  const semana = !!e.notification.data?.semana;
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (semana) {
      if (janelas.length) { janelas[0].postMessage('semana'); return janelas[0].focus(); }
      return self.clients.openWindow('./?acao=semana');
    }
    if (janelas.length) {
      if (atualizar) janelas[0].postMessage('atualizar'); // app aberto: aplica o painel novo na hora
      return janelas[0].focus();
    }
    return self.clients.openWindow(atualizar ? './?atualizar=1' : './');
  })());
});
