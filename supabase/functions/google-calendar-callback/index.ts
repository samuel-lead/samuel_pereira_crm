// Segundo passo da conexão: o Google chama essa URL de volta depois que
// a pessoa autoriza (ou recusa). Troca o "code" pelos tokens de verdade
// e guarda em google_calendar_conexoes. verify_jwt desligado de
// propósito — quem chama aqui é o servidor do Google, não o navegador
// logado no CRM.

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAINEL_URL = "https://sousamuelpereira.com.br/integracoes/google-calendar";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const orgId = url.searchParams.get("state");
  const erroGoogle = url.searchParams.get("error");

  if (erroGoogle) {
    return Response.redirect(`${PAINEL_URL}?erro=${encodeURIComponent(erroGoogle)}`, 302);
  }

  if (!code || !orgId) {
    return Response.redirect(`${PAINEL_URL}?erro=parametros_invalidos`, 302);
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!clientId || !clientSecret) {
    return Response.redirect(`${PAINEL_URL}?erro=chaves_nao_configuradas`, 302);
  }

  const redirectUri =
    "https://hgloheptxqdjpwzgquku.supabase.co/functions/v1/google-calendar-callback";

  const respostaToken = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const dadosToken = await respostaToken.json();

  if (!respostaToken.ok || !dadosToken.access_token || !dadosToken.refresh_token) {
    // Sem refresh_token normalmente quer dizer que essa conta já tinha
    // autorizado antes e o Google não manda de novo — precisaria revogar
    // o acesso em myaccount.google.com/permissions e tentar de novo.
    const motivo = dadosToken.error_description ?? dadosToken.error ?? "sem_refresh_token";
    return Response.redirect(`${PAINEL_URL}?erro=${encodeURIComponent(motivo)}`, 302);
  }

  const expiraEm = new Date(Date.now() + dadosToken.expires_in * 1000).toISOString();
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { error } = await supabaseAdmin.from("google_calendar_conexoes").upsert(
    {
      org_id: orgId,
      access_token: dadosToken.access_token,
      refresh_token: dadosToken.refresh_token,
      expira_em: expiraEm,
    },
    { onConflict: "org_id" }
  );

  if (error) {
    return Response.redirect(`${PAINEL_URL}?erro=${encodeURIComponent(error.message)}`, 302);
  }

  return Response.redirect(`${PAINEL_URL}?conectado=1`, 302);
});
