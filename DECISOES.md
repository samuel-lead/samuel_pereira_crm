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
