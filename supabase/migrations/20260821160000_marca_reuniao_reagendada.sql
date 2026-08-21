-- Toda vez que um lead reentra em "Reunião marcada" (ex.: veio de um
-- No-show e vai ser remarcado), o sistema cria uma linha nova em `reunioes`
-- — idêntica, em formato, à primeira reunião de verdade do lead. Isso
-- inflava "calls marcadas hoje" contando reagendamento como call nova.
-- Esse flag marca quando a reunião é um reagendamento (o lead já tinha
-- pelo menos uma reunião anterior), pra separar dos dois nos relatórios.

alter table public.reunioes
  add column reagendada boolean not null default false;
