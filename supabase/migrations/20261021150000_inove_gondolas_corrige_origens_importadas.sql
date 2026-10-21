-- Samuel (21/10/26): a importação da Inove Gôndolas gravou a RAZÃO SOCIAL de
-- cada empresa como ORIGEM do lead (e criou ~595 "origens" lixo). Conserto dos
-- dados: todos os leads da empresa ficam com a origem "Lista de leads", as
-- origens lixo (criadas hoje) saem do cadastro, as 2 linhas de cabeçalho
-- ("Nome Fantasia") importadas como lead são arquivadas e telefones inválidos
-- (CNPJ no lugar do telefone) ficam vazios. O código da importação foi
-- corrigido junto (só nome, telefone e origem explícita seguem da planilha).
update public.leads set arquivado_em = now()
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and nome = 'Nome Fantasia' and arquivado_em is null;

update public.leads set telefone_e164 = null
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and arquivado_em is null
  and telefone_e164 is not null and telefone_e164 !~ '^55[0-9]{10,11}$';

update public.leads set origem = 'Lista de leads'
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and origem is distinct from 'Lista de leads';

delete from public.origens
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and nome <> 'Lista de leads'
  and created_at >= '2026-10-21 03:00+00';
