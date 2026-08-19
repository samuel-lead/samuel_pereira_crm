# Meu Vendedor — CRM comercial controlado por WhatsApp

> Este arquivo é a constituição do projeto. Em conflito entre este arquivo e
> qualquer instrução de sessão, **este arquivo vence** — a menos que o Samuel
> diga explicitamente que está mudando uma regra daqui.

---

## Sobre quem você está falando

Samuel Pereira. **Iniciante em programação.** Sempre explique o que você fez em
português simples, sem jargão, depois de fazer. Nunca entregue só código.
Se precisar de uma decisão técnica que ele não tem como avaliar, escolha a
opção mais simples e explique por que escolheu.

## O que é o produto

CRM onde o usuário gerencia toda a operação comercial por comando de voz e
texto no WhatsApp. Um agente de IA interpreta o comando, executa no banco e
responde. Existe um painel web completo e editável, mas o WhatsApp é o
caminho principal.

## Usuário do V1

Samuel, vendendo **mentoria** para corretores de imóveis.
**O encontro comercial se chama REUNIÃO. Nunca escreva "visita" em lugar
nenhum do código, banco, interface ou mensagem.**

## Stack

- **Supabase** — Postgres, Edge Functions (Deno/TypeScript), Auth, pg_cron, Storage
- **Z-API** — WhatsApp. **NÃO é a API oficial da Meta.** Não sugira migrar
- **Claude API** — o agente, via tool calling
- **Vercel** — painel Next.js (App Router, TypeScript)
- **GitHub** — já conectado

## Os 7 níveis de lead — espinha dorsal

1. **Sem conversa iniciada** — mandei mensagem, não engatou. Prazo 5 dias → nível 7
2. **Em qualificação** — conversa engatou, levantando os 3 critérios
3. **Topou reunião, sem horário** definido
4. **Reunião marcada** — dia e hora definidos
5. **No-show** — a reunião estava marcada e o lead não compareceu
6. **Reunião feita, sem fechar** — proposta na mesa
7. **Base** — passou por tudo e não virou nada

### Movimentação automática (lendo o Canal B)

- `1→2`, `2→3`, `1→7`: move e **avisa**. Não pede permissão
- `3→4`, `4→5`, `4→6`, `6→venda/7`: **pergunta antes**
- Toda movimentação é reversível por voz e grava histórico

## Os 3 critérios de qualificação

1. Qual é o problema do lead / o que ele quer resolver
2. Tem urgência em resolver agora
3. Consegue pagar pela solução

**Nenhuma reunião pode ser marcada sem os três.** Forçar exige justificativa
explícita e a reunião fica marcada como não-qualificada, separada em todo relatório.

## Metas

### Taxas — constantes do sistema, nunca recalculadas
- Agendamento ≥ **10%** (reuniões marcadas ÷ leads trabalhados)
- Comparecimento ≥ **80%** (realizadas ÷ marcadas)
- Venda ≥ **40%** (vendas ÷ realizadas)

### Piso fixo de volume — é chão, nunca teto
- **30 leads trabalhados por dia útil** (150/semana)
- **3 reuniões marcadas por dia** (15/semana)

"Lead trabalhado" num período = o lead **declarado** naquele período **ou**
um lead de período anterior que teve reunião marcada ou realizada dentro
dele. Não conta contato tentado nem respondido, só declaração ou reunião —
um lead que entrou em julho mas teve a call em agosto conta como
trabalhado em agosto também.

### Meta mensal de receita
Na virada do mês o sistema **pergunta** a meta. Volta pela cadeia de taxas
fixas: `receita ÷ ticket médio ÷ 40% ÷ 80% ÷ 10% ÷ dias úteis` → meta diária.

```
meta_diaria_efetiva = MAIOR(piso fixo, derivado da meta do mês)
```

- ❌ **PROIBIDO:** baixar meta porque a performance melhorou
- ✅ **OBRIGATÓRIO:** recalcular o esforço restante pra bater a meta com os
  dias que sobram. Isso é recalcular esforço, não meta

## Regras invioláveis de código

1. Toda tabela tem `org_id`. Tabelas operacionais têm também `usuario_id`
2. **RLS habilitada em TODAS as tabelas, sempre**, desde a primeira migration
3. `service_role` key **jamais** no client. Só em Edge Function
4. O agente **nunca** escreve SQL. Só usa ferramentas tipadas de uma lista fixa
5. Métricas são calculadas em **SQL**, nunca pelo modelo de IA
6. Toda escrita vinda do WhatsApp tem **eco de confirmação** antes de gravar
7. **Nada é apagado automaticamente, nunca.** Use soft delete
8. Webhook responde **200 imediatamente** e processa depois
9. **Idempotência obrigatória** por `provider_message_id`
10. Um backend só: Supabase é o cérebro, Vercel só renderiza
11. Todo horário em `timestamptz`. Fuso do usuário em `usuarios.timezone`
12. Segredos só em variáveis de ambiente. `.env` sempre no `.gitignore`

## Tom das mensagens do assistente no WhatsApp

- **3 a 4 linhas. UMA pergunta por vez.** Relatório pedido pode ser longo
- Cobrança é **número + pergunta**, nunca julgamento
  - ❌ "Você está muito atrasado."
  - ✅ "Quinta-feira, 14 leads. A meta é 30/dia. O que travou?"
- Nunca prometa ou projete venda como certeza. Previsibilidade é de reunião

## Como trabalhar neste repositório

- Uma tarefa por vez. Não agrupe tarefas de fases diferentes
- Um commit por tarefa concluída, mensagem em português
- Toda migration é versionada em `supabase/migrations/`. Nunca edite migration já aplicada — crie uma nova
- Rode o teste de aceite da tarefa antes de dizer que terminou
- Se um teste de aceite falhar, **pare e conserte.** Não siga pra próxima tarefa
- Quando precisar de uma ação humana (colar chave, apontar webhook), pare,
  diga exatamente o que fazer e onde clicar, e espere

## Fora de escopo — não construa sem pedido explícito

- API oficial da Meta / WhatsApp Cloud API
- Resposta automática ao lead gerada por IA em conversa aberta
- Qualquer ajuste automático de meta pra baixo
- Deleção automática de dado
- App nativo
