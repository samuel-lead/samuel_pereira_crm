-- Libera "excluidos" como valor válido de leads.reativado_origem — usado
-- pelo selo "Lead excluído reativado" quando um lead volta da aba
-- Excluídos pra Novos Leads (ver reativarLeadExcluido em lib/leads/actions.ts).
alter table public.leads drop constraint leads_reativado_origem_check;

alter table public.leads add constraint leads_reativado_origem_check
  check (reativado_origem = any (array['base'::text, 'repescagem_icp'::text, 'excluidos'::text]));
