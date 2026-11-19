---
name: Lastro
description: O hub de patrimônio da família — caixa, cartão e carteira num app escuro em brasa.
colors:
  chao: "#0c0a09"
  bloco: "#16120f"
  bloco-2: "#1f1915"
  folha: "#15110e"
  topo: "#17110d"
  campo: "#1d1814"
  linha: "rgba(255, 236, 214, .08)"
  texto: "#f7f0e8"
  texto-2: "#cdbfb1"
  texto-mudo: "#a59889"
  brasa: "#ff7a35"
  brasa-texto: "#ffa463"
  ambar: "#ffb347"
  sobe: "#ffc46b"
  cai: "#ff8a80"
  tinta-na-brasa: "#1d0d05"
  cartao-brasa-1: "#e2533a"
  cartao-brasa-2: "#c2362f"
  cartao-brasa-3: "#8f2433"
typography:
  numero-do-topo:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "52px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  titulo-de-secao:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  codigo-do-cartao:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.03em"
  valor:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  corpo:
    fontFamily: "Figtree, sans-serif"
    fontSize: "14.5px"
    fontWeight: 600
    lineHeight: 1.3
  apoio:
    fontFamily: "Figtree, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  rotulo:
    fontFamily: "Figtree, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.12em"
rounded:
  icone: "13px"
  campo: "16px"
  tile: "18px"
  bloco: "22px"
  barra: "26px"
  folha: "28px"
  pilula: "99px"
spacing:
  gutter: "16px"
  linha: "11px"
  bloco: "14px"
  secao: "24px"
components:
  bloco:
    backgroundColor: "{colors.bloco}"
    rounded: "{rounded.bloco}"
    padding: "14px 16px"
  cartao-do-carrossel:
    backgroundColor: "{colors.bloco}"
    textColor: "{colors.texto}"
    rounded: "{rounded.bloco}"
    padding: "13px 14px 12px"
    width: "200px"
  botao-principal:
    backgroundColor: "{colors.brasa}"
    textColor: "{colors.tinta-na-brasa}"
    rounded: "{rounded.pilula}"
    height: "48px"
  botao-secundario:
    backgroundColor: "{colors.bloco-2}"
    textColor: "{colors.texto}"
    rounded: "{rounded.pilula}"
    height: "46px"
  acao-da-linha:
    backgroundColor: "{colors.bloco-2}"
    textColor: "{colors.texto}"
    rounded: "{rounded.pilula}"
    padding: "8px 13px"
  pilula-do-topo:
    backgroundColor: "rgba(255, 236, 214, .08)"
    textColor: "{colors.texto}"
    rounded: "{rounded.pilula}"
    padding: "6px 12px"
  icone-da-linha:
    backgroundColor: "{colors.bloco-2}"
    textColor: "{colors.ambar}"
    rounded: "{rounded.icone}"
    size: "38px"
  mais:
    backgroundColor: "{colors.brasa}"
    textColor: "{colors.tinta-na-brasa}"
    rounded: "{rounded.pilula}"
    size: "54px"
  campo:
    backgroundColor: "{colors.campo}"
    textColor: "{colors.texto}"
    rounded: "{rounded.campo}"
---

# Design System: Lastro — "Carvão"

A interface do app desde a **v10.0** (18/11/2026; construída da v9.18 à v9.30), no celular e no computador. Código: `app/v10.css` (tudo sob `html.v10`), `app/v10.js`
(topo, barra, Hoje, abertura), `app/carvao.js` (componentes puros) e `TELAS_CV` em `app/telas.js`. A interface anterior
("Brasa", v8 — `app/v8.css`) só aparece com a chave desligada (`localStorage lastro-v10 = '0'`) e sai de vez quando a
bateria de testes for reescrita para o Carvão.

## Overview

**Creative North Star: "Carteira de cartões em brasa"**

Um carvão quase preto e quente, onde só o que importa acende. Cada tela responde a uma pergunta com **um número grande no
topo** (em degradê laranja → vermelho) e, embaixo, o que pede atenção vira **cartões que se deslizam** — o que está em
foco no carrossel acende em brasa, com o pássaro da marca de marca-d'água. O resto são listas com filete, barras finas
âmbar e blocos escuros, um nunca dentro do outro. A estrutura veio da direção "Carteira de cartões", escolhida pelo Bruno
em 15/11/2026 (referências: apps de carteira e de investimento do Muzli e do webpo.space).

Cena de uso: dois Samsung em tema escuro, à noite ou em trânsito, com uma mão. O Bruno lança várias vezes ao dia;
quem só consulta **nunca vê botões que gravam**. Por isso: escuro sempre, número grande primeiro, polegar embaixo
(barra e ＋), e nenhuma informação dos painéis do Claude some — o que não tem lugar próprio fica em **Tudo do painel**.

**Key Characteristics:**
- Escuro quente (`#0c0a09`) + laranja brasa (`#ff7a35`); o número do topo em degradê `#ffb347 → #ff6a3a → #e2433f`.
- **Nada de verde e nada de tema claro** — subir é âmbar (`#ffc46b`), cair é coral (`#ff8a80`).
- Uma pergunta por tela, respondida no topo; o resto em cartões, listas e barras.
- Sem sombra para dar profundidade: profundidade = tom do bloco + filete de 8% de creme.
- Letras de no mínimo 12 px.

## Colors

Paleta de brasa sobre carvão: tudo é escuro e quente; a cor só aparece no número, na ação e no que está em foco.

### Primary
- **Brasa** (`#ff7a35`): a ação — botão principal, ＋, "Paguei/Recebi" principal, contorno do item em foco, a linha
  laranja embaixo do topo (55%). Texto sobre ela é sempre **Tinta na brasa** (`#1d0d05`), nunca branco.
- **Brasa-texto** (`#ffa463`): links ("Ver todos", "Tudo do painel"), ícone da aba atual, seta de item aberto.
- **Degradê do número** (`linear-gradient(120deg, #ffb347, #ff6a3a 55%, #e2433f)`): só o número principal do topo e o
  número do cabeçalho pequeno ao rolar.
- **Cartão aceso** (`linear-gradient(140deg, #e2533a, #c2362f 55%, #8f2433)`): o cartão em foco no carrossel.

### Secondary
- **Âmbar** (`#ffb347`): dado — barras, linhas e colunas dos gráficos, ícones das linhas.
- **Sobe** (`#ffc46b`): valor que subiu, entrada, "no alvo". **Cai** (`#ff8a80`): valor que caiu, negativo, problema.

### Neutral
- **Chão** (`#0c0a09`): fundo da tela, da barra de gestos e do manifesto.
- **Bloco** (`#16120f`) e **Bloco-2** (`#1f1915`): blocos e, dentro deles, ícones, pílulas e botões secundários.
- **Topo** (`#17110d → #120e0b`), **Folha** (`#15110e`), **Campo** (`#1d1814`).
- **Linha** (`rgba(255,236,214,.08)`): filetes e contornos.
- **Texto** (`#f7f0e8`), **Texto-2** (`#cdbfb1`), **Mudo** (`#a59889`, mínimo para texto de apoio).

### Named Rules
**A Regra Sem Verde.** Nenhum verde, em nada — nem para "bom", nem nas categorias (`semVerde` em `categorias.js`).
Bom = âmbar; atenção = brasa; problema = coral, sempre com ícone + texto.
**A Regra da Brasa Rara.** Laranja é ação ou foco. Dado é âmbar. Um bloco nunca é pintado inteiro de laranja, exceto o
cartão em foco do carrossel.
**A Regra do Escuro Único.** Não existe tema claro.

## Typography

**Display:** Bricolage Grotesque (números, títulos de seção, códigos dos cartões), sempre `tabular-nums` nos valores.
**Corpo:** Figtree (texto, rótulos, botões, listas).

**Character:** o grotesco largo e firme nos números dá peso ao dinheiro; o Figtree mantém o resto calmo e legível.

### Hierarchy
- **Número do topo** (800, 52 px, −0,045 em; centavos a 46% e erguidos): a resposta da tela.
- **Código do cartão** (800, 24 px): o nome curto no carrossel (HGLG11, DEZ, NOV).
- **Título de seção** (650, 17 px), com a contagem ao lado em Figtree 13 px mudo.
- **Valor** (700, 19–21 px): valores dos cartões e dos blocos do Hoje; nas linhas, 650 15 px.
- **Corpo** (600, 14,5 px): título das linhas. **Apoio** (12,5 px, mudo): o que vem embaixo.
- **Rótulo** (600, 12 px, caixa alta, 0,12 em): só o rótulo acima do número do topo e o título das folhas.

## Layout

Uma coluna de celular com respiro de 16 px. A tela tem três camadas: **topo** (título, botões redondos de 38 px, rótulo,
número, pílulas), a **folha de conteúdo** que sobe por cima dele (raio 28 no topo, alça de 36×4) e a **barra flutuante**
embaixo. Ao rolar, o topo vai embora com a página e aparece um **cabeçalho pequeno fixo** com o nome e o número (o topo
não encolhe — isso fazia a página pular).

Ritmo: seções a 24 px umas das outras; blocos a 10 px; linhas de 11 px de altura interna separadas por filete;
carrossel saindo da margem (`margin: 0 -16px`) com encaixe por cartão (`scroll-snap`) e 10 px entre cartões.

**Computador (≥ 960 px):** a barra vira uma coluna fixa à esquerda (232 px, raio 24) com a marca "Lastro", o **Lançar**
(o ＋ em brasa, com nome) e os quatro destinos em linhas de 48 px; topo e conteúdo ficam numa **coluna de leitura de 880 px**
no centro (o topo vira um bloco de raio 28 com contorno de brasa); gráficos até 640 px de largura (crescem junto com o
texto); folhas viram um painel à direita. Nada de colunas de jornal: no Carvão título e bloco são irmãos e não podem se
separar.

Ordem de cada tela: topo (a resposta) → cartões que pedem ação → listas curtas (3–5 itens + "Ver todos") → ações →
"Tudo do painel" no fim. Âncoras das sub-abas antigas (`#v10-aba-sub`) continuam valendo para links e busca.

## Elevation & Depth

Plano. Profundidade é tom: chão `#0c0a09` < bloco `#16120f` < bloco-2 `#1f1915`, com um filete de creme a 8%. Só há
sombra em três lugares: a **barra flutuante** (`0 10px 30px -8px rgba(0,0,0,.7)` + anel de 10 px do chão a 55%), o
**cartão em brasa** (`0 16px 30px -20px rgba(226,67,63,.9)`) e o brilho do topo. Nenhum bloco dentro de outro bloco: o que
entra num bloco perde fundo, borda e raio.

## Shapes

Cantos generosos e sempre redondos: ícone 13, campo 16, tile e passo 18–20, bloco e cartão 22, barra 26, folha 28;
pílulas, botões e o ＋ totalmente redondos. Barras com 5–7 px de altura e ponta redonda; o alvo é um traço de 2 px.
Colunas dos gráficos com raio de até 7 px. A silhueta do pássaro (`icons/badge-96.png` como máscara) é a única forma
decorativa.

## Components

### Topo
Título da tela (17 px) e situação (12,5 px mudo) à esquerda; à direita, buscar, esconder valores e ⋯ em círculos de
38 px. Embaixo: rótulo em caixa alta, o número em degradê e pílulas (`pilula()` em `v10.js`) — texto puro ou com ícone
desenhado (setas de subir/cair, estado cheio). Linha de brasa a 55% embaixo; o pássaro a 12% no canto.

### Barra
Pílula flutuante de 66 px (`rgba(20,16,13,.97)` com desfoque), quatro destinos de 64 px — **Hoje · Caixa · ＋ · Cartão ·
Carteira** — com ícone de 20 px e nome de 12 px; o atual em fundo de creme a 9% e ícone em brasa-texto. O ＋ é um
círculo de brasa de 54 px. Some ao rolar e volta ao parar. Quem só consulta não tem o ＋.

### Cartão do carrossel (`cartaoCv`)
200 px (fatura 196, mês 152, mercado 262), bloco escuro com código grande, nome, valor embaixo e rodapé. O mais perto
da borda esquerda acende (`ligarCarrosseis` → `.brasa`): degradê do cartão aceso, texto branco e o pássaro a 16%.
Tocar abre uma folha de detalhe (`data-detalhe` + `<template>`), só leitura.

### Linha (`linhaCv`)
Ícone em tile de 38 px (âmbar sobre bloco-2) ou o dia (`diaCv`), título 14,5 px até 2 linhas, apoio mudo, valor à
direita e, para quem publica, uma ação em pílula ("Paguei", "Recebi"; a principal em brasa; redonda de 40 px quando é só
um ícone). Separadas por filete; a lista inteira fica num bloco.

### Barras agora × alvo (`barrasAlvoCv`)
Rótulo e valor numa linha, trilho de 7 px âmbar com o traço do alvo; atenção em brasa, problema em coral; nota mudo
embaixo. Versão compacta: rótulo | trilho | valor numa linha só.

### Gráficos (`areaCv`, `colunasCv`)
Sem grade e sem eixo Y. Linha âmbar de 2,5 px com degradê embaixo, hoje aceso com halo, mínimo negativo em coral com o
valor, último valor escrito. Colunas âmbar arredondadas, negativas em coral. Tocar mostra o valor (`data-dica`).

### Botões
Principal: pílula de brasa, 48 px, texto escuro. Secundário: pílula bloco-2 com filete, 46 px. Ações da tela em
fileira de ícones (`acoes-ic-cv`: tiles de 52 px, raio 18) ou em pílulas (`acoesCv`). Toque afunda (`scale(.93–.97)`).

### Folhas
Sobem de baixo, fundo `#15110e`, raio 28, linha de brasa a 45% no topo, título em rótulo caixa alta centralizado. Campos
bloco `#1d1814`, raio 16; o valor do lançamento em 40 px Bricolage laranja. Passos ("Levar para o Claude") são blocos
de raio 20; o de agora com contorno de brasa e número em círculo cheio.

### Tudo do painel
Índice no fim de cada tela: um bloco por assunto, uma linha por bloco do painel (ícone pelo tipo, título, resumo, seta
que gira). Aberto, o bloco entra liso na largura toda: números em grade de duas colunas sem caixinhas, avisos como linhas
com ícone, tabelas como listas, gráficos sem grade, escolhas em pílula de brasa. Não repete o que a tela já mostra.

### Abertura
A tela inteira é o botão da digital: o pássaro no anel em brasa, a saudação e só a marca da digital num círculo de 58
px. A senha da família fica num link embaixo.

## Do's and Don'ts

### Do:
- **Do** responder a pergunta da tela no topo, com um número só (em degradê).
- **Do** usar âmbar para dado, brasa para ação ou foco, coral para problema — sempre com ícone + texto.
- **Do** mostrar 3–5 itens e "Ver todos"; o resto vai para a folha de detalhe ou para "Tudo do painel".
- **Do** escopar todo estilo novo em `html.v10` e dar nomes próprios às classes (o `.passo-txt` genérico já vazou para
  outra folha na 9.28).
- **Do** deixar o movimento dentro de `@media (prefers-reduced-motion: no-preference)` (transform/opacity, saída
  exponencial, sem quique).

### Don't:
- **Don't** usar verde, em nada, nem tema claro.
- **Don't** pôr bloco dentro de bloco, nem cartão antigo repintado: o desenho novo é dos componentes de `carvao.js`.
- **Don't** repetir na mesma tela o que o topo já diz (ex.: "Ainda cabe" na legenda, a fatura aberta no carrossel).
- **Don't** usar texto menor que 12 px nem branco sobre a brasa.
- **Don't** mostrar botões que gravam para quem não publica.
- **Don't** usar temas literais (carro, P&B esportivo, ouro) — a família detesta.
