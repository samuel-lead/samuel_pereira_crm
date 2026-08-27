-- Samuel quer a grafia sempre "No-show" (com hífen), igual já estava em
-- uma das orgs. Normaliza o "No Show" (sem hífen) das outras pra bater.
update public.niveis
set
  nome = replace(nome, 'No Show', 'No-show'),
  etiqueta_wpp = replace(etiqueta_wpp, 'No Show', 'No-show')
where ordem = 5
  and nome like 'No Show%';
