# Decisões técnicas

Registro de escolhas técnicas não especificadas no BUILD.md/PRD, mais simples e seguidas em frente.

## 2026-07-28 — Reorganização inicial do repositório

Uma sessão anterior já tinha criado um scaffold Next.js solto na raiz do repositório (antes de eu ler o BUILD.md real). Como nada disso tinha sido commitado ainda, movi esses arquivos para dentro de `/painel/`, que é onde o BUILD.md pede que o painel Next.js fique (Fase 7). Nada foi perdido, só reorganizado.

Também copiei `CLAUDE.md`, `docs/BUILD.md` e `docs/PRD-meu-vendedor.md` de `~/Downloads/docs_files/` para dentro do repositório, para que fiquem versionados junto com o código em vez de ficarem soltos na pasta de Downloads.

## 2026-07-28 — Como um contato vira lead (resolve pergunta aberta do PRD §14.6)

O Samuel confirmou a regra: nenhum contato do WhatsApp vira lead sozinho, nunca por decisão automática do sistema. Só existem dois caminhos:

1. **Declaração direta** — o Samuel fala pelo Canal A ("captura esse contato, é um lead"), como já descrito no PRD/CLAUDE.md.
2. **Pergunta do sistema** — ao notar uma conversa nova no Canal B que pode ser um lead (Fase 9), o sistema **pergunta** ao Samuel se é lead, e só grava depois do "sim". Nunca cadastra sozinho.

Isso vale como especificação para a Fase 9 (movimentação automática lendo o Canal B): a detecção de "lead novo" a partir do Canal B é sempre um `pergunta antes`, nunca um `move e avisa` — mesmo que a tabela do CLAUDE.md trate outras transições (1→2, 2→3, 1→6) como automáticas sem pedir permissão. Criar um lead do zero é diferente de mover um lead que já existe.

## 2026-08-14 — Ordem das fases alterada: banco e painel antes do WhatsApp

O Samuel decidiu adiar a configuração da Z-API (custo de duas instâncias pagas) e pediu pra construir o CRM primeiro, com cadastro manual de leads, deixando o WhatsApp pra depois. Isso é uma mudança explícita de ordem em relação ao BUILD.md, permitida pela regra do próprio `CLAUDE.md` ("em conflito... a menos que o Samuel diga explicitamente que está mudando uma regra daqui").

Nova ordem de execução:
1. Fase 1 (banco de dados) — sem dependência de Z-API, segue normalmente.
2. Uma fatia adiantada da Fase 7 (painel web): CRUD manual de leads por nível, sem login ainda avançado nem métricas — só o necessário pra usar o CRM sem WhatsApp.
3. Fases 2, 3, 8 e 9 (tudo que depende da Z-API) ficam pausadas até o Samuel resolver as instâncias.
4. Fases 4, 5, 6 (motor de níveis, gate de qualificação, métricas) seguem no banco normalmente; qualquer parte que dependa de mandar mensagem pelo WhatsApp (ex.: Tarefa 4.3 etiquetas Z-API, avisos automáticos) fica marcada como pendente até a Z-API estar configurada.

## 2026-08-17 — Migration inicial: 11 tabelas, não 12

A lista de tabelas do BUILD.md (seção Tarefa 1.1) enumera exatamente 11 tabelas: `orgs, usuarios, metas_config, metas_mensais, niveis, leads, nivel_historico, interacoes, reunioes, mensagens_brutas, comandos`. O texto do critério de aceite da mesma tarefa menciona "as 12 tabelas", o que parece uma inconsistência de contagem no próprio documento. Segui a lista explícita de 11 tabelas, que é a especificação mais concreta e verificável.

Também segui a função auxiliar `current_org_id()` (usada nas policies de RLS) para dentro de um schema `private`, não exposto pela API do Supabase, depois que o `get_advisors` apontou que ela ficava acessível publicamente como endpoint REST (`/rest/v1/rpc/current_org_id`). Isso não muda o comportamento das policies — elas continuam funcionando igual — só fecha uma porta que não precisava estar aberta.

## 2026-08-17 — Seed: criei o usuário de login do Samuel

A tabela `usuarios.id` referencia `auth.users(id)`, então não dava pra inserir o usuário sem um login existir antes no Supabase Auth. Criei um via Admin API do Supabase (não por SQL manual, que é desaconselhado pela própria Supabase por causa dos campos internos de senha/confirmação), usando o e-mail `samuuelpereiradasilva@gmail.com` e uma senha gerada aleatoriamente, salva só em `.env` (`PAINEL_SENHA_INICIAL`) — nunca passou pelo chat. Essa senha só vai servir de verdade quando o painel com login existir (Fase 7); pode ser trocada a qualquer momento.

Também dei um valor padrão pra `etiqueta_wpp` de cada nível: usei o mesmo texto do `nome` do nível (ex.: "Base"), já que o BUILD.md não especifica esse valor e ele só passa a importar de verdade na Tarefa 4.3 (sincronização com etiquetas do WhatsApp via Z-API, ainda pausada).

## 2026-08-17 — Painel: fatia adiantada da Fase 7, sem WhatsApp

Construí só o suficiente do painel pra você cadastrar e editar leads na mão: login (Supabase Auth), lista de leads por nível, criar lead, editar lead (dados, nível, os 3 critérios). Duas decisões dentro disso:

1. **Atualizei o Next.js de 14 pra 16** antes de escrever qualquer tela — o `npm install` acusou uma vulnerabilidade crítica de segurança na versão 14 usada no scaffold anterior. Sem breaking changes que afetassem nosso código, só a API de cookies (`cookies()` virou assíncrona) e o arquivo `middleware.ts` virou `proxy.ts` (convenção nova do Next 16).

2. **Editar o nível de um lead pelo painel também grava `nivel_historico`**, igual vai acontecer quando o agente de WhatsApp mexer nisso (Fase 3/4). Isso segue a regra do `CLAUDE.md`: "toda movimentação é reversível... e grava histórico" — não é uma regra exclusiva do WhatsApp, é do dado.

3. **Ainda não apliquei o gate de qualificação (Fase 5)** no painel — hoje dá pra mudar o lead pro nível 4 (Reunião marcada) mesmo sem os 3 critérios preenchidos. Isso é intencional por enquanto: o gate ainda não foi construído em lugar nenhum do sistema (nem no agente). Quando chegar na Fase 5, a trava entra pros dois caminhos (painel e WhatsApp) ao mesmo tempo, já que os dois escrevem no mesmo banco.

Testei tudo de ponta a ponta no navegador com o banco real: login, criar lead, editar (mudar nível + critérios), e confirmei que o `nivel_historico` gravou certo. Depois apaguei o lead de teste.

## 2026-08-17 — Novo nível "No Show" + "Reunião marcada" vira coluna sem número

O Samuel pediu pra separar "reunião marcada" (agendada, ainda vai acontecer) de "no show" (agendada, o lead não apareceu) — antes isso tudo ficava misturado no nível 4. Depois de um vai-e-volta bom pra entender o pedido certo, ficou definido:

- 6 colunas numeradas normalmente: Sem conversa iniciada (1), Em qualificação (2), Topou reunião sem horário (3), No Show (4), Reunião feita sem fechar (5), Base (6)
- 1 coluna especial **sem número**, chamada "Reunião marcada", que aparece entre a 3 e a 4, com destaque visual (verde, borda reforçada) mas sem pílula "Nível X"

Pra isso, adicionei uma coluna `numerado boolean` na tabela `niveis` (default `true`, `false` só na linha "Reunião marcada"). O "número visível" que aparece na tela (as pílulas "Nível 1"..."Nível 6") é calculado no painel contando só as linhas com `numerado = true`, na ordem — não é o mesmo valor da coluna `ordem` interna do banco (que segue 1 a 7 sequencial, sem pular nada, porque isso é o que mantém a posição de cada coluna e as referências de `leads.nivel_ordem`).

Atualizei `CLAUDE.md` e `docs/PRD-meu-vendedor.md` pra registrar os 7 níveis (a numeração ali é a numeração interna/de banco, 1 a 7, não a "numeração visível" da tela).

## 2026-08-17 — Estrutura inspirada no Pipedrive (sem Kanban novo, sem separar Pessoa/Negócio)

O Samuel pediu pra trazer a estrutura do Pipedrive pro painel, mantendo o Kanban que já tínhamos e sem separar "lead" em Pessoa/Organização/Negócio (continua um cadastro só, como já estava no PRD). Ele confirmou querer as três coisas juntas:

1. **Menu lateral fixo** — substitui o cabeçalho horizontal (`TopBar`, removido) por uma barra lateral com Funil, Lista de leads, Atividades e Configurações, mais o botão Sair. Criei `components/sidebar.tsx` e um `components/page-header.tsx` mais simples (só título + ação) pra cada página usar.
2. **Página do lead mais completa** — além do formulário de editar, agora tem uma linha do tempo (interações + reuniões) e um campo pra registrar nota rápida sem precisar editar o lead inteiro. Nova ação `registrarNota` em `lib/leads/actions.ts`, gravando na tabela `interacoes` que já existia desde a Fase 1 mas não tinha nenhuma tela usando ela ainda.
3. **Lista em tabela** — `/leads/lista`, alternativa ao Kanban pra quando uma planilha for melhor que cartões. Filtro por nível e busca por nome via querystring (sem JavaScript extra, só GET de formulário).

Também criei `/atividades` (feed de todas as interações e reuniões, de todos os leads, mais recentes primeiro) e `/configuracoes` (editar nome da org e o vocabulário/critérios de qualificação — os campos que já existiam em `orgs` desde a Fase 1 pra dar suporte à migração pro V2, mas não tinham UI nenhuma). As metas/taxas do sistema aparecem em Configurações só pra leitura, com o texto explicando por que não são editáveis por ali — não construí edição pra não abrir brecha de mexer no piso ou nas taxas por acidente.

Reorganizei as páginas de leads pra dentro de um grupo de rotas `(app)` do Next.js (não muda nenhuma URL) só pra poder ter um layout compartilhado com o menu lateral sem repetir código em cada página.

Testei cada tela nova no navegador com o banco real (login, ver a lista, filtrar por nível, registrar uma nota e ver ela aparecer tanto no lead quanto nas Atividades, editar as configurações da org). Rodei também um build de produção (`npm run build`) pra garantir que nada quebrou. Apaguei os dados de teste depois.

## 2026-08-17 — Estágio "Leads" (ordem 0) + arrastar-e-soltar no Kanban

Depois de ver a estrutura do Pipedrive, o Samuel pediu três ajustes:

1. **Título da página**: "Funil de leads" → só "Leads".
2. **Novo estágio "Leads" (ordem 0), sem número, antes do Nível 1** — diferente do Nível 1 ("mandei mensagem, não engatou"), esse é "cadastrado, ainda não abordado" (nenhuma mensagem mandada). Todo lead novo agora nasce aqui (mudei o `default` da coluna `leads.nivel_ordem` de 1 pra 0), não mais direto no Nível 1. Precisou abrir o `check` de `niveis.ordem` pra aceitar 0.
3. **Arrastar os cartões entre colunas** — antes só dava pra mudar o nível editando o lead. Adicionei uma ação `moverLeadNivel` e transformei os cartões do Kanban em arrastáveis (`draggable`, API nativa do HTML5 — sem biblioteca externa). Registra `nivel_historico` igual as outras formas de mudar nível, com motivo "Arrastado no Kanban".

Um efeito colateral do item 2: agora **duas** colunas ficam sem a pílula "Nível X" (Leads e Reunião marcada). Separei dois conceitos que antes eram a mesma coisa: `niveis.numerado` (mostra "Nível X" ou não) e `niveis.destacado` (ganha o estilo de cor sólida reforçada ou não) — inicialmente só "Reunião marcada" era destacada, mas isso mudou logo em seguida (ver entrada abaixo).

Testado no navegador: coluna "Leads" aparece sem número, primeira da fila; arrastar um lead de uma coluna pra outra funcionou e gravou o histórico. Build de produção limpo.

## 2026-08-17 — Menu recolhível + coluna "Leads" também com cor sólida

Dois ajustes rápidos depois de ver a tela:

1. **Menu lateral recolhível** — botão "«" ao lado da logo esconde os rótulos e deixa só os ícones (menu vai de 240px pra 64px de largura). Botão vira "»" pra expandir de novo. O botão de recolher/expandir precisou ficar perto da logo, no topo — a primeira versão ficava embaixo, no canto inferior esquerdo, exatamente onde o indicador de desenvolvimento do próprio Next.js (a bolinha "N") fica por cima, tornando o botão impossível de clicar durante `next dev`. Isso não apareceria em produção (o indicador do Next só existe em desenvolvimento), mas ainda assim era ruim pra testar agora.
2. **Coluna "Leads" ganhou o mesmo estilo de cor sólida da "Reunião marcada"**, só que preta (gradiente `neutral-800` → preto) em vez de verde — imitando a cor do Nível 1. Generalizei o `solido` (antes só existia hardcoded como verde no componente do Kanban) pra virar um campo por nível em `lib/niveis.ts`, e cada nível ganhou seu próprio gradiente sólido (usado só quando `destacado = true`).

Testado no navegador: menu recolhe e expande sem conflito com o indicador do Next, coluna "Leads" aparece preta sólida. Build de produção limpo.

## 2026-08-17 — Menu de origem fixo + erro de telefone duplicado tratado direito

Duas coisas nessa rodada:

1. **Menu de origem pré-definido** — troca o campo de texto livre "Origem" por um `<select>` com as origens reais do Samuel (Indicação Closer, Networking, SS IG, Treinamento presencial, Tráfego pago, Indicação base, Base de leads, Base de clientes, HUNTER IG SAMUEL, Parceria (aula semanal), Renovação, Meu grupo do Wpp), mais "Outro..." que abre um campo de texto livre. Componente `components/origem-select.tsx`, usado tanto em criar quanto editar lead.

2. **Bug real encontrado pelo Samuel** ("texto livre deu erro"): ao investigar, não era bug do campo "Outro" — era a trava de telefone duplicado do banco (`unique (usuario_id, telefone_e164)`) sendo violada e o erro cru do Postgres (`duplicate key value violates unique constraint...`) subindo sem tratamento, quebrando a página com uma tela de erro feia do Next.js em vez de uma mensagem legível. Corrigido trocando `criarLead`/`atualizarLead` de "lança exceção" pra "retorna `{ erro }`", usando `useActionState` do React nos formulários (padrão igual ao da tela de login) — agora mostra "Já existe um lead com esse telefone." embaixo do formulário, sem crash, e sem perder o que a pessoa já tinha digitado. Isso exigiu separar o formulário de editar lead num componente cliente próprio (`components/editar-lead-form.tsx`), já que a página em si continua sendo um Server Component (busca dados no servidor).

Testado no navegador: telefone duplicado mostra a mensagem certa e não deixa criar; telefone único cria e redireciona normal; editar sem mudar nada salva normal. Build de produção limpo.

## 2026-08-17 — Reuniões de verdade, marcar venda, filtro no Kanban, dashboard de métricas

O Samuel mandou uma planilha do Google (COMERCIAL) mostrando como ele controla hoje: aba por mês com "Data de Agendamento" e "Data da Reunião" separadas, e uma aba "ANO" com meta de receita/faturamento por mês. Pediu pra construir isso no sistema. Perguntei como ele queria separar "Base" e "Ganho" do funil principal (sugeri 2 boards, 3 boards, ou só um filtro) — ele escolheu **só um filtro no board atual**, sem criar tela nova pra isso.

Quatro mudanças, nessa ordem:

1. **Filtro no Kanban** (`/leads?todos=1`): por padrão o board só mostra leads sendo trabalhados (esconde nível 7 "Base" e leads com `status = 'vendido'`). Um link no topo alterna pra "Mostrar Base e Vendas".

2. **Reunião de verdade com as 2 datas** — até agora, mudar o nível pra "Reunião marcada" só trocava `leads.nivel_ordem`, não criava nada na tabela `reunioes` (que existe desde a Fase 1 mas nunca tinha UI). Agora:
   - Editando o lead e mudando o nível pra "Reunião marcada": aparece um campo obrigatório "Data e hora da reunião" (`reuniao_data`), que vira `reunioes.agendada_para`. A "data de agendamento" é `reunioes.marcada_em`, que o banco já preenche sozinho com `now()` — não precisa pedir pro usuário.
   - Arrastando um lead pro "Reunião marcada" no Kanban: como arrastar não tem como abrir um seletor de data decente, manda pra tela de editar já com o nível pré-selecionado (`?marcarReuniao=1`), em vez de mover na hora.
   - Saindo de "Reunião marcada" pra "No Show" ou "Reunião feita, sem fechar" (editando ou arrastando): atualiza sozinho o `status` da reunião mais recente pra `nao_compareceu` ou `realizada`. Isso é lógica nova, `sincronizarReuniao()` em `lib/leads/actions.ts`, chamada tanto por `atualizarLead` quanto por `moverLeadNivel`.

3. **Marcar como vendido** — painel novo na página do lead (`components/marcar-vendido-form.tsx`) pra registrar o valor da venda. Grava `leads.status = 'vendido'`, `valor_venda`, `vendido_em = now()`, e atualiza a reunião mais recente com `resultado = 'vendeu'`. Depois disso o lead some do Kanban filtrado (item 1).

4. **Dashboard de métricas** (`/dashboard`, novo item no menu) — leads trabalhados, reuniões marcadas, reuniões realizadas, no show, vendas e receita, mais as 3 taxas (agendamento/comparecimento/venda) comparadas com os mínimos do sistema (10%/80%/40%, lidos de `metas_config`, nunca hardcoded). Mostra "Esta semana" e "Este mês" lado a lado, com o piso (leads/dia × dias úteis já passados no período) como referência. Tudo calculado com `count`/`sum` direto no Postgres via Supabase — nenhuma conta feita "no olho". Se `leads_trabalhados < 20`, mostra aviso de amostra pequena, como o BUILD.md pede.

Isso cobre boa parte da Fase 6 do BUILD.md (métricas em SQL, nunca estimadas) usando a estrutura que já existia desde a Fase 1 — só faltava a UI pra alimentar `reunioes` de verdade.

Testado no navegador de ponta a ponta com o banco real: mudar nível pra reunião marcada pede a data e cria a reunião; mudar pra "reunião feita" marca a reunião como realizada sozinho; marcar como vendido grava tudo certo e some do funil filtrado; dashboard mostra os números batendo com o que foi criado. Desfiz as mudanças de teste no lead "teste" (que já existia, criado pelo próprio Samuel) pra não sujar as métricas reais dele. Build de produção limpo.

## 2026-08-17 — Base e Vendas viram telas próprias; gramática; filtro por data

Depois de ver o filtro "Mostrar Base e Vendas" funcionando, o Samuel decidiu que não gostou do resultado visual e pediu pra trocar por telas separadas (voltando à ideia original que ele tinha descartado). Também pediu dois ajustes de gramática e um filtro que faltava:

1. **`/leads/base` e `/leads/vendas`** — duas telas novas, cada uma com os cartões de lead (componente novo `components/lead-card.tsx`, reaproveitado dos dois lugares) mostrando só quem está na Base ou só quem foi vendido. O Kanban principal (`/leads`) voltou a ser sempre filtrado (sem nível 7, sem `status = 'vendido'`), sem alternância — os links "Base →" e "Vendas →" substituem o link único de antes.

2. **Gramática dos níveis**: "Topou reunião, sem horário" → "Topou reunião, mas ainda não definiu o horário"; "Reunião feita, sem fechar" → "Fez a reunião, mas ainda não comprou".

3. **Filtro por período na Lista de leads** (`/leads/lista?de=...&ate=...`): dois campos de data ("Entrou de" / "até"), filtrando por `declarado_em`, junto dos filtros que já existiam (nome e nível).

Testado no navegador: as duas telas novas abrem com estado vazio correto; a gramática nova aparece em todo canto que usa `rotuloNivel` (dropdown de editar, badge da lista); o filtro de data com um período de 2020 zera a lista (prova que filtra de verdade). Build de produção limpo, 12 rotas.

## 2026-08-17 — Tela de Usuários (ver e revogar acesso) + dashboard e Vendas com cores de verdade

Três pedidos:

1. **Página `/usuarios`** — lista quem tem acesso ao CRM (nome, e-mail, desde quando) e deixa excluir o acesso de alguém que saiu da empresa. O detalhe técnico: `usuarios` não guarda e-mail (isso vive em `auth.users`, gerenciado pelo Supabase Auth). A regra do `CLAUDE.md` proíbe `service_role` fora de Edge Function, então em vez de usar a API admin do Supabase no painel (Vercel), criei duas funções SQL `SECURITY DEFINER` no banco — o mesmo padrão que já usávamos pra `current_org_id()`:
   - `listar_usuarios_da_org()`: junta `usuarios` com `auth.users` e devolve só quem é da mesma organização de quem chamou.
   - `excluir_usuario(usuario_id_alvo)`: confere que o alvo é da mesma organização, bloqueia autoexclusão, apaga a linha de `usuarios` e depois a de `auth.users` (nessa ordem, por causa da referência entre as duas tabelas). O painel só chama essas funções via `supabase.rpc(...)` como usuário autenticado comum — nunca vê nem usa a chave `service_role`.
   
   Botão de excluir pede confirmação (`confirm()` do navegador) antes de mandar, e o próprio usuário logado não vê o botão na própria linha (dá pra tentar mesmo assim direto na função, mas ela também bloqueia).

2. **Dashboard com cores de verdade** — o Samuel achou o primeiro dashboard "morto, preto e branco". Redesenhei: um card grande em gradiente roxo→azul destacando a receita do período, e os 4 números principais (leads trabalhados, reuniões marcadas/realizadas, no show) cada um com sua cor e ícone (violeta, azul-céu, esmeralda, rosa). As taxas viraram barrinhas de progresso coloridas em vez de só texto. Toda a parte visual ficou num componente novo `components/dashboard-ui.tsx`, separado da página que só busca dado.

3. **Vendas e Base também ganharam um "hero" colorido** no topo (verde-esmeralda pra Vendas, ardósia escura pra Base), mostrando o número principal (receita total / quantidade na base) em destaque, no mesmo estilo do dashboard — resolve o "não gostei daquilo lá" do Samuel sobre a tela de Vendas.

Testado com o banco real: criei um usuário de teste (via Admin API, fora do painel) e confirmei direto no banco, simulando a sessão autenticada do Samuel, que `excluir_usuario` apaga o usuário de teste (some de `usuarios` e de `auth.users`) e bloqueia a autoexclusão do próprio Samuel — a chamada pelo navegador em si não deu pra testar de ponta a ponta porque o `confirm()` do navegador é bloqueado pela automação headless, mas a lógica no banco (que é onde a segurança realmente mora) está provada. Dashboard e Vendas conferidos visualmente. Build de produção limpo, 13 rotas.

## 2026-08-17 — Nome do nível quebrando em duas linhas no Kanban + renomeia nível 5

O Samuel reclamou que o nome de nível comprido ("Topou reunião, mas ainda não definiu o horário") estava quebrando em duas linhas dentro da coluna do Kanban, bagunçando o design. Corrigido de forma genérica (vale pra qualquer nível, não só esse): o título da coluna agora trunca com reticências numa linha só (`truncate`), com o nome completo aparecendo ao passar o mouse (`title`). Mais simples e durável do que tentar caçar o texto perfeito que cabe exatamente na largura da coluna.

Também renomeou o nível "Fez a reunião, mas ainda não comprou" (ordem 6, "Nível 5" na tela) pra **"Oportunidades para o fim do mês"** — mais curto e resolve a quebra de linha por si só nesse caso.

Testado no navegador: nível 3 agora corta com "..." numa linha só; nível 5 mostra o nome novo inteiro, cabendo bem. Build de produção limpo.

## 2026-08-17 — Nível 3: texto completo em vez de cortado

O Samuel não gostou de ver "..." no nível 3 — queria a frase inteira legível dentro do quadrado, não cortada. Encurtei o texto mantendo o sentido e a gramática: "Topou reunião, mas ainda não definiu o horário" → **"Topou reunião, horário a definir"** (33 → 33 caracteres nominalmente parecido, mas sem a parte "mas ainda não" que empurrava a frase pra fora da largura da coluna). Cabe inteiro numa linha, sem reticências. O `truncate` genérico do commit anterior continua no lugar como rede de segurança pra nomes futuros mais compridos.

Testado no navegador: "Topou reunião, horário a definir" aparece completo, sem cortar. Build de produção limpo.

## 2026-08-17 — Tira "(Kanban)" do menu + botão de excluir lead

Dois pedidos pequenos e rápidos:

1. **Menu lateral**: o item dizia "Funil (Kanban)". O Samuel só queria "Funil". Trocado no array `ITENS` do `components/sidebar.tsx`.

2. **Excluir lead**: não existia jeito nenhum de remover um lead pelo painel. Adicionei o botão "Excluir lead" no fim da página de detalhe do lead. Segue a regra do `CLAUDE.md` de "nada é apagado automaticamente, nunca — use soft delete": o botão não apaga a linha do banco, só marca `arquivado_em = agora` (a mesma coluna que todas as listas já ignoram desde a Fase 1). Antes de gravar, aparece o alerta nativo do navegador (`confirm()`) perguntando "Tem certeza que quer excluir o lead '<nome>'? Ele vai sumir de todas as telas." — só segue adiante se a pessoa confirmar.

Testado no navegador de ponta a ponta (com o `confirm()` forçado a "sim" via script, já que a automação headless normalmente bloqueia esse alerta nativo): o lead "teste" sumiu do Funil depois do clique, a contagem de leads caiu de 3 pra 2, e o cancelamento (clicando em "Cancelar" no alerta) mantém o lead intacto. Build de produção limpo, 13 rotas.
