// SMS do cartão Itaú -> dados de um lançamento (Fase 2). Formatos vistos em SMS reais (set–out/2026):
//   "Compra aprovada de R$ 58,70 em LOJA, 21/10 as 20:35 no seu Itau final 0000."
//   "Compra aprovada de R$ 579,00 em 5x em LOJA, 06/10 as 12:03 no seu Itau final 0000."
//   "Compra aprovada no seu <CARTÃO> final 0000 - LOJA valor RS 49,97 em 12/09, as 21h31."
//   "Compra aprovada no <CARTÃO> p/ <NOME DO ADICIONAL> - LOJA valor RS 5,95 em 16/09/2026 as 07h00."
//   "Pre-autorizacao aprovada no seu <CARTÃO> final 0000 - LOJA valor RS 8,95 em 17/09, as 01h17." (reserva, não é a cobrança)
//   "Confirmamos o estorno da compra no <CARTÃO> p/ <NOME> - LOJA, RS 33,70 em 08/09/2026 as 19h38."
// O leitor é tolerante (acento, "às", "R$"/"RS", espaços); o que não reconhecer devolve null e o app
// abre o formulário vazio. Nada do SMS sai do celular.

import { lerValor } from './lancamentos.js';

// "DL*UberRides" -> "UberRides", "PAG*Loja" -> "Loja", "IFD*99Food" -> "99Food"; "KEETABR*56.900.036 MAY" -> "KEETABR"
// (quando depois do * só vem código, o nome é o que vem antes)
const limparLoja = loja => {
  const s = String(loja || '').replace(/\s+/g, ' ').trim();
  const m = s.match(/^([A-Za-z0-9]{2,12})\s?\*\s?(.*)$/);
  if (m && /^\d/.test(m[2])) return m[1];
  return s.replace(/^[A-Z0-9]{2,4}\s?\*\s?/i, '').trim();
};

// Chave da memória "loja -> categoria": minúsculo, sem acento nem números soltos, até 3 palavras
export const chaveLoja = loja => limparLoja(loja).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(p => p && !/^\d+$/.test(p)).slice(0, 3).join(' ');

// hoje: AAAA-MM-DD (para descobrir o ano quando o SMS traz só dia/mês)
export function lerSms(texto, hoje) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!/ita[uú]|compra aprovada|estorno|pr[eé]-?autoriza/i.test(t)) return null;
  const v = t.match(/(?:R\$|RS)\s*([\d.]+,\d{2})/i);
  const dt = t.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
  if (!v || !dt) return null;
  const estorno = /estorno/i.test(t);
  const parc = t.match(/\bem\s+(\d{1,2})\s*x\b/i);
  const [hAno, hMes] = hoje.split('-').map(Number);
  const mes = Number(dt[2]);
  const ano = dt[3] ? Number(dt[3]) : mes > hMes ? hAno - 1 : hAno; // dezembro lido em janeiro
  const hora = t.match(/\b(\d{2})[:h](\d{2})\b/);
  const loja = estorno
    ? (t.match(/\s-\s*([^,]+?),\s*R/i)?.[1] || t.match(/compra (?:no|na|em)\s+([^,]+)/i)?.[1])
    : (t.match(/\s-\s*(.+?)\s+valor\s+R/i)?.[1] || t.match(/\bem\s+(?:\d{1,2}\s*x\s+em\s+)?(.+?),\s*\d{2}\/\d{2}/i)?.[1]);
  const quem = t.match(/\bp\/\s*([A-Za-zÀ-ú]+)[^-]*-/)?.[1];
  return {
    valor: lerValor(v[1]),
    parcelas: parc ? Number(parc[1]) : 1,
    estorno,
    data: `${ano}-${dt[2]}-${dt[1]}`,
    hora: hora ? `${hora[1]}:${hora[2]}` : null,
    loja: limparLoja(loja) || null,
    final: t.match(/final\s+(\d{4})/i)?.[1] || null,
    quem: quem ? quem.charAt(0).toUpperCase() + quem.slice(1).toLowerCase() : null, // dono do cartão (adicional)
    preAutorizacao: /pr[eé]-?autoriza/i.test(t),
  };
}

// Impressão digital do texto do SMS (para avisar quando o mesmo SMS for lançado duas vezes)
export async function marcaSms(texto) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
  return [...h.slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// v8.7: várias mensagens coladas de uma vez (ou compartilhadas juntas). Cada SMS do Itaú começa por "Compra aprovada"
// ou "Confirmamos o estorno"; o texto é cortado nesses pontos e cada pedaço passa pelo lerSms. Devolve os lidos (com o
// pedaço original, para a impressão digital) e quantos pedaços não eram SMS do Itaú.
export function separarSms(texto, hoje) {
  // corta cada pedaço no fim do SMS ("…final 0000." ou "…as 19h38."): o que vem depois (hora da mensagem, outro texto)
  // não entra na impressão digital, que assim é a mesma do SMS lançado sozinho
  const fim = p => p.match(/^[\s\S]*?\d{2}[h:]\d{2}(?:\s+no seu [^.]*?final\s+\d{4})?\.?/i)?.[0] || p;
  const pedacos = String(texto || '').split(/(?=compra aprovada|confirmamos o estorno|pr[eé]-?autoriza[cç][aã]o aprovada)/i).map(p => fim(p.trim())).filter(Boolean);
  const lidos = [];
  let ignorados = 0;
  for (const p of pedacos) {
    const l = lerSms(p, hoje);
    if (l) lidos.push({ ...l, texto: p });
    else if (/\S/.test(p.replace(/[\d/:.,\s-]/g, ''))) ignorados++;
  }
  return { lidos, ignorados };
}
