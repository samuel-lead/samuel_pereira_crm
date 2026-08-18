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

## 2026-08-17 — Responsável pelo lead (opcional)

O Samuel quer atribuir um responsável a cada lead (pensando em cadastrar SDRs). Adicionei a coluna `leads.responsavel_id`, nula (não obriga escolher ninguém), referenciando `usuarios`. Aparece como um dropdown "Responsável" tanto no formulário de criar lead (`/leads/novo`) quanto na página de editar lead — junto dos outros campos, dentro do mesmo card. A lista de nomes vem de `usuarios` (select direto, permitido pela RLS já existente de "todo mundo da mesma org enxerga os usuários da org").

Descobri no caminho que **ainda não existe nenhuma forma de criar um novo usuário pelo painel** — hoje só dá pra listar e excluir em `/usuarios`. Conferi direto no banco e só existe o próprio Samuel em `usuarios` e `auth.users`; o SDR que ele mencionou ter cadastrado não chegou a ser criado em lugar nenhum. Isso vai precisar de uma tela própria — combinei com ele de tratar como próxima etapa, junto com o pedido de permissões por usuário.

Testado: criei um lead de teste com "Samuel Pereira" como responsável, confirmei no banco que `responsavel_id` gravou certo, reabri a página de edição e o dropdown já veio com "Samuel Pereira" pré-selecionado. Lead de teste removido depois. Build de produção limpo, 13 rotas.

## 2026-08-17 — Cadastro de usuário com permissões por página

Continuação direta do pedido anterior. Como não existia nenhuma forma de criar um usuário pelo painel, construí isso do zero, junto com o sistema de permissões que o Samuel pediu ("só acesso ao Funil", por exemplo).

**Modelo escolhido (o mais simples que atende o pedido):**
- `usuarios.papel`: `'admin'` ou `'membro'`. Admin sempre vê tudo, sem exceção — inclusive Usuários e Configurações, que **não são configuráveis** (só admin mexe nisso, por design, pra não ter buraco de segurança tipo um membro se autopromovendo).
- `usuarios.paginas_permitidas`: lista de páginas que um "membro" pode ver, entre as 4 operacionais: Funil, Lista de leads, Atividades, Métricas. Admin escolhe quais marcar na hora de cadastrar (ou depois, editando).

**Cadastro (`/usuarios/novo`)**: pede nome, e-mail, senha temporária, tipo de acesso e (se "Membro") quais páginas. Como criar um login novo exige a chave `service_role` — proibida no painel pela Constituição do projeto — isso roda numa Edge Function nova (`criar-usuario`), que confere que quem está chamando é admin da mesma org antes de criar. O painel nunca vê a chave `service_role`, só chama a função autenticado.

**Editar permissões (`/usuarios/[id]/permissoes`)**: qualquer usuário existente (menos você mesmo) pode ter o papel e as páginas trocados depois, via uma função SQL `atualizar_permissoes_usuario` que também confere que quem chama é admin.

**Aplicando de verdade**: o menu lateral já esconde os itens que a pessoa não pode ver. E se ela tentar entrar direto numa URL fora da lista dela (digitando o endereço, por exemplo), o `proxy.ts` (middleware, roda em toda navegação) barra e manda ela pra primeira página que ela pode ver — ou pra uma tela de "sem acesso" se por algum motivo ela não tiver nenhuma.

Testado com o banco real: cadastrei um "SDR Teste" como membro com só Funil e Lista de leads marcados, confirmei no banco que gravou certo, fiz login como ele no navegador e vi o menu mostrando só essas duas opções. Tentei entrar direto em `/dashboard` (Métricas, não liberado) e em `/usuarios` (admin-only) — as duas vezes fui redirecionado de volta pro Funil na hora. Testei também a troca de permissões e a trava de segurança (um membro tentando mudar permissão de outro usuário é bloqueado pela função no banco) simulando as sessões autenticadas direto no banco. Usuário de teste removido no final. Build de produção limpo, 15 rotas.

## 2026-08-17 — Cada lead só pode ser mexido pelo responsável (ou admin)

O Samuel perguntou como deveria funcionar o acesso: cada usuário só mexe no próprio lead, mas continua vendo o funil inteiro (visão de equipe) — ou cada um só vê os seus? Recomendei a primeira: ver tudo, editar só o seu, porque a segunda tem um buraco — como o responsável é opcional, um lead sem dono ficaria escondido de todo mundo. Ele topou.

**Onde a regra vale de verdade é no banco (RLS)**, não só escondendo botão na tela — assim nem um usuário mexendo direto na API dá volta na regra:
- Todo mundo da org continua **lendo** todos os leads (`leads_select_org`).
- Só o **responsável do lead ou um admin** pode **alterar ou arquivar** (`leads_update_dono_ou_admin`, `leads_delete_dono_ou_admin`).
- Registrar nota (tabela `interacoes`) segue a mesma regra: só o dono do lead (ou admin) anota.
- Criei uma função `private.eh_admin()` que as políticas usam pra saber se quem tá logado é admin.

**Na tela**, pra não depender só do banco rejeitar (o que daria um erro feio): as Server Actions checam a permissão antes de escrever e devolvem uma mensagem amigável ("Você só pode mexer em leads que são seus.") se não for o caso. O formulário de editar lead também:
- Fica todo desabilitado (cinza, sem poder digitar) se o lead não é seu, com um aviso no topo dizendo quem é o responsável.
- Esconde "Marcar como vendido", "Registrar nota" e "Excluir lead" quando o lead não é seu.
- O campo "Responsável" só é um menu editável pra admin — pra quem não é admin, aparece só como texto (o admin que decide redistribuir leads entre a equipe).
- Ao criar um lead novo, quem não é admin já entra automaticamente como responsável (sem escolher).

No Kanban, o card de um lead que não é seu não pode mais ser arrastado (fica com a "mãozinha" trocada por seta comum e um pouco apagado), mas continua clicável pra abrir e ver os detalhes.

Testado criando um usuário "membro" de teste direto no banco (pra simular um SDR de verdade, sem mexer na conta do Samuel): logado como ele, o lead que criei foi automaticamente atribuído a ele e deu pra editar e salvar normalmente; abrindo um lead de outra pessoa, o formulário veio todo travado com o aviso, sem os botões de ação, e o card dele no Kanban não pôde ser arrastado. Testei também tentando burlar direto no banco (sem passar pela tela) — um membro tentando editar lead alheio foi bloqueado (0 linhas alteradas), e um admin editando lead de outra pessoa funcionou normal. Usuário e lead de teste removidos no final. Build de produção limpo, 15 rotas.

## 2026-08-17 — Botão de WhatsApp no card do lead + WhatsApp comercial do usuário

O Samuel quer clicar direto no card do lead (sem abrir ele) e já chamar o lead no WhatsApp, sem sair do CRM. Adicionei um selo verde do WhatsApp ao lado da origem, em cada card do Kanban — clicando, abre `https://wa.me/<telefone>` numa aba nova (usa o WhatsApp Web/app que já está logado no navegador da pessoa, com a conversa já endereçada pro lead). Só aparece se o lead tiver telefone cadastrado.

Detalhe técnico: pra caber um link clicável dentro do card sem quebrar o HTML (não dá pra colocar um link dentro de outro link), troquei o card inteiro de `<Link>` por uma `<div>` que navega por clique — e o botão do WhatsApp cancela essa propagação (`stopPropagation`), senão clicar nele também abriria o lead por baixo.

Aproveitei e liguei o campo `wpp_comercial_e164` que já existia no banco desde o início do projeto (mas nunca tinha uma tela pra preencher): agora o formulário de "Novo usuário" pede também o WhatsApp comercial da pessoa — o número que ela usa pra atender os leads. Ainda não é usado por nada além de ficar registrado (é a base pra quando o WhatsApp automático entrar em cena, mais pra frente).

Testado no navegador logado (usuário de teste, sem mexer na conta do Samuel): o selo do WhatsApp aparece no card, o link gerado bate certinho com o telefone do lead (`https://wa.me/556283223116`), clicar nele não abre o lead por baixo, e clicar no resto do card continua abrindo o lead normalmente. Cadastrei um usuário de teste com WhatsApp comercial preenchido e confirmei que salvou certo no banco. Usuários de teste removidos no final. Build de produção limpo, 15 rotas.

## 2026-08-17 — Botão do WhatsApp: pop-up em vez de aba nova

O Samuel não gostou do clique no WhatsApp abrir outra aba do navegador — queria uma janela pop-up, mais leve, sem sair de vista do CRM. Troquei `target="_blank"` (aba) por `window.open(url, "whatsapp", "width=420,height=680,noopener,noreferrer")` — passar tamanho fixo pro `window.open` é o que faz o navegador abrir como janela pop-up (sem barra de endereço, sem abas) em vez de uma aba normal.

Testado: confirmei que o clique chama `window.open` com a URL certa (`https://wa.me/<telefone>`) e os parâmetros de tamanho, e que a tela do Funil continua no lugar (não navega pro lead nem sai da página). Build de produção limpo.

## 2026-08-17 — WhatsApp: ir direto pra conversa, sem tela de propaganda

O `wa.me` mostra uma tela de "baixe o WhatsApp" antes de abrir a conversa — o Samuel queria abrir já dentro da conversa, pronto pra mandar a mensagem. Troquei o link de `https://wa.me/<telefone>` pra `https://web.whatsapp.com/send?phone=<telefone>`, que vai direto pro WhatsApp Web: se a pessoa já tem sessão logada no navegador, abre a conversa na hora; sem tela de propaganda no meio.

Testado: confirmei que o link gerado agora é `https://web.whatsapp.com/send?phone=556283223116`. Build de produção limpo.

## 2026-08-17 — WhatsApp: corrige número sem o "9" do celular

O Samuel testou e a conversa dava erro ao tentar mandar mensagem. Causa: o telefone salvo tava sem o "9" na frente (formato antigo, ex.: `6283223116`, 10 dígitos) — o WhatsApp não reconhece assim, precisa de 11 (DDD + 9 + 8 dígitos). `linkWhatsApp()` agora detecta esse caso e completa o "9" automaticamente antes de montar o link, além de lidar direito com número que já vier com o 55 na frente (não duplica nem falta dígito).

Testado com vários formatos de entrada possíveis (com/sem 55, com/sem 9, com máscara `(62) 98432-5678`) — todos batem no formato final correto de 13 dígitos. Conferido também com um lead real no navegador. Build de produção limpo.

## 2026-08-17 — Lead sem responsável pode ser "pego" por qualquer usuário

Pensando na futura integração com campanha de tráfego (o lead vai chegar sem responsável definido), o Samuel confirmou o comportamento: todo mundo com acesso ao Funil já enxergava um lead sem dono, mas só admin conseguia definir quem era o responsável — não dava pra um usuário comum "pegar" o lead pra si.

Ajustei a política de RLS de `leads` pra liberar update quando `responsavel_id is null` também (antes só liberava se `responsavel_id = auth.uid()` ou admin), mas o `with check` continua travando: quem não é admin só consegue deixar o lead com `responsavel_id` = o próprio `auth.uid()` — não dá pra "roubar" lead de outra pessoa nem deixar sem dono de novo.

Na tela, quando o lead não tem responsável, em vez do aviso genérico de "só visualização" aparece um aviso diferente com um botão **"Pegar esse lead pra mim"** — um clique, sem precisar preencher o formulário inteiro. Depois de pegar, o lead vira dele normalmente (formulário libera, pode editar/mover/anotar/excluir).

Importante: isso só vale pra lead **sem ninguém**. Se já tem responsável, continua só admin reatribuindo — não mudou.

Testado: criei um lead sem responsável, logado como um usuário membro de teste, cliquei em "Pegar esse lead pra mim" e confirmei no banco que o `responsavel_id` virou o dele; recarreguei a página e o formulário já apareceu liberado, com todos os botões de ação. Usuários e lead de teste removidos no final. Build de produção limpo.

## 2026-08-17 — Excluir usuário com leads exige escolher pra quem transferir

O Samuel perguntou o que acontece se excluir um usuário que tem "um monte de lead no Funil" — testei e descobri que **dava erro** (violação de chave estrangeira), porque `leads.usuario_id`, `interacoes.usuario_id`, `reunioes.usuario_id` e `comandos.usuario_id` apontam pro usuário e o banco não deixa apagar quem ainda tem essas referências.

Reescrevi `excluir_usuario()`: antes de excluir, checa se a pessoa tem leads (como criadora ou responsável), interações, reuniões ou comandos vinculados. Se tiver, **exige** um segundo parâmetro (`transferir_para`, outro usuário da mesma org) — aí transfere tudo isso pro novo dono antes de seguir com a exclusão. Metas (`metas_config`/`metas_mensais`) não são transferidas — são pessoais (piso de leads do dia, meta do mês), não fazem sentido pra outra pessoa, então somem junto com o usuário.

Na tela, o botão "Excluir acesso" tenta direto; se vier o erro específico de "tem vínculo", em vez de mostrar só a mensagem, abre um seletinho "Transferir leads e atividades de [nome] pra:" com os outros usuários da org, e o botão vira "Transferir e excluir". Segunda tentativa já manda o destino junto.

Testado: criei dois usuários de teste, um lead vinculado a um deles, tentei excluir — apareceu certinho o aviso pedindo pra escolher destino; escolhi o segundo usuário, cliquei em "Transferir e excluir" e confirmei no banco que o lead passou pro segundo (usuario_id e responsavel_id) e o primeiro usuário sumiu de `usuarios` e `auth.users`, sem erro de chave estrangeira. Dados de teste removidos no final. Build de produção limpo, 15 rotas.

## 2026-08-17 — Filtro "por usuário" no Funil

Pedido simples: um dropdown "Filtrar por usuário" do lado do botão "+ Novo lead", que quando escolhido só mostra no Kanban os leads daquele responsável. Implementado como um `<select>` que navega pra `/leads?usuario=<id>` (ou volta pra `/leads` limpo se escolher "Filtrar por usuário" de novo) — o filtro vira parte da URL, então dá pra recarregar a página ou mandar o link pra alguém que o filtro continua aplicado. A consulta dos leads ganha um `.eq("responsavel_id", ...)` quando o filtro tá ativo.

Disponível pra todo mundo com acesso ao Funil (não só admin) — visualizar já era liberado geral, isso é só um jeito de focar a visão, não muda quem pode editar o quê.

Testado: com dois leads (um de cada dono), filtrando por um usuário sobrou só o lead dele; voltando pro "sem filtro" os dois reapareceram. Dados de teste removidos no final. Build de produção limpo.

## 2026-08-17 — Telefone de lead excluído ficava "preso" pra sempre

O Samuel excluiu um lead e tentou cadastrar outro com o mesmo telefone — o sistema recusou dizendo que já existia, mesmo o antigo estando excluído. Causa: exclusão de lead é soft delete (`arquivado_em`, por regra do projeto — nada é apagado de verdade), mas a trava de "telefone duplicado" (`unique (usuario_id, telefone_e164)`) não sabia disso e continuava contando o lead arquivado como ocupando aquele número.

Troquei a constraint por um índice único parcial — `unique (usuario_id, telefone_e164) where arquivado_em is null` — que só enxerga leads ativos. Lead excluído libera o telefone pra reuso; telefone já em uso por um lead ativo continua bloqueado normalmente (a mensagem amigável "Já existe um lead com esse telefone" não muda, só o comportamento por trás).

Testado direto no banco: criei um lead, arquivei ele, recriei outro com o mesmo telefone — funcionou. Tentei um terceiro com o mesmo telefone enquanto o segundo tava ativo — bloqueou, como esperado. Dados de teste removidos no final.

## 2026-08-17 — Base de Leads e Clientes viram itens do menu lateral

O Samuel queria tirar os links "Base →", "Vendas →" e "Ver em lista →" do topo do Funil (poluição visual) e colocar essas duas telas como itens de verdade no menu lateral: **"Base de Leads"** e **"Clientes"**.

- Menu lateral ganhou os dois itens novos (entre "Lista de leads" e "Atividades"), usando as mesmas permissões da página Funil (quem tem acesso ao Funil também acessa essas duas).
- Topo do Funil ficou só com a contagem de leads e o filtro por usuário + "Novo lead" — sem os links redundantes.
- **Base de Leads** virou um Kanban de verdade (reaproveitei o mesmo componente do Funil), mostrando os leads que estão na Base como cards — mesmo visual, WhatsApp, tudo. Como é só um nível (Base), a coluna não numera ("Nível X" só faz sentido dentro da sequência completa do funil).
- **Clientes** manteve a tela simples de lista (sem Kanban, como pedido) — só troquei o título de "Vendas" pra "Clientes". Por baixo continua a mesma lógica de "quem comprou" (`status = 'vendido'`), não mudei nenhum termo do negócio (venda, meta de venda, etc.) — só o nome dessa tela específica.

Testado no navegador: menu lateral mostra os dois itens novos, Base de Leads renderiza o Kanban de coluna única sem numeração errada, Clientes mostra o título certo com a lista de quem comprou. Build de produção limpo, 15 rotas (mesmas de antes, só mudou o conteúdo).

## 2026-08-17 — Base de Leads e Clientes: cor certa e valor da venda como selo

Dois ajustes finos depois de ver as telas no ar:

1. **Base de Leads**: o Samuel queria a cor exata da coluna "Leads" do funil (preto), não a cor genérica da paleta do nível 7 (stone). Como a cor no Kanban é decidida pelo `ordem` do nível, forcei `ordem: 0` só na hora de montar os dados pra essa tela (não mexe no banco, é local dessa página) — assim reaproveita a mesma cor preta de `CORES_NIVEL[0]` sem duplicar nada.

2. **Clientes**: ele voltou atrás do "sem Kanban por enquanto" — viu a lista simples e achou o valor da venda "estranho" no rodapé do card. Troquei pelo mesmo Kanban do funil (coluna única verde-esmeralda, cor de sucesso). O valor da venda + data viram o selo que normalmente mostra a origem do lead (reaproveitando o mesmo espaço/estilo já pronto do card) — fica um selo arredondado, igual a "SS IG" aparece nos outros cards, só que com "R$ 2.500,00 · 17/08/2026". O card de receita total no topo continua do jeito que estava.

Testado no navegador com dados de teste nas duas telas — cores batendo com o esperado, valor da venda aparecendo como selo limpo. Dados de teste removidos no final. Build de produção limpo.

## 2026-08-17 — Foto de perfil do usuário

O Samuel quer que cada usuário possa colocar uma foto real no lugar da bolinha com a inicial do nome.

**Onde fica**: criei uma tela nova, `/perfil` ("Meu perfil"), acessível por **qualquer usuário logado** — admin ou membro, mesmo um membro com quase nenhuma permissão marcada. Ela fica de propósito fora do sistema de permissões por página (o `paginaDaRota()` do `proxy.ts` só reconhece rotas específicas; `/perfil` não bate com nenhuma, então passa direto) — faz sentido, porque é a própria conta da pessoa, não um dado do CRM. Também adicionei um atalho "Meu perfil" fixo no rodapé do menu lateral (acima do "Sair"), com a foto/inicial de quem está logado, sempre visível independente das permissões.

**Como funciona**: a foto vai pro Supabase Storage, num bucket público chamado `avatars` (é só avatar, não tem nada sensível — bucket público evita ter que gerar link assinado toda hora). O nome do arquivo é sempre o próprio `id` do usuário (sem extensão, sempre sobrescreve) — RLS no `storage.objects` garante que cada um só sobe/troca/apaga o arquivo com o **próprio** id, embora qualquer um consiga ler qualquer avatar (é público mesmo, como foto de perfil normalmente é). Ao salvar, a Server Action grava a URL pública em `usuarios.foto_url` com um `?v=timestamp` no final, pra o navegador não mostrar a foto antiga em cache depois de trocar.

**Onde aparece**: criei um componente `AvatarUsuario` que mostra a foto se tiver, senão cai pra inicial (mesmo visual de sempre) — usado na tela de Usuários (lista da equipe) e no menu lateral ("Meu perfil"). `listar_usuarios_da_org()` também passou a devolver `foto_url`.

Testado direto via API (a automação de navegador não consegue simular escolher um arquivo num `<input type="file">` — é bloqueado pelo próprio navegador por segurança): logei como usuário de teste via API do Supabase, subi uma imagem de verdade pro bucket, confirmei que funcionou; testei que outro usuário **não** consegue subir arquivo no lugar de alguém (bloqueado, RLS funcionando); confirmei leitura pública sem autenticação; depois simulei a gravação do `foto_url` e vi a foto aparecer certinho na tela de perfil, no menu lateral e na lista de Usuários, substituindo a inicial. Removi o arquivo e o usuário de teste no final. Build de produção limpo, 16 rotas.

## 2026-08-17 — Métricas: ticket médio, canal que mais vendeu, performance por SDR

O Samuel pediu pra analisar de novo a planilha do Google Sheets e trazer o que tava faltando no Dashboard. Abri a planilha (aba "MAI", a mais recente) e achei três blocos que a tela de Métricas não tinha:

1. **Ticket médio** (receita ÷ vendas) — na planilha aparece junto do faturamento da semana. Adicionei no `Metricas` (`lib/metricas.ts`) e mostrei junto do card de Receita ("X vendas · ticket médio R$Y").

2. **"Resultado por canal de agendamento"** — a planilha mostra, por canal/origem do lead, quantas vendas e quanto faturou no mês, com gráfico de pizza. Criei `calcularVendasPorCanal()` (agrupa `leads.origem` das vendas do mês, org inteira — não é métrica pessoal, é visão de time) e um componente novo `VendasPorCanal` com barrinha de proporção por canal.

3. **"Resultado individual de cada SDR na semana"** — a planilha compara side-by-side o desempenho de cada vendedor. Criei `calcularMetricasPorUsuario()`, que roda o mesmo cálculo de métricas (já existia, por usuário) pra cada usuário da org e devolve tudo junto. Componente novo `PerformanceSdr` mostra numa tabela: leads, marcadas, realizadas, no show, vendas, taxa de venda e receita, um por linha.

**Decisão de visibilidade**: os itens 2 e 3 (canal e comparação entre SDRs) só aparecem pra **admin** — são dados de time/comparação entre pessoas, diferente do resto do Dashboard que já era só a métrica pessoal de quem tá logado. Um membro continua vendo só a própria semana/mês, como sempre foi.

Testado com um usuário de teste admin + um lead vendido de verdade no banco: o canal apareceu certinho ("SS IG · 1 venda · R$3.000,00"), e a tabela de SDRs mostrou o usuário de teste (zerado) ao lado do Samuel (com a venda) — confirmando que a visão por usuário separa direitinho quem fez o quê. Dados de teste removidos no final. Build de produção limpo, 16 rotas.

## 2026-08-17 — Correção: aba certa da planilha + card de Receita "chique"

Duas coisas nessa:

1. **Eu tinha olhado a aba errada da planilha** (MAI) — a aba viva, que o Samuel realmente usa, é a do mês atual (AGO). Reabri e conferi lá: a estrutura é a mesma que já implementei (leads, calls, vendas, faturamento, receita, ticket médio, canal), então nada mudou na parte de métricas — só uma coisa nova que reparei: a planilha tem "Negociações" e "Valor das negociações" (leads que já ganharam proposta mas ainda não fecharam), que a gente ainda não tem. Dá pra contar quantos leads estão no nível "Oportunidades para o fim do mês" sem mexer em nada — mas o "valor" da negociação exigiria um campo novo no lead (hoje só existe valor depois que vira venda). Não criei isso ainda, fica pra próxima se o Samuel quiser.

2. **Visual do card de Receita**: era roxo, o Samuel queria verde-esmeralda "de luxo" pra combinar com dinheiro. Refiz o card (no Dashboard e também no de "Clientes", pra ficar consistente): gradiente escuro esmeralda→verde-azulado, ícone de cifrão gigante e translúcido de marca d'água no canto, sombra grande colorida, número em fonte bem grossa com leve sombra no texto, brilho sutil no topo. Testado em tela de desktop de verdade (o painel de automação é estreito e cortava o texto, mas isso não acontece numa tela normal).

## 2026-08-17 — Ajustes finos: canais no plural + nome das colunas

Dois retoques depois de ver a tela:

1. **"Canal que mais vendeu"**: o componente já listava todos os canais com venda (nunca foi só um) — o problema era só o título no singular, que dava a entender que era só o campeão. Renomeei pra "Canais que venderam no mês" e deixei a descrição mais clara ("todo canal que teve venda, com quantas vezes aconteceu").

2. **Tabela de performance por SDR**: as colunas "Marcadas" e "Realizadas" viraram "Calls marcadas" e "Calls realizadas", pra bater com o nome usado na planilha de referência.

Testado com 3 vendas de canais diferentes (Networking, SS IG, Indicação base) — as três apareceram na lista, cada uma com sua quantidade e faturamento; e a tabela de SDR já mostra os nomes completos das colunas. Dados de teste removidos no final. Build de produção limpo.

## 2026-08-17 — Bug: semana calculava segunda a domingo, tinha que ser domingo a sábado

O Samuel percebeu que a "semana" das métricas não tava no padrão certo. Conferi o código: `inicioDaSemana()` calculava a partir de **segunda-feira** (padrão ISO), mas o combinado sempre foi domingo a sábado. Corrigi a função pra sempre voltar até o domingo mais recente, e criei `fimDaSemana()` (domingo + 6 dias = sábado).

Pra isso nunca mais dar dúvida, também **mostrei o intervalo de datas na tela** — tanto no card "Esta semana" quanto na tabela "Performance da semana por SDR" agora aparece "domingo a sábado · 16/08 a 22/08" (ou a semana correspondente), calculado ao vivo, não fixo.

Testado com uma simulação isolada da função (segunda-feira 17/08 como "hoje") — confirmou que a semana calculada vai de domingo 16/08 a sábado 22/08. Testado também na tela, logado com usuário de teste: os dois textos de período aparecem certinhos. Usuário de teste removido no final. Build de produção limpo.

## 2026-08-17 — Bug: contador do Funil incluía lead da Base

O Samuel reparou: a tela mostrava "1 lead sendo trabalhados" mas todas as colunas do Kanban apareciam vazias. Causa: a consulta que conta os leads não excluía quem tá no nível 7 (Base) — e a Base tem tela própria desde a mudança anterior, então não aparece em nenhuma coluna do Funil, mas ainda entrava na contagem. Adicionei `.neq("nivel_ordem", 7)` na consulta, pra contagem bater com o que realmente aparece nas colunas.

Testado: confirmei no banco que o lead "teste" realmente estava no nível 7; depois de corrigir, a tela passou a mostrar "0 leads sendo trabalhados", batendo com as colunas vazias. Build de produção limpo.

## 2026-08-17 — Origem dos leads (semana e mês) nas Métricas

Pedido do Samuel, baseado na planilha: mostrar de onde vieram os leads (todos, não só quem virou venda) — separado por semana e por mês. Diferente do "Canais que venderam" (que já existia e só conta quem fechou), isso aqui conta **todo lead que entrou** no período, agrupado por origem.

Criei `calcularLeadsPorOrigem()` (org inteira, visão de time — mesma lógica de admin-only das outras métricas de equipe) e um componente `LeadsPorOrigem` reaproveitado duas vezes: "Origem dos leads — semana" e "Origem dos leads — mês", cada um com o total geral em cima e a contagem por origem com barrinha de proporção.

Testado com 3 leads de teste (2 de "SS IG", 1 de "Networking") — os dois blocos mostraram a contagem certinha (SS IG: 2, Networking: 1, total: 3 leads). Dados de teste removidos no final. Build de produção limpo.

## 2026-08-17 — Tabela de performance por SDR: números centralizados

Ajuste visual simples: na tabela "Performance da semana por SDR", os números (Leads, Calls marcadas/realizadas, No Show, Vendas, Taxa de venda, Receita) ficaram centralizados; só o nome do SDR continua alinhado à esquerda. Testado direto no DOM (className de cada célula) pra confirmar o alinhamento certo em cada coluna.

## 2026-08-18 — Meta de receita do mês (não confundir com faturamento)

O Samuel deixou bem claro: **a meta é sempre sobre receita** (o dinheiro que realmente entra no caixa), nunca sobre faturamento (o valor bruto da venda — se vendeu R$10 mil mas só recebeu R$5 mil até agora, a meta olha os R$5 mil). O sistema já tinha essa distinção (`leads.valor_venda` soma como "receita" em todo o resto do painel), então não precisei mudar nada de conceito — só faltava um jeito de **definir a meta e ver o progresso**.

A tabela `metas_mensais` já existia desde a Fase 1 do projeto (schema original) mas nunca tinha tela nenhuma — criei:

- `definirMetaReceita()`: cada usuário define a própria meta do mês atual (upsert em `metas_mensais`, chave é usuário+ano+mês). Preenche `ticket_medio` e `dias_uteis` (colunas obrigatórias na tabela) com o ticket médio padrão da org e os dias úteis do mês, mas **não calculei ainda** a cadeia inteira de "quantos leads/reuniões preciso pra bater a meta" que tá descrita na Constituição (`CLAUDE.md`) — isso é maior, fica pra outra tarefa se o Samuel quiser.
- `MetaReceitaWidget`: componente com duas versões — **compacta** (uma linha: "Meta do mês: R$X · Falta R$Y", clicável pra editar) e **completa** (card com barra de progresso, "Recebido" vs "Meta", editável).

**Onde aparece**: compacta no topo do Funil, do lado direito da contagem de leads (mesma linha, ao lado do filtro por usuário); completa no topo da tela de Métricas, antes de "Esta semana". Se ainda não tiver meta definida, os dois lugares mostram o campo pra preencher na hora.

Testado com usuário de teste: defini uma meta de R$30.000, salvou, e os dois lugares mostraram "Falta R$30.000,00 pra bater a meta" (recebido R$0 ainda) — sem precisar recarregar a página, o formulário já vira resumo sozinho depois de salvar. Dados de teste removidos no final. Build de produção limpo, mesmas 16 rotas.

## 2026-08-18 — Meta de receita vira única (não por usuário) — só admin edita

O Samuel corrigiu o modelo do dia anterior: não existe "meta de cada um da equipe" — é **uma meta só, da empresa toda**. Todo mundo vê; só o administrador escolhe/edita o valor.

Mudanças:

- **Migration** (`20260818010000_meta_receita_por_org_admin_edita.sql`): a chave única de `metas_mensais` passou de `(usuario_id, ano, mes)` pra `(org_id, ano, mes)` — uma linha por mês pra organização inteira, não mais uma por pessoa. RLS trocada: leitura liberada pra todo mundo da org (`metas_mensais_select_org`), escrita (inserir/editar) só pra admin (`metas_mensais_insert_admin`/`metas_mensais_update_admin`, usando a função `private.eh_admin()` que já existia).
- **`lib/metas/actions.ts`**: `definirMetaReceita()` agora barra na entrada quem não é admin (`"Só administradores podem definir a meta."`) — mesma regra que a RLS já garante no banco, só que com mensagem amigável em vez de erro cru.
- **`lib/metricas.ts`**: `buscarMetaReceitaMes()` passou a receber `orgId` em vez de `usuarioId`. Criei `calcularReceitaOrg()` — soma a receita da organização inteira no período, porque o "progresso" da meta agora também é de time, não mais só do usuário logado.
- **`MetaReceitaWidget`**: ganhou a prop `podeEditar`. Quem não é admin nunca vê o botão "Editar" nem o formulário — só o valor e a barra de progresso, somem também o clique na versão compacta. Se a meta ainda não foi definida e a pessoa não é admin, mostra um aviso neutro ("Ainda não foi definida pelo administrador") em vez de abrir um formulário vazio.
- **Funil e Métricas**: as duas páginas passaram a buscar a meta e a receita por `org_id` (não mais `usuario_id`), e passam `podeEditar={souAdmin}` pro widget.

Testado com duas contas: logado como membro de teste, a tela mostrou a meta certa (R$30.000, já cadastrada antes pelo Samuel) mas **sem nenhum botão de editar** em nenhuma das duas telas — conferido também direto no DOM, sem nenhum "Editar" na lista de botões. Pra provar que a trava é de verdade (não só escondida na tela), tentei um `PATCH` direto na API do Supabase autenticado como esse membro, tentando mudar a meta pra R$999.999 — a RLS bloqueou (0 linhas afetadas) e o valor no banco continuou R$30.000. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Aviso chamativo quando vira o mês e a meta não foi definida

O Samuel pediu um "sinal" mais claro: toda vez que virar o mês, precisa aparecer alguma coisa avisando que a meta de receita precisa ser trocada. Isso já acontecia de forma silenciosa (o formulário abria sozinho pro admin quando não havia meta pro mês atual), mas ficava discreto demais, meio camuflado no fundo branco da tela.

Troquei o estado "mês novo, meta ainda não definida" (só aparece pra admin, já que só ele pode agir) por um aviso amarelo com sino (🔔), tanto na versão compacta (Funil) quanto na completa (Métricas): "🔔 [Mês] começou — defina a meta". Continua sendo o mesmo formulário de sempre por baixo — só a moldura chamou mais atenção. Assim que salva, o aviso some sozinho e volta o card normal com a barra de progresso.

Não precisou nenhuma tabela ou lógica nova: como `metas_mensais` já é uma linha por `(org_id, ano, mes)`, a virada do mês naturalmente já deixa essa linha inexistente até alguém cadastrar — o aviso só está reagindo a isso ficar `null`.

Testado: criei um admin de teste, apaguei a meta de agosto pra simular o primeiro acesso do mês, logei e vi o aviso amarelo aparecer certinho no Funil e em Métricas; preenchi R$30.000 de novo, o aviso sumiu e voltou o card normal com "Falta R$30.000,00". Reassociei a linha da meta de volta pro usuário real (Samuel) e apaguei a conta de teste. `tsc --noEmit` e `npm run build` limpos, mesmas 16 rotas.

## 2026-08-18 — Venda vendida ficando presa na Base + Receita separada de Valor da venda

O Samuel viu o card "Fechar venda" e apontou dois problemas:

1. **Bug real**: o texto dizia "fica só em 'Mostrar Base e Vendas'" — um recurso que já não existe (foi trocado por telas próprias há várias entradas atrás, ver "Base e Vendas viram telas próprias"). Investigando o código, achei um bug de verdade por trás do texto desatualizado: a tela `/leads/base` filtra só por `nivel_ordem = 7`, **sem excluir `status = 'vendido'`** — diferente do Funil (`/leads`), que já exclui vendidos. Ou seja, um lead que estava na Base e foi marcado como vendido continuava aparecendo lá, além de aparecer em Clientes — duplicado. Corrigido com `.neq("status", "vendido")` na query da Base, igual o Funil já fazia. Texto do card corrigido pra "sai do Funil e da Base e vai pra Clientes" — que agora é verdade.

2. **Valor da venda ≠ Receita**: o Samuel apontou que precisa informar os dois separadamente ao fechar uma venda, pra métricas baterem certo — reforça a regra que já estava no `CLAUDE.md` desde o início ("faturamento é o preço da venda... a meta sempre é sobre receita: o quanto que entra no caixa"). Até agora só existia `valor_venda`, e esse mesmo número era usado como se fosse "receita" em toda métrica do painel — o que ia dar errado assim que uma venda fosse parcelada (o preço fechado é maior do que o que já entrou no caixa).

   - **Migration** (`20260818020000_receita_separada_do_valor_da_venda.sql`): nova coluna `leads.receita_venda numeric`, nullable, ao lado de `valor_venda` (que continua existindo e significa faturamento/preço combinado).
   - **`MarcarVendidoForm`**: dois campos agora, "Valor da venda (R$)" e "Receita recebida (R$)", os dois obrigatórios.
   - **`marcarVendido()`** (`lib/leads/actions.ts`): grava os dois valores.
   - **Página do lead**: card "✓ Vendido" mostra "Venda: RX" e "Receita: RY" em linhas separadas.
   - **Clientes (`/leads/vendas`)**: o "Receita total em vendas" no topo e o selo em cada card agora somam/mostram `receita_venda`, não mais `valor_venda`.
   - **`lib/metricas.ts`**: `calcularMetricas()` (usada em "Esta semana"/"Este mês", ticket médio, taxa de venda) e `calcularReceitaOrg()` (usada na Meta de receita) passaram a somar `receita_venda`. **Não mexi** em `calcularVendasPorCanal()` ("Canais que venderam") — o campo lá já se chama corretamente `faturamento` e usa `valor_venda`, que é o conceito certo pra aquela tela (quanto cada canal faturou, não quanto já recebeu).

   Fica pro Samuel decidir mais pra frente (ele já sinalizou que tem mais ajustes de preenchimento de lead vindo a seguir): hoje os dois campos são obrigatórios sempre, mesmo quando o pagamento é à vista (aí ele digita o mesmo número duas vezes) — não criei nenhum atalho tipo "copiar valor da venda" porque não foi pedido, mas é simples de adicionar se ele quiser depois.

Testado de ponta a ponta com um lead de teste que comecei propositalmente na Base: marquei como vendido com **valores diferentes** (Venda R$1.000, Receita R$400, pra garantir que não era coincidência) — confirmei que o lead sumiu da Base, apareceu em Clientes mostrando "Receita total em vendas: R$400,00" (não R$1.000), a página do lead mostrou "Venda: R$1.000,00" e "Receita: R$400,00" separados, o Dashboard mostrou "RECEITA R$400,00 · ticket médio R$400,00" e a Meta de receita mostrou "Recebido R$400,00" — enquanto "Canais que venderam" corretamente mostrou "R$1.000,00" (faturamento). Lead e conta de teste removidos no final. `tsc --noEmit` e `npm run build` limpos, mesmas 16 rotas.

## 2026-08-18 — Bug: lead excluído continuava contando na Receita/métricas

O Samuel perguntou: excluiu um lead que tinha venda, e os números continuaram aparecendo nas métricas — tava certo? Não estava, era bug. Excluir lead nunca apaga a linha do banco (regra do `CLAUDE.md`, soft delete via `arquivado_em`), mas as contas de receita não checavam esse campo — só `calcularLeadsPorOrigem()` já filtrava `arquivado_em is null`; `calcularMetricas()` (Receita/ticket médio de "Esta semana"/"Este mês"), `calcularVendasPorCanal()` ("Canais que venderam") e `calcularReceitaOrg()` (progresso da Meta de receita) não filtravam. Resultado: o lead sumia de Clientes, mas o dinheiro dele continuava contando em tudo que é "Receita" no painel.

Adicionei `.is("arquivado_em", null)` nas três consultas de venda/receita em `lib/metricas.ts`. Agora excluir um lead tira ele de tudo, de uma vez — não só da lista visível.

**Não mexi** na contagem de "leads trabalhados" nem nas de reuniões (marcadas/realizadas/no show) — elas também não filtram `arquivado_em`, mas isso é uma decisão separada (o `CLAUDE.md` define "lead trabalhado" como "o que foi declarado", sem falar de exclusão) — fica pro Samuel dizer se quer isso também, é só avisar.

Testado: criei um lead de teste já nascendo vendido (R$500), conferi que a Receita e a Meta mostravam R$500; excluí o lead pela tela normal (botão "Excluir lead", com o alerta de confirmação); recarreguei o Dashboard e a Receita, ticket médio, "Canais que venderam" e a Meta de receita foram todos pra R$0/vazio — só "Leads trabalhados" continuou contando 1 (esperado, não fazia parte do escopo). Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Fechar venda: campo de dinheiro de verdade, sem setinha de número

Três ajustes finos no card "Fechar venda", depois do Samuel ver a tela:

1. **Texto corrigido de novo**: "sai do Funil e da Base" → só "sai do Funil e vai pra Clientes" — o "e da Base" não fazia sentido (o lead normalmente nem estava na Base quando é vendido; isso só foi um cenário de teste que criei propositalmente na entrada anterior pra provar o bug).
2. **Texto do placeholder**: "Quanto já entrou no caixa" → "Quanto entrou no caixa".
3. **Campo de dinheiro de verdade**: os dois campos eram `<input type="number">`, que no navegador mostra as setinhas pra incrementar/decrementar (o "dropbox" que o Samuel via) e não formata nada. Troquei por um campo de texto com máscara de moeda: assim que digita qualquer número, já aparece formatado "R$ 1.500,00" na hora — funciona tratando cada dígito digitado como centavo (a mesma lógica que apps de banco usam), sem setinha nenhuma. Por baixo dos panos, um campo escondido manda pro servidor o número puro (`1500.00`), então a Server Action que já existia não precisou mudar nada.

Testado digitando "150000" no campo Valor da venda — virou "R$ 1.500,00" na hora, conferido tanto visualmente quanto no valor real do campo escondido (`1500.00`); preenchi Receita com "60000" → "R$ 600,00"; enviei o formulário de verdade e a página do lead mostrou "Venda: R$1.500,00" e "Receita: R$600,00", batendo exatamente com o que foi digitado. Lead e conta de teste removidos no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Bug: "Meu perfil" sumia rolando a página, rodapé do menu não ficava fixo

O Samuel mandou um print mostrando "Meu perfil" e "Sair" no meio de um espaço em branco, longe do rodapé de verdade da tela. Causa: o `components/sidebar.tsx` já estava certo (`h-screen` + `nav` com `flex-1` + bloco de perfil fixo depois, pra empurrar pro rodapé) — o problema estava um nível acima, em `app/(app)/layout.tsx`. O wrapper que contém o menu e o conteúdo da página usava `min-h-screen` (altura **mínima**, sem limite de cima) e sem `overflow-hidden`. Toda vez que o conteúdo de uma página (o `<main>`) era mais alto que a tela, era o **documento inteiro** que rolava — inclusive o menu lateral, que não é fixo de verdade, só um bloco de 100vh dentro de uma página maior. Rolando a página, o menu "subia" junto, cortando os itens de cima e deixando "Meu perfil" solto no meio do que sobrava visível.

Corrigido travando a altura do wrapper em `h-screen overflow-hidden` (documento nunca mais rola) e movendo o scroll pra dentro do container do conteúdo da página (`overflow-y-auto`). Resultado: o menu lateral fica sempre parado, do tamanho exato da tela, e só a área da direita rola por dentro quando o conteúdo é grande.

Testado com um lead de teste, reduzindo a janela pra 800×450 (forçando o formulário do lead a ser mais alto que a tela): rolei o conteúdo da direita em 400px via script e conferi as posições reais dos elementos — o `<aside>` continuou exatamente em `top: 0, height: 450` (a tela inteira, sem se mexer) e "Meu perfil" continuou visível no rodapé (`y: 401-441`), com o scroll do documento (`window.scrollY`) permanecendo em 0 o tempo todo — só o painel de conteúdo rolou. Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Produto vendido, data de entrada do lead e data em que a reunião foi marcada

O Samuel pediu três coisas de uma vez no cadastro de lead:

1. **Campo "Produto"** — pra selecionar o que foi vendido (ou está sendo negociado). Ele mandou pegar os produtos reais da planilha (aba AGO) em vez de eu inventar nomes — abri a planilha e achei duas colunas preenchidas na coluna PRODUTO: "Agenda Previsível" e "Treinamento comercial". Criei `leads.produto` (coluna nova, texto) e um componente `ProdutoSelect` igual ao `OrigemSelect` que já existia (lista fixa + "Outro..." pra digitar livre) — assim cresce sozinho conforme ele for vendendo produtos novos, sem precisar mexer no código. Aparece no cadastro de lead novo, na edição, e — se preenchido — no card "✓ Vendido" também.

2. **Data e hora que o lead entrou no sistema** — já existia no banco (`declarado_em`, é o mesmo campo usado pra contar "leads trabalhados" nas métricas) mas não aparecia em lugar nenhum da tela. Agora mostra "Lead adicionado em 18/08/26, 01:23" no topo da página do lead.

3. **Data em que a reunião foi marcada, separada da data da reunião em si** — até agora só existia um campo, "Data e hora da reunião" (quando ela VAI acontecer); a "data de agendamento" (quando ela FOI marcada) sempre usava `now()` do banco, sem opção de mudar — o texto embaixo do campo até avisava isso ("é registrada automaticamente"). Isso quebrava se o Samuel fosse registrar uma reunião retroativa (marcada ontem, por exemplo). Adicionei um segundo campo, "Data em que foi marcada", que já vem preenchido com a hora atual mas pode ser trocado. Aparece também na Linha do tempo do lead, junto da data da reunião, pra nunca mais dar dúvida de qual é qual.

Sobre o resto do pedido (revisar o que falta comparado com CRMs grandes tipo Pipedrive/HubSpot, e deixar os campos prontos pra quando vier lead direto do Meta/Google Ads): não implementei nada disso ainda — é maior e precisa de decisão dele antes (por exemplo, se vale a pena guardar e-mail do lead, que hoje não existe em lugar nenhum). Respondi isso separado no chat, sem misturar com essa tarefa.

Testado com um lead de teste: escolhi "Agenda Previsível" no Produto, movi o lead pra "Reunião marcada" preenchendo "Data em que foi marcada" com uma data passada (15/08 10h) e "Data e hora da reunião" com uma data futura (20/08 15h30) — salvei e confirmei direto no banco que `reunioes.marcada_em` e `reunioes.agendada_para` gravaram exatamente essas datas (convertidas certo pro fuso UTC). A Linha do tempo mostrou as duas datas separadas. Marquei a venda e o card "✓ Vendido" mostrou "Produto: Agenda Previsível" antes do valor. Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos, mesmas 16 rotas.

## 2026-08-18 — Produto: move pra dentro de "Fechar venda", tira do cadastro/edição

O Samuel viu o campo "Produto" no meio do formulário de editar lead (entre Origem e Responsável) e achou melhor mudar: só faz sentido perguntar o produto na hora de fechar a venda, não antes. Movido o `ProdutoSelect` pra dentro do card "Fechar venda" (`MarcarVendidoForm`), logo abaixo do botão "Marcar como vendido" — e removido do cadastro de lead novo e da edição geral. `marcarVendido()` agora grava `produto` junto com `valor_venda`/`receita_venda`; `criarLead()` e `atualizarLead()` não mexem mais nesse campo.

Testado: abri um lead sem produto, conferi que "Produto" sumiu do formulário de edição (só ficou Nome, Telefone, Origem, Responsável, Nível) e apareceu certinho abaixo do botão verde, dentro do card "Fechar venda". Preenchi valor, receita e escolhi "Treinamento comercial", marquei como vendido, e o card "✓ Vendido" mostrou "Produto: Treinamento comercial" — confirmando que salvou pelo lugar novo. Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Campo de e-mail do lead (só na edição, não no cadastro rápido)

Continuação do que eu tinha sugerido (gap comparado com CRMs grandes e preparação pra integração com anúncio): o Samuel topou adicionar e-mail, mas só na tela de editar o lead — não quer que peça e-mail no cadastro rápido (`/leads/novo`), que continua só nome, telefone, origem e responsável.

Criei `leads.email` (coluna nova, texto, opcional) e o campo "E-mail" no `EditarLeadForm`, logo depois de Telefone. `criarLead()` não foi tocado (continua sem e-mail); `atualizarLead()` passou a gravar o campo.

Testado: confirmei que `/leads/novo` continua sem nenhum campo de e-mail; abri um lead de teste, o campo "E-mail" apareceu vazio na edição, preenchi "lead.teste@example.com", salvei, e confirmei direto no banco que gravou certo. Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos, mesmas 16 rotas.

## 2026-08-18 — Design da tela "Novo lead"

O Samuel achou a tela de cadastro de lead "sem vida" — era só um card branco simples. Redesenhei mantendo a mesma paleta que já uso no resto do painel (violeta/azul-céu, o gradiente do logo e do botão principal):

- Card ganhou um cabeçalho colorido (gradiente violeta→azul-céu) com um ícone de "pessoa +" novo (`IconePessoaMais`, criado em `components/icons.tsx`), título "Novo lead" e uma frase curta de contexto — o link "Cancelar" mudou de lugar, pra dentro desse cabeçalho.
- Card em si ganhou cantos mais arredondados e sombra mais forte (`shadow-md` em vez de `shadow-sm`), efeito de elevação mais "de produto" do que uma caixa solta.
- Os campos de texto ganharam `placeholder` (antes só o de telefone tinha).
- A caixa de aviso no fim ("O lead entra em Leads...") trocou o cinza neutro por um tom violeta claro com um emoji de lâmpada, pra combinar com o resto e não parecer um aviso de erro.
- Botão "Salvar lead" ganhou o mesmo gradiente violeta→azul-céu do cabeçalho, com sombra que cresce ao passar o mouse.

Testado no navegador (admin de teste): conferi que o cabeçalho e o "Cancelar" não se sobrepõem em tela de desktop (larguras conferidas via posição real dos elementos, não só visual), e cadastrei um lead de verdade pela tela nova — apareceu certinho na coluna "Leads" do Funil, confirmando que o formulário continua funcionando igual, só mudou a cara. Lead e conta de teste removidos no final. `tsc --noEmit` e `npm run build` limpos, mesmas 16 rotas.

## 2026-08-18 — Importação dos 11 leads reais da planilha (aba AGO)

O Samuel pediu pra subir os leads da planilha (aba AGO) pro CRM, mantendo vendas, follow-ups etc. **Isso não foi mudança de código** — foi uma inserção direta de dados reais no banco, via SQL, sem passar pelas telas do painel (11 leads de uma vez pela interface seria lento e sem necessidade).

**Como li a planilha certo:** clicar célula por célula (como fiz nas vezes anteriores) é lento e arriscado pra 11 linhas com várias colunas. Descobri o `gid` da aba AGO pela URL e baixei ela como CSV (`.../export?format=csv&gid=876711910`) via `curl` — isso trouxe todas as linhas e colunas de uma vez, sem erro de leitura.

**Mapeamento planilha → banco** (uma linha por lead, sempre com `usuario_id`/`responsavel_id` = Samuel, já que SDR e CLOSER eram sempre ele em todas as linhas):
- `DATA DE ENTRADA` → `declarado_em` (hora fixada em meio-dia, horário de Brasília — a planilha só tinha data, sem hora)
- `WHATSAPP` → `telefone_e164` (só limpei o número e adicionei o 55 na frente; não mexi no "9" que falta em alguns — o `linkWhatsApp()` já conserta isso na hora de abrir a conversa)
- `ORIGEM DO LEAD` → `origem` (todas bateram com a lista já cadastrada, nenhuma caiu em "Outro")
- `PRODUTO` → `produto` (só Paulo Ribeiro e Thiago Souza tinham; os outros ficaram vazio)
- `Data de Agendamento` + `Data da Call` → uma linha nova em `reunioes` (`marcada_em` e `agendada_para`)
- `CALL Realizada (S/N)` + `Status da CALL` → decidiu o nível do lead e o status da reunião:
  - Sem nenhuma call marcada (5 leads: Ted, Caio Lacerda, Ivo Santos, Amanda Ambrósio, Monique Pimentel) → nível "Leads" (0), sem reunião
  - Call marcada mas não realizada (Túlio Queiroz, Nice Soares, Beatriz Aranha) → nível "No Show" (5), reunião com `status = 'nao_compareceu'`
  - Call realizada, "Status da CALL: Follow-up" (Paulo Ribeiro) → nível "Oportunidades para o fim do mês" (6), reunião `realizada`, sem resultado fechado
  - Call realizada, "Status da CALL: Venda" (Claudilaine, Thiago Souza) → `status = 'vendido'`, reunião `realizada` com `resultado = 'vendeu'`
- `VALOR DA VENDA` → `valor_venda`; `VALOR PAGO NO MÊS` → `receita_venda` — aqui achei uma diferença real: a Claudilaine tinha os dois preenchidos (R$5.000 os dois), mas o **Thiago Souza vendeu R$10.000 e o "valor pago no mês" estava em branco na planilha**. Segui a planilha à risca: gravei `receita_venda = null` pra ele, em vez de chutar um valor. Isso bateu exatamente com o card "Receita" da própria planilha (R$5.000, só a Claudilaine) — confirma que não foi erro meu, é assim que está registrado lá.
- `NEGOCIAÇÃO EM ABERTO` e "closer pegou indicação" (colunas que o CRM ainda não tem campo próprio) → viraram uma nota na Linha do tempo de cada lead, pra não perder a informação.
- Todo lead importado ganhou uma nota "Importado da planilha COMERCIAL (aba AGO)." na Linha do tempo, pra ficar rastreável.

**Coisa que ficou pra você resolver:** o Thiago Souza está com receita "não informada" (R$10.000 vendidos, mas não sei quanto já caiu no caixa) — é só abrir o lead dele e conferir/corrigir se quiser que aquele valor conte na Meta de receita.

**Também reparei:** já existia um lead de teste seu chamado "Samuel Pereira da Silva" com o mesmo telefone do Thiago Souza (11 99896-4964) — parece ter sido um teste seu enquanto mexia no sistema. Não toquei nele (pode ser coisa sua mesmo), só fica o aviso caso vire um lead duplicado — se for, é só excluir esse de teste.

Testado: conferi cada um dos 11 leads na Lista de leads (nível batendo certinho com a planilha), a tela Clientes mostrando as 2 vendas com o total certo (R$5.000 de receita), e o Dashboard/Métricas com "Origem dos leads — mês: 10" (o Paulo Ribeiro fica de fora por ter entrado em julho, corretamente) e "Canais que venderam" mostrando Networking R$10.000 e SS IG R$5.000 — tudo batendo com os números que a própria planilha mostra. Conta de verificação removida no final (os 11 leads ficam, são dados reais).

## 2026-08-18 — Bug: lead excluído continuava contando em "Leads trabalhados" e Reuniões

O Samuel perguntou por que "Performance da semana" mostrava dado sendo que ele não tinha adicionado nada novo. Investigando, achei a causa: ele tinha criado alguns leads de teste essa semana (nomes "teste", "Samuel", "Samuel Pereira da Silva", enquanto testava as telas comigo) e já tinha excluído todos — mas "Leads trabalhados", "Reuniões marcadas", "Reuniões realizadas" e "No Show" continuavam contando eles mesmo assim.

Essa é a mesma falha que corrigi ontem pra Receita/Canais/Meta (`calcularReceitaOrg`, `calcularVendasPorCanal`), só que eu tinha deixado essas quatro de fora de propósito, avisando que era decisão separada — hoje ficou claro que ele quer isso corrigido também, então apliquei o mesmo princípio.

- `leadsTrabalhados`: adicionei `.is("arquivado_em", null)` direto (a consulta já é na tabela `leads`).
- `reunioesMarcadas`, `reunioesRealizadas`, `noShow`: essas consultas são na tabela `reunioes`, que não tem coluna `arquivado_em` própria — tive que fazer um `join` com `leads` (`leads!inner(arquivado_em)`) e filtrar por `leads.arquivado_em is null`, já que o que importa é se o *lead* da reunião foi excluído, não a reunião em si.

Agora excluir um lead tira ele de toda métrica, sem exceção — Receita, Canais, Meta, Leads trabalhados e Reuniões, todos.

Testado: com uma conta de verificação, conferi que "Performance da semana por SDR" mostrava "Samuel Pereira: 7 leads, 2 calls marcadas, 0 realizadas, 1 no show" (sobra dos testes dele, todos já excluídos) antes da correção; depois de aplicar o filtro e reiniciar o servidor, os mesmos números foram todos pra 0 — batendo com o fato de ele não ter nenhum lead ativo (não-arquivado) nessa semana. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — "Lead trabalhado" passa a contar reunião de mês anterior também

Ligado à entrada anterior sobre a importação: o Samuel reparou que "Este mês" mostrava 10 leads trabalhados, mas ele "trabalhou com 11" em agosto. Investigando, achei o motivo: o Paulo Ribeiro entrou no sistema em 29/07 (segundo a própria planilha), mas a call dele foi em 05/08 — ou seja, ele continuou sendo trabalhado em agosto mesmo tendo entrado em julho. Perguntei ao Samuel se a data da planilha estava errada ou se era assim mesmo (trabalhou o lead em agosto, mesmo tendo entrado antes) — ele confirmou: quer contar **todo lead que ele trabalhou no mês**, não só quem entrou nele.

Isso muda a definição de "lead trabalhado" que estava até no `CLAUDE.md` — atualizei o arquivo também, já que o Samuel mudou a regra explicitamente (a própria constituição do projeto permite isso: "a menos que o Samuel diga explicitamente que está mudando uma regra daqui").

**Nova regra**: um lead conta como trabalhado num período se ele foi **declarado** (entrou) nesse período **ou** teve alguma **reunião** (marcada ou realizada) dentro dele — mesmo que tenha entrado num período anterior. Implementei em `calcularMetricas()` (`lib/metricas.ts`): além da consulta de leads declarados no período, adicionei uma segunda consulta buscando reuniões do usuário com `marcada_em` ou `agendada_para` dentro do período (excluindo lead arquivado, igual as outras). Os dois grupos de IDs de lead se juntam num `Set` (sem duplicar quem aparece nos dois) e o tamanho desse conjunto é o total de "leads trabalhados".

Não mexi em `calcularLeadsPorOrigem()` ("Origem dos leads — semana/mês") — esse é sobre de onde os leads vieram, não sobre trabalho contínuo, então continua olhando só a data de entrada.

Testado: reproduzi a mesma lógica direto em SQL (união de "declarados no período" com "teve reunião no período") pro Samuel em agosto — o resultado bateu 11 leads, incluindo o Paulo Ribeiro dessa vez. Conta de verificação removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Bug: "Reuniões realizadas + No Show" passava de "Reuniões marcadas"

O Samuel reparou algo que não fazia sentido: Métricas mostrava 5 reuniões marcadas, mas 3 realizadas + 3 no show = 6 — mais do que o total de marcadas, matematicamente impossível se "realizada"/"no show" são sempre um subconjunto de "marcada".

Causa: **"Marcadas" contava pela data em que a reunião foi agendada** (`marcada_em`), **mas "Realizadas" e "No Show" contavam pela data em que a reunião de fato aconteceu** (`agendada_para`) — duas datas diferentes. O caso que estourou isso: o Paulo Ribeiro (da importação da planilha) foi marcado em 29/07 mas a call dele foi em 05/08 — contava como "realizada em agosto" mas não como "marcada em agosto", porque a marcação em si foi em julho. É exatamente a mesma raiz do bug de "lead trabalhado" (2 entradas acima), só que nas reuniões em vez dos leads.

Apliquei o mesmo princípio: uma reunião conta como "marcada" no período se ela foi **marcada** dentro dele **ou** se a **call em si aconteceu** dentro dele — a mesma consulta que já usava esse "ou" pra "lead trabalhado" (reaproveitei, sem duplicar a busca no banco: uma query só serve pras duas contas agora). Isso garante que toda reunião que virou "realizada" ou "no show" no período sempre está contada também em "marcadas" daquele período — o funil nunca mais "estoura" de novo.

Testado: reproduzi a conta em SQL (marcada dentro do mês OU call dentro do mês) — deu 6, batendo exatamente com 3 realizadas + 3 no show. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Métricas: "Produtos mais vendidos no mês"

Pedido simples: uma categoria em Métricas mostrando quais produtos mais venderam. Segui exatamente o mesmo padrão de "Canais que venderam no mês" (mesma lógica, só trocando `origem` por `produto`):

- `calcularVendasPorProduto()` em `lib/metricas.ts` — agrupa leads vendidos do mês por `produto`, soma faturamento e conta vendas. Lead vendido sem produto preenchido cai em "Sem produto" (mesmo padrão do "Sem origem" que já existia).
- Componente novo `components/vendas-por-produto.tsx`, cópia do `VendasPorCanal` com barrinha azul-céu em vez de violeta (só pra diferenciar visualmente as duas seções).
- Aparece em "Visão da equipe" (admin-only, visão de time), logo depois de "Canais que venderam".

Testado: com uma conta de teste, conferi que a seção mostrou "Treinamento comercial · 1 venda · R$10.000,00" (Thiago Souza) e "Sem produto · 1 venda · R$5.000,00" (Claudilaine, que não tinha produto registrado na importação da planilha) — batendo com os dados reais. Conta de verificação removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Números da "Performance da semana por SDR" com peso visual desigual

O Samuel reparou que os "0" da tabela "Performance da semana por SDR" pareciam ter tamanhos diferentes entre si. Conferi via inspeção direta (tamanho de fonte, altura da linha, altura da célula) e todas as células eram idênticas — não era um bug de tamanho de verdade. A causa mais provável é que números numa fonte proporcional (o padrão do navegador) podem ter peso visual/largura ligeiramente diferentes dependendo da vizinhança de caracteres, o que engana o olho numa tabela cheia de números lado a lado.

Corrigido aplicando `tabular-nums` (dígitos de largura fixa, o jeito certo de mostrar números numa tabela) em todas as células numéricas da tabela — leads, calls marcadas/realizadas, no show, vendas, taxa de venda e receita.

Testado: confirmei antes da mudança que fonte (14px), altura de linha (20px) e altura da célula (37px) já eram idênticas em todas as colunas — o ajuste é puramente de renderização dos dígitos, sem mudar nenhum dado. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — "Origem dos leads" ganha média por dia + corrige total do mês desatualizado

Dois pedidos numa tacada: mostrar a média de leads por dia ao lado do total (nas duas seções, semana e mês), e verificar se o total do mês (10) estava certo.

**Não estava.** `calcularLeadsPorOrigem()` ainda contava só por `declarado_em` — não peguei essa função quando mudei a regra de "lead trabalhado" pra incluir reunião de período anterior (2026-08-18, entrada "'Lead trabalhado' passa a contar reunião de mês anterior também"), porque na hora achei que "de onde vieram os leads" era um conceito diferente de "trabalhado". Testando de verdade, ficou claro que não faz sentido ter dois números de "leads do mês" diferentes (11 em Leads trabalhados, 10 em Origem dos leads) — o Samuel espera que os dois batam. Apliquei a mesma regra aqui: um lead conta se foi declarado no período OU teve reunião (marcada ou realizada) dentro dele. Precisou juntar duas consultas (leads declarados + reuniões do período, com a origem vindo do lead pelo `join`) num mapa só, sem duplicar quem aparece nos dois grupos.

**Média por dia**: `LeadsPorOrigem` ganhou uma prop `diasUteis` (reaproveita o mesmo `diasUteis` que `calcularMetricas()` já calculava pra "Esta semana"/"Este mês" — não criei conta nova). O cabeçalho virou "X leads/dia em média · Y leads no total", a média antes do total, na mesma linha, como pedido.

Testado: com conta de teste, "Origem dos leads — mês" passou a mostrar "11 leads no total" (SS IG foi de 5 pra 6, entrando o Paulo Ribeiro) e "0,9 leads/dia em média" antes do total. Conta de verificação removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Faturamento também aparece nas Métricas

O Samuel pediu pra ver o faturamento (não só a receita) nas Métricas. O sistema já guardava os dois valores por venda (`valor_venda` = faturamento, `receita_venda` = receita), mas só a receita aparecia no card grande de "Esta semana"/"Este mês" — faturamento não tinha lugar nenhum na tela.

Adicionei `faturamento` no tipo `Metricas` e em `calcularMetricas()` (soma de `valor_venda` das vendas do período, do jeito igual já fazia com `receita_venda`). Na tela, mantive a **Receita como o número grande principal** (é a regra do `CLAUDE.md`: a meta e o destaque sempre são sobre receita, faturamento é secundário) e coloquei "Faturamento: RX" como uma linha pequena logo abaixo, dentro do mesmo card verde.

Testado: com uma venda de teste (faturamento R$8.000, receita R$3.000 — valores propositalmente diferentes), o card mostrou "RECEITA R$3.000,00" grande e "Faturamento: R$8.000,00" pequeno embaixo, confirmando que os dois números continuam distintos e cada um aparece onde deve. Dados de teste removidos no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Nova página "Bônus SDR"

O Samuel pediu pra trazer a aba "BÔNUS SDRs" da planilha pro CRM, como item novo no menu, logo depois de "Atividades".

Abri a aba na planilha e, em vez de adivinhar a régua do bônus, cliquei em cada célula de fórmula pra ler a conta exata que o Google Sheets usa (a maioria das planilhas dele usa fórmula de verdade, não número digitado à mão). A régua real, com três blocos que se somam:

1. **Bônus por volume de calls realizadas no mês**: ≥60 calls → R$300, ≥80 → R$500, ≥100 → R$1.000 (senão R$0).
2. **R$20 por call que foi marcada num fim de semana E realizada** — o "fim de semana" aqui é o dia da **marcação** (quando o SDR agendou), não o dia da call em si. Achei essa fórmula (`DIA.DA.SEMANA` sobre a "Data de Agendamento") e seguidamente confirmei que bate com o campo `marcada_em` que já existe no nosso banco.
3. **Bônus por faturamento das vendas fechadas no mês**: ≥R$50mil → R$1.000, ≥R$80mil → R$2.000, ≥R$100mil → R$3.000 (senão R$0) — usa faturamento (`valor_venda`), não receita, exatamente como a planilha.

Detalhe que vale registrar: o "Total de bônus" da planilha do Samuel está com um erro `#REF!` agora mesmo (uma referência quebrada, provavelmente uma coluna que foi apagada e a fórmula não atualizou) — no CRM implementei o total como a soma dos três blocos (`bônus calls + bônus fim de semana + bônus faturamento`), que é claramente a intenção da fórmula original, sem herdar o bug da planilha.

**Onde os números vêm**: reaproveitei `calcularMetricasPorUsuario()` (que já calcula calls marcadas/realizadas e faturamento por SDR, já corrigido pra excluir lead arquivado e contar reunião de mês anterior) — só adicionei uma consulta nova pra contar quantas calls realizadas foram marcadas num fim de semana. Nova função `calcularBonusPorSdr()` em `lib/metricas.ts`.

**Acesso**: só admin vê essa tela (é dado de compensação da equipe, não é algo que cada SDR deveria ver dos outros) — segue o mesmo padrão de Usuários/Configurações, protegido no `middleware.ts`.

Testado: com uma conta de admin de teste, a tela mostrou "Samuel Pereira: 6 calls marcadas, 3 realizadas, 50% no-show, R$0 bônus calls (3 &lt; 60), R$0 bônus fim de semana, R$15.000 faturamento, R$0 bônus faturamento (15mil &lt; 50mil), R$0 total" — bati à mão os dias da semana das 3 reuniões realizadas (quarta, sexta, quinta — nenhuma cai em fim de semana), confirmando que o bônus de fim de semana zerado está certo, não é coincidência. Conferi também que "Bônus SDR" aparece na posição certa do menu (logo depois de "Atividades"). Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos, 17 rotas agora.

## 2026-08-18 — Design do "Bônus SDR": mesma cara das Métricas

O Samuel achou a tabela simples do Bônus SDR sem graça e pediu pra ficar bonita, igual as Métricas. Redesenhei usando a mesma linguagem visual do resto do painel:

- **Card grande no topo** com gradiente (âmbar/laranja em vez do verde-esmeralda da Receita, pra diferenciar visualmente "bônus" de "receita") mostrando o total de bônus de toda a equipe somado, com marca d'água de estrela.
- **Um card por SDR**, com o nome e o total de bônus dele em destaque no topo, depois uma grade de 4 mini-cards coloridos (mesmo estilo dos cards de "Leads trabalhados"/"Reuniões" das Métricas: ícone colorido, título pequeno, número grande) — Calls marcadas, Calls realizadas, No-show, Faturamento.
- Embaixo de cada card, o detalhamento dos três blocos de bônus (por calls, por fim de semana, por faturamento) numa lista simples, pra deixar claro de onde veio cada parte do total.

Testado: com conta de teste, o card do topo mostrou o gradiente âmbar com o total certo, e o card do Samuel Pereira mostrou os 4 mini-cards coloridos com os números batendo (6 marcadas, 3 realizadas, 50% no-show, R$15.000 faturamento) e o detalhamento dos três bônus embaixo. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Nova página "Ano" + carga histórica de janeiro a julho

O Samuel perguntou como ia controlar leads e métricas do ano inteiro e dos meses — hoje o CRM só mostra "esta semana"/"este mês", nada de ano nem meses passados. Perguntei se ele queria só os números agregados por mês ou também importar lead por lead de janeiro a julho (igual fiz com agosto) — ele escolheu só os números, mais rápido e sem risco de errar detalhe de 7 meses de planilha.

**De onde vieram os números**: baixei a aba "ANO" da planilha como CSV (mesmo truque do `gid` + `export?format=csv` que uso desde a importação de agosto) — ela já tem meta, faturamento e receita por mês, prontos, sem precisar somar nada na mão.

**Onde ficaram guardados**: criei duas colunas novas em `metas_mensais` — `faturamento_real` e `receita_real` — só preenchidas pra janeiro a julho de 2026 (os meses de antes do CRM existir, sem lead nenhum registrado). Cada mês desses ganhou uma linha com a meta (R$30.000, igual todo mês) e esses dois valores reais tirados direto da planilha.

**Como a tela decide o que mostrar**: `calcularResumoAno()` (nova, em `lib/metricas.ts`) passa pelos 12 meses do ano — se o mês tem `faturamento_real`/`receita_real` preenchido, usa esse valor fixo; senão, calcula ao vivo somando os leads vendidos daquele mês (do jeito que já faz em `calcularReceitaOrg`). Isso quer dizer que agosto em diante segue vivo, crescendo junto com o CRM sendo usado de verdade — só o passado é fixo.

**Tela nova** (`/ano`, só admin — mesma régua de "dado financeiro de time" do Bônus SDR): card grande verde-esmeralda com a receita acumulada do ano, e uma tabela mês a mês (Meta, Faturamento, Receita, Falta pra meta) com o mês atual destacado com uma etiqueta "agora".

Testado: com conta de teste, os totais acumulados batidos à mão (Receita R$66.560,00, Meta R$240.000,00, Faturamento R$178.700,00) confirmaram que a soma dos 12 meses está certa; cada linha de "Falta pra meta" bateu exatamente com a linha "Falta para a meta" da própria planilha (ex.: Janeiro R$16.290,00); Agosto apareceu com a etiqueta "agora" e os valores calculados ao vivo (R$15.000 faturamento, R$5.000 receita), batendo com o que já estava correto no resto do painel. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos, 18 rotas.

## 2026-08-18 — Ano: tira do menu lateral, vira link em Métricas + seletor de ano

Dois ajustes rápidos na tela "Ano" logo depois de criada:

1. **O Samuel achou estranho ter "Ano" fixo no menu lateral** ("parece que eu estou enchendo linguiça") — é uma tela que abre de vez em quando, não toda hora, diferente de Funil/Métricas que são usadas todo dia. Tirei do menu (`components/sidebar.tsx`) e coloquei um link "Ver o ano inteiro →" no canto de cima da tela de Métricas (só pra admin, já que `/ano` continua sendo admin-only) — mais fácil de achar quando precisa, sem ocupar espaço fixo o tempo todo.
2. **Seletor de ano** — a tela só mostrava o ano atual (2026), sem jeito de ver anos anteriores ou futuros. Adicionei `FiltroAnoSelect` (mesmo padrão do `FiltroUsuarioSelect` que já existia pro Funil), um `<select>` que navega pra `/ano?ano=X`. A tela agora lê o ano pela URL, com o ano atual como padrão quando não vem nada. O texto "até agora" no card verde e a etiqueta "agora" na linha do mês só aparecem quando o ano escolhido é o ano corrente — pra anos passados/futuros isso não faz sentido, então some sozinho.

Testado: conferi que "Ano" sumiu do menu lateral e o link novo em Métricas aponta pra `/ano`; troquei o seletor pra 2025 e a tela mudou pra "Ano 2025", tudo zerado (sem dado nesse ano, esperado) e sem a etiqueta "agora" em nenhum mês — confirmando que a lógica de "só mostra 'agora' no ano corrente" funciona. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Ano: barras de progresso em vez de tabela + link vai pro final de Métricas

O Samuel não gostou muito do visual da tela Ano ("acho que dá pra ser melhor") e pediu pra mover o link "Ver o ano inteiro" do topo de Métricas pro final da página.

- **Link movido**: saiu do `PageHeader` (topo) e foi pro fim do `<main>`, depois de todo o conteúdo de Métricas (Taxas, Visão da equipe, etc.), centralizado — mesmo texto "Ver o ano inteiro →", só mudou de lugar.
- **Redesenho da tela Ano**: troquei a tabela simples (linhas de texto) por um cartão por mês com **barra de progresso** comparando receita contra a meta — verde quando bateu, âmbar quando não. Cada cartão mostra o mês (com a etiqueta "agora" se for o mês corrente), a receita em destaque, a barra, e embaixo "Meta RX · Faturamento RY" de um lado e "Bateu a meta 🎉" ou "Falta RZ" do outro. Fica mais fácil de bater o olho e ver de cara quais meses foram bons sem precisar ler número por número.

Testado: com conta de teste, a tela mostrou as barras de janeiro a abril em âmbar (nenhum mês bateu os R$30.000 de meta ainda), com a largura proporcional certa (ex.: janeiro em ~46%, batendo com R$13.710 de R$30.000); confirmei que "Ver o ano inteiro →" aparece depois de todo o conteúdo de Métricas, não mais no topo. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Campo Closer na reunião

O Samuel pediu pra registrar quem vai fazer a reunião de venda (o Closer), separado de quem marcou a reunião (o SDR — já é o `usuario_id` da própria reunião). É a mesma distinção que a planilha dele já fazia.

- **Banco**: nova coluna `closer_id` em `reunioes`, referenciando `usuarios(id)`, opcional (pode ficar sem definir).
- **Formulário**: ao mover um lead pra "Reunião marcada", apareceu um terceiro campo (junto com "Data em que foi marcada" e "Data e hora da reunião") pra escolher o Closer, com "Ainda não definido" como opção padrão — reaproveitei o componente `ResponsavelSelect` que já existia pra Responsável.
- **Linha do tempo do lead**: quando a reunião tem Closer definido, aparece "Closer: [nome]" logo abaixo de "Marcada em".

Testado: com conta de teste, marquei uma reunião escolhendo "Samuel Pereira" como Closer — conferi direto no banco que a linha em `reunioes` gravou o `closer_id` certo, e na tela a Linha do tempo mostrou "Closer: Samuel Pereira" corretamente. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Metas e taxas do sistema viram editáveis pelo admin

Em Configurações, o card "Metas e taxas do sistema" (piso de leads/dia, piso de reuniões/dia, taxas mínimas de agendamento/comparecimento/venda) era só leitura de propósito — refletindo a regra do CLAUDE.md de que essas taxas nunca são recalculadas automaticamente por performance. O Samuel pediu pra deixar editável pelo admin, e isso não conflita com aquela regra: o sistema continua nunca ajustando os números sozinho (ex.: baixar a meta porque o mês foi bom) — só um humano, admin, decide mudar a régua manualmente, mesma lógica que a Meta de Receita mensal já tinha.

- **Banco**: a política de RLS `metas_config_por_org` (que já deixava qualquer usuário da org editar, mesmo sem UI pra isso) virou duas: `metas_config_select_org` (todo mundo vê) e `metas_config_update_admin` (só admin grava) — mesmo padrão usado em `metas_mensais` pra Meta de Receita.
- **Formulário**: os 5 campos (antes só texto) viraram inputs numéricos editáveis; taxas mostradas/editadas em % (0-100) na tela, convertidas pra fração (0-1) na gravação. Validação no server action: piso > 0, taxas entre 1% e 100%, e um segundo cheque de papel (`papel !== "admin"` barra a escrita mesmo se alguém chamar a action direto).

Testado: com conta de teste admin, mudei o piso de leads/dia de 30 pra 35 e conferi direto no banco que só esse campo mudou (os outros 4 ficaram intactos) — refeito com cuidado depois de notar, pelos logs do servidor, que o Samuel já tinha testado a mesma tela ao vivo no navegador dele antes de eu terminar de verificar, o que gerou algumas gravações extras (nada de errado, só concorrência de dois usuários mexendo ao mesmo tempo). Valores resetados pro padrão (30/3/10%/80%/40%) no final, conta de teste removida. `tsc --noEmit` e `npm run build` limpos, 18 rotas.

## 2026-08-18 — Meu perfil: mostra nome e e-mail

A tela "Meu perfil" só tinha a foto — não dava nem pra conferir o próprio nome ou e-mail cadastrado. Comparando com a documentação pública do HubSpot e do Pipedrive (só consulta, sem cadastrar nada), os dois mostram foto + nome + e-mail juntos numa área de "minha conta", com uma particularidade: e-mail de login em geral tem um cuidado a mais (muda numa tela separada ou com confirmação por trás), porque é ele que garante o acesso.

Adicionei um card "Meus dados" no topo da tela, com nome e e-mail **só leitura** por enquanto — editar de verdade (principalmente o e-mail) exigiria um fluxo de confirmação que ainda não existe, fica pra outro passo se o Samuel quiser depois.

Testado: com conta de teste, o card mostrou nome e e-mail certos, batendo com o que tava cadastrado. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos, 18 rotas.

## 2026-08-18 — Critério 1 vira "perfil do lead" mais narrativo

O Samuel queria testar juntar os 3 critérios de qualificação (problema, urgência, capacidade) num campo aberto só, pro SDR escrever livre em vez de preencher caixas separadas. Dei minha opinião antes de mexer (ele pediu sugestão, não implementação): concordo em deixar o campo do "problema" mais rico e narrativo, mas urgência e "consegue pagar" precisam continuar como campo fechado (seleção), porque o sistema depende de checar isso automaticamente no banco antes de deixar marcar reunião — com texto livre não dá pra saber com certeza se a urgência foi mencionada, e o projeto proíbe usar IA pra "adivinhar" isso (métrica sempre calculada direto no banco). Ele topou esse meio-termo.

- **Campo "Qual é o problema dele"** virou **"Me conte sobre o lead — qual é o perfil dele?"**, com 4 linhas (era 2) e um placeholder de exemplo: "qual a situação dele hoje, o que já tentou fazer pra resolver, onde quer chegar...". Continua sendo o mesmo campo de texto livre de sempre — só o convite pra escrever ficou mais completo.
- **Urgência e capacidade de pagar** continuam exatamente como estavam (seleção fechada) — não mudou nada estrutural aqui, e os 3 critérios do CLAUDE.md continuam os mesmos 3, só a forma de perguntar o primeiro ficou melhor.

Testado: com conta de teste, abri um lead existente e conferi que o novo texto do campo aparece certo, e os dois seletores de urgência/capacidade continuam do jeito de sempre. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — "Sobre o lead" com chips de exemplo e autonomia de decisão

Dois ajustes finos no card de qualificação do lead, a pedido do Samuel:

1. **Título do quadro**: "OS 3 CRITÉRIOS DE QUALIFICAÇÃO" virou **"SOBRE O LEAD"** — mais simples e conecta direto com o campo logo abaixo ("Me conte sobre o lead").
2. **Exemplo em chips**: o texto de exemplo que tava dentro do placeholder do campo virou 4 etiquetas visuais (chips) acima do campo de texto — Situação hoje, O que já tentou, Onde quer chegar, e uma nova, **Autonomia de decisão** (se o lead decide sozinho ou depende de outra pessoa pra fechar) — ideia dele, ajuda a entender se vai precisar de mais alguém na conversa antes de fechar. São só visuais (não clicáveis), o SDR ainda escreve tudo livre no campo de baixo.

Testado: com conta de teste, abri um lead existente e conferi visualmente que o título e os 4 chips aparecem certos, campo continua editável normal. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Bloqueia marcar reunião sem os 3 critérios preenchidos

Regra que já existia escrita no CLAUDE.md ("Nenhuma reunião pode ser marcada sem os três [critérios]") mas ainda não era checada em nenhum lugar do código — o Samuel pediu pra tornar obrigatório de verdade.

Em `atualizarLead` (`lib/leads/actions.ts`), quando o lead está entrando agora em "Reunião marcada" (nível mudou e o novo nível é 4), o sistema checa: perfil do lead preenchido, urgência diferente de "ainda não sei", capacidade de pagar diferente de "ainda não sei". Se faltar algum, a gravação inteira é cancelada — nada é salvo, nenhuma reunião é criada — e aparece uma mensagem dizendo exatamente o que falta (ex.: "Antes de marcar a reunião, preencha: se tem urgência, se consegue pagar."). Só entra em vigor na hora que o lead troca pra esse nível — quem já tava em "Reunião marcada" antes não é barrado por edições comuns.

Não implementei o "forçar com justificativa" que o CLAUDE.md também menciona (marcar mesmo sem qualificação, mas sinalizado como "não-qualificada" nos relatórios) — o Samuel só pediu o bloqueio simples por enquanto; fica pra depois se ele quiser essa válvula de escape.

O único lugar do painel que realmente cria uma reunião é esse formulário de editar lead — arrastar o card no Kanban pra "Reunião marcada" já redireciona pra essa mesma tela em vez de marcar direto, então não precisou mexer no drag-and-drop.

Testado: com conta e lead de teste, tentei marcar reunião sem preencher os 3 critérios — bloqueou, mensagem certa apareceu, nível continuou 2 e nenhuma reunião foi criada no banco. Preenchendo os 3 e submetendo de novo, salvou normal (nível virou 4, reunião criada). Tudo removido no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Closer da reunião marcada também pode editar o lead

O Samuel confirmou que faz sentido o Closer (quando é uma pessoa diferente do SDR responsável) conseguir editar o lead — principalmente fechar a venda — sem precisar ser admin. O lead **não muda de dono**: o SDR continua sendo o responsável (e continua contando pra métrica dele), só abre uma exceção de permissão de edição pro Closer da reunião marcada (ativa) daquele lead.

- **Banco (RLS)**: nova função `private.eh_closer_da_reuniao_ativa(lead_id)` — verifica se o usuário logado é `closer_id` de uma reunião com `status = 'marcada'` daquele lead. As políticas de UPDATE em `leads` e INSERT em `interacoes` (notas) passaram a aceitar também essa condição, além de admin/responsável.
- **Código**: `garantirPodeEditar`, `atualizarLead` e `moverLeadNivel` (em `lib/leads/actions.ts`) ganharam a mesma checagem. Na tela do lead, `podeEditar` agora também é `true` quando existe uma reunião marcada com esse usuário como `closer_id` (usa os dados que a página já buscava, sem consulta extra).
- **Bug evitado no caminho**: o texto "Responsável: Você" (que aparecia pra quem não é admin) assumia que só o próprio dono podia estar editando — com o Closer entrando nessa exceção, isso ia mostrar "Você" errado pro Closer. Corrigido pra sempre mostrar o nome de verdade do responsável.

Testado: criei um SDR e um Closer de teste (ambos não-admin, pessoas diferentes), um lead do SDR com reunião marcada pro Closer. Logado como Closer: o formulário apareceu editável (sem o aviso de "só visualização"), "Responsável" mostrou o nome certo do SDR (não "Você"), e o botão "Fechar venda" funcionou — venda registrada com sucesso e o `responsavel_id` do lead continuou sendo o SDR, sem mudar. Tudo removido no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Função do usuário (SDR / Closer)

O Samuel pediu pra poder marcar a função de cada usuário — SDR ou Closer — na tela de Usuários. É diferente do "papel" que já existia (admin/membro, que é nível de acesso ao sistema) — função é o papel da pessoa no processo comercial.

- **Banco**: nova coluna `funcao` em `usuarios` (texto, só aceita 'sdr', 'closer' ou vazio). `listar_usuarios_da_org()` e `atualizar_permissoes_usuario(...)` atualizados pra ler/gravar essa coluna.
- **Criar usuário**: novo campo "Função" (SDR / Closer / Não definida) no formulário de cadastro — vai junto pra Edge Function `criar-usuario`, que também foi atualizada e reimplantada.
- **Editar permissões**: a mesma tela onde já se troca admin/membro e páginas permitidas ganhou o seletor de função.
- **Lista de usuários**: quando a função está definida, aparece um badge verde ("SDR" ou "Closer") ao lado do badge de Administrador/Membro.

Por enquanto essa função é só um rótulo — não filtra os seletores de "Responsável" nem de "Closer" na tela do lead (ainda mostram todo mundo da org). Se o Samuel quiser, um próximo passo natural é usar essa função pra filtrar esses seletores.

Testado: com conta de teste, cadastrei um usuário novo com função SDR (gravou certo no banco e apareceu o badge na lista), depois editei as permissões dele e troquei pra Closer (o seletor já veio pré-selecionado com o valor salvo, e a troca gravou certo). Tudo removido no final. `tsc --noEmit` e `npm run build` limpos, Edge Function `criar-usuario` reimplantada.

## 2026-08-18 — Filtra Responsável/Closer pela função do usuário

Passo seguinte da função SDR/Closer (feature anterior): os seletores de "Responsável" e "Closer" no lead agora usam essa função pra filtrar quem aparece — Responsável só mostra quem tem função SDR, Closer só mostra quem tem função Closer. Antes mostravam todo mundo da equipe, misturado.

- **`ResponsavelSelect`** ganhou um prop `funcaoFiltro` ("sdr" ou "closer"). Quando usado, filtra a lista de usuários — mas **sempre mantém quem já tava selecionado**, mesmo que a função dele não bata (ou nem tenha função definida ainda). Isso evita que um lead antigo, com responsável sem função marcada, apareça com o campo vazio ou quebrado.
- Aplicado nos dois lugares: "Responsável" (em Novo lead e Editar lead) com `funcaoFiltro="sdr"`, e "Closer" (em Editar lead, ao marcar reunião) com `funcaoFiltro="closer"`.
- As páginas que alimentam esses formulários (`leads/novo`, `leads/[id]`) passaram a buscar a coluna `funcao` junto com `id, nome`.

Como quase ninguém na equipe do Samuel tem função definida ainda (é feature nova), esses seletores vão continuar curtos até ele preencher a função de cada pessoa em Usuários → Permissões.

Testado: com usuários de teste (um SDR, um Closer, um sem função nenhuma), confirmei que "Responsável" mostrou só o SDR, "Closer" mostrou só o Closer, e um lead com responsável pré-existente sem função continuou mostrando esse responsável certo (não sumiu nem quebrou). Tudo removido no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Card do lead fica vermelho sem atividade há mais de 1 dia

O Samuel pediu um sinal visual no Funil pra avisar o SDR quando um lead fica parado — sem ser movido de nível nem receber nenhuma nota.

**O que conta como "atividade"**: o mais recente entre (a) a última vez que o lead mudou de nível (`entrou_nivel_em`, já existia e já era atualizado a cada movimentação) e (b) a nota mais recente registrada nele (`interacoes.ocorreu_em`). Não precisei criar coluna nova — só juntei os dois dados que já existiam.

- Em `app/(app)/leads/page.tsx`, depois de buscar os leads do Funil, busco a interação mais recente de cada um (uma query só, agrupada em memória) e calculo `ultima_atividade_em` = a mais recente entre as duas fontes.
- Em `components/kanban-board.tsx`, cada card calcula quantos dias se passaram desde essa data. Com 1 dia ou mais, o card fica com fundo e borda vermelho-claro e mostra "X dia(s) sem atividade" embaixo do nome — assim que o lead recebe uma nota nova ou é movido de coluna, some sozinho na próxima vez que a tela carregar.
- Só vale pro Funil (`/leads`) — as telas de Base e Vendas reusam o mesmo componente de card mas não calculam isso (não faz sentido sinalizar atraso em lead que já saiu do funil ativo).

Testado: peguei um lead real, forcei no banco a última atividade dele pra 3 dias atrás (nível e nota junto) — o card ficou vermelho com "3 dias sem atividade", os outros continuaram normais. Registrei uma nota nova nele e recarreguei — voltou ao normal, sem vermelho. Desfiz as datas forçadas e removi a conta de teste no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Nível 2 e 3 usam a mesma cor do Nível 1

Ajuste visual simples no Funil: as colunas "Nível 2. Em qualificação" e "Nível 3. Topou reunião, horário a definir" usavam cores diferentes (azul e violeta) do "Nível 1" (cinza-azulado/slate). O Samuel pediu pra ficarem iguais ao Nível 1. Mudei só a função `corDoNivel()` em `lib/niveis.ts` pra devolver a cor do Nível 1 quando a coluna for 2 ou 3 — as outras colunas (Reunião marcada, No Show, etc.) não mudaram.

Testado: com conta de teste, conferi visualmente que Nível 1, 2 e 3 agora têm a mesma cor cinza-azulada, e o resto do funil (Reunião marcada em verde, etc.) continua como estava. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Nova página "Reuniões" no menu lateral

Depois de conversar sobre como CRMs como Close e Pipedrive têm uma visão dedicada só de reuniões/calls, o Samuel pediu pra construir a mesma coisa aqui. Antes, a única forma de ver uma reunião era abrindo o lead individualmente ou olhando a coluna "Reunião marcada" no Funil — não dava pra ver todas de uma vez, nem filtrar por closer.

- **Tela nova** (`/reunioes`): tabela simples com Data e hora, Lead, SDR (quem marcou a reunião), Closer (quem vai fazer a call) e Status (Marcada/Realizada/Não compareceu). Ordenada da mais recente pra mais antiga.
- **Filtro por closer**: um seletor no topo (`FiltroCloserSelect`, mesmo padrão do filtro por usuário que já existia no Funil) — só lista quem tem função Closer.
- **Página configurável**: "Reuniões" entrou na mesma lista de páginas que um admin pode liberar por usuário (`funil`, `lista`, `atividades`, `reunioes`, `métricas`) — admin vê sempre, membro só se for liberado em Usuários → Permissões. Tive que atualizar a Edge Function `criar-usuario` (lista de páginas válidas) e a função `atualizar_permissoes_usuario` no banco, além do valor padrão da coluna `paginas_permitidas`, e reimplantar a Edge Function.
- **Menu lateral**: novo item "Reuniões" com ícone de calendário, entre Atividades e Bônus SDR.

Testado: com conta de teste admin, a tela mostrou as 6 reuniões existentes com SDR/Closer/Status corretos; marquei uma reunião com um closer de teste e o filtro por closer mostrou só ela (1 reunião). Encontrei e corrigi um bug de português no contador ("6 reuniãoões" em vez de "6 reuniões") antes de fechar. Tudo removido no final. `tsc --noEmit` e `npm run build` limpos, 19 rotas.

## 2026-08-18 — Funil vira dois quadros: Pré-vendas e Vendas

Mudança grande, pedida em várias mensagens seguidas pelo Samuel: a tela "Reuniões" (que eu tinha acabado de criar como tabela) virou um quadro Kanban igual o Funil, e o Funil foi dividido em dois:

- **Pré-vendas** (era "Funil", continua em `/leads`): Leads, Sem conversa iniciada, Em qualificação, Topou reunião sem horário, **e No Show** — quando o lead não comparece, ele volta pra cá, pro SDR tentar remarcar. Território do SDR.
- **Vendas** (era "Reuniões", em `/reunioes`, agora logo abaixo de Pré-vendas no menu): Reunião marcada e Oportunidades para o fim do mês. Território do Closer.

**A regra mais importante**: quando o lead sai de "Reunião marcada" e entra em "Oportunidades" (ou seja, a reunião foi realizada), o **responsável pelo lead muda automaticamente pro Closer** que fez a call — antes disso o lead continua do SDR (inclusive se levar No Show, continua do SDR). Isso bateu num problema técnico: a política de segurança do banco (RLS) não deixa ninguém, fora admin, transferir um lead pra OUTRA pessoa — então criei uma função no banco (`transferir_lead_para_closer`, com suas próprias checagens de permissão por dentro) que faz essa troca específica com privilégio elevado, chamada automaticamente pelo código sempre que essa transição acontece. Também corrigi um bug que eu mesmo ia introduzir: o formulário de editar lead, se eu não tomasse cuidado, sobrescreveria essa troca automática com o valor antigo do campo "Responsável" no mesmo salvamento — agora ele pula esse campo especificamente nessa transição.

**Técnico**: os dois quadros reusam o mesmo componente `KanbanBoard` de sempre (só filtram quais níveis aparecem em cada um — `NIVEIS_PRE_VENDAS = [0,1,2,3,5]` e `NIVEIS_VENDAS = [4,6]`, em `lib/niveis.ts`), então arrastar card, cores, aviso de "sem atividade" etc. funcionam igual nos dois. A tabela de reuniões que eu tinha acabado de fazer (com filtro por closer) foi substituída por esse Kanban — não ficou nas duas formas.

Testado: com contas e leads de teste, confirmei que Pré-vendas só mostra os níveis antes da reunião + No Show, e Vendas só mostra Reunião marcada + Oportunidades. Movi um lead de "Reunião marcada" pra "Oportunidades" pelo formulário — o responsável trocou automaticamente pro Closer certo, e a reunião ficou "realizada". Movi outro lead pra "No Show" — o responsável continuou com o SDR, sem trocar. Tudo removido no final. `tsc --noEmit` e `npm run build` limpos, 19 rotas.

## 2026-08-18 — Correção: "Reunião marcada" aparece nos dois quadros

Ajuste rápido depois de eu ter dividido o funil: o Samuel esclareceu que "Reunião marcada" não devia sair do Pré-vendas — ela continua lá (o SDR quer ver o compromisso que marcou), logo antes do No Show, **e também** aparece no Vendas (fila do Closer). Só um lead que já teve a reunião realizada (entrou em Oportunidades, e o responsável já virou o Closer) sai de vez do Pré-vendas.

Mudei só `NIVEIS_PRE_VENDAS` em `lib/niveis.ts` de `[0,1,2,3,5]` pra `[0,1,2,3,4,5]` — Vendas (`[4,6]`) não mudou. Como os dois quadros usam a mesma consulta ordenada por `ordem`, "Reunião marcada" já cai automaticamente entre "Topou reunião" e "No Show", sem precisar reordenar nada.

Testado: com conta de teste, o Pré-vendas mostrou a coluna "Reunião marcada" na posição certa (vazia, nenhum lead lá no momento), e o Vendas continuou mostrando "Reunião marcada" + "Oportunidades" normalmente. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Menu volta a chamar "Leads" + numeração corrigida no Vendas

Dois ajustes rápidos depois da divisão em Pré-vendas/Vendas:

1. **Nome no menu**: o Samuel pediu pra voltar a chamar de "Leads" (em vez de "Pré-vendas") no menu lateral, no título da página e no checkbox de permissões — "Vendas" continua com esse nome.
2. **Numeração errada no quadro Vendas**: a coluna "Oportunidades para o fim do mês" estava aparecendo como "NÍVEL 1" no quadro Vendas, porque a numeração era calculada só com os níveis daquele quadro (que ali é só o segundo nível da lista). Corrigido pra calcular a numeração usando TODOS os níveis (a lista completa, sem filtrar), e só depois decidir quais colunas aparecem em cada quadro — agora mostra "NÍVEL 5", que é o número certo, contínuo com o Leads/Pré-vendas.

Testado: com conta de teste, confirmei que o menu mostra "Leads" e que o quadro Vendas mostra "NÍVEL 5. Oportunidades para o fim do mês" corretamente. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.

## 2026-08-18 — Coluna "Oportunidades futuras" (verde) dentro de Vendas

Terceira peça da divisão do funil: dentro de "Oportunidades para o fim do mês" (nível 6), o Samuel queria separar visualmente quem já fez a reunião, é ICP qualificado, mas avisou que só fecha depois (não é pra fechar esse mês) — ele confirmou que não é um nível novo de verdade, é só uma divisão visual dentro do mesmo nível.

- **Banco**: nova coluna `leads.oportunidade_futura` (boolean, default false). `nivel_ordem` continua 6 pros dois casos — não mexe em relatório nem em nenhuma métrica existente.
- **Quadro Vendas**: a coluna "Oportunidades" virou duas na tela — "Oportunidades para o fim do mês" (de sempre) e uma nova "Oportunidades futuras", em verde, só quando `oportunidade_futura = true`. Essa segunda coluna é sintética (não existe na tabela `niveis` do banco) — só serve pra desenhar o Kanban, criada em `lib/niveis.ts` como `NIVEL_OPORTUNIDADE_FUTURA`/`ORDEM_OPORTUNIDADE_FUTURA` (usei o número 1006, bem fora da faixa real, só pra não colidir com nenhum nível de verdade).
- **Duas formas de marcar**, como o Samuel pediu: **arrastar o card** pra essa coluna no Kanban (o `moverLeadNivel` reconhece esse ordem especial e só liga a marcação, sem tocar no nível de verdade), ou **abrir o lead e marcar um checkbox** que só aparece quando o nível selecionado é "Oportunidades" — ambos os caminhos levam ao mesmo lugar.

Testado: com conta de teste, marquei o checkbox num lead que já estava em Oportunidades — o nível continuou 6, a marcação virou `true`, e o card foi pra coluna verde nova no quadro Vendas. Desmarquei de novo — voltou pra coluna normal. Conta de teste removida no final. `tsc --noEmit` e `npm run build` limpos.
