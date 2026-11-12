# Estudo de caso — Lastro

*[Read in English](case-study.md)*

**Papel:** produto, UX e engenharia, de ponta a ponta · **Período:** out/2026 – hoje, mais de 50 versões · **Usuários:**
uma família de verdade, todo dia

## O problema

O dinheiro da família vivia em cinco lugares: o app do banco, os SMS do cartão, a corretora, a corretora de cripto e
longas conversas com uma IA que gerava ótimos painéis mensais — em arquivos HTML que ninguém abria no celular. As
perguntas do dia a dia ("quanto ainda dá para gastar este mês?", "o mês que vem vai apertar?", "onde investir este
mês?") pediam um computador e vinte minutos.

## Objetivos

- Responder "quanto ainda dá para gastar?" num olhar, no celular, para os dois adultos.
- Lançar uma compra do cartão em segundos, de preferência direto do SMS do banco.
- Manter a IA como analista — sem redigitar as contas dela e sem discordar dela.
- Custo zero, nenhum servidor para manter e **nenhum terceiro capaz de ler os dados**.

## Decisões principais

| Decisão | Por quê | Custo |
|---|---|---|
| **Usar o painel da IA como motor de cálculo** (iframe escondido, chamando as funções dele) | Uma fonte só para as contas; bloco novo da IA aparece sem versão nova | O app depende dos nomes das funções → toda chamada é opcional e protegida, com o painel original como reserva |
| **GitHub como banco de dados cifrado** | Grátis, versionado, auditável, já tem API | Um commit por sincronização → fila de 3 segundos, caixa + carteira num commit só |
| **Criptografia no aparelho + chave selada pela digital (WebAuthn PRF)** | Nada legível nos servidores nem no aparelho | O PRF não existe em todo autenticador → três modos de proteção escolhidos sozinhos |
| **Notificações vazias** | O serviço de push nunca vê conteúdo | O celular precisa baixar e decifrar para escrever o texto |
| **Funções puras em toda ação financeira** | Desfazer exato, teste fácil, rastro auditável | Mais código do que mexer no estado direto |
| **Sem framework e sem build** | Abre rápido, nada para atualizar, vida longa | Componentes, gráficos e gerador de `.xlsx` feitos à mão |
| **Conector MCP para a IA (opcional)** | Acaba com o baixar/anexar arquivo | A chave fica no servidor enquanto ligado → revogável, lista fechada de campos, validação antes |

## O que foi entregue

- Início que responde "ainda dá para gastar?" com o ritmo do dia × o que cabe por dia.
- Lançamento em dois toques pelo "+" ou pelo SMS do banco (vários de uma vez, com aviso de repetido e categoria lembrada).
- Cartão item a item, orçamentos com aviso em 80%/100%, revisão de assinaturas, planilha em Excel de verdade.
- Carteira com estimativa ao vivo, metas, dividendos, escada de liquidez, simulador de troca na renda fixa e plano de
  aportes conferido com a sobra segura do mês.
- Seletor de mês: corrigir meses fechados, planejar os que vêm.
- Fechamento do mês guiado com a IA e, depois, um conector MCP para a IA ler e gravar direto.

## Princípios de produto que vieram do uso real

1. **Sempre perguntar o alcance.** Editar ou tirar algo que se repete pergunta "só este mês / este e os próximos / só
   os próximos". Tirar uma assinatura uma vez a tirou do futuro sem avisar — nunca mais.
2. **Controle total, nunca travado.** Passado, presente e futuro editáveis; o incomum avisa em vez de bloquear.
3. **Nenhum passo novo.** As funções se encaixam no que a família já faz (lançar, fechar o mês) — sem conversas extras.
4. **Todo controle que parece mudar um dado muda de verdade**; simulação vem marcada como simulação.

## Qualidade

≈260 verificações de regressão em Playwright, 62 de ponta a ponta com dois celulares simulados e o Worker de verdade,
mais de 30 arquivos de teste de unidade e uma varredura de telas que acusa `undefined/NaN`, rolagem lateral e cartões
vazios — rodados com dados no formato real antes de cada versão. Uma tela de diagnóstico (sem valores) transformou
relatos de "não funciona" em bugs corrigíveis.

## Lições

- **Deixe o especialista continuar especialista.** Embrulhar o painel da IA em vez de reescrevê-lo evitou toda uma
  classe de bugs do tipo "o app diz X, a análise diz Y".
- **Dado real acha o que o dado de teste não acha.** Vários bugs (token vencido parando a sincronização em silêncio,
  nomes de categoria divergindo entre o app e a IA, dividendo contado duas vezes) só apareceram com meses reais — a
  bateria agora se calibra pelos dados que recebe.
- **Segurança pode ser invisível.** Chave selada pela digital e notificação vazia custam zero toques a mais para a família.
