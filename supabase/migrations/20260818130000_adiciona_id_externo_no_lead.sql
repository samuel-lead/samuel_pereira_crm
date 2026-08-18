-- Guarda o ID que a integração de origem (Facebook Lead Ads, Google Ads,
-- etc.) usou pra identificar esse lead — é a chave de idempotência: se o
-- provedor reenviar o mesmo aviso duas vezes, não duplica o lead.
alter table public.leads
  add column id_externo text;

create unique index leads_id_externo_key
  on public.leads (id_externo)
  where id_externo is not null;
