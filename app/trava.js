// Digital (ou reconhecimento facial / PIN do celular) via WebAuthn.
//
// Não há servidor: a credencial (chave de acesso) existe só para o Android pedir a verificação do
// dono do aparelho. Com a extensão PRF, cada verificação também devolve 32 bytes secretos, sempre
// iguais para o mesmo "sal" — é deles que sai a chave que cifra os segredos guardados no aparelho
// (protecao.js). Sem PRF, a digital só libera a tela.

const aleatorio = n => crypto.getRandomValues(new Uint8Array(n));

// Onde a chave de acesso foi salva (AAGUID nos dados do autenticador). Só para explicar ao usuário:
// com o Google a digital guarda a chave dos dados (PRF); outros gerenciadores podem não guardar.
// O do Samsung Pass é "SAMSUNG" em ASCII.
const PROVEDORES = {
  'ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4': 'Google',
  '53414d53-554e-4700-0000-000000000000': 'Samsung Pass',
};
function provedorDe(cred) {
  try {
    const dados = new Uint8Array(cred.response.getAuthenticatorData());
    if (!(dados[32] & 0x40)) return null; // sem dados da credencial
    const h = [...dados.slice(37, 53)].map(b => b.toString(16).padStart(2, '0')).join('');
    if (/^0+$/.test(h)) return null;
    return PROVEDORES[`${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`] || 'outro';
  } catch {
    return null;
  }
}
const bytes = b => (b ? new Uint8Array(b) : null);

export async function digitalDisponivel() {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
}

// Cria a chave de acesso do Lastro. Devolve { id, saida, provedor } — saida = bytes do PRF, se o
// celular já os entregar na criação (senão, conferirDigital com o mesmo sal busca).
export async function criarDigital(salPrf) {
  const cred = await navigator.credentials.create({
    publicKey: {
      challenge: aleatorio(32),
      rp: { name: 'Lastro' },
      user: { id: aleatorio(16), name: 'Lastro · família', displayName: 'Lastro' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      // chave de acesso guardada (residentKey): é a do Gerenciador de Senhas do Google que tem PRF
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required' },
      timeout: 60000,
      extensions: { prf: { eval: { first: salPrf } } },
    },
  });
  return { id: new Uint8Array(cred.rawId), saida: bytes(cred.getClientExtensionResults?.().prf?.results?.first), provedor: provedorDe(cred) };
}

// Pede a digital. Lança erro se a pessoa cancelar ou a verificação falhar.
// Com salPrf, devolve os bytes do PRF (ou null, se o celular não tiver PRF).
// signal: cancela o pedido (destrancou pela senha enquanto a digital esperava).
export async function conferirDigital(id, salPrf = null, signal = undefined) {
  const r = await navigator.credentials.get({
    signal,
    publicKey: {
      challenge: aleatorio(32),
      allowCredentials: [{ type: 'public-key', id, transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60000,
      ...(salPrf ? { extensions: { prf: { eval: { first: salPrf } } } } : {}),
    },
  });
  return bytes(r.getClientExtensionResults?.().prf?.results?.first);
}
