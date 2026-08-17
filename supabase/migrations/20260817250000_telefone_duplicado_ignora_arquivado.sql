-- A trava de "telefone duplicado" contava lead arquivado (excluído) como se
-- ainda existisse, bloqueando recadastrar o mesmo número depois de excluir.
-- Troca a constraint por um índice único que só olha leads ativos.

alter table public.leads
  drop constraint leads_usuario_id_telefone_e164_key;

create unique index leads_usuario_telefone_ativo_idx
  on public.leads (usuario_id, telefone_e164)
  where arquivado_em is null;
