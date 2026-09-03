-- Link do Instagram da empresa, usado no botão "Seguir no Instagram" da
-- tela final da isca quando o lead é "só cadastro" (sem material pra
-- liberar). Um link só vale pra todas as iscas dessa empresa — igual já
-- funciona com os pixels de rastreamento.
alter table public.orgs add column if not exists instagram_url text;

-- Extende a função que já existia (buscar_pixels_org) pra também devolver
-- o instagram_url — ela já resolve org por slug de isca pra visitante
-- anônimo, sem precisar de outra função nova pra isso.
drop function if exists public.buscar_pixels_org(text);

create function public.buscar_pixels_org(p_slug text)
returns table(meta_pixel_id text, google_tag_id text, instagram_url text)
language sql
security definer
set search_path to 'public'
as $function$
  select o.meta_pixel_id, o.google_tag_id, o.instagram_url
  from iscas i
  join orgs o on o.id = i.org_id
  where i.slug = p_slug and i.ativo = true and i.arquivado_em is null
  limit 1;
$function$;

-- Preenche o Instagram da própria empresa do Samuel (mentoria) — só a
-- dele por enquanto, conforme pedido.
update public.orgs
set instagram_url = 'https://instagram.com/sousamuelpereira'
where id = 'a26cfaff-8e96-4300-87c2-8fc527ef755c';
