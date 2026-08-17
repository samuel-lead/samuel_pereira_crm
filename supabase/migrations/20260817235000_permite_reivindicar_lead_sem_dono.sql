-- Lead sem responsável (ex.: chegou de uma campanha de tráfego, sem dono
-- definido) pode ser "pego" por qualquer usuário com acesso ao Funil — não
-- só por admin. Uma vez que já tem responsável, só admin reatribui.

alter policy "leads_update_dono_ou_admin" on public.leads
  using (
    org_id = private.current_org_id()
    and (private.eh_admin() or responsavel_id = auth.uid() or responsavel_id is null)
  )
  with check (
    org_id = private.current_org_id()
    and (private.eh_admin() or responsavel_id = auth.uid())
  );
