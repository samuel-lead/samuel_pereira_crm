-- Funil Farming (Samuel, 17/11/26).
-- 1) Lead do Farming só fica no funil enquanto está nas etapas 0 a 3 (Leads, Sem
--    conversa iniciada, Conversando, Adicionado no grupo). Se for pra qualquer
--    outro nível (reunião marcada = Vendas, ou Base), sai do Farming sozinho.
create or replace function public.sair_do_farming_ao_avancar()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.funil = 'farming' and new.nivel_ordem not in (0, 1, 2, 3) then
    new.funil := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sair_do_farming on public.leads;
create trigger trg_sair_do_farming
  before update of nivel_ordem on public.leads
  for each row execute function public.sair_do_farming_ao_avancar();

-- 2) Lead do Farming parado não gera aviso de "lead parado" (WhatsApp e sino):
--    o Farming é lista de reativação, ficar parado ali é normal.
do $$
declare d text;
begin
  select pg_get_functiondef('public.notificar_leads_parados'::regproc) into d;
  if position('l.funil is null' in d) = 0 then
    d := replace(d, 'and l.nivel_ordem <> 9', 'and l.nivel_ordem <> 9 and l.funil is null');
    execute d;
  end if;

  select pg_get_functiondef('public.listar_notificacoes'::regproc) into d;
  if position('l.funil is null' in d) = 0 then
    d := replace(d, 'and l.nivel_ordem <> 9', 'and l.nivel_ordem <> 9 and l.funil is null');
    execute d;
  end if;
end $$;
