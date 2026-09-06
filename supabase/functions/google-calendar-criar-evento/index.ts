// Chamada pelo botão "Salvar no Google Agenda" dentro do card do lead.
// Usa o token do próprio usuário logado (verify_jwt ligado) pra ler a
// reunião respeitando as regras normais de acesso, e um client
// separado com service_role só pra mexer em google_calendar_conexoes
// (tabela sem nenhuma policy, ninguém comum acessa direto).

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function obterAccessTokenValido(
  supabaseAdmin: ReturnType<typeof createClient>,
  orgId: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; calendarId: string } | { erro: string }> {
  const { data: conexao } = await supabaseAdmin
    .from("google_calendar_conexoes")
    .select("access_token, refresh_token, expira_em, calendar_id")
    .eq("org_id", orgId)
    .maybeSingle();

  if (!conexao) {
    return { erro: "Google Calendar ainda não foi conectado. Conecte em Integrações primeiro." };
  }

  // Só renova se estiver perto de vencer (1 min de folga) — evita chamar
  // o Google à toa toda vez.
  const jaVenceu = new Date(conexao.expira_em as string).getTime() < Date.now() + 60_000;
  if (!jaVenceu) {
    return { accessToken: conexao.access_token as string, calendarId: conexao.calendar_id as string };
  }

  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conexao.refresh_token as string,
      grant_type: "refresh_token",
    }),
  });
  const dados = await resposta.json();

  if (!resposta.ok || !dados.access_token) {
    return { erro: "Não deu pra renovar o acesso ao Google Calendar — pode ser preciso reconectar em Integrações." };
  }

  const novaExpiraEm = new Date(Date.now() + dados.expires_in * 1000).toISOString();
  await supabaseAdmin
    .from("google_calendar_conexoes")
    .update({ access_token: dados.access_token, expira_em: novaExpiraEm })
    .eq("org_id", orgId);

  return { accessToken: dados.access_token as string, calendarId: conexao.calendar_id as string };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return json(500, { erro: "Google Calendar não configurado nas secrets" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUsuario = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: erroUser } = await supabaseUsuario.auth.getUser();
  if (erroUser || !userData.user) return json(401, { erro: "Não autenticado" });

  let corpo: { reuniaoId?: string };
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "Corpo inválido" });
  }

  if (!corpo.reuniaoId) return json(400, { erro: "reuniaoId é obrigatório" });

  const { data: reuniaoData, error: erroReuniao } = await supabaseUsuario
    .from("reunioes")
    .select("id, org_id, lead_id, agendada_para, google_event_id")
    .eq("id", corpo.reuniaoId)
    .single();

  if (erroReuniao || !reuniaoData) return json(404, { erro: "Reunião não encontrada" });

  const { data: leadData } = await supabaseUsuario
    .from("leads")
    .select("nome, telefone_e164")
    .eq("id", reuniaoData.lead_id as string)
    .single();

  const { data: orgData } = await supabaseUsuario
    .from("orgs")
    .select("publico")
    .eq("id", reuniaoData.org_id as string)
    .single();

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const resultadoToken = await obterAccessTokenValido(
    supabaseAdmin,
    reuniaoData.org_id as string,
    clientId,
    clientSecret
  );
  if ("erro" in resultadoToken) return json(400, { erro: resultadoToken.erro });

  const inicio = new Date(reuniaoData.agendada_para as string);
  const fim = new Date(inicio.getTime() + 60 * 60 * 1000);
  const nomeLead = leadData?.nome ?? "Lead";
  const rotuloEncontro = orgData?.publico === "imobiliario" ? "Visita" : "Reunião";

  const evento = {
    summary: `${rotuloEncontro} com ${nomeLead}`,
    description: [
      "Criado automaticamente pelo Meu Vendedor.",
      leadData?.telefone_e164 ? `Telefone: ${leadData.telefone_e164}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
  };

  const jaTemEvento = !!reuniaoData.google_event_id;
  const urlEvento = jaTemEvento
    ? `https://www.googleapis.com/calendar/v3/calendars/${resultadoToken.calendarId}/events/${reuniaoData.google_event_id}`
    : `https://www.googleapis.com/calendar/v3/calendars/${resultadoToken.calendarId}/events`;

  const respostaEvento = await fetch(urlEvento, {
    method: jaTemEvento ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${resultadoToken.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(evento),
  });

  const dadosEvento = await respostaEvento.json();

  if (!respostaEvento.ok) {
    return json(400, { erro: dadosEvento.error?.message ?? "Erro ao salvar evento no Google Agenda" });
  }

  if (!jaTemEvento) {
    await supabaseAdmin
      .from("reunioes")
      .update({ google_event_id: dadosEvento.id })
      .eq("id", reuniaoData.id as string);
  }

  return json(200, { eventoUrl: dadosEvento.htmlLink });
});
