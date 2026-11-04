-- Inove Gôndolas (Samuel, 04/11/26): o funil não tem reunião marcada.
-- Pré-vendas: Novos Leads → Sem conversa iniciada → Em qualificação.
-- Depois o SDR "envia pro Elton" (closer) e o lead cai em Vendas:
--   3 "Topou reunião, horário a definir" → "Novo para o Elton"
--   4 "Reuniões marcadas"                 → "Em negociação"
--   7 "Follow após reunião"               → "Proposta enviada"
-- 5 (No-show), 6 (Precisa reagendar) e 8 (Oportunidades) continuam na tabela
-- (nada é apagado), mas o painel não mostra mais — todos sem lead hoje.
-- Os leads que já estavam nos níveis 3 e 4 não são movidos: só mudam de nome.
-- Só mexe nos níveis da Inove Gôndolas, nenhuma outra empresa.

update public.niveis
set nome = 'Novo para o Elton',
    definicao = 'Lead qualificado pelo SDR e enviado para o Elton; ele ainda não começou a negociar',
    etiqueta_wpp = 'Novo para o Elton'
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 3;

update public.niveis
set nome = 'Em negociação',
    definicao = 'O Elton está conversando e negociando com o lead',
    etiqueta_wpp = 'Em negociação'
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 4;

update public.niveis
set nome = 'Proposta enviada',
    definicao = 'Proposta enviada ao lead; aguardando a resposta',
    etiqueta_wpp = 'Proposta enviada'
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 7;

-- Os níveis escondidos saem da numeração, senão "Base" ficaria com um salto
-- (N6 logo depois de N3). Fica N1, N2, N3 e Base como N4.
update public.niveis
set numerado = false
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem in (5, 8);
