// Primeiro passo da conexão com o Google Calendar: recebe o org_id (a
// página /integracoes/google-calendar já confere que quem clicou está
// logado nessa org antes de montar esse link) e redireciona pra tela de
// permissão do próprio Google. verify_jwt fica desligado de propósito:
// esse link é clicado direto pelo navegador, não chega com um token do
// Supabase.

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");

  if (!orgId) {
    return new Response("org_id é obrigatório", { status: 400 });
  }

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  if (!clientId) {
    return new Response("GOOGLE_CLIENT_ID não configurado nas secrets", { status: 500 });
  }

  const redirectUri =
    "https://hgloheptxqdjpwzgquku.supabase.co/functions/v1/google-calendar-callback";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  // offline + consent garantem que o Google devolve um refresh_token —
  // sem os dois, só vem na primeira vez que a pessoa autoriza o app.
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", orgId);

  return Response.redirect(authUrl.toString(), 302);
});
