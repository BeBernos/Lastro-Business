// Proteção do aparelho (fase B): o app sempre abre trancado e só a digital (ou a senha da família)
// devolve a chave dos dados.
//
// Guardado no IndexedDB (chave "cofre", versão 2):
//   modo "digital": a chave da família, a senha e o token do GitHub cifrados (AES-GCM) com uma chave
//                   que só a digital libera (extensão PRF da chave de acesso). Nada legível no aparelho.
//                   { v: 2, modo, sal, iteracoes, cred, salPrf, iv, segredos }
//   (provedor: onde a chave de acesso ficou — 'Google', 'Samsung Pass', 'outro' ou null — só para explicar)
//   modo "porta":   o celular não libera chave pela digital (sem PRF): a chave e a senha ficam guardadas
//                   como até a v4 e a digital só destrava a tela. { v: 2, modo, sal, iteracoes, cred, chave, senha }
//   modo "senha":   o celular não tem digital: nada guardado, a senha da família a cada abertura.
//                   { v: 2, modo, sal, iteracoes }
// Até a v4 o cofre era { chave, sal, iteracoes, senha } (sem "v"), com a digital opcional em "trava".
//
// Na memória, só enquanto o app está destrancado (estado.cofre em app.js):
//   { chave, bruta, sal, iteracoes, senha, token, embrulho }
//   token: undefined = ainda guardado com a digital (destrancou pela senha); null = não há.

import { b64, decifrar, derivarBruta, importarChave } from './cofre.js';
import { conferirDigital, criarDigital } from './trava.js';

const enc = new TextEncoder();
const dec = new TextDecoder();
const INFO = enc.encode('lastro-cofre-v1');

export const protegido = salvo => salvo?.v === 2;

// Bytes do PRF -> chave AES-GCM que cifra os segredos (HKDF, não-exportável)
async function chaveDaDigital(saida) {
  const base = await crypto.subtle.importKey('raw', saida, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function selar(embrulho, cofre) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const segredos = { bruta: b64.de(cofre.bruta), senha: cofre.senha ?? null, token: cofre.token ?? null };
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: INFO }, embrulho, enc.encode(JSON.stringify(segredos)));
  return { iv: b64.de(iv), segredos: b64.de(new Uint8Array(ct)) };
}

// Senha da família -> cofre na memória. `envelopes` confirmam a senha (lança erro se estiver errada).
export async function abrirComSenha(senha, sal, iteracoes, envelopes) {
  const bruta = await derivarBruta(senha, b64.para(sal), iteracoes);
  const chave = await importarChave(bruta);
  const alvo = envelopes.find(e => e?.kdf?.sal === sal);
  if (!alvo) throw new Error('Não há painel para conferir a senha.');
  await decifrar(alvo, chave);
  return { chave, bruta, sal, iteracoes, senha };
}

// Digital -> cofre na memória. Lança erro se a pessoa cancelar.
export async function abrirComDigital(salvo, signal) {
  const id = b64.para(salvo.cred);
  if (salvo.modo === 'porta') {
    await conferirDigital(id, null, signal);
    return { chave: salvo.chave, sal: salvo.sal, iteracoes: salvo.iteracoes, senha: salvo.senha, token: null };
  }
  const saida = await conferirDigital(id, b64.para(salvo.salPrf), signal);
  if (!saida) throw new Error('A digital não devolveu a chave deste aparelho.');
  const embrulho = await chaveDaDigital(saida);
  const s = JSON.parse(dec.decode(await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64.para(salvo.iv), additionalData: INFO }, embrulho, b64.para(salvo.segredos))));
  const bruta = b64.para(s.bruta);
  return { chave: await importarChave(bruta), bruta, sal: salvo.sal, iteracoes: salvo.iteracoes, senha: s.senha, token: s.token, embrulho };
}

// Cria a proteção para o cofre (com `bruta`, ou `senha` para refazê-la). modo 'digital' tenta o PRF e, se o celular
// não tiver, fica em 'porta'; 'senha' não guarda nada. Devolve { salvo, cofre }.
export async function criarProtecao(cofre, modo) {
  // destrancado no modo "porta" a chave veio guardada, sem os bytes: refaz pela senha
  if (!cofre.bruta && cofre.senha) cofre = { ...cofre, bruta: await derivarBruta(cofre.senha, b64.para(cofre.sal), cofre.iteracoes) };
  const base = { v: 2, sal: cofre.sal, iteracoes: cofre.iteracoes };
  if (modo === 'senha') return { salvo: { ...base, modo: 'senha' }, cofre };
  const salPrf = crypto.getRandomValues(new Uint8Array(32));
  const cred = await criarDigital(salPrf);
  // alguns celulares só entregam o PRF numa verificação, não na criação: pede a digital mais uma vez
  const saida = cred.saida || (await conferirDigital(cred.id, salPrf));
  const provedor = cred.provedor;
  if (!saida) return { salvo: { ...base, modo: 'porta', provedor, cred: b64.de(cred.id), chave: cofre.chave, senha: cofre.senha }, cofre };
  const embrulho = await chaveDaDigital(saida);
  const novo = { ...cofre, embrulho };
  return { salvo: { ...base, modo: 'digital', provedor, cred: b64.de(cred.id), salPrf: b64.de(salPrf), ...(await selar(embrulho, novo)) }, cofre: novo };
}

// Grava de novo depois de trocar a senha ou o token. No modo digital, sem a chave da digital na
// memória (destrancou pela senha), pede a digital. Devolve o salvo novo (e completa `cofre`).
export async function regravarProtecao(salvo, cofre) {
  const base = { ...salvo, sal: cofre.sal, iteracoes: cofre.iteracoes };
  if (salvo.modo === 'porta') return { ...base, chave: cofre.chave, senha: cofre.senha };
  if (salvo.modo !== 'digital') return base;
  if (!cofre.embrulho || cofre.token === undefined) {
    const aberto = await abrirComDigital(salvo);
    cofre.embrulho = aberto.embrulho;
    if (cofre.token === undefined) cofre.token = aberto.token;
  }
  return { ...base, ...(await selar(cofre.embrulho, cofre)) };
}
