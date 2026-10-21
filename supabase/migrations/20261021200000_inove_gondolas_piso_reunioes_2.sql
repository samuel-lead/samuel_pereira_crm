-- Samuel (21/10/26): na Inove Gôndolas o piso de reuniões por dia continua e
-- vale 2. (Leads por dia e taxa de agendamento seguem fora das metas.)
update public.metas_config set piso_reunioes_dia = 2
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
