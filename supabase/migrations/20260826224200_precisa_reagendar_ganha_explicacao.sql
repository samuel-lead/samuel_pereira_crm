-- Mesmo tratamento do "No-show (Marcou reunião e sumiu)": explica o que
-- "Precisa reagendar" significa direto no nome da coluna.
update public.niveis n
set
  nome = n.nome || ' (Marcou ' || (case when o.publico = 'imobiliario' then 'visita' else 'reunião' end) || ' e pediu para trocar horário)',
  etiqueta_wpp = n.etiqueta_wpp || ' (Marcou ' || (case when o.publico = 'imobiliario' then 'visita' else 'reunião' end) || ' e pediu para trocar horário)'
from public.orgs o
where n.org_id = o.id
  and n.ordem = 6;
