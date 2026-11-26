-- Inove Gôndolas (Samuel, 26/11/26): abordagem só vai até o dia 3. Níveis 13 e 14 estavam vazios (0 leads, 0 histórico).
delete from public.niveis
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a'
  and ordem in (13, 14)
  and not exists (select 1 from public.leads l where l.org_id = niveis.org_id and l.nivel_ordem in (13, 14));
