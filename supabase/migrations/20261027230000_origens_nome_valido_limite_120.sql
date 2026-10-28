-- Samuel (27/10/26): a trava de 22/10 limitava o nome da origem a 60 letras, mas
-- o nome automático da isca "Aula" ("Isca: " + nome da isca) tem 63 — todo lead
-- novo dessa isca falhava desde 22/10. Limite sobe pra 120; o resto da regra
-- (sem data, hora ou só número) continua igual.
alter table public.origens drop constraint origens_nome_valido;
alter table public.origens add constraint origens_nome_valido check (
  length(btrim(nome)) >= 1 and length(btrim(nome)) <= 120
  and nome !~ '^[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}$'
  and nome !~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$'
  and nome !~ '^[0-9.,/[:space:]-]+$'
) not valid;
