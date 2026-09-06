// Chamada pelo botão "Salvar na Google Agenda" dentro do card do lead.
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

const ROTULOS_URGENCIA: Record<string, string> = {
  desconhecida: "Ainda não sabe",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const ROTULOS_CAPACIDADE: Record<string, string> = {
  desconhecida: "Ainda não sabe",
  sim: "Sim",
  parcial: "Parcial",
  nao: "Não",
};

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
    .select("id, org_id, lead_id, usuario_id, closer_id, agendada_para, google_event_id")
    .eq("id", corpo.reuniaoId)
    .single();

  if (erroReuniao || !reuniaoData) return json(404, { erro: "Reunião não encontrada" });

  const { data: leadData } = await supabaseUsuario
    .from("leads")
    .select("nome, email, telefone_e164, criterio_problema, criterio_urgencia, criterio_capacidade")
    .eq("id", reuniaoData.lead_id as string)
    .single();

  if (!leadData) return json(404, { erro: "Lead não encontrado" });

  // Trava pedida pelo Samuel: sem e-mail do lead não dá pra convidar
  // ninguém pro evento, então nem cria.
  if (!leadData.email) {
    return json(400, {
      erro: "Esse lead ainda não tem e-mail cadastrado — adicione o e-mail no card antes de salvar na Google Agenda.",
    });
  }

  const { data: usuarios } = await supabaseUsuario
    .from("usuarios")
    .select("id, nome")
    .in("id", [reuniaoData.usuario_id, reuniaoData.closer_id].filter(Boolean) as string[]);

  // Iniciais vêm de quem MARCOU essa reunião (a SDR), não do responsável
  // atual do lead — os dois podem ser pessoas diferentes (ex: SDR marca,
  // depois o lead passa pro closer como responsável).
  const nomeSdr = usuarios?.find((u) => u.id === reuniaoData.usuario_id)?.nome;
  const nomeCloser = usuarios?.find((u) => u.id === reuniaoData.closer_id)?.nome;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const resultadoToken = await obterAccessTokenValido(
    supabaseAdmin,
    reuniaoData.org_id as string,
    clientId,
    clientSecret
  );
  if ("erro" in resultadoToken) return json(400, { erro: resultadoToken.erro });

  const inicio = new Date(reuniaoData.agendada_para as string);
  const fim = new Date(inicio.getTime() + 90 * 60 * 1000);

  // Iniciais da SDR que marcou (2 primeiras letras do primeiro nome, tipo
  // "Julia" → "JU") + nome do lead + nome do closer, se tiver — formato
  // que o Samuel pediu explicitamente.
  const iniciais = nomeSdr ? nomeSdr.trim().slice(0, 2).toUpperCase() : "";
  let titulo = leadData.nome;
  if (nomeCloser) titulo += ` + ${nomeCloser}`;
  if (iniciais) titulo = `${iniciais} - ${titulo}`;

  const descricao = [
    leadData.criterio_problema || null,
    `Urgência: ${ROTULOS_URGENCIA[leadData.criterio_urgencia as string] ?? "Ainda não sabe"}`,
    `Investimento: ${ROTULOS_CAPACIDADE[leadData.criterio_capacidade as string] ?? "Ainda não sabe"}`,
    leadData.telefone_e164 ? `Telefone: ${leadData.telefone_e164}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const jaTemEvento = !!reuniaoData.google_event_id;

  const evento: Record<string, unknown> = {
    summary: titulo,
    description: descricao,
    start: { dateTime: inicio.toISOString() },
    end: { dateTime: fim.toISOString() },
    attendees: [{ email: leadData.email }],
    colorId: "10", // Basil — verde, pedido explicitamente
  };

  async function criarEventoNovo() {
    // Google Meet só entra na criação — o Google não deixa adicionar um
    // conferenceData novo num PATCH que já tinha um antes sem repetir o
    // mesmo conferenceId.
    evento.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
    const url = `https://www.googleapis.com/calendar/v3/calendars/${resultadoToken.calendarId}/events?conferenceDataVersion=1&sendUpdates=all`;
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resultadoToken.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evento),
    });
  }

  let respostaEvento: Response;
  // deno-lint-ignore no-explicit-any
  let dadosEvento: any;

  if (jaTemEvento) {
    const urlAtualizar = `https://www.googleapis.com/calendar/v3/calendars/${resultadoToken.calendarId}/events/${reuniaoData.google_event_id}?conferenceDataVersion=1&sendUpdates=all`;
    respostaEvento = await fetch(urlAtualizar, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${resultadoToken.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evento),
    });
    dadosEvento = await respostaEvento.json();

    // Se o evento antigo foi apagado direto na Google Agenda, o Google às
    // vezes devolve 404/410, mas às vezes aceita o PATCH com 200 e só
    // mantém o status "cancelled" (o evento continua invisível na agenda
    // mesmo assim). Nos dois casos, cria um evento novo em vez de deixar
    // essa atualização "fantasma" passar como sucesso.
    const eventoMorto =
      respostaEvento.status === 404 ||
      respostaEvento.status === 410 ||
      dadosEvento?.status === "cancelled";
    if (eventoMorto) {
      respostaEvento = await criarEventoNovo();
      dadosEvento = await respostaEvento.json();
    }
  } else {
    respostaEvento = await criarEventoNovo();
    dadosEvento = await respostaEvento.json();
  }

  if (!respostaEvento.ok) {
    return json(400, { erro: dadosEvento.error?.message ?? "Erro ao salvar evento no Google Agenda" });
  }

  if (dadosEvento.id && dadosEvento.id !== reuniaoData.google_event_id) {
    await supabaseAdmin
      .from("reunioes")
      .update({ google_event_id: dadosEvento.id })
      .eq("id", reuniaoData.id as string);
  }

  return json(200, { eventoUrl: dadosEvento.htmlLink });
});
