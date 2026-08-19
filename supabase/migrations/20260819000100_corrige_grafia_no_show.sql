-- Ortografia correta do estrangeirismo, segundo o VOLP: "no-show" (com
-- hífen), não "No Show". Ajusta o nome do nível 5 em todas as orgs.
update public.niveis
set nome = 'No-show', etiqueta_wpp = 'No-show'
where ordem = 5 and nome = 'No Show';
