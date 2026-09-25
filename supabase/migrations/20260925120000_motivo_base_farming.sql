-- Nova coluna "Farming" na Base de leads: o motivo_base 'farming' precisa
-- ser aceito pela trava de segurança (check constraint) do banco.
alter table public.leads
  drop constraint leads_motivo_base_check;

alter table public.leads
  add constraint leads_motivo_base_check
  check (
    motivo_base is null
    or motivo_base = any (array[
      'nao_iniciou_conversa',
      'qualificou_sumiu',
      'nao_reagendados',
      'proposta_nao_comprou',
      'iniciou_sem_interesse',
      'desqualificado',
      'farming'
    ])
  );
