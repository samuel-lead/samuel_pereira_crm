-- notificar_lead_atribuido só deve rodar como gatilho da tabela leads,
-- nunca chamada direto por um usuário via RPC.
revoke all on function public.notificar_lead_atribuido() from public, anon, authenticated;
