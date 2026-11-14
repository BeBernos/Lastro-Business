// "Carteiro" do app no Cloudflare: avisa os celulares quando sai um painel novo.
//
// - Os arquivos do app (pasta app/) continuam sendo servidos direto pelo Cloudflare;
//   este código só roda para as rotas /push/* e /cotacoes (cotações para a estimativa da carteira, cotacoes.js).
// - A cada minuto (cron) ele lê o data/painel.enc e o data/carteira.enc que estão no ar. Se o "publicadoEm" de um deles mudou,
//   manda um Web Push vazio para os celulares inscritos; o service worker do app busca o
//   painel e mostra a notificação. Nenhum dado financeiro passa por aqui: o push não leva
//   conteúdo e o painel continua cifrado.
// - Inscrições, chaves VAPID e o último aviso ficam num Durable Object (grátis, SQLite).

import { DurableObject } from 'cloudflare:workers';
import { cotacoes } from './cotacoes.js';
import { rotaConector, servidorMcp } from './mcp.js';

// Contato exigido pelo Web Push (VAPID); uma URL é aceita no lugar de e-mail.
const CONTATO = 'https://github.com/BeBernos/Lastro-Business';
const MAX_INSCRICOES = 20;
// v9.16.1: resumo da semana — domingo a partir das 19h de Brasília (22h UTC; sem horário de verão). Vai pelo cron de minuto:
// a conta grátis do Cloudflare aceita só 5 crons e os 5 Workers da família já usam um cada (um 6º derrubou a montagem).
const ehHoraDaSemana = d => d.getUTCDay() === 0 && d.getUTCHours() >= 22;
// Só serviços de push conhecidos (evita usar o Worker para chamar URLs arbitrárias).
const SERVICOS_PUSH = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)\//;

const enc = new TextEncoder();
const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const json = (dados, status = 200) => new Response(JSON.stringify(dados), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function idDe(endpoint) {
  return b64url(await crypto.subtle.digest('SHA-256', enc.encode(endpoint)));
}

export class Avisos extends DurableObject {
  // Cache das cotações (rota /cotacoes): respostas das fontes por alguns minutos, limpo de tempos em tempos.
  async lerCache(chave) {
    return (await this.ctx.storage.get(`cache:${chave}`)) || null;
  }

  async gravarCache(chave, valor) {
    await this.ctx.storage.put(`cache:${chave}`, { em: Date.now(), valor });
    if (Math.random() < 0.05) {
      const velhos = [...(await this.ctx.storage.list({ prefix: 'cache:' })).entries()]
        .filter(([, v]) => Date.now() - v.em > 3 * 86400000).map(([k]) => k);
      if (velhos.length) await this.ctx.storage.delete(velhos.slice(0, 128));
    }
  }

  // v9.10: conector MCP (mcp.js) — chave da família, token do GitHub e o segredo do endereço, só enquanto estiver ligado
  async lerConector() {
    return (await this.ctx.storage.get('conector')) || null;
  }

  async gravarConector(cfg) {
    await this.ctx.storage.put('conector', cfg);
  }

  async apagarConector() {
    await this.ctx.storage.delete('conector');
  }

  // Par de chaves VAPID, criado no primeiro uso e guardado aqui (nada para configurar à mão).
  async vapid() {
    let k = await this.ctx.storage.get('vapid');
    if (!k) {
      const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
      k = {
        privada: await crypto.subtle.exportKey('jwk', par.privateKey),
        publica: b64url(await crypto.subtle.exportKey('raw', par.publicKey)),
      };
      await this.ctx.storage.put('vapid', k);
    }
    return k;
  }

  async chavePublica() {
    return (await this.vapid()).publica;
  }

  async inscrever(endpoint) {
    const id = `inscricao:${await idDe(endpoint)}`;
    const atuais = await this.ctx.storage.list({ prefix: 'inscricao:' });
    if (!atuais.has(id) && atuais.size >= MAX_INSCRICOES) throw new Error('limite de aparelhos inscritos');
    await this.ctx.storage.put(id, { endpoint, inscritoEm: new Date().toISOString() });
  }

  async cancelar(endpoint) {
    await this.ctx.storage.delete(`inscricao:${await idDe(endpoint)}`);
  }

  async inscrito(endpoint) {
    return !!(await this.ctx.storage.get(`inscricao:${await idDe(endpoint)}`));
  }

  async jwt(aud) {
    const k = await this.vapid();
    const parte = obj => b64url(enc.encode(JSON.stringify(obj)));
    const dados = `${parte({ typ: 'JWT', alg: 'ES256' })}.${parte({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTATO })}`;
    const chave = await crypto.subtle.importKey('jwk', k.privada, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
    const assinatura = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, chave, enc.encode(dados));
    return { jwt: `${dados}.${b64url(assinatura)}`, publica: k.publica };
  }

  // Push sem conteúdo: só "acorda" o service worker do app.
  async enviar(endpoint) {
    const { jwt, publica } = await this.jwt(new URL(endpoint).origin);
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { TTL: String(24 * 3600), Urgency: 'normal', Authorization: `vapid t=${jwt}, k=${publica}`, 'Content-Length': '0' },
    });
    if (r.status === 404 || r.status === 410) await this.cancelar(endpoint); // aparelho desinstalou ou trocou a inscrição
    return r.status;
  }

  async enviarParaTodos() {
    const inscricoes = await this.ctx.storage.list({ prefix: 'inscricao:' });
    const resultados = [];
    for (const { endpoint } of inscricoes.values()) {
      try {
        resultados.push(await this.enviar(endpoint));
      } catch (e) {
        resultados.push(String(e.message || e));
      }
    }
    return resultados;
  }

  // Chamado pelo cron com o publicadoEm de cada arquivo que está no ar (painel e carteira).
  // A chave do painel continua 'ultimoAvisado' para não reenviar um aviso antigo depois do deploy.
  async verificar(publicadoEm, arquivo = 'painel') {
    if (!publicadoEm) return { avisou: false };
    const chave = arquivo === 'painel' ? 'ultimoAvisado' : `ultimoAvisado:${arquivo}`;
    const ultimo = await this.ctx.storage.get(chave);
    if (publicadoEm === ultimo) return { avisou: false };
    await this.ctx.storage.put(chave, publicadoEm);
    if (!ultimo) return { avisou: false, primeiraVez: true }; // não avisa o painel que já existia
    await this.ctx.storage.put('motivo', { tipo: 'painel', em: Date.now() });
    return { avisou: true, resultados: await this.enviarParaTodos() };
  }

  // v9.16: domingo às 19h. O push continua vazio; o service worker pergunta o motivo em /push/motivo. Uma vez por domingo.
  async avisarSemana(dia) {
    if ((await this.ctx.storage.get('semanaAvisada')) === dia) return null;
    await this.ctx.storage.put('semanaAvisada', dia);
    await this.ctx.storage.put('motivo', { tipo: 'semana', em: Date.now() });
    return this.enviarParaTodos();
  }

  async motivo() {
    return (await this.ctx.storage.get('motivo')) || null;
  }
}

const caixa = env => env.AVISOS.get(env.AVISOS.idFromName('familia'));

async function lerInscricao(request) {
  const texto = await request.text();
  if (texto.length > 4096) throw new Error('inscrição grande demais');
  const { endpoint } = JSON.parse(texto);
  if (typeof endpoint !== 'string' || !SERVICOS_PUSH.test(endpoint)) throw new Error('serviço de push não reconhecido');
  return endpoint;
}

const BINANCE_LIBERADO = new Set(['/api/v3/account', '/api/v3/ticker/price', '/sapi/v1/simple-earn/flexible/position']);
async function repassarBinance(request, env) {
  const url = new URL(request.url);
  const caminho = url.pathname.slice('/binance'.length);
  if (!BINANCE_LIBERADO.has(caminho)) return json({ erro: 'caminho não liberado' }, 404);
  const chave = request.headers.get('X-MBX-APIKEY');
  // v9.3.1: o firewall da Binance barra (403) pedido sem User-Agent e alguns endereços de nuvem — identifica-se e, se
  // barrado, tenta os endereços alternativos que a própria Binance oferece
  const cab = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) Lastro/1.0', Accept: 'application/json', ...(chave ? { 'X-MBX-APIKEY': chave } : {}) };
  const hosts = env.BINANCE_URL ? [env.BINANCE_URL] : ['https://api.binance.com', 'https://api-gcp.binance.com', 'https://api1.binance.com', 'https://api3.binance.com', 'https://api4.binance.com'];
  let status = 502, corpo = JSON.stringify({ msg: 'não foi possível falar com a Binance' });
  for (const h of hosts) {
    try {
      const r = await fetch(`${h}${caminho}${url.search}`, { headers: cab });
      status = r.status;
      corpo = await r.text();
      if (status !== 403 && status !== 451) break;
    } catch { /* este endereço não respondeu: tenta o próximo */ }
  }
  return new Response(corpo, { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}

const PLUGGY_LIBERADO = [/^\/auth$/, /^\/items$/, /^\/items\/[\w-]+$/, /^\/accounts$/, /^\/investments$/, /^\/transactions$/];
async function repassarPluggy(request, env) {
  const url = new URL(request.url);
  const caminho = url.pathname.slice('/pluggy'.length);
  const post = request.method === 'POST';
  if (!PLUGGY_LIBERADO.some(r => r.test(caminho)) || (post && caminho !== '/auth') || (!post && request.method !== 'GET')) return json({ erro: 'caminho não liberado' }, 404);
  const chave = request.headers.get('X-API-KEY');
  try {
    const r = await fetch(`${env.PLUGGY_URL || 'https://api.pluggy.ai'}${caminho}${url.search}`, {
      method: request.method,
      headers: { 'User-Agent': 'Lastro/1.0', Accept: 'application/json', ...(post ? { 'Content-Type': 'application/json' } : {}), ...(chave ? { 'X-API-KEY': chave } : {}) },
      body: post ? await request.text() : undefined,
    });
    return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  } catch {
    return json({ message: 'não foi possível falar com a Pluggy' }, 502);
  }
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    try {
      if (pathname === '/push/chave' && request.method === 'GET') {
        return json({ chave: await caixa(env).chavePublica() });
      }
      if (pathname === '/push/inscrever' && request.method === 'POST') {
        await caixa(env).inscrever(await lerInscricao(request));
        return json({ ok: true });
      }
      // v9.16: por que o último push saiu (painel novo × resumo da semana) — sem dado nenhum, só o tipo e a hora
      if (pathname === '/push/motivo' && request.method === 'GET') {
        return json((await caixa(env).motivo()) || { tipo: 'painel', em: 0 });
      }
      if (pathname === '/push/cancelar' && request.method === 'POST') {
        await caixa(env).cancelar(await lerInscricao(request));
        return json({ ok: true });
      }
      // Cotações para a estimativa "Hoje" da carteira (ver cotacoes.js)
      if (pathname === '/cotacoes' && request.method === 'GET') {
        return json(await cotacoes(request, env, caixa(env)));
      }
      // v9.3: repasse da Binance (só leitura). O celular assina o pedido com a chave dele (o servidor não conhece a chave);
      // aqui só passa o pedido e a resposta adiante, sem guardar nem registrar nada (decisão do Bruno, 04/11/2026).
      if (pathname.startsWith('/binance/') && request.method === 'GET') return repassarBinance(request, env);
      // v9.4: Itaú pelo Open Finance (Meu Pluggy) — mesmo esquema: só repassa, sem guardar
      if (pathname.startsWith('/pluggy/')) return repassarPluggy(request, env);
      // v9.10: conector MCP do Claude (mcp.js). Ligar/ver/desligar vêm do app com o token do GitHub; o servidor MCP fica
      // em /mcp/<segredo>, o endereço que o Bruno cola em claude.ai → Conectores.
      const conector = pathname.match(/^\/mcp\/(ligar|estado|desligar)$/);
      if (conector && request.method === 'POST') return await rotaConector(conector[1], request, env, caixa(env));
      const mcp = pathname.match(/^\/mcp\/([A-Za-z0-9_-]{20,})$/);
      if (mcp) return await servidorMcp(mcp[1], request, caixa(env));
      // Teste pelo menu do app: manda um push só para o próprio aparelho, se ele estiver inscrito.
      if (pathname === '/push/testar' && request.method === 'POST') {
        const endpoint = await lerInscricao(request);
        const c = caixa(env);
        if (!(await c.inscrito(endpoint))) return json({ erro: 'aparelho não inscrito' }, 404);
        return json({ status: await c.enviar(endpoint) });
      }
    } catch (e) {
      return json({ erro: String(e.message || e) }, 400);
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(evento, env, ctx) {
    ctx.waitUntil((async () => {
      const agora = new Date(evento?.scheduledTime || Date.now());
      if (ehHoraDaSemana(agora)) await caixa(env).avisarSemana(agora.toISOString().slice(0, 10)).catch(() => {}); // não atrapalha o aviso de painel
      for (const arquivo of ['painel', 'carteira']) {
        const r = await env.ASSETS.fetch(new Request(`https://app.local/data/${arquivo}.enc`));
        if (!r.ok) continue;
        const { publicadoEm } = await r.json();
        await caixa(env).verificar(publicadoEm, arquivo);
      }
    })());
  },
};
