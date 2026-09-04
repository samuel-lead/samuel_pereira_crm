-- A trava de segurança do banco (check constraint) que valida motivo_base
-- ainda não conhecia o novo motivo "desqualificado" — travava com "new row
-- for relation leads violates check constraint" na hora de salvar.
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
      'desqualificado'
    ])
  );
