-- Samuel pediu pra deixar claro o que é "No Show" direto no nome da
-- coluna: "(Marcou reunião e sumiu)" — ou "visita" pra quem é imobiliário.
-- Usa ordem = 5 (não o texto do nome) porque uma das orgs já tinha "No-show"
-- com grafia diferente das outras.
update public.niveis n
set
  nome = n.nome || ' (Marcou ' || (case when o.publico = 'imobiliario' then 'visita' else 'reunião' end) || ' e sumiu)',
  etiqueta_wpp = n.etiqueta_wpp || ' (Marcou ' || (case when o.publico = 'imobiliario' then 'visita' else 'reunião' end) || ' e sumiu)'
from public.orgs o
where n.org_id = o.id
  and n.ordem = 5;
