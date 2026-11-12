# Lastro — sistema visual "Brasa" (v8.5)

Escolhido pelo Bruno em 28/10/2026 no protótipo (direção **B · Brasa**) e aplicado ao app inteiro na v8.5.0.
Código: `app/v8.css` (só regras sob `html[data-ui="v8"]`) e `app/v8.js` (movimento). Sem a chave (`localStorage
lastro-ui = v7`) o app volta à interface anterior, que fica em `app/index.html`.

## Cena de uso
Dois Samsung (S25 e S26), tema escuro, de noite e em trânsito, com uma mão. O Bruno lança compras várias vezes ao dia;
o Rafael só consulta. Por isso: escuro primeiro, números grandes, polegar embaixo (barra e "+"), nada que atrase lançar.

## Cores (tokens em `v8.css`, claro e escuro)
| Papel | Escuro | Claro | Uso |
|---|---|---|---|
| `--bg` | `#0f0d0c` | `#f4f1ed` | chão (= manifesto e barra de gestos) |
| `--card` / `--card-2` | `#1a1715` / `#24201d` | `#fff` / `#f5f1ec` | cartões / superfícies dentro de cartões, pílulas |
| `--ink` / `--ink-2` / `--muted` | `#f4efe9` / `#c8bfb7` / `#8f867e` | `#14110f` / `#57504a` / `#8a827a` | texto |
| `--accent` / `--accent-ink` / `--accent-soft` | laranja da marca | | ação principal, aba e sub-aba atuais, "+" |
| `--brasa` | laranja 20% | laranja 16% | brilho no canto dos destaques |
| `--dado`, `--s1..s3`, `--pos/--neg` | azul… | | dados (nunca laranja) |
| `--bom/--atencao/--ruim` | | | estados, sempre com ícone + texto |

Regra: **laranja = ação ou "você está aqui"; azul = dado; verde/amarelo/vermelho = estado.** Avisos do agente não
pintam o cartão inteiro: só um brilho suave no topo na cor do estado e o ícone num selo.

## Tipografia
- **Bricolage Grotesque** (`--display`): títulos de tela e de cartão, números grandes (destaques, indicadores, valor
  digitado no lançamento). Números com `tabular-nums`.
- **Figtree** (`--sans`): todo o resto — texto, rótulos, botões, listas.
- Escala: rótulo de destaque 11,5 px em caixa alta (0,09 em); texto 15; título de cartão 18; topo 27; destaque 46.

## Casca
- **Topo compacto**: marca 38 px, título da aba, "Atualizado …" embaixo; à direita, **Análises** (só no celular de
  quem publica) e ⋮.
- **Sub-abas**: pílulas numa faixa presa no topo; a atual em laranja suave.
- **Barra de abas presa embaixo**, de ponta a ponta, com traço laranja sobre a aba atual. Quem publica:
  Início · Caixa · **[+]** · Cartão · Carteira. Quem só consulta (Rafael): as cinco abas, sem "+".
- **"+"**: círculo laranja de 60 px saltado da barra. Abre as opções em cartões que sobem do botão
  (Cartão, Pix ou débito, Entrada, Investir, Colar SMS do Itaú) e vira "×".
- Computador (≥960 px): a barra vira lateral e o "+" vira o primeiro botão dela ("Lançar").

## Componentes
- **Destaque** (`.hero`): rótulo em caixa alta → número grande → uma frase → pílulas; brilho de brasa no canto em
  todos os tons (o tom aparece nas pílulas e na cor do número, não no fundo).
- **Cartão**: raio 24, sem contorno; no claro, sombra suave; no escuro, só um fio de luz no topo.
- **Pílula de estado** (`.chip`): fundo neutro, ícone e texto na cor do estado.
- **Listas de contas e agenda**: o dia num selo de 44 px (hoje em laranja cheio). A **Agenda é uma linha do tempo**:
  um fio liga os dias. "a pagar" é uma pílula neutra; "pago" é verde.
- **Indicadores** (`.pn-solto`): grade com fios finos; valores em Bricolage.
- **Campos**: raio 16, fundo do chão; foco com borda e halo laranja. O valor do lançamento usa 30 px em Bricolage.
  **Atalhos de categoria** (as 4 mais usadas) logo abaixo do campo de categoria.
- **Folhas**: raio 30 no topo, sobem com mola e fecham arrastando a alça.

## Movimento (`v8.js`)
Números grandes contam até o valor novo; blocos entram em cascata; troca de aba com View Transition (título e
destaque "viajam"); deslizar o dedo troca de sub-aba; gráficos se desenham; **puxar a tela para baixo no topo busca a
versão publicada**; marca chega com mola na tela de senha; vibração curta ao salvar. Tudo em transform/opacity,
150–420 ms, e desliga com "Remover animações" do Android.
