-- Samuel (admin) precisa ver se os SDRs estão usando a "Minha rotina" e
-- marcando os checks. Até aqui só cada pessoa enxergava as próprias
-- linhas de rotina_diaria_status (a policy "por_usuario" filtra por
-- usuario_id = quem está logado), então o admin abria a tela e via tudo em
-- branco do SDR. Esta policy NOVA é só de leitura: o admin da mesma
-- empresa enxerga as linhas de todo mundo da org. Escrever continua só
-- nas próprias linhas (a policy antiga segue valendo pra isso).
create policy rotina_diaria_status_admin_le
  on public.rotina_diaria_status
  for select
  using (org_id = private.current_org_id() and private.eh_admin());
