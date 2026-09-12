// Manda um WhatsApp pra um usuário do CRM — usada pelos gatilhos internos
// (lead novo, lead sem responsável, contato vencido, lead parado, reunião
// chegando, relatório diário), chamados de dentro do Postgres via
// pg_cron/pg_net (ver supabase/migrations/20260912140000_lembretes_por_whatsapp.sql).
// Espelha o mesmo desenho do enviar-push: usa o mesmo segredo interno
// (PUSH_INTERNAL_SECRET) guardado no Vault, nunca a service role key fora
// das Edge Functions. Sem IA nenhuma aqui — é só busca do telefone do
// usuário + texto pronto que já veio montado do banco.
import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });

  const segredoInterno = Deno.env.get("PUSH_INTERNAL_SECRET");
  const tokenChamador = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!segredoInterno || tokenChamador !== segredoInterno) {
    return json(401, { erro: "Não autorizado" });
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "Corpo inválido" });
  }

  const usuarioId = String(corpo.usuario_id ?? "");
  const mensagem = String(corpo.mensagem ?? "");
  if (!usuarioId || !mensagem) return json(400, { erro: "usuario_id e mensagem são obrigatórios" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: usuario } = await admin
    .from("usuarios")
    .select("wpp_comercial_e164")
    .eq("id", usuarioId)
    .maybeSingle();

  const telefone = usuario?.wpp_comercial_e164?.replace(/\D/g, "");
  if (!telefone) return json(200, { enviado: false, motivo: "sem telefone cadastrado" });

  const instancia = Deno.env.get("ZAPI_INSTANCIA_A");
  const token = Deno.env.get("ZAPI_TOKEN_A");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN_A");
  if (!instancia || !token) return json(200, { enviado: false, motivo: "Z-API não configurada" });

  try {
    const resposta = await fetch(`https://api.z-api.io/instances/${instancia}/token/${token}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    });
    return json(200, { enviado: resposta.ok });
  } catch (erro) {
    return json(200, { enviado: false, motivo: String(erro) });
  }
});
