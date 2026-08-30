-- Nova categoria de "Base de leads": lead que iniciou conversa mas
-- respondeu explicitamente que não tinha interesse — diferente de
-- "qualificou_sumiu" (foi qualificado e desapareceu sem responder).
alter table public.leads drop constraint leads_motivo_base_check;

alter table public.leads
  add constraint leads_motivo_base_check
  check (
    motivo_base is null or motivo_base = any (array[
      'nao_iniciou_conversa',
      'qualificou_sumiu',
      'nao_reagendados',
      'proposta_nao_comprou',
      'iniciou_sem_interesse'
    ])
  );
