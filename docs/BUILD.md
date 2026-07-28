# BUILD.md — Especificação de execução
### Meu Vendedor · V1

> **Para o Claude Code.** Leia este arquivo inteiro antes de escrever qualquer linha.
> Leia também `CLAUDE.md` (constituição) e `PRD-meu-vendedor.md` (produto).
> Execute as fases **em ordem**. Não pule. Não agrupe.

---

## COMO VOCÊ DEVE TRABALHAR

1. Execute **uma tarefa por vez**, na ordem numérica.
2. Ao terminar cada tarefa: rode o **teste de aceite**, faça **um commit** em português, e explique em **português simples** o que fez.
3. Se o teste de aceite falhar: **pare, conserte, teste de novo.** Não avance.
4. Quando encontrar um **🛑 CHECKPOINT HUMANO**: pare, diga exatamente o que o Samuel precisa fazer e onde clicar, e espere a resposta dele.
5. Fora dos checkpoints, **não peça permissão** — execute.
6. Se uma decisão técnica não estiver especificada aqui, escolha a opção mais simples, siga em frente e registre a escolha em `DECISOES.md`.

**Convenções:** TypeScript · nomes de tabela e coluna em `snake_case` português · migrations em `supabase/migrations/` com timestamp · nunca editar migration já aplicada.

---

## VARIÁVEIS DE AMBIENTE

Crie `.env.example` com estas chaves (valores vazios) e garanta `.env` no `.gitignore`:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ZAPI_INSTANCIA_A=
ZAPI_TOKEN_A=
ZAPI_CLIENT_TOKEN_A=
ZAPI_INSTANCIA_B=
ZAPI_TOKEN_B=
ZAPI_CLIENT_TOKEN_B=

ANTHROPIC_API_KEY=

WEBHOOK_SEGREDO=
TIMEZONE_PADRAO=America/Sao_Paulo
```

`WEBHOOK_SEGREDO` é um token que você gera e coloca na query string do webhook, pra recusar chamadas que não vieram da Z-API.

---

# FASE 0 — Fundação do repositório

### Tarefa 0.1 — Estrutura
Crie a estrutura, `.gitignore` (com `.env`, `node_modules`, `.vercel`), `README.md` curto, `DECISOES.md` vazio e `.env.example`.

```
/supabase/migrations/
/supabase/functions/
/painel/            (Next.js, fase 7)
/docs/
```

**✅ Aceite:** `git status` limpo; `.env` não aparece no rastreamento.

### 🛑 CHECKPOINT HUMANO 0.A
Peça ao Samuel: criar projeto no Supabase, criar 2 instâncias na Z-API (número A = chip novo do assistente; número B = número comercial dele), pegar a chave da Anthropic, e preencher o `.env`. Diga exatamente onde cada chave fica em cada painel.

---

# FASE 1 — O banco

### Tarefa 1.1 — Migration inicial

Crie a migration com as tabelas abaixo. **RLS habilitada em todas**, com policy que só permite linhas do `org_id` do usuário autenticado. `created_at`/`updated_at` em tudo, com trigger de `updated_at`.

```sql
orgs
  id uuid pk default gen_random_uuid()
  nome text not null
  vocabulario_encontro text not null default 'reunião'
  criterio_1_label text not null default 'Qual é o problema dele'
  criterio_2_label text not null default 'Tem urgência em resolver'
  criterio_3_label text not null default 'Consegue pagar a solução'
  ticket_medio_padrao numeric

usuarios
  id uuid pk references auth.users(id)
  org_id uuid not null references orgs
  nome text not null
  wpp_assistente_e164 text        -- Canal A
  wpp_comercial_e164 text         -- Canal B
  timezone text not null default 'America/Sao_Paulo'

metas_config
  id uuid pk
  org_id, usuario_id
  piso_leads_dia int not null default 30
  piso_reunioes_dia int not null default 3
  taxa_agendamento_min numeric not null default 0.10
  taxa_comparecimento_min numeric not null default 0.80
  taxa_venda_min numeric not null default 0.40
  vigente_desde date not null default current_date

metas_mensais
  id uuid pk
  org_id, usuario_id
  ano int not null, mes int not null
  meta_receita numeric
  meta_vendas int
  ticket_medio numeric not null
  dias_uteis int not null
  vendas_necessarias int
  reunioes_realizadas_necessarias int
  reunioes_marcadas_necessarias int
  leads_necessarios int
  meta_leads_dia_derivada int
  meta_leads_dia_efetiva int      -- MAIOR(piso, derivada)
  travada_em timestamptz
  unique (usuario_id, ano, mes)

niveis
  id uuid pk
  org_id
  ordem int not null check (ordem between 1 and 6)
  nome text not null
  definicao text not null
  prazo_dias int                  -- 5 no nível 1, null nos outros
  destino_ao_estourar int         -- 6 no nível 1
  etiqueta_wpp text
  unique (org_id, ordem)

leads
  id uuid pk
  org_id, usuario_id
  nome text not null
  telefone_e164 text
  origem text
  nivel_ordem int not null default 1
  criterio_problema text
  criterio_urgencia text check (in ('alta','media','baixa','desconhecida')) default 'desconhecida'
  criterio_capacidade text check (in ('sim','nao','parcial','desconhecida')) default 'desconhecida'
  qualificado_em timestamptz
  declarado_em timestamptz not null default now()   -- é o que conta como "lead trabalhado"
  entrou_nivel_em timestamptz not null default now()
  ultimo_contato_em timestamptz
  proximo_follow_em timestamptz
  status text not null default 'ativo' check (in ('ativo','vendido','perdido'))
  valor_venda numeric
  vendido_em timestamptz
  arquivado_em timestamptz        -- soft delete
  unique (usuario_id, telefone_e164)

nivel_historico
  id uuid pk
  org_id, lead_id
  de_ordem int, para_ordem int not null
  motivo text
  automatico boolean not null default false
  ocorreu_em timestamptz not null default now()

interacoes
  id uuid pk
  org_id, usuario_id, lead_id
  tipo text check (in ('mensagem','ligacao','reuniao','nota'))
  direcao text check (in ('entrada','saida'))
  canal text check (in ('A','B','manual'))
  conteudo text
  ocorreu_em timestamptz not null
  origem text check (in ('observado','declarado'))

reunioes
  id uuid pk
  org_id, usuario_id, lead_id
  agendada_para timestamptz not null
  status text not null default 'marcada'
        check (in ('marcada','realizada','nao_compareceu','cancelada'))
  resultado text check (in ('vendeu','nao_vendeu','remarcou'))
  valor numeric
  qualificada boolean not null default true
  justificativa_forcada text
  marcada_em timestamptz not null default now()

mensagens_brutas
  id uuid pk
  org_id
  canal text not null check (in ('A','B'))
  provider_message_id text not null unique      -- IDEMPOTÊNCIA
  telefone_e164 text
  payload jsonb not null
  recebido_em timestamptz not null default now()
  processado_em timestamptz
  erro text

comandos
  id uuid pk
  org_id, usuario_id
  mensagem_bruta_id uuid references mensagens_brutas
  texto_original text
  transcricao text
  intencao text
  ferramentas jsonb
  resposta text
```

**Índices:** `leads(usuario_id, proximo_follow_em)` · `leads(usuario_id, nivel_ordem)` · `leads(usuario_id, declarado_em)` · `interacoes(lead_id, ocorreu_em desc)` · `reunioes(usuario_id, agendada_para)` · `mensagens_brutas(processado_em) where processado_em is null`

**✅ Aceite:** as 12 tabelas aparecem no Table Editor do Supabase; `select` sem autenticação retorna vazio em todas.

### Tarefa 1.2 — Seed
Popule os 6 níveis conforme o PRD (nível 1 com `prazo_dias = 5` e `destino_ao_estourar = 6`), crie a org do Samuel, o `metas_config` com os valores padrão, e o usuário.

**✅ Aceite:** `niveis` tem 6 linhas com os nomes corretos; `metas_config` tem 30/3/0.10/0.80/0.40.

### Tarefa 1.3 — Teste de RLS
Escreva um teste automatizado que cria duas orgs e prova que uma **não consegue** ler leads da outra.

**✅ Aceite:** o teste passa provando o bloqueio. Se conseguir ler, **pare tudo** — não avance com segurança aberta.

---

# FASE 2 — Ingestão

### Tarefa 2.1 — Edge Function `webhook-zapi`

Fluxo obrigatório, nesta ordem:
1. Valida `WEBHOOK_SEGREDO` na query string; se inválido, 401
2. **Responde 200 imediatamente**
3. Só então grava em `mensagens_brutas` com o payload cru e o canal (A ou B)
4. Se `provider_message_id` já existir, ignora sem erro
5. Erro de gravação é logado, nunca derruba a função

Não interprete o conteúdo nesta tarefa.

**✅ Aceite:** POST manual com payload de exemplo cria 1 linha; o mesmo POST repetido continua com 1 linha.

### Tarefa 2.2 — Worker `processar-mensagem`
Pega mensagens com `processado_em is null`, processa em ordem, marca como processada. Falha grava em `erro` e não trava a fila.

### 🛑 CHECKPOINT HUMANO 2.A
Dê ao Samuel a URL das funções e o passo a passo (com o que procurar na tela) pra apontar o webhook das duas instâncias Z-API.

**✅ Aceite da Fase 2 — teste real:** Samuel manda mensagem pro número A pelo celular e a linha aparece em `mensagens_brutas`. Manda a mesma duas vezes: continua uma linha só.

---

# FASE 3 — O agente

### Tarefa 3.1 — Transcrição de áudio
Mensagem de áudio no Canal A: baixa o arquivo pela Z-API, transcreve **no servidor**, salva em `comandos.transcricao`. Nunca no navegador.

### Tarefa 3.2 — O loop do agente

Crie a Edge Function `agente` com Claude API e tool calling. **O agente nunca escreve SQL** — só chama ferramentas.

Ferramentas do V1 (implemente todas nesta fase, com stubs para as que dependem de fases futuras):

| Ferramenta | Assinatura |
|---|---|
| `declarar_lead` | `(nome, telefone?, origem?, contexto?)` → cria no nível 1 |
| `declarar_leads_lote` | `(leads[])` |
| `buscar_lead` | `(termo)` → retorna candidatos para desambiguação |
| `atualizar_lead` | `(lead_id, campos)` |
| `registrar_criterio` | `(lead_id, criterio: 1\|2\|3, valor)` |
| `mover_nivel` | `(lead_id, para_ordem, motivo, automatico)` |
| `registrar_interacao` | `(lead_id, tipo, conteudo, ocorreu_em)` |
| `marcar_reuniao` | `(lead_id, quando, forcar?, justificativa?)` — **GATE, fase 5** |
| `atualizar_reuniao` | `(reuniao_id, status, resultado?, valor?)` |
| `consultar_metricas` | `(inicio, fim)` — **SQL puro, fase 6** |
| `consultar_progresso_meta` | `(ano, mes)` — fase 6 |
| `definir_meta_mensal` | `(ano, mes, meta_receita?, meta_vendas?, ticket_medio?)` — fase 6 |
| `listar_follows_pendentes` | `()` |
| `listar_leads` | `(filtros)` |
| `criar_lembrete` | `(quando, texto, lead_id?)` |

**Regras do agente:**
- Resposta de 3 a 4 linhas, **uma pergunta por vez**
- Nome ambíguo → chama `buscar_lead` e pergunta qual
- Falta dado essencial → grava o que tem e pergunta **uma** coisa
- Toda chamada de ferramenta registrada em `comandos.ferramentas`

### Tarefa 3.3 — Eco de confirmação
O agente **não grava direto**. Monta o resumo, manda pro Samuel, e só grava depois do "sim". Correção → ajusta e confirma de novo. Guarde a intenção pendente no banco, **não** no contexto do modelo.

### Tarefa 3.4 — Resposta pelo Canal A
Envia a resposta de volta pela Z-API na instância A.

**✅ Aceite da Fase 3 — o marco do projeto:**
1. Samuel manda áudio: *"capturei o Marcos, dono de imobiliária em Goiânia, problema de conversão do time, telefone 62 99999-9999"*
2. Recebe: *"Anotei: Marcos, dono de imobiliária, problema de conversão. Nível 1. Confirma?"*
3. Responde *"sim"*
4. O lead está em `leads`, nível 1, com `declarado_em` preenchido

---

# FASE 4 — Motor dos 6 níveis

### Tarefa 4.1 — Movimentação e histórico
`mover_nivel` grava `nivel_historico` e atualiza `entrou_nivel_em`. Reversão por voz (*"volta o Marcos pro 2"*) funciona e também grava histórico.

### Tarefa 4.2 — Regra dos 5 dias
Job `pg_cron` diário (08:00 no fuso do usuário): todo lead no nível 1 com `entrou_nivel_em` há mais de `niveis.prazo_dias` vai pro nível 6, `automatico = true`. Manda resumo no Canal A. **Não apaga nada.**

**✅ Aceite:** criar lead de teste com `entrou_nivel_em` antigo, rodar o job, ver o lead no 6, o histórico gravado e a mensagem chegando.

### Tarefa 4.3 — Etiquetas Z-API
Sincroniza `nivel_ordem` com as etiquetas do WhatsApp Business via Z-API. Banco é a fonte da verdade. Etiqueta mudada na mão no celular → o sistema detecta e **pergunta** se atualiza o nível.

---

# FASE 5 — Gate de qualificação

### Tarefa 5.1
`marcar_reuniao` **falha** se `criterio_problema` for nulo, ou `criterio_urgencia`/`criterio_capacidade` forem `'desconhecida'`. A mensagem de erro diz **qual falta** e sugere como levantar.

### Tarefa 5.2
`forcar: true` exige `justificativa` não-vazia, grava `qualificada = false`, e o agente avisa que a reunião entrou como não-qualificada.

**✅ Aceite:** tentar marcar reunião com lead sem critérios → barrado com mensagem clara. Forçar sem justificativa → barrado. Forçar com justificativa → cria com `qualificada = false`.

---

# FASE 6 — Métricas e meta mensal

### Tarefa 6.1 — As métricas em SQL
Crie views/funções SQL. **Nenhum cálculo pelo modelo de IA.**

```
leads_trabalhados      = count(leads) por declarado_em no período
reunioes_marcadas      = count(reunioes) por marcada_em
reunioes_realizadas    = count(reunioes) status = 'realizada'
vendas                 = count(leads) status = 'vendido' por vendido_em
receita                = sum(valor_venda)

taxa_agendamento   = reunioes_marcadas / leads_trabalhados
taxa_comparecimento = reunioes_realizadas / reunioes_marcadas
taxa_venda         = vendas / reunioes_realizadas
```

Retorne também o comparativo com o período anterior de mesmo tamanho. Se `leads_trabalhados < 20`, marque o resultado como amostra insuficiente e o agente avisa em vez de diagnosticar.

### Tarefa 6.2 — Meta mensal
`definir_meta_mensal` calcula e **congela** em `metas_mensais`:

```
vendas_necessarias              = ceil(meta_receita / ticket_medio)
reunioes_realizadas_necessarias = ceil(vendas_necessarias / 0.40)
reunioes_marcadas_necessarias   = ceil(reunioes_realizadas_necessarias / 0.80)
leads_necessarios               = ceil(reunioes_marcadas_necessarias / 0.10)
meta_leads_dia_derivada         = ceil(leads_necessarios / dias_uteis)
meta_leads_dia_efetiva          = MAX(piso_leads_dia, meta_leads_dia_derivada)
```

- Ticket médio: se `metas_mensais` anteriores tiverem vendas, calcula pela média real e informa qual usou; senão, pergunta
- **Nunca** grave `meta_leads_dia_efetiva` abaixo do piso
- Alterar meta travada exige comando explícito e grava histórico

### Tarefa 6.3 — Progresso
`consultar_progresso_meta` retorna: realizado até hoje, projeção no ritmo atual, dias úteis restantes, e **quantos leads/dia os dias restantes exigem** pra bater a meta. Isso recalcula **esforço**, nunca a meta.

**✅ Aceite:** com meta de R$50.000 e ticket R$5.000 em mês de 22 dias úteis, o sistema grava `meta_leads_dia_derivada = 15` e `meta_leads_dia_efetiva = 30` (o piso venceu).

---

# FASE 7 — Painel (Vercel)

Next.js App Router + TypeScript + Supabase Auth. Login com e-mail e senha. Leitura **e escrita**, tudo via RLS com a `anon key`. `service_role` nunca aparece aqui.

Telas: Visão geral (as 4 métricas, progresso da meta, piso do dia) · Leads por nível, com filtro e edição · Reuniões, separando qualificadas de não-qualificadas · Follows vencidos · Histórico de metas.

**✅ Aceite:** abrir do celular, logar, editar um lead na mão e ver a mudança refletida quando perguntar pelo WhatsApp.

---

# FASE 8 — Rotinas (pg_cron)

| Job | Quando | Conteúdo |
|---|---|---|
| `briefing_manha` | 07:00 | Follows vencidos, reuniões do dia, meta de leads do dia, quanto falta da meta do mês |
| `fechamento_dia` | 18:30 | *"Quantos leads você trabalhou hoje?"* — aceita resposta em lote por áudio |
| `cobranca_meio_semana` | Qui 10:00 | Número realizado vs. meta + pergunta. Nunca julgamento |
| `relatorio_semanal` | Dom 18:00 | As 4 métricas, comparativo, gargalo, plano dos 7 dias |
| `virada_mes` | Dia 1, 08:00 | *"Virou o mês. Qual a meta de receita de [mês]?"* |
| `regra_5_dias` | 08:00 | Já feito na Fase 4 |

---

# FASE 9 — Movimentação automática lendo o Canal B

> A tarefa mais difícil do projeto. Só depois de tudo acima estável.

Analisa as conversas do Canal B e move os níveis conforme a tabela do `CLAUDE.md`.
- `1→2`, `2→3`, `1→6`: move e **avisa**
- `3→4`, `4→5`, `5→venda/6`: **pergunta antes**
- Atualiza `ultimo_contato_em` a cada mensagem observada
- Cria `interacoes` com `origem = 'observado'`
- Modo sombra primeiro: por 3 dias, registra o que **teria** feito sem executar, e manda o resumo pro Samuel conferir

**✅ Aceite:** no modo sombra, as sugestões batem com o julgamento do Samuel em pelo menos 8 de 10 casos antes de ativar de verdade.

---

# FASES 10 a 14 — Depois dos 30 dias de uso

Não construa sem o Samuel pedir. Estão no PRD, seção 13.

10. Diagnóstico de gargalo + análise de atendimento
11. Campos customizados, menu configurável, respostas automáticas
12. **30 dias de uso real** — corte o que não for usado
13. Área de aulas + tradução V2 (reunião → visita, critérios de imóvel)
14. Visão de gestor + integrações com CRM de imobiliária

---

## LEMBRETES FINAIS

- Explique tudo em português simples. O Samuel não lê código
- Teste de aceite falhou = pare e conserte
- Na dúvida entre duas soluções, escolha a mais simples e registre em `DECISOES.md`
- **Nunca** escreva "visita" no lugar de "reunião"
- **Nunca** ajuste meta pra baixo
