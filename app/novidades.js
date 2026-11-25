// Novidades de cada versão (saiu do app.js em 14/11/2026): aparecem uma vez em cada celular quando a versão nova entra
// (mostrarNovidades, app.js) e ficam em menu → Novidades e histórico. Escrever para o Bruno e o Rafael, em linguagem simples.
// Cada item: [título, texto, tipo?] — tipo = nova | melhoria | correcao. **A cada versão, a entrada nova vai no topo.**
export const NOVIDADES = {
  '11.3.1': [
    ['App instalado igual ao site', 'A barra de cima da janela do app instalado agora acompanha a interface (azul-noite na Meia-noite) e não fica mais bege com o Windows claro.', 'correcao'],
    ['Atualiza sem fechar', 'A janela do app no computador agora procura a versão nova sempre que você volta para ela, sem precisar fechar e abrir.', 'correcao'],
  ],
  '11.3.0': [
    ['Meia-noite: o Plano', 'Na interface em teste, a quarta aba é o Plano: os 5 números do consultor (poupança, patrimônio, reserva em meses, cartão e gasto livre), para onde vai a sobra do mês e os potes das metas.', 'nova'],
    ['A sobra confere com o caixa', 'O Plano soma os aportes que faltam e avisa se eles deixam a conta negativa no mês que vem — e sugere quanto adiar.', 'nova'],
    ['Decisões numa linha do tempo', 'Os passos do plano em Agora, Esta semana e Depois, com o Feito em cada um, e o que o Claude notou (estratégia, conta parada, orçamento, vencimento da fatura, come-cotas). A nota de saúde saiu.', 'melhoria'],
  ],
  '11.2.0': [
    ['Meia-noite: o Patrimônio', 'Na interface em teste, a Carteira virou Patrimônio. No topo, um mapa: cada tipo de investimento do tamanho do que vale, dizendo se está acima ou abaixo do alvo — toque num para ver os ativos dele.', 'nova'],
    ['O que mudou no mês', 'Um gráfico em degraus mostra de onde veio a diferença: resgates, aportes e o mercado. Assim dá para ver se uma queda foi resgate ou prejuízo.', 'nova'],
    ['Para onde vai, com o 13º', 'A linha do patrimônio do último ano e a projeção até daqui a 5 anos. Ligue "Investir o 13º e o PPR" para ver a diferença.', 'nova'],
    ['Come-cotas avisado', 'Em maio e novembro, o app avisa o dia do come-cotas nos fundos de renda fixa: o valor líquido cai um pouco, e é imposto, não perda.', 'melhoria'],
  ],
  '11.1.0': [
    ['Meia-noite: o Mês', 'Na interface em teste, Caixa e Cartão viraram uma tela só, o Mês. Abre no calendário, com o saldo de cada dia (toque num dia com ponto para ver o que entra e sai). Também tem a linha e os 12 meses.', 'nova'],
    ['O mês em três baldes', 'Fixo (o que já está comprometido), Livre (o gasto do dia a dia) e a Sobra, com a taxa de poupança do mês.', 'nova'],
    ['Aviso do cheque especial', 'Se a conta fica no negativo porque a fatura vence antes do dinheiro entrar, o Mês avisa e sugere o melhor dia de vencimento.', 'nova'],
    ['Cartão dentro do Mês', 'Na Meia-noite o Cartão saiu da barra: está no Mês, no filtro Cartão, com tudo o que tinha (faturas, compras, recorrentes). Categorias avisam antes de passar do orçamento.', 'melhoria'],
  ],
  '11.0.0': [
    ['Lastro 11 em teste: a Meia-noite', 'A repaginação nova começou. Em Configurações, ligue "Interface Meia-noite (em teste)" para ver: cores azul-noite e coral, a barra com Hoje, Mês, Cartão e Patrimônio, e o Hoje novo. Quem não ligar continua com o app de sempre.', 'nova'],
    ['Livre de verdade', 'Na Meia-noite, o número grande do Hoje é o que dá para gastar sem mexer no que já tem destino: o que ainda cabe no cartão. Se os aportes do plano passarem do caixa do mês que vem, ele avisa. Toque no número para ver o porquê.', 'nova'],
    ['Hoje como briefing', 'Uma frase do dia, até 3 coisas para fazer hoje (a mais urgente primeiro), o ritmo do gasto livre e os próximos dias — cada um abre o detalhe.', 'melhoria'],
  ],
  '10.2.0': [
    ['Hoje novo', 'O Hoje virou um resumo do app inteiro: a leitura do dia (como o mês fecha e o que pede cuidado), o Caixa, o Cartão e a Carteira em três cartões coloridos que deslizam, a agenda dos próximos dias (toque num dia para ver o que entra e sai), o que fazer e para onde vai a conta no próximo ano.', 'nova'],
    ['Saldo de hoje certo', 'O Hoje mostra o saldo da conta de hoje pela agenda do mês, não o último saldo do banco lançado.', 'correcao'],
  ],
  '10.1.0': [
    ['Tudo do painel por assunto', 'No topo, os assuntos de cada tela com o número que resume cada um (na Carteira: desempenho, renda, estratégia, liquidez, futuro e plano). Toque num deles para ir até lá. Embaixo, os blocos do Claude já abertos, sem a lista de títulos para tocar um a um. Nada sumiu.', 'melhoria'],
    ['Listas com barra', 'Listas de valores do painel (resgates por mês, por exemplo) mostram uma barra do tamanho de cada valor: dá para comparar de relance.', 'melhoria'],
  ],
  '10.0.1': [
    ['Itaú, Binance e o resto fecham com o total', 'Embaixo do total da Carteira, o que não está ligado ao Itaú nem à Binance aparece à parte (os Tesouros de novembro estavam de fora).', 'correcao'],
    ['Ativo novo liga sozinho ao Itaú', 'Comprou um investimento novo? Na atualização do Itaú ele é ligado sozinho pelo nome. O que não tiver par vira aviso com "Ligar", e dá para marcar "está em outro lugar".', 'nova'],
    ['Data dos valores da Carteira', 'O topo da Carteira mostra a data dos valores (a última atualização), não a data oficial do último fechamento.', 'melhoria'],
  ],
  '10.0.0': [
    ['Lastro 10: o Carvão é a interface', 'A interface nova agora é a do app para os dois celulares, sem precisar ligar nada. Se precisar, dá para voltar à anterior por um tempo em Configurações.', 'nova'],
    ['Roteiro da carteira mais claro', 'Os passos que faltam agrupados pelo dia (com quanto falta para ele), cada um com o valor e o ✓ de feito; os já feitos numa linha só.', 'melhoria'],
    ['Projeção de cada ativo', 'Na Carteira, além do total, a projeção de cada investimento com a taxa e a premissa. O Claude passa a calcular no próximo fechamento da carteira.', 'nova'],
    ['Tudo do painel mais enxuto', 'Assuntos iguais numa linha só (consumo de patrimônio e aportes; eficiência e custo médio da renda fixa; variação e termômetro). Bloco que vier sem dados diz isso, em vez de abrir em branco.', 'melhoria'],
    ['No computador também', 'Na tela larga, a barra vira uma coluna à esquerda com o Lançar, e as telas ficam numa coluna de leitura no centro.', 'nova'],
    ['Próximas faturas com a parcela certa', 'Cada fatura futura mostra o número da parcela daquele mês (antes repetia o de agora).', 'correcao'],
    ['Mudar o valor de uma parcela', 'Numa compra parcelada: "Mudar o valor de uma parcela" — só esta, esta e as próximas ou só as próximas. O total não precisa ser redigitado.', 'nova'],
    ['Data das compras parceladas', 'No parcelamento do cartão, o campo "Data da compra" (com o ano). Se a data não bater com o número da parcela, o app avisa.', 'nova'],
    ['Passou do limite do cartão', 'No Hoje, quando a fatura passa do limite, o bloco mostra quanto passou (em vez de "cabe R$ 0"). O topo do Cartão também.', 'melhoria'],
    ['Valores exatos', 'Os valores das telas novas aparecem com os centavos.', 'melhoria'],
    ['Itaú e Binance na Carteira', 'Embaixo do total investido, quanto está no Itaú e na Binance (aparece depois da próxima atualização automática).', 'nova'],
    ['Ver todos os ativos', 'Todos os cartões acesos, um tom por tipo de investimento. A planilha da fatura agora vem das compras mais novas para as mais antigas.', 'melhoria'],
  ],
  '9.29.1': [
    ['Sem verde no aviso de salvo', 'Na interface nova, o ✓ do aviso "Salvo" agora é âmbar, como o resto do app.', 'correcao'],
  ],
  '9.29.0': [
    ['Interface nova: o que você pediu', 'Abertura só com a marca da digital — toque em qualquer lugar. Barra de baixo alinhada, com o ＋ no centro, e "Investimentos" virou "Carteira".', 'melhoria'],
    ['Tudo do painel refeito', 'Saiu o que as telas já mostram (botões repetidos, destaques, metas, nota, mercado). Os blocos abertos ocupam a largura toda e seguem o desenho novo: números sem caixinhas, avisos em linhas, gráficos sem grade, escolhas em brasa.', 'melhoria'],
    ['Levar para o Claude no lugar', 'Os passos da folha voltaram às proporções certas: o texto ocupa a largura toda e o nome do arquivo fica embaixo.', 'correcao'],
  ],
  '9.28.0': [
    ['Interface nova: gráficos no desenho novo', 'O saldo do mês, a evolução da carteira e os meses fechados ganharam gráficos novos: sem grade, uma linha âmbar que se desenha ao abrir, o ponto de hoje aceso e os valores só onde importam. Tocar ou arrastar continua mostrando cada dia.', 'nova'],
    ['Telas mais enxutas', 'Investimentos: ativos, estratégia com o próximo passo, evolução e renda juntas, metas em linhas e os movimentos numa fileira de ícones. Listas mais curtas no Cartão e no Caixa (com "Ver todas"). Nas Análises, só o que pede atenção aparece aberto — o que está certo vira uma linha.', 'melhoria'],
    ['Mais vida ao tocar', 'Os cartões e as linhas afundam um pouco ao toque, os blocos do Hoje entram em cascata e o ícone da aba acende. No Tudo do painel, as tabelas viraram listas que cabem no celular.', 'melhoria'],
  ],
  '9.27.0': [
    ['Interface nova: o que você pediu', 'Abertura: sem a janela da digital pulando sozinha nem o botão dela — é só tocar na tela. Barra embaixo na ordem de prioridade: Hoje, Caixa, ＋, Cartão e Investimentos; o ⋯ (menu) foi para o topo. Hoje: o saldo do banco em primeiro e, embaixo, as contas a pagar (com o pago) e as últimas compras. Investimentos: cartões menores e "Ver menos" depois do "Ver todos". Cartão: o seletor de mês menor e sem a fatura repetida (o carrossel mostra só as próximas).', 'melhoria'],
    ['Tudo do painel, organizado', 'O Tudo do painel de cada tela virou um índice limpo: os assuntos agrupados (Fatura, Gastos, Parcelas…), uma linha por bloco com um resumo — toque para abrir ali mesmo. Nada sumiu. No menu ⋯, o Caixa saiu (agora está na barra).', 'melhoria'],
  ],
  '9.26.0': [
    ['Interface nova: as telas redesenhadas do zero', 'Com a interface nova ligada, Investimentos, Cartão, Caixa e Análises foram redesenhados do zero no jeito que você escolheu, "Carteira de cartões": o que importa vira um cartão que você desliza — cada ativo com o código grande, cada fatura (a aberta em brasa e as próximas), cada mês dos próximos 12, cada análise do Claude e cada ativo no mercado. Embaixo, barras agora × alvo (estratégia, orçamento por categoria, a nota de saúde), listas com ícone (compras, contas a pagar com o botão de pago, recorrentes) e o que fazer agora. O topo das Análises mostra a nota do mês.', 'nova'],
    ['Nada sumiu: Tudo do painel', 'No fim de cada tela, "Tudo do painel" abre tudo o que o painel do Claude mostra sobre o assunto, inteiro — e "Voltar" volta ao desenho novo.', 'melhoria'],
  ],
  '9.25.0': [
    ['Interface nova: tudo no desenho novo', 'Com a interface nova ligada, todos os cartões por dentro das telas — inclusive os que vêm do painel do Claude — passaram para o desenho Carvão: blocos escuros iguais, títulos menores, linhas com filete, barras finas em âmbar (atenção em laranja, problema em coral), botões em pílula, sem cartão dentro de cartão e sem "Toque para abrir". O Caixa ganhou o saldo da conta no topo, com o pior dia e como o mês fecha, e o que se repetia saiu de dentro.', 'melhoria'],
  ],
  '9.24.0': [
    ['Interface nova: Caixa e Análises', 'Com a interface nova ligada, o Caixa e as Análises também viraram uma leitura só, sem abas — e todo atalho (do Mais, do Hoje ou da busca) rola a tela direto até a parte certa, como "Contas a pagar" ou "Conferir caixa × carteira".', 'nova'],
  ],
  '9.23.0': [
    ['Interface nova: a abertura', 'Com a interface nova ligada, a tela de abrir o Lastro mudou: a marca no anel em brasa, os anéis acendendo um por um, a saudação (bom dia, boa tarde, boa noite) e a digital embaixo — é só tocar. A senha da família continua no link de baixo.', 'nova'],
  ],
  '9.22.0': [
    ['Interface nova: o Mais', 'Com a interface nova ligada, o Mais (⋯ na barra) ganhou no topo o que não está na barra: Caixa (contas a pagar, próximos 12 meses, saldo no banco) e Análises (as do Claude, o mercado e a conferência entre caixa e carteira) — cada um com uma linha dizendo como está, como "3 contas até o fim do mês · próxima 20/11".', 'nova'],
  ],
  '9.21.0': [
    ['Interface nova: Investimentos', 'Com a interface nova ligada (Configurações), Investimentos virou uma leitura só, sem as abas Visão, Alocação, Ativos, Renda e Evolução. No topo, o patrimônio e se a carteira está Saudável, em Atenção ou Fora do plano — com o quanto ela segue a estratégia ("Estratégia 92% fiel"). Embaixo, nesta ordem: o que fazer agora, a estratégia, os seus ativos (toque para aportar, resgatar ou atualizar), a renda e a evolução.', 'nova'],
  ],
  '9.20.1': [
    ['Categorias com cor de novo', 'Os ícones das categorias voltaram a ter cada um a sua cor — e nenhuma é verde: Saúde, Academia, Suplementos, Investimentos, Pix, Serviços e Sítio ganharam cores novas, e uma cor verde que você tenha escolhido antes aparece trocada.', 'melhoria'],
    ['Interface nova: o topo parou de piscar', 'Ao rolar a tela, o topo encolhia, a página pulava e ele voltava a crescer, sem parar. Agora o topo sobe junto com a tela e um cabeçalho fino aparece em cima com o número principal.', 'correcao'],
  ],
  '9.20.0': [
    ['Interface nova: o Cartão', 'Com a interface nova ligada (Configurações), o Cartão virou uma leitura só, sem as abas Fatura, Gastos e Parcelas: a barra do que compõe a fatura e quanto ainda cabe, o ritmo até o fim do mês, as compras (cada uma abre para editar), o gasto por categoria com o orçamento e as próximas faturas.', 'nova'],
  ],
  '9.19.0': [
    ['Interface nova: o Hoje', 'Com a interface nova ligada (Configurações), o Hoje ficou no desenho novo: quatro blocos — fatura, quanto cabe no cartão, saldo no banco e o investido — e, só quando há algo a fazer, até três faixas com o mais urgente primeiro (aporte, passo do plano, conta chegando, fechamento). O ＋ ganhou um desenho novo: o valor grande no centro, as categorias em botões e o botão que já mostra quanto sobra no mês depois do gasto.', 'nova'],
  ],
  '9.18.0': [
    ['Interface nova em teste', 'Em Configurações › Interface nova: o começo da repaginação, com o visual Carvão — o topo escuro com o número em laranja, a tela subindo como uma folha e a barra de vidro com o ＋ no meio. As telas por dentro ainda são as de hoje; mudam nas próximas versões. Dá para desligar quando quiser.', 'nova'],
  ],
  '9.17.2': [
    ['Arrumação por dentro', 'O código do app foi dividido em partes menores (avisos e folhas, Binance, Itaú e conciliação, cada um no seu arquivo). Nada muda no uso: é para as próximas melhorias saírem mais rápido e com menos risco.', 'melhoria'],
  ],
  '9.17.0': [
    ['Fechamento pelo Claude direto', 'Com o conector ligado, as etapas Carteira e Caixa do fechamento são só copiar o pedido: o Claude lê o Lastro, mostra o resumo e deixa o mês novo pronto. Nada vai para a família até você tocar em Aplicar no cartão "Fechamento pronto" do Início (com Descartar e, depois, Desfazer).', 'nova'],
  ],
  '9.16.1': [ // a 9.16.0 não chegou a entrar no ar (montagem falhou: limite de crons)
    ['Resumo da semana', 'Todo domingo às 19h chega o aviso do resumo da semana: quanto saiu nos últimos 7 dias (e se foi mais ou menos que na semana anterior), para onde foi, os maiores gastos, se o mês está no ritmo e o que vence nos próximos 7 dias. Aos domingos ele também fica no topo do Início; nos outros dias, menu ⋮ → Resumo da semana.', 'nova'],
  ],
  '9.15.0': [
    ['Caixa sem números brigando', 'Quando o gráfico do saldo já conta algo que ainda não foi confirmado (ex.: um salário que caiu ontem e ninguém marcou), o destaque avisa quanto é e leva à agenda para confirmar. O "Mínimo" agora é de hoje em diante, igual ao do painel.', 'correcao'],
    ['Prints nas ideias', 'Menu ⋮ → Ideias e feedback: dá para anexar até 3 prints junto da ideia.', 'nova'],
    ['Trocar o endereço do conector', 'Menu → Claude direto: se o link do conector vazar, "Trocar o endereço" cria outro na hora e o antigo para de funcionar.', 'nova'],
    ['Pequenos acertos', 'Nomes de ativos com as siglas certas ("Tesouro IPCA+ 2035"); a renda passiva no Hoje mostra a média de 3 meses quando os dividendos do mês ainda não caíram.', 'melhoria'],
  ],
  '9.14.0': [
    ['"Hoje" no Início', 'O "Para olhar" virou "Hoje": o que pede ação vem primeiro e, quando dá para fazer na hora, a linha tem o botão ao lado — Investir (o aporte do mês, quando já cabe) e Feito (o passo do plano de ação com data nesta semana). Gatilhos da estratégia e a hora de rodar o Plano levam direto para o Claude.', 'nova'],
  ],
  '9.13.0': [
    ['A estratégia manda no app', 'A estratégia que o Claude grava no Plano passa a ser a única fonte: a meta de alocação do painel sai dela sozinha (antes eram três cópias que se desencontravam). Quando ela mudar, o app avisa o que mudou (alvos, ordens, gatilhos), com Desfazer.', 'nova'],
    ['Pausar na ordem dos aportes', 'Carteira › Alocação → Estratégia: cada item da ordem do dinheiro novo tem Pausar/Retomar. O Investir já abre no primeiro item, avisa quando o ativo está fora da ordem ou pausado e, no Resgate, quando a estratégia pede para evitar aquele ativo.', 'nova'],
    ['Gatilhos vigiados', 'Os gatilhos da estratégia com número (dólar, CDI, salário) são conferidos pelo app; quando um dispara, aparece no Hoje com "Levar para o Claude".', 'nova'],
  ],
  '9.12.4': [
    ['Instruções do Projeto que se atualizam sozinhas', 'Com o Claude direto ligado: menu → Instruções do Projeto → "Copiar o texto curto" e cole uma vez no Projeto. O Claude passa a ler as instruções completas pelo conector, e quando elas mudarem não precisa recolar nada.', 'nova'],
    ['Painéis para testes baixam direto', 'Configurações → Baixar os painéis para testes: os dois vão para a pasta Downloads, sem passar pelo Compartilhar (que continua no aviso, se preferir).', 'melhoria'],
  ],
  '9.12.3': [
    ['FIIs, ETFs e GLDI11 pelo preço da B3', 'Na atualização automática, cada um vale as suas cotas × o preço da B3 de agora (o Itaú mostrava o preço com 2 a 3 pregões de atraso e demorava a mostrar as cotas compradas — foi o que tirou as 20 cotas de GLDI11). Os fundos continuam vindo do Itaú.', 'correcao'],
    ['Aporte e resgate esperam o banco', 'Depois de um aporte ou resgate num fundo, o Itaú leva alguns dias para mostrar. O app espera até 3 dias úteis antes de usar o saldo do banco, para não desfazer o que você lançou.', 'correcao'],
    ['Fatura igual à do Itaú', 'Compra parcelada: a 1ª parcela leva os centavos que sobram, como o Itaú faz (66,24 + 3 × 66,22). Trocar a categoria de uma parcela ou recorrente agora move o valor junto, e as parcelas mostram a data da compra.', 'correcao'],
    ['Um resultado do mês só', 'Carteira › Visão mostra o resultado do mês da posição gravada (o mesmo do painel). A estimativa de agora só aparece num dia depois da posição.', 'melhoria'],
    ['Claude direto sem arquivo', 'Com o conector ligado, Plano, Pesquisa e Análise do dia viram um passo só: copiar o pedido e colar no Claude. Ele lê e grava sozinho (o fechamento continua com arquivo). Recole as instruções do Projeto (menu → Instruções do Projeto).', 'melhoria'],
  ],
  '9.12.2': [
    ['Bastidores', 'Preparação da versão de demonstração (portfólio público, com uma família fictícia). Nada muda no seu uso.', 'melhoria'],
  ],
  '9.12.1': [
    ['Repositório com nome novo', 'O repositório do Lastro passou a se chamar Lastro-Personal. O app se ajustou sozinho: nada para configurar.', 'melhoria'],
  ],
  '9.12.0': [
    ['Menu reorganizado', 'O menu agora tem grupos — Do dia a dia, Com o Claude, Dados e Ajuda — e no topo um cartão com a situação (caixa, carteira, se já foi para a família) e o botão Buscar atualização. Esconder os valores virou uma chave na própria linha.', 'melhoria'],
    ['Configurações numa tela só', 'Menu → Configurações: avisos e lembretes com chave liga/desliga, proteção, senha da família, organizar o Início, a validade do token do GitHub (avisa quando está perto de vencer), diagnóstico e, separado em vermelho, apagar os dados deste celular.', 'nova'],
  ],
  '9.11.0': [
    ['Escolha o mês', 'Em Caixa e Cartão, as setas no topo mudam de mês. Meses passados mostram como o mês fechou (entradas, contas, fatura, anotação) e dá para corrigir. Meses que vêm mostram a projeção: o que entra e o que sai, com a sobra prevista; toque numa conta que se repete para mudar o valor só daquele mês, ou lance uma conta a pagar ou uma entrada direto naquele mês. No Cartão, a fatura daquele mês com as parcelas e recorrentes. O Início continua sempre em hoje.', 'nova'],
  ],
  '9.10.0': [
    ['Claude direto (conector)', 'Menu → Claude direto: liga o Lastro como conector no claude.ai. O Claude passa a ler o caixa e a carteira sozinho e grava plano, análises, fichas, estratégia, meta de alocação e análise de mercado sem você baixar, anexar ou importar nada — ele mostra o que vai mudar e só grava depois do seu "pode gravar". O fechamento do mês continua com os arquivos. "Desligar o Claude" apaga a chave do servidor na hora.', 'nova'],
    ['Resposta pequena aceita mais', 'A resposta do PLANO agora também pode trazer a meta de alocação e a análise de mercado.', 'melhoria'],
  ],
  '9.9.14': [
    ['Listas de escolha no visual do app', 'Escolher o investimento, o tipo, as parcelas, a categoria, o mês e os simuladores agora abre uma lista do próprio Lastro, com o valor de cada investimento ao lado, em vez da caixa cinza do Android que cobria a tela.', 'melhoria'],
  ],
  '9.9.13': [
    ['Aporte em investimento novo', 'No "+" → Investir → Aporte, a lista agora tem "+ Investimento novo": escreva o nome (Tesouro Prefixado 2029, VWRA11…) e o tipo, e ele entra na carteira com o aporte. Antes só dava para aportar no que a carteira já tinha — os passos do plano com Tesouro e VWRA11 não tinham como ser lançados.', 'correcao'],
  ],
  '9.9.12': [
    ['Renda fixa no critério certo', 'O "% do CDI" de cada fundo comparava o saldo líquido (sem o IR) com o CDI bruto e derrubava todos uns 15%. Agora o app devolve o IR para comparar no mesmo critério das lâminas (ex.: Active Fix All ~102%, Optimus ~53%). O simulador de troca continua usando o que rendeu de fato.', 'correcao'],
    ['Plano de ação do Claude no Lastro', 'Os passos que o Claude manda no plano_acao (resposta pequena do PLANO) agora entram no Roteiro da carteira (Carteira › Visão), e cada passo tem "Marcar como feito" e "Não vou fazer" — o que você descartar vai no próximo pedido do Plano, para o Claude refazer as contas sem ele. Instruções do Projeto mudaram: copie e cole de novo.', 'nova'],
    ['Resgate que o banco já descontou', 'Se o Itaú automático já tirou o valor do investimento antes de você lançar o resgate, o app agora aceita o resgate mesmo assim: registra a saída na carteira e a entrada no caixa, sem descontar de novo. Antes ele recusava ("tem só R$ 0,00").', 'correcao'],
    ['Auditoria na conferência', 'Análises › Conferir agora acusa investimento que caiu muito no mês sem resgate registrado e fatura que não bate com as categorias.', 'nova'],
    ['Quando rodar o Claude', 'Menu → Levar para o Claude mostra quando rodar Carteira, Caixa e Plano (1× por mês, no fechamento) e avisa — no Início e por lembrete — quando vale rodar o Plano antes: você descartou um passo ou fez um movimento grande fora do plano.', 'nova'],
    ['O "+" fecha com movimento', 'O menu do "+" agora também sai animado ao tocar no × ou fora dele.', 'melhoria'],
  ],
  '9.9.11': [
    ['Planilhas em Excel de verdade', 'A planilha para conferir a fatura com o Itaú e a do Imposto de Renda agora são arquivos do Excel (.xlsx): uma linha por lançamento e uma coluna por informação (data, descrição, categoria, valor, tipo), valor como número que soma e filtra, cabeçalho fixo com filtro e o total no fim. A da fatura traz tudo o que compõe a fatura (inclusive as compras da fatura do Itaú) e uma aba por categoria.', 'melhoria'],
  ],
  '9.9.10': [
    ['Itaú pelo valor líquido', 'A carteira passa a guardar o valor líquido do Itaú (já sem o IR — ex.: Active Fix All R$ 24.108, não os R$ 24.393 brutos). Na tela do Itaú, o líquido aparece grande e o bruto pequeno, com o nome de cada um. Na primeira atualização os fundos do Itaú "caem" a diferença do IR — não é perda. O simulador de troca e os textos da renda fixa tratam os valores como líquidos. As instruções do Projeto mudaram: copie e cole de novo.', 'correcao'],
  ],
  '9.9.9': [
    ['Itaú: bruto × líquido (corrigido na 9.9.10)', 'Esta versão usou o bruto do Itaú; o certo é o líquido, que a 9.9.10 passou a usar.', 'correcao'],
  ],
  '9.9.8': [
    ['Itaú: bruto × líquido (corrigido na 9.9.10)', 'Esta versão chamou de bruto o que era o líquido; a 9.9.10 deixou os nomes e o valor certos.', 'melhoria'],
    ['Comparação com o mês anterior', 'Na Carteira, "Hoje · estimativa" e "Seus investimentos" comparam com o fechamento do mês anterior, sem contar os aportes e resgates do mês (antes comparava com a última atualização de valores).', 'melhoria'],
  ],
  '9.9.7': [
    ['12 meses que dá para entender', 'Caixa › 12 meses mostra a sobra de cada mês (o que entra menos o que sai — o que dá para investir) e com quanto começar o mês para a conta não ficar no vermelho antes do salário. Toque num mês para ver tudo o que entra e sai. O simulador fica no fim, em "Simular".', 'melhoria'],
    ['13º e retroativo não são salário', 'O 13º e o retroativo do dissídio estavam marcados como salário, e a projeção repetia os dois em todos os meses (R$ 8 mil a mais por mês). O app corrige sozinho, com Desfazer; as instruções do Projeto também mudaram — copie e cole de novo (menu → Instruções do Projeto).', 'correcao'],
  ],
  '9.9.6': [
    ['Instruções do Projeto completas', 'Menu → Instruções do Projeto agora copia o texto inteiro (a parte do caixa e a do Lastro juntas): é só apagar tudo no Projeto e colar.', 'nova'],
    ['Histórico de versões', 'Menu → Novidades e histórico mostra o que mudou em cada versão, a mais nova primeiro, marcando o que é novo, melhoria ou correção.', 'nova'],
    ['Tabelas que cabem na tela', 'Tabelas com três colunas de valores (ex.: Fatura por mês) não saem mais do cartão nem encostam um número no outro; o "R$" fica implícito e o sinal de menos aparece certo.', 'correcao'],
    ['Barra de abas sem transparência', 'Ao rolar, a barra de baixo só desliza para fora — não fica mais meio transparente com o texto da tela aparecendo por cima.', 'correcao'],
  ],
  '9.9.5': [
    ['Recorrente fora de um mês só', 'Quando você tira uma recorrente "só deste mês", o painel ainda a somava e acusava divergência na fatura. No próximo fechamento, o pedido da etapa Caixa já pede ao Claude o painel corrigido — uma vez só. As instruções do Projeto mudaram: copie e cole de novo (menu → Instruções do Projeto).', 'correcao'],
  ],
  '9.9.4': [
    ['Mês anterior de volta nos gastos', 'Em Cartão › Gastos, "Onde cortar gasto" e o ritmo por categoria mostravam o mês anterior zerado: o fechamento usava "Mercado" e o app "Supermarket". Agora cada categoria tem um nome só (o da sua lista) — o app acerta sozinho, com Desfazer.', 'correcao'],
  ],
  '9.9.3': [
    ['Automático não atropela o manual', 'Itaú e Binance só trocam o valor de um investimento quando o banco tem um saldo mais novo do que o que você fez à mão. Lançou um aporte ou resgate que o banco ainda não mostra, ou digitou um valor em Atualizar valores? Aquele investimento espera o próximo dia — sem queda ou alta falsa. Em Atualizar valores, os automáticos aparecem marcados.'],
    ['Estimativa de hoje certa', 'Na Carteira, o "Hoje · estimativa" não soma mais o mercado em cima do que já veio do banco, e os FIIs voltam a mostrar a variação do dia.'],
  ],
  '9.9.2': [
    ['Subiu ou caiu', 'Quando a Binance e o Itaú atualizam sozinhos, o aviso mostra quanto subiu ou caiu, em reais e em % (ex.: "Itaú: subiu R$ 45,67 (+0,21%)"), e o detalhe de cada investimento fica no histórico, igual ao Atualizar valores manual. Os dois avisos aparecem um depois do outro.'],
  ],
  '9.9.1': [
    ['Onde achar o Item ID', 'A tela de ligar o Itaú agora explica: dashboard.pluggy.ai → página Demo → toque na conexão do Itaú → copie o itemId.'],
  ],
  '9.9.0': [
    ['Itaú atualiza sozinho', 'Carteira › Atualizar valores → Ligar o Itaú pelo Open Finance: cole as chaves da Pluggy e escolha a qual investimento da carteira cada aplicação do Itaú corresponde (o app já sugere pelo nome). Depois disso, 1× por dia, ao abrir, os valores entram sozinhos na carteira — com Desfazer, como qualquer lançamento.'],
    ['Faxina', 'Código morto removido e testes atualizados. Nada muda no uso.'],
  ],
  '9.8.5': [
    ['Perguntas e avisos mais bonitos', 'A pergunta "de quando?" mostra cada opção com o título em cima e a explicação embaixo. O aviso de "Salvo" ficou mais discreto, escuro como o app, com o Desfazer em laranja.'],
  ],
  '9.8.4': [
    ['Editar pergunta de quando', 'Mudou o valor ou a data de algo que se repete (conta fixa, entrada, Pix recorrente, recorrente do cartão) ou que tem parcelas (Pix parcelado)? O app pergunta: só este mês, este e os próximos, ou só dos próximos — igual ao tirar.'],
    ['Controle total', 'Nada mais trava: datas passadas e futuras, pago com data futura, agendar até 5 anos, entrada de um mês que vem, lançar com o mês virado. Onde for incomum, o app avisa e deixa fazer. E os meses já fechados podem ser corrigidos em Caixa › Contas › Meses fechados.'],
  ],
  '9.8.3': [
    ['Pix e contas agendados', 'Pix, débito e conta a pagar aceitam data no futuro (até 11 meses). Neste mês, entra como "a pagar" no dia; num mês que vem, vai para os próximos meses e para a projeção. Vale também para o parcelado: a 1ª parcela cai no dia que você escolher. Caixa › Contas mostra o que está agendado para os próximos meses (toque para tirar).'],
  ],
  '9.8.2': [
    ['Tirar só deste mês', 'Ao tirar uma recorrente do cartão, uma conta fixa ou uma entrada, o app pergunta: só deste mês (volta no mês que vem), deste mês e dos próximos, ou só dos próximos. Antes ele tirava de vez.'],
  ],
  '9.8.1': [
    ['Menos conversas com o Claude', 'A revisão da estratégia e as fichas dos ativos agora vão junto na etapa Plano do fechamento do mês. Não precisa abrir conversa extra: Fichas, Revisar e Pesquisar continuam lá só para quando você quiser.'],
  ],
  '9.8.0': [
    ['Simular uma troca na renda fixa', 'Carteira › Alocação → Renda fixa de verdade → Simular uma troca (ou na folha de um fundo): quanto você teria ficando onde está × indo para um CDB, LCA, Tesouro IPCA+ ou prefixado — com o rendimento real do fundo de hoje, os dias parado no resgate e o imposto. Nada é gravado.'],
    ['Quando o dinheiro fica disponível', 'Carteira › Alocação: a carteira inteira em degraus (cai hoje, em 1–2 dias, em 3–6 dias…) e, quando você tiver títulos com vencimento, ano a ano, com aviso do que vence em até 60 dias.'],
  ],
  '9.7.0': [
    ['Quando o resgate cai na conta', 'Toque num investimento (Carteira › Ativos): o app diz em que dia o dinheiro cai se você pedir agora (ex.: Active Fix All, D+6 úteis), contando fins de semana e feriados. No Resgate, a data já vem preenchida.'],
    ['Fichas dos ativos', 'Carteira › Alocação → Fichas dos ativos: o Claude pesquisa prazo de resgate, taxas, imposto e risco de cada investimento, com fonte. A ficha aparece na folha de cada ativo.'],
    ['O app confere o plano', 'Na Estratégia, "Pontos a rever no plano": aporte em fundo que rende pouco, dólar num ativo que você já tem, dinheiro com data num resgate demorado. Vão junto no texto do Plano.'],
    ['Instruções do Projeto no app', 'Menu → Instruções do Projeto: copie e cole no claude.ai. O menu avisa quando elas mudarem.'],
    ['Painéis para testes', 'Menu → Avançado → Mandar os painéis para testes: mande para o Claude Code testar com os seus dados.'],
  ],
  '9.6.1': [
    ['Pix e débito parcelado ou recorrente', 'No "+" → Pix/débito: escolha as parcelas (sai a primeira agora e as outras nos próximos meses) ou marque Recorrente (vira uma conta fixa que se repete todo mês).'],
  ],
  '9.6.0': [
    ['Sair e voltar sem a digital', 'Se você voltar ao Lastro em até 1 minuto, ele abre direto — mesmo quando o Android fecha o app por trás para liberar memória. Passou de 1 minuto, pede a digital como sempre.'],
    ['Categorias no cartão', 'Recorrentes e parcelas ganharam categoria sozinhas quando o app reconhece o nome (Netflix → Streaming, Ração Mia → Mia…). As que ele não conhece: toque nelas e escolha.'],
    ['Início mais limpo', 'O destaque mostra o seu ritmo dentro do que cabe por dia, e "fim do mês" e "gasto hoje" lado a lado. Próximas contas mais baixas, com o Paguei à direita.'],
    ['Renda fixa de verdade', 'Carteira › Alocação: quanto cada fundo rendeu de fato × o CDI do mesmo período, pior primeiro. Vai junto no texto do Plano para o Claude ajudar a remanejar.'],
    ['Plano mais rápido', 'Na etapa Plano (e na análise de um dia comum) o Claude devolve só um arquivo pequeno com o que mudou. O app junta sozinho.'],
    ['Fluidez no Diagnóstico', 'Menu → Avançado → Diagnóstico: tempo de abertura, travadas e o botão Medir a fluidez.'],
  ],
  '9.5.0': [
    ['Levar para o Claude, passo a passo', 'Cada etapa do fechamento (Carteira → Caixa → Plano) tem 3 passos: mandar o arquivo, colar o pedido e importar a resposta. O próximo só abre quando o anterior estiver feito, com cadeado no que ainda não pode.'],
    ['Tudo editável no cartão', 'Toque numa parcela (Samsung, Amazon…), numa recorrente ou numa compra da fatura para mudar ou tirar. Ao mudar o valor de algo que se repete, o app pergunta: só este mês, este e os próximos, ou só dos próximos em diante.'],
    ['Carteira e Caixa na mão', 'Carteira › Ativos: toque num investimento para aportar, resgatar, registrar dividendo ou atualizar o valor. Caixa › Contas: Paguei/Recebi na própria linha. Caixa › Visão geral: conferir com o saldo do banco.'],
    ['Estratégia', 'Carteira › Alocação: hoje × alvo por classe, quanto falta e atalhos para pesquisar um ativo ou revisar a estratégia com o Claude.'],
    ['Mais leve', 'Orçamento do mês e Parcelas mais limpos; Ideias e feedback mostra só o que ainda está na fila.'],
  ],
  '9.4.2': [
    ['Itaú pelo Open Finance saiu', 'A conta de teste da Pluggy não conecta banco de verdade, então o "Ligar o Itaú" saiu do app (e as chaves guardadas foram apagadas). Os investimentos do Itaú continuam com a estimativa diária pelo CDI e o valor exato no fechamento.'],
  ],
  '9.4.1': [
    ['Binance: valor certo', 'A cripto que estava no Earn flexível contava duas vezes. Agora conta uma vez só — toque em "Puxar a cripto da Binance" em Atualizar valores para corrigir na hora.'],
    ['Itaú: Item ID do Meu Pluggy', 'Ligar o Itaú agora pede o Item ID da conexão do meu.pluggy.ai (⋮ → Copiar Item ID), junto com as chaves do dashboard.'],
  ],
  '9.4.0': [
    ['Itaú pelo Open Finance', 'Carteira › Atualizar valores → Ligar o Itaú: com as chaves do Meu Pluggy, o app mostra o que o Itaú tem (contas, cartão e investimentos). No próximo passo, os investimentos se atualizam sozinhos.'],
    ['Só a interface nova', 'A interface anterior saiu do app (e a chave do Avançado também): menos código, app mais leve.'],
  ],
  '9.3.1': [
    ['Binance: correção', 'O pedido à Binance agora se identifica e, se o firewall dela barrar, tenta os endereços alternativos da própria Binance. Se ainda falhar, o aviso mostra o motivo exato.'],
  ],
  '9.3.0': [
    ['Cripto pela Binance', 'Carteira › Atualizar valores → Ligar a Binance: com uma chave só de leitura, a cripto da carteira se atualiza sozinha 1× por dia (e o detalhe em dólar por moeda). A chave fica cifrada no seu celular; o servidor só repassa o pedido, sem guardar nada.'],
  ],
  '9.2.0': [
    ['Aviso com o que mudou', 'No celular do Rafael, o aviso de atualização agora diz o que o Bruno lançou ("Bruno lançou: Pix: Metrô R$ 54,00"); com vários, a lista. Painel novo do Claude continua com "Lastro atualizado".'],
  ],
  '9.1.0': [
    ['Início mais leve', 'Aporte, orçamento, renda passiva, metas e alertas viraram um cartão só, "Para olhar", com uma linha para cada um (toque para ver o detalhe). Próximas contas mostra as 3 primeiras. Quer os cartões completos de volta? Menu ⋮ → Organizar o Início.'],
    ['Fatura sem repetição', 'As compras lançadas ficam só em "O que compõe a fatura" (já aberto), com a planilha ali; o quadro grande dos cenários fica recolhido.'],
    ['Sem convites vazios', 'Criar orçamento e metas agora fica no menu ⋮.'],
  ],
  '9.0.0': [
    ['Caixa e carteira conciliados', 'O app agora iguala sozinho o que é cópia entre os dois: os dividendos que a carteira prevê (quanto e em que dia) entram na agenda do caixa. Foi o que deu diferença na virada: o caixa de novembro veio sem os 5 dividendos dos FIIs.'],
    ['Com Desfazer', 'A conciliação aparece como um lançamento ("Conciliação: …"), com Desfazer. Se você desfizer, o app não insiste.'],
  ],
  '8.12.0': [
    ['O que compõe a fatura', 'Cartão › Fatura: a fatura do mês item a item, em grupos — compras lançadas, parcelas, recorrentes e o que o Claude registrou só como total. A soma bate com a fatura.'],
    ['Próximas faturas detalhadas', 'Cartão › Parcelas: em cada mês futuro, as recorrentes aparecem uma por uma (com o dia), junto com as parcelas e as compras já feitas para aquela fatura.'],
    ['Fatura completa no fechamento', 'Mande a fatura do Itaú (PDF) para o Claude no fechamento do caixa: ele grava as compras que o app não tinha, e elas entram item a item no lugar do "só o total".'],
  ],
  '8.11.0': [
    ['Envio sem mensagem de erro', 'Lançou várias coisas seguidas? Elas vão para a família juntas, poucos segundos depois. Sem internet, o app guarda e tenta de novo sozinho: aparece só o selo "Aguardando envio". Mensagem de erro só quando precisar de você (ex.: token vencido).'],
    ['Descrições lembradas', 'Ao digitar a descrição, o app sugere o que você já escreveu antes, e já escolhe a categoria que costuma ir junto.'],
    ['Escolher a fatura', 'Na última semana do mês, a compra no cartão mostra "Vai para a fatura de …". Se a fatura fechou antes do fim do mês, marque: o app lembra o dia e faz isso sozinho nas próximas compras.'],
    ['Gastos de hoje', 'No "Dá para gastar" do Início, quanto você já gastou hoje (cartão e Pix/débito lançados).'],
  ],
  '8.10.0': [
    ['Fechamento em etapas', 'Menu ⋮ → Levar para o Claude: no fim do mês aparecem as três etapas (Carteira, Caixa, Plano). Cada uma tem enviar, copiar o texto e importar a volta, e a próxima só abre quando você importar o que o Claude devolveu.'],
    ['Análise do dia', 'Nos outros dias, a mesma tela vira "Análise do dia": um texto de atualização, sem fechar o mês. Dá para trocar entre os dois modos no alto da tela.'],
    ['Só o JSON', 'O texto agora pede ao Claude só o arquivo JSON, com as análises dentro (é bem mais rápido para ele). As análises da carteira também aparecem em Análises.'],
    ['Acrescentar algo', 'Antes de copiar, o campo "Quer acrescentar algo?" vai junto no fim do texto.'],
  ],
  '8.9.2': [
    ['Teclado não cobre mais a lista', 'Ao buscar uma categoria (ou digitar em qualquer folha), a tela encolhe acima do teclado: dá para ver e tocar nos resultados sem fechar o teclado.'],
    ['Recorrentes em ordem de dia', 'Cartão › Parcelas → Recorrentes no cartão agora vêm na ordem do dia da cobrança, como em Contas.'],
  ],
  '8.9.1': [
    ['Fechamento passo a passo', 'Menu ⋮ → Levar para o Claude mostra a ordem do fechamento (1. Carteira, 2. Caixa, 3. Plano), onde você está e o que importar de volta em cada passo, com o botão para o próximo.'],
    ['Plano sem perder o fechamento', 'Se o Claude devolver o plano em cima de uma carteira mais antiga (a do Drive), o app oferece copiar só o plano de aportes e a meta de dólar para a carteira atual.'],
  ],
  '8.9.0': [
    ['Dia do aporte', 'No Início, o cartão "Aporte do mês" mostra o que falta do plano de aportes e o primeiro dia em que dá para fazer sem a conta ficar abaixo da reserva até o começo do mês que vem. O dia muda sozinho a cada lançamento, e o celular lembra no dia.'],
  ],
  '8.8.0': [
    ['Orçamento por categoria', 'Cartão › Gastos → Definir: um limite por mês para cada categoria (com a média dos meses como sugestão). O app avisa em 80% e quando passar, e mostra no Início o que está apertado.'],
    ['Renda passiva × custo de vida', 'Carteira › Renda: quanto das despesas do mês os dividendos já pagam, mês a mês, e quanto investido seria preciso para pagar o mês inteiro.'],
    ['% em dólar mês a mês', 'Carteira › Evolução: a evolução da parte em dólar, com a linha da meta quando ela existir.'],
    ['Assinaturas que sobem', 'Cartão › Parcelas → Revisar assinaturas: o app avisa quando uma recorrente sobe de preço e lembra de revisar o que ninguém usa.'],
    ['Metas', 'Carteira › Visão → Metas: reserva, viagem, apê. Ligue os investimentos de cada meta e veja quanto falta por mês.'],
    ['Imposto de Renda', 'Menu ⋮ → Imposto de Renda (ou Carteira › Renda): dividendos, aportes, resgates e posição do ano num arquivo para o Claude ou o contador.'],
  ],
  '8.7.0': [
    ['Vários SMS de uma vez', 'No "+" → Colar SMS do Itaú, cole quantas mensagens quiser. O app separa, lembra a categoria de cada loja e desmarca as repetidas e as pré-autorizações; você confere e lança tudo num envio só.'],
    ['Extrato do mês', 'Caixa › Contas → Extrato do mês (ou menu ⋮): tudo o que entrou e saiu, com busca ("uber", "mercado", "45") e filtro por tipo.'],
    ['Busca rápida', 'A lupa no topo acha contas, lojas, investimentos e telas.'],
    ['Arraste o dedo no gráfico', 'No saldo do Caixa, arraste o dedo pelo gráfico para ver o saldo de cada dia.'],
    ['Início do seu jeito', 'Menu ⋮ → Organizar o Início: escolha a ordem dos cartões e o que aparece (vale para este celular).'],
    ['Esconder os valores', 'O olho no "Dá para gastar" (ou menu ⋮) troca todos os R$ por ••• neste celular — para mostrar o app a alguém ou usar em público.'],
    ['Aviso do token do GitHub', 'Em menu ⋮ → Avançado → Configurar publicação, informe a validade do token: o app avisa 7 dias antes de vencer (foi o que parou a publicação na v5).'],
    ['Análises com data', 'Quando os números mudaram depois de o Claude escrever uma análise, ela mostra "escrito com os dados de dd/mm".'],
    ['Mais fácil de ler e tocar', 'Textos cinza mais legíveis, botões pequenos maiores e o leitor de tela anuncia cada janela. Menu ⋮ → Como usar o Lastro mostra o essencial.'],
  ],
  '8.6.0': [
    ['Novidades a cada versão', 'Esta janela aparece uma vez quando o app atualiza. Para ver de novo: menu ⋮ → Novidades desta versão.'],
    ['Ideias e feedback', 'Menu ⋮ → Ideias e feedback: anote o que melhorar no app. Vai direto para a lista que o Claude lê antes de cada versão nova.'],
    ['Teclado só quando você quiser', 'Ao abrir Cartão, Pix, Entrada ou Investir, o teclado não sobe mais sozinho: toque no campo para digitar.'],
    ['Patrimônio igual no caixa e na carteira', 'A carteira manda no patrimônio: ao importar a carteira (ou um caixa novo), o app copia o patrimônio dela para o caixa e publica os dois juntos. Em Análises › Conferir há um botão para igualar agora.'],
  ],
};
