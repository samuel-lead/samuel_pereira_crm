// Manda notificação push de verdade (chega na tela de bloqueio, mesmo
// com o app fechado) pra todos os aparelhos inscritos de um usuário.
// Chamada de dois jeitos:
// 1. Com o JWT de quem está logado + { teste: true } — manda um aviso de
//    teste só pra quem chamou (usado no botão "Mandar notificação de
//    teste" em /perfil).
// 2. Com o segredo interno (PUSH_INTERNAL_SECRET) + { usuario_id, titulo,
//    corpo, url } — usado pelos gatilhos internos do CRM (lead novo,
//    contato vencido, lead parado), chamados de dentro do Postgres via
//    pg_cron/pg_net. Não usa a service role key aqui de propósito — o
//    segredo interno fica só no Vault do Postgres, nunca precisa expor a
//    service role key fora das Edge Functions.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!vapidPublicKey || !vapidPrivateKey) {
    return json(500, { erro: "Chaves VAPID não configuradas nas secrets" });
  }

  webpush.setVapidDetails(
    "mailto:contato@sousamuelpereira.com.br",
    vapidPublicKey,
    vapidPrivateKey
  );

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "Corpo inválido" });
  }

  let usuarioId: string;
  let titulo: string;
  let mensagem: string;
  let url: string;

  const authHeader = req.headers.get("Authorization");
  const tokenChamador = authHeader?.replace("Bearer ", "");

  if (corpo.teste) {
    if (!tokenChamador) return json(401, { erro: "Não autenticado" });
    const { data, error } = await supabaseAdmin.auth.getUser(tokenChamador);
    if (error || !data.user) return json(401, { erro: "Token inválido" });

    usuarioId = data.user.id;
    titulo = "Meu Vendedor";
    mensagem = "Notificação de teste — se você viu isso, tá funcionando! 🎉";
    url = "/perfil";
  } else {
    // Chamada interna (gatilhos do CRM) — exige o segredo interno, não o
    // token de um usuário comum.
    const segredoInterno = Deno.env.get("PUSH_INTERNAL_SECRET");
    if (!segredoInterno || tokenChamador !== segredoInterno) {
      return json(401, { erro: "Não autorizado" });
    }

    usuarioId = String(corpo.usuario_id ?? "");
    titulo = String(corpo.titulo ?? "Meu Vendedor");
    mensagem = String(corpo.corpo ?? "");
    url = String(corpo.url ?? "/leads");

    if (!usuarioId) return json(400, { erro: "usuario_id é obrigatório" });
  }

  const { data: inscricoes, error: erroInscricoes } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("usuario_id", usuarioId);

  if (erroInscricoes) return json(500, { erro: erroInscricoes.message });
  if (!inscricoes || inscricoes.length === 0) {
    return json(404, { erro: "Nenhum aparelho inscrito pra esse usuário" });
  }

  const payload = JSON.stringify({ titulo, corpo: mensagem, url });

  const resultados = await Promise.allSettled(
    inscricoes.map((inscricao) =>
      webpush.sendNotification(
        {
          endpoint: inscricao.endpoint,
          keys: { p256dh: inscricao.p256dh, auth: inscricao.auth },
        },
        payload
      )
    )
  );

  // Inscrição morta (410/404) — o navegador cancelou ela do lado dele.
  // Remove daqui também pra não ficar tentando mandar pra sempre.
  const inscricoesExpiradas = inscricoes.filter((_, i) => {
    const r = resultados[i];
    return (
      r.status === "rejected" &&
      typeof r.reason === "object" &&
      r.reason !== null &&
      "statusCode" in r.reason &&
      (r.reason.statusCode === 410 || r.reason.statusCode === 404)
    );
  });

  if (inscricoesExpiradas.length > 0) {
    await supabaseAdmin
      .from("push_subscriptions")
      .delete()
      .in("id", inscricoesExpiradas.map((i) => i.id));
  }

  const enviadas = resultados.filter((r) => r.status === "fulfilled").length;
  return json(200, { enviadas, total: inscricoes.length });
});
