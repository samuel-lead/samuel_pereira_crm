# PRD — "Meu Vendedor"
### CRM comercial auto-gerenciado por WhatsApp

**Versão:** 1.0
**Autor:** Samuel Pereira
**Usuário do V1:** Samuel Pereira, vendendo mentoria para corretores de imóveis
**Stack:** Claude Code + GitHub · Supabase · Z-API · Vercel · Claude API

---

## 1. Sumário executivo

Um CRM em que o usuário gerencia toda a operação comercial **por comando de voz e texto no WhatsApp**. Um agente de IA interpreta o comando, executa a ação no banco e responde. Existe um painel web completo e editável, mas o WhatsApp é o caminho principal.

O sistema não é passivo: ele lê as conversas com os leads, move o funil sozinho, cobra metas fixas, calcula as taxas reais e aponta onde está o gargalo.

**V1 é para o Samuel**, vendendo mentoria. O corretor vem no V2 e a imobiliária no V3 — como configuração, não como reescrita.

---

## 2. O problema

Quem vende — corretor de imóvel ou mentor de corretor — erra em três pontos que se retroalimentam:

1. **Não tem clareza dos números.** Perguntado "com quantos leads você trabalhou esse mês?", responde por achismo. Sem número não sabe onde está o gargalo. Acha que o problema é fechamento e quase sempre é qualificação.
2. **Não gerencia o lead.** Não é falta de conhecimento, é fricção. CRM tradicional é trabalho extra que não devolve nada.
3. **Não faz atendimento, faz agendamento.** Leva todo mundo pra reunião e qualifica lá. Agenda cheia, venda vazia.

**Tese central:** o gargalo não é conhecimento, é fricção e falta de cobrança. Software resolve isso melhor do que aula resolve — e por isso a aula continua existindo dentro do sistema, ligada ao gargalo detectado.

---

## 3. Estratégia de versões

O que muda entre versões é **configuração, não código**. É o princípio de engenharia mais importante do projeto.

| | **V1 — agora** | **V2** | **V3** |
|---|---|---|---|
| Usuário | Samuel | Corretor individual | Gestor + time |
| Vende | Mentoria | Imóvel | — |
| Encontro se chama | **Reunião** | Visita | — |
| Critério 1 | Qual é o problema dele | Que imóvel ele quer | — |
| Critério 2 | Tem urgência em resolver | Quer comprar agora | — |
| Critério 3 | Consegue pagar a solução | Consegue pagar o imóvel | — |
| Entra | — | Área de aulas | Visão de gestor, integrações |

Na prática: a tabela `orgs` guarda o vocabulário e os rótulos dos 3 critérios. Migrar do V1 pro V2 é trocar texto no banco.

---

## 4. Os 7 níveis — espinha dorsal

Todo lead vive em exatamente um nível.

| Nível | Nome | Definição | Prazo |
|---|---|---|---|
| **1** | Sem conversa iniciada | Mandei mensagem; o lead só visualizou, não respondeu, ou respondeu só "boa tarde" sem engatar | **5 dias** → vai pro 7 |
| **2** | Em qualificação | Conversa engatou, atendimento rolando, levantando os 3 critérios | — |
| **3** | Topou reunião, sem horário | Qualificado e aceitou reunir, mas dia e hora não definidos | — |
| **4** | Reunião marcada | Dia e hora definidos | — |
| **5** | No Show | A reunião estava marcada e o lead não compareceu | — |
| **6** | Reunião feita, sem fechar | Reuniu, proposta na mesa, não comprou ainda | — |
| **7** | **Base** | Passou por todo o processo e não virou nada. Também recebe os do nível 1 que estouraram os 5 dias | Reaquecimento |

### Movimentação automática

O Samuel **declara** o lead. Depois disso ele não move nada na mão — o sistema lê a conversa no Canal B e move sozinho.

| Transição | Gatilho | Comportamento |
|---|---|---|
| 1 → 2 | Conversa engatou de verdade | Move e **avisa** |
| 2 → 3 | Qualificado e topou reunir, sem horário | Move e **avisa** |
| 3 → 4 | Dia e hora definidos | **Confirma antes** (consequência de agenda) |
| 4 → 5 | A reunião aconteceu e o lead não apareceu | **Confirma antes** (afeta taxa de comparecimento) |
| 4 → 6 | A reunião aconteceu | **Confirma antes** (afeta taxa de comparecimento) |
| 6 → venda / 7 | Fechou ou não fechou | **Confirma antes** (afeta receita) |
| 1 → 7 | 5 dias sem engatar | Move e **avisa** |

Movimento automático **avisa**, não pede permissão — senão vira o trabalho manual que o produto existe pra eliminar. Tudo reversível por voz: *"volta o Marcos pro 2"*.

### Etiquetas no WhatsApp

O nível espelha a etiqueta do WhatsApp Business via Z-API. O Samuel abre o WhatsApp e vê o nível na própria lista de conversas.
- Banco é a fonte da verdade; a etiqueta segue o banco
- Etiqueta alterada na mão → o sistema detecta e pergunta se atualiza o nível

---

## 5. Qualificação — os 3 critérios

Nenhuma reunião pode ser marcada sem os três preenchidos:

1. **Qual é o problema dele** / o que ele quer resolver
2. **Tem urgência** em resolver agora
3. **Consegue pagar** pela solução

Este é o mecanismo central do produto — a metodologia deixando de ser aula e virando trava de sistema.

- `marcar_reuniao` **falha** se algum critério estiver vazio
- Ao falhar, o agente diz qual falta e como levantar
- Dá pra forçar com justificativa explícita, mas a reunião fica marcada como **não-qualificada** e aparece separada em todo relatório

---

## 6. Métricas, taxas e metas

### 6.1 As taxas são constantes do sistema

| Taxa | Cálculo | Mínimo |
|---|---|---|
| **Agendamento** | Reuniões marcadas ÷ leads trabalhados | **10%** |
| **Comparecimento** | Reuniões realizadas ÷ reuniões marcadas | **80%** |
| **Venda** | Vendas ÷ reuniões realizadas | **40%** |

Nunca mudam. Não são recalculadas por performance.

### 6.2 O piso fixo de volume

| | Por dia útil | Por semana |
|---|---|---|
| **Leads trabalhados** | 30 | 150 |
| **Reuniões marcadas** | 3 | 15 |

**"Lead trabalhado" = o lead que o Samuel declara pelo WhatsApp.** Não é contato tentado nem contato respondido. A declaração é o que conta.

O piso é **chão, nunca teto**. Taxa melhor significa mais reuniões, não menos trabalho.

### 6.3 A meta mensal de receita

Todo virar de mês o sistema pergunta:

> *"Virou o mês. Qual a meta de receita de agosto?"*

O Samuel responde (`"50 mil"` ou `"10 vendas"`). O sistema volta pela cadeia de taxas fixas:

```
Meta de receita
   ÷ ticket médio            →  vendas necessárias
   ÷ 40%  (venda)            →  reuniões realizadas
   ÷ 80%  (comparecimento)   →  reuniões marcadas
   ÷ 10%  (agendamento)      →  leads trabalhados
   ÷ dias úteis do mês       →  meta diária
```

**Ticket médio:** no mês 1 o sistema pergunta. Depois calcula sozinho pelas vendas fechadas e mostra qual está usando. O Samuel pode sobrescrever.

### 6.4 Regra de conflito

```
meta_diaria_efetiva = MAIOR( piso fixo , derivado da meta do mês )
```

A meta do mês só empurra pra **cima**. Se a conta der 15 e o piso é 30, vale 30. Se der 45, vale 45.

### 6.5 Duas coisas que parecem iguais e não são

| ❌ Proibido | ✅ Obrigatório |
|---|---|
| Baixar a meta porque a taxa melhorou | Recalcular quanto falta com os dias que sobram |

Exemplo do permitido, no meio do mês:
> *"Dia 12. R$18k fechados. Nesse ritmo o mês fecha em R$33k. Pra chegar nos 50k, os 10 dias úteis restantes pedem 42 leads/dia em vez de 30."*

Isso recalcula **esforço**. A meta continua 50k.

- Meta do mês trava depois de definida; alterar exige comando explícito e fica registrado
- Histórico de metas por mês, com realizado vs. meta

### 6.6 Motor de diagnóstico

| Sintoma | Diagnóstico | Onde corrigir |
|---|---|---|
| Agendamento < 10% | **Atendimento / qualificação** | Como aborda, qualifica e convida |
| Comparecimento < 80% | **Qualidade do agendamento** | Marcou sem os 3 critérios, ou não confirmou |
| Venda < 40% | **A reunião em si** | Condução, proposta, fechamento |
| Leads/dia < 30 | **Volume** | Prospecção |

Isto é o "você acha que seu problema é fechamento, mas é outro" virando código.

---

## 7. Princípios do sistema

**P1 — O agente não improvisa resposta pro lead.**
Resposta automática existe e é configurável: regra montada pelo Samuel, texto escrito por ele. O que o agente não faz é inventar resposta por conta própria em conversa aberta. Sugere, o Samuel aprova, ou a regra pré-configurada dispara.

**P2 — WhatsApp é o caminho principal, painel é o caminho completo.**
Tudo que dá pra fazer no painel dá pra fazer pelo WhatsApp. Os dois escrevem no mesmo banco.

**P3 — Toda escrita vinda do WhatsApp tem eco de confirmação.**
`"Anotei: Marcos, dono de imobiliária, quer escalar time, urgência alta. Nível 1. Certo?"` Nada entra silenciosamente. Nada é apagado automaticamente, nunca.

**P4 — O agente nunca inventa número.**
Métrica é consulta SQL, não é o modelo calculando. Sem dado suficiente, o agente diz que não tem.

**P5 — Cobrança é número + pergunta, nunca julgamento.**
❌ *"Você está muito atrasado."*
✅ *"Quinta-feira, 14 leads. A meta é 30/dia. O que travou?"*

**P6 — Resposta curta.**
3 a 4 linhas, **uma pergunta por vez**. Relatório que o Samuel pediu pode ser longo — ele pediu, ele quer ler.

Ruim: *"Registrei o João, nível 2. Quer agendar follow? Você tem 4 vencidos hoje, quer ver? Sua taxa caiu 3%, quer que eu analise?"*
Bom: *"João salvo, nível 2. Follow em 2 dias. Quer ver os 4 vencidos de hoje?"*

---

## 8. Os dois canais de WhatsApp

**Canal A — Número do assistente** (chip novo). Onde o Samuel conversa com o sistema: declara lead, pede relatório, pede análise, recebe briefing e cobrança.

**Canal B — Número comercial do Samuel.** Onde ele fala com os leads de verdade. O sistema lê para: detectar lead novo, atualizar último contato, mover nível, detectar follow parado, alimentar análise de atendimento e disparar respostas automáticas configuradas.

Separar os dois elimina a maior confusão possível: saber se uma mensagem é **comando** ou **conversa com lead**.

---

## 9. Requisitos

### P0 — Fundação

| # | Requisito |
|---|---|
| **R1** | Declaração de lead por voz/texto, individual e em lote, com eco de confirmação |
| **R2** | **Gate de qualificação** — reunião só com os 3 critérios; forçar exige justificativa e marca como não-qualificada |
| **R3** | Atualização por linguagem natural, com desambiguação quando o nome for ambíguo |
| **R4** | Consulta de números por voz, calculada em SQL, com comparativo de período |
| **R5** | Ingestão à prova de falha: 200 imediato, payload cru salvo, idempotência por `provider_message_id` |
| **R6** | Motor dos 6 níveis: movimentação manual e automática, histórico, regra dos 5 dias, etiquetas Z-API |
| **R7** | Meta mensal: pergunta na virada, cadeia reversa, regra do maior, travamento e histórico |
| **R8** | Painel web com login, editável, RLS por org |

### P1 — CRM completo

| # | Requisito |
|---|---|
| **R9** | Campos customizados criados pelo usuário sem programar |
| **R10** | Menu, etiquetas, filtros salvos e ordenação configuráveis, alteráveis por voz |
| **R11** | Respostas automáticas por origem/campanha, texto escrito pelo Samuel, log de disparos, desligar geral |
| **R12** | Rotinas: briefing da manhã, fechamento do dia, cobrança de meio de semana, relatório semanal, virada de mês |
| **R13** | Follow inteligente a partir do Canal B, priorizado por nível + urgência + capacidade |
| **R14** | Diagnóstico de gargalo contra as taxas mínimas |
| **R15** | Análise de atendimento: máximo 3 pontos, com exemplo do que deveria ter sido dito |
| **R16** | Área de aulas ligada a nível e gargalo, entregue por link no WhatsApp |

### P2 — Arquitetar agora, construir depois

| # | Requisito |
|---|---|
| **R17** | Visão de gestor: métricas por corretor, ranking, onde cada um erra, comparativo com a média |
| **R18** | Integração com CRM de imobiliária (Vista, Jetimob, Kenlo) — camada de conector isolada desde já |

---

## 10. O banco de dados, explicado do zero

> Assume que você nunca mexeu com banco de dados.

Um banco é um **gaveteiro**. Cada **gaveta** guarda um tipo de coisa. Dentro tem **fichas**, e cada ficha tem **campos**.

- **Tabela** = gaveta · **Registro** = ficha · **Coluna** = campo · **ID** = número único da ficha

Você poderia jogar tudo numa ficha gigante por lead, mas aí a ficha de quem você falou 40 vezes fica ilegível, não dá pra contar nada, e um erro estraga o resto. Por isso: **o lead é uma ficha, cada conversa é outra ficha em gaveta própria**, carregando o número da ficha do lead. Isso é "relacionamento" — um papel apontando pro outro por número.

| Gaveta | O que guarda |
|---|---|
| `orgs` | A empresa dona dos dados. No V1 é só você. É o que permite uma imobiliária inteira usar depois sem misturar |
| `usuarios` | Quem usa. Nome, os dois números, fuso |
| `metas_config` | O piso fixo e as três taxas mínimas |
| `metas_mensais` | A meta de receita de cada mês e tudo que sai dela |
| `niveis` | Os 6 níveis, com definição e prazo |
| `leads` | A pessoa: nome, telefone, nível, os 3 critérios, últimos contatos |
| `nivel_historico` | Cada movimentação: de onde, pra onde, quando, manual ou automática |
| `interacoes` | Cada conversa, ligação, reunião ou anotação |
| `reunioes` | Data, status, resultado, valor |
| `mensagens_brutas` | Tudo que a Z-API manda, cru, sem tratar |
| `comandos` | O que você falou e o que o agente fez — pra auditar quando errar |

### Duas decisões que parecem chatas e não são

**A gaveta `mensagens_brutas`.** Se o sistema tentar processar na hora e estiver com problema, a mensagem se perde pra sempre. Então ele **primeiro guarda cru** e responde "recebi"; processa depois com calma. É guardar a nota fiscal antes de lançar no caixa.

**Não deixar cadastrar a mesma mensagem duas vezes.** A Z-API às vezes reenvia a mesma mensagem (proposital, garante que nada se perca). Sem proteção, isso cria **dois leads iguais** — e você perde a confiança no sistema no primeiro mês. Cada mensagem tem um código único e a gaveta **recusa** ficha repetida. Chama *idempotência*.

### A segurança que não pode faltar

Toda ficha carrega de quem ela é (`org_id`, `usuario_id`), e o banco é configurado pra ninguém conseguir ler ficha que não é sua. Chama **RLS**. Fazer desde a primeira tabela custa 10 minutos; fazer depois custa reescrever.

---

## 11. A arquitetura, explicada do zero

> Pense num restaurante.

| Restaurante | Sistema | O que faz |
|---|---|---|
| **Garçom** | Z-API | Pega o pedido na mesa (WhatsApp) e leva pra cozinha |
| **Janela do balcão** | Webhook (Edge Function) | Recebe, grita "anotado!" e prende no varal. **Não cozinha** — por isso nunca trava |
| **Varal de comandas** | Fila | Pedidos esperam a vez, em ordem |
| **Chef** | Agente (Claude) | Lê a comanda e decide o que fazer |
| **Panelas do chef** | Ferramentas | Lista **fixa** de ações. O chef não inventa panela nem entra no estoque |
| **Estoque** | Postgres (Supabase) | Onde tudo fica guardado |
| **Despertador** | pg_cron | Toca 7h e manda fazer o briefing |
| **Salão** | Vercel | Onde você senta, olha tudo e mexe na mão |

### O caminho de um pedido

Você manda áudio: *"capturei o Marcos, dono de imobiliária, problema de conversão"*

1. Z-API entrega no sistema
2. Webhook guarda cru e responde na hora
3. Um processo pega da fila e transcreve
4. O agente entende: "lead novo"
5. Usa a ferramenta `declarar_lead` — não escreve no banco direto
6. A ficha entra em `leads`, nível 1
7. Volta no WhatsApp: *"Marcos salvo, nível 1. Me passa o telefone?"*

### Três decisões e o motivo

**Um backend só.** Supabase é o cérebro, Vercel só mostra a tela. Regra dividida nos dois = corrigir bug em dois lugares pra sempre.

**A IA não faz conta.** "Quantos leads trabalhei" é respondido pelo banco. Modelo de IA erra conta e chuta com confiança. Banco não chuta.

**A IA não escreve no banco livremente.** Só usa ferramentas da lista. É a diferença entre dar a chave do estoque pro chef e passar os ingredientes pela janela.

---

## 12. Métricas de sucesso do V1

O teste é: **você usa sozinho, sem se forçar, por 30 dias.**

**Primeiras 2 semanas**
- Uso em 5 dias/semana
- 100% dos leads declarados no mesmo dia
- Declaração de lead em menos de 30 segundos
- Zero escrita errada que passou sem o eco pegar

**30 dias**
- Qualquer pergunta sobre o funil respondida em menos de 10 segundos, com número certo
- Piso de 30 leads/dia sustentado por 4 semanas
- Você prefere o sistema ao que usava antes, sem "só hoje eu anoto no papel"

**Critério de parada:** se você parar 3 dias seguidos sem motivo externo, o problema é o produto. Investigar antes de construir mais.

---

## 13. Roadmap

| Fase | Escopo |
|---|---|
| 0 | Setup, chaves, `CLAUDE.md` |
| 1 | Banco + RLS + seed |
| 2 | Ingestão Z-API à prova de falha |
| 3 | Agente + primeira ferramenta + eco |
| 4 | Motor dos 6 níveis + regra dos 5 dias + etiquetas |
| 5 | Gate de qualificação |
| 6 | Métricas + meta mensal |
| 7 | Painel Vercel com login |
| 8 | Rotinas automáticas |
| 9 | Movimentação automática lendo Canal B |
| 10 | Diagnóstico + análise de atendimento |
| 11 | CRM completo: campos, menu, respostas automáticas |
| 12 | 30 dias de uso real |
| 13 | Área de aulas + tradução V2 |
| 14 | Gestor + integrações |

---

## 14. Perguntas abertas

**Respondidas ✅**
- 4ª métrica → leads trabalhados, piso fixo de 30/dia
- "Lead trabalhado" → o lead que o Samuel declara pelo WhatsApp
- Meta mensal → informada na virada, taxas fixas, regra do maior

**Em aberto — não bloqueiam a Fase 0:**
1. **Ticket médio** da mentoria (o sistema pergunta no mês 1, mas saber antes ajuda a validar a cadeia)
2. Os 3 critérios são sim/não ou têm gradação (alta/média/baixa)?
3. Rubrica de análise de atendimento — quais itens a metodologia avalia?
4. Cadência de follow dos níveis 2 a 5 (o 1 já tem: 5 dias)
5. Prazo máximo no nível 5 antes de ir pra base?
6. O que caracteriza "conversa engatou" no gatilho 1 → 2 — quantidade de mensagens do lead, ou conteúdo?

---

## 15. Riscos

| Risco | Mitigação |
|---|---|
| Bloqueio de número pela Z-API | Aceito no V1. Canal B majoritariamente leitura, sem disparo em massa, backup periódico. Reavaliar antes do V2 |
| Você mesmo não usar | É o que o V1 testa. Critério de parada na seção 12 |
| Escrita errada no CRM pela IA | P3 — eco de confirmação obrigatório |
| Custo de IA por mensagem | Métrica em SQL; IA só em interpretação e texto |
| Reescrita ao entrar o corretor no V2 | Vocabulário e rótulos configuráveis por org desde o dia 1 |
| Reescrita ao entrar a imobiliária no V3 | `org_id` + RLS desde a primeira tabela |
