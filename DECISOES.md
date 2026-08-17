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
