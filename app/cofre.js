// Cofre do painel: criptografia ponta a ponta com a "senha da família".
//
// AES-256-GCM com chave derivada da senha via PBKDF2-SHA256 (600 mil iterações).
// O conteúdo é comprimido (gzip) antes de cifrar. O mesmo arquivo roda no app
// (navegador) e no script de publicação (Node 20+), então os dois sempre conversam.

export const ITERACOES = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64 = {
  de(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
  para(texto) {
    const s = atob(texto);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  },
};

export const novoSal = () => crypto.getRandomValues(new Uint8Array(16));

export async function derivarChave(senha, sal, iteracoes = ITERACOES) {
  const base = await crypto.subtle.importKey('raw', enc.encode(senha.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    base,
    { name: 'AES-GCM', length: 256 },
    false, // a chave nunca sai do aparelho
    ['encrypt', 'decrypt'],
  );
}

// Os mesmos 256 bits que derivarChave usa, em bytes: o app guarda assim, cifrados pela digital
// (protecao.js), para não precisar refazer as 600 mil iterações a cada abertura.
export async function derivarBruta(senha, sal, iteracoes = ITERACOES) {
  const base = await crypto.subtle.importKey('raw', enc.encode(senha.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes }, base, 256));
}

// Bytes da chave -> chave AES-GCM não-exportável (igual à de derivarChave)
export const importarChave = bruta => crypto.subtle.importKey('raw', bruta, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);

async function passarPor(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

// conteudo: { html, ... } -> envelope JSON que pode ficar público sem expor nada
export async function cifrar(conteudo, chave, sal, iteracoes = ITERACOES) {
  const publicadoEm = new Date().toISOString();
  const gz = await passarPor(enc.encode(JSON.stringify(conteudo)), new CompressionStream('gzip'));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(publicadoEm) }, chave, gz);
  return {
    formato: 'painel-cifrado',
    v: 1,
    kdf: { nome: 'PBKDF2-SHA256', iteracoes, sal: b64.de(sal) },
    iv: b64.de(iv),
    publicadoEm,
    dados: b64.de(new Uint8Array(ct)),
  };
}

// Lança erro se a senha estiver errada ou o arquivo tiver sido adulterado.
export async function decifrar(envelope, chave) {
  if (envelope?.formato !== 'painel-cifrado' || envelope.v !== 1) throw new Error('Formato de painel desconhecido');
  const gz = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64.para(envelope.iv), additionalData: enc.encode(envelope.publicadoEm) },
    chave,
    b64.para(envelope.dados),
  );
  return JSON.parse(dec.decode(await passarPor(new Uint8Array(gz), new DecompressionStream('gzip'))));
}

export const salDo = envelope => b64.para(envelope.kdf.sal);

// Senha forte e fácil de digitar uma vez: 4 blocos de 4 (sem caracteres ambíguos) ≈ 80 bits.
export function gerarSenha() {
  const alfabeto = 'abcdefghjkmnpqrstuvwxyz23456789';
  const r = crypto.getRandomValues(new Uint8Array(16));
  const c = [...r].map(n => alfabeto[n % alfabeto.length]).join('');
  return c.match(/.{4}/g).join('-');
}
