#!/usr/bin/env node
// Cifra o painel gerado pelo Agente Financeiro e grava em app/data/painel.enc,
// pronto para commit. Alternativa ao botão "Publicar" do app, para usar no computador.
//
//   node scripts/publicar.mjs painel_cashflow_2026-10-07.html
//   node scripts/publicar.mjs cashflow_dados_2026-10-07.json      (usa o painel publicado como molde)
//   node scripts/publicar.mjs painel.html --nova-senha            (troca a senha da família)
//
// Senha: variável de ambiente SENHA_FAMILIA ou digitada na hora.
// Nunca faça commit do .html/.json original — só do painel.enc cifrado.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { cifrar, decifrar, derivarChave, novoSal, salDo, ITERACOES } from '../app/cofre.js';
import { lerArquivo, resumo } from '../app/painel.js';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'app', 'data', 'painel.enc');

const args = process.argv.slice(2);
const novaSenha = args.includes('--nova-senha');
const arquivo = args.find(a => !a.startsWith('--'));
if (!arquivo) {
  console.error('Uso: node scripts/publicar.mjs <painel.html | dados.json> [--nova-senha]');
  process.exit(1);
}

async function perguntarSenha(texto) {
  if (process.env.SENHA_FAMILIA) return process.env.SENHA_FAMILIA;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const s = await rl.question(texto);
  rl.close();
  return s;
}

const publicado = existsSync(destino) ? JSON.parse(await readFile(destino, 'utf8')) : null;
const senha = await perguntarSenha(publicado && !novaSenha ? 'Senha da família: ' : 'Nova senha da família (mín. 12): ');
if (senha.length < 12) {
  console.error('A senha precisa ter pelo menos 12 caracteres.');
  process.exit(1);
}

let sal, iteracoes, chave, molde;
if (publicado && !novaSenha) {
  // mesma senha e mesmo sal: os celulares que já entraram continuam abrindo sem digitar nada
  sal = salDo(publicado);
  iteracoes = publicado.kdf.iteracoes;
  chave = await derivarChave(senha, sal, iteracoes);
  try {
    molde = (await decifrar(publicado, chave)).html;
  } catch {
    console.error('Senha diferente da usada no painel publicado. Para trocar a senha, rode de novo com --nova-senha.');
    process.exit(1);
  }
} else {
  sal = novoSal();
  iteracoes = ITERACOES;
  chave = await derivarChave(senha, sal, iteracoes);
}

const html = lerArquivo(await readFile(arquivo, 'utf8'), molde);
const envelope = await cifrar({ html, arquivo: basename(arquivo), importadoEm: new Date().toISOString() }, chave, sal, iteracoes);
await mkdir(dirname(destino), { recursive: true });
await writeFile(destino, JSON.stringify(envelope));

const r = resumo(html);
console.log(`OK: ${r.periodoLabel} (dados de ${r.ultimaAtualizacao}) cifrado em app/data/painel.enc`);
if (novaSenha && publicado) console.log('Atenção: senha trocada — cada celular vai pedir a senha nova uma vez.');
console.log('Agora: git add app/data/painel.enc && git commit -m "Painel atualizado" && git push');
