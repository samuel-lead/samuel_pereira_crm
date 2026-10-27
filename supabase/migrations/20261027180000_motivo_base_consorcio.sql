-- Banker - Consorcio: três motivos novos de ir pra Base (Samuel, 27/10/26).
alter table public.leads drop constraint leads_motivo_base_check;

alter table public.leads
  add constraint leads_motivo_base_check
  check (
    motivo_base is null or motivo_base = any (array[
      'nao_iniciou_conversa',
      'qualificou_sumiu',
      'nao_reagendados',
      'proposta_nao_comprou',
      'iniciou_sem_interesse',
      'desqualificado',
      'farming',
      'sem_condicao_pagar',
      'comprou_concorrente',
      'numero_invalido'
    ])
  );
