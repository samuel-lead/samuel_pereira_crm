-- Samuel (21/10/26): a Inove Gôndolas vende gôndolas pra lojas e supermercados,
-- então a parte "Sobre o lead" (perfil, urgência, capacidade) do card usa
-- perguntas do mercado de gôndolas. Liga/desliga por empresa.
alter table public.orgs add column mercado_gondolas boolean not null default false;

update public.orgs set mercado_gondolas = true where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
