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
