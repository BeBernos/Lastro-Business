# Security

*[Português abaixo](#segurança-resumo-em-português)*

Lastro handles a family's complete financial life, so the design starts from one rule: **no server ever sees financial
data in the clear** — with a single, opt-in, revocable exception described at the end.

## Threat model

| Threat | Mitigation |
|---|---|
| Storage provider (GitHub) or host (Cloudflare) is breached or curious | Only ciphertext is stored or served. The encryption key never leaves the phones. |
| A phone is lost or picked up unlocked | The app always opens locked and locks again after 1 minute in the background; locking wipes decrypted data, iframes and the key from memory. |
| Someone reads the phone's storage | On the owner's phone the key is sealed by the fingerprint (WebAuthn PRF), so nothing readable is stored on the device. |
| Push notifications leak data | Pushes are empty. The phone downloads the encrypted file and writes the notification text locally. |
| Quote lookups leak the portfolio | The app asks only for tickers and a date — never quantities or values — and does the math on the device. |
| Accidental publication of real data | `.gitignore` blocks plaintext exports; this public repository is a fresh export scanned against a list of forbidden terms and contains only fictitious data. |

## Encryption at rest and in transit

- **AES-256-GCM** with a key derived from the family password by **PBKDF2-SHA256, 600,000 iterations**, random salt.
  Payloads are gzip-compressed before encryption (`app/cofre.js`).
- The encrypted envelope is committed to a private GitHub repository through the GitHub API; the other phone downloads
  it from the static host and decrypts it locally.
- The password itself is never stored or transmitted.

## Unlocking on the device (`app/protecao.js`, `app/trava.js`)

| Mode | How it works |
|---|---|
| **Fingerprint + PRF** (default where supported) | A passkey with the WebAuthn **PRF extension** returns secret bytes only after biometric verification. They are expanded with **HKDF** into a key that seals `{family key, password, GitHub token}`. Without the finger, the device holds only ciphertext. |
| **Fingerprint as a door** | For authenticators without PRF: the biometric only unlocks the screen; the key is stored on the device. |
| **Password only** | Nothing stored; the password is typed on every open. |

The family password always works as a fallback and cancels any pending biometric prompt. A short session (1 minute)
survives Android reloading the app, using a non-exportable AES key kept in IndexedDB plus a `sessionStorage` marker —
closing the app on purpose ends it.

## Integrations

- **Bank (Open Finance) and crypto exchange**: read-only credentials are encrypted with the family key on the phone.
  Requests are signed on the device; the Worker only relays an explicit allowlist of read-only endpoints and stores nothing.
- **Public quotes** (B3, Central Bank of Brazil, crypto): fetched by the Worker and cached; requests carry only tickers and dates.
- **Web Push**: VAPID (ES256) keys are generated on first use inside a Durable Object; payloads are empty.

## The one exception: the AI connector (opt-in)

To let Claude read and write the data directly through MCP (instead of downloading and uploading files), the owner can
turn on the connector. While it is **on**, the Durable Object keeps the family key and a GitHub token so the server can
decrypt, apply the AI's change and re-encrypt. Safeguards:

- turning it on requires a GitHub token with push permission and proof that the key opens the published file;
- the MCP endpoint lives at an unguessable secret URL;
- the AI can only write a whitelisted set of fields (analyses, plan, targets) — never balances, positions or the month;
- every write can be dry-run first (`so_validar`), and the server instructs the AI to show the change and wait for the user's OK;
- **Turn off** deletes the key, token and secret immediately.

## Reporting

This is a portfolio repository. If you notice a security issue, please contact the author through
[github.com/BeBernos](https://github.com/BeBernos) rather than opening a public issue.

---

## Segurança (resumo em português)

Regra de projeto: **nenhum servidor vê dado financeiro em claro**. Os dados são cifrados no celular (AES-256-GCM,
chave por PBKDF2-SHA256 com 600 mil iterações) antes de sair dele; GitHub e Cloudflare só guardam e servem texto cifrado.
O app sempre abre trancado e tranca de novo depois de 1 minuto fora, apagando tudo da memória. No celular de quem
publica, a chave fica selada pela digital (extensão PRF do WebAuthn + HKDF): sem o dedo, o aparelho só tem dado cifrado.
As notificações vão vazias; a consulta de cotações leva só os códigos e a data. As integrações com banco e corretora
de cripto são só de leitura, assinadas no celular, e o Worker apenas repassa uma lista fechada de endereços.

**Única exceção, opcional e revogável:** o conector do Claude (MCP). Enquanto estiver ligado, o servidor guarda a chave
para poder decifrar, aplicar a mudança da IA e cifrar de novo — com endereço secreto, lista fechada de campos que a IA
pode gravar, validação antes de gravar e confirmação do usuário. Desligar apaga a chave na hora.
