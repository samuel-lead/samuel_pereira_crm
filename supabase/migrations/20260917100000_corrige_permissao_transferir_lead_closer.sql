-- Bug real: transferir_lead_para_closer() é chamada exatamente no
-- momento em que a reunião VIRA "realizada" (marcarVendido já atualiza
-- reunioes.status pra 'realizada' antes de chamar essa function) — mas
-- eh_closer_da_reuniao_ativa() só reconhecia o closer enquanto o status
-- ainda era 'marcada'. Resultado: o closer nunca passava na checagem de
-- permissão (não é admin, não é o responsável atual — é o SDR — e não
-- "é closer de reunião marcada" porque ela.já virou realizada), a
-- function levantava exceção, e como o código que chama isso não conferia
-- o erro do RPC, a falha ficava invisível: a venda era registrada
-- normalmente, só o lead continuava com o SDR como responsável em vez de
-- passar pro Closer. Samuel pegou isso ao vivo com uma venda da
-- Elizabeth aparecendo como SDR *e* Closer ao mesmo tempo.
create or replace function private.eh_closer_da_reuniao_ativa(p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.reunioes
    where lead_id = p_lead_id
      and closer_id = auth.uid()
      and status in ('marcada', 'realizada')
  )
$$;
