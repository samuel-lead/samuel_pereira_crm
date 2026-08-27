// Cadastra uma empresa cliente nova: cria a org, o funil padrão (os 10
// níveis de sempre, 0 a 9), as metas/taxas padrão, e o primeiro usuário
// admin dela. Só o dono da plataforma (super_admin) pode chamar isso —
// cada empresa fica isolada na própria org_id, como todo o resto do sistema.

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Imobiliário fala "visita", não "reunião"/"call" — o resto do funil é
// idêntico, só troca essa palavra nos níveis que citam encontro com o lead.
function niveisPadrao(publico: string) {
  const palavra = publico === "imobiliario" ? "visita" : "reunião";
  const Palavra = publico === "imobiliario" ? "Visita" : "Reunião";

  return [
    {
      ordem: 0,
      nome: "Novos Leads",
      definicao: "Lead cadastrado, ainda não abordado (nenhuma mensagem enviada)",
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: "Novos Leads",
      numerado: false,
      destacado: true,
    },
    {
      ordem: 1,
      nome: "Sem conversa iniciada",
      definicao:
        'Mandei mensagem; o lead só visualizou, não respondeu, ou respondeu só "boa tarde" sem engatar',
      prazo_dias: 5,
      destino_ao_estourar: 9,
      etiqueta_wpp: "Sem conversa iniciada",
      numerado: true,
      destacado: false,
    },
    {
      ordem: 2,
      nome: "Em qualificação",
      definicao: "Conversa engatou, atendimento rolando, levantando os 3 critérios",
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: "Em qualificação",
      numerado: true,
      destacado: false,
    },
    {
      ordem: 3,
      nome: `Topou ${palavra}, horário a definir`,
      definicao: `Qualificado e aceitou ${publico === "imobiliario" ? "receber visita" : "reunir"}, mas dia e hora não definidos`,
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: `Topou ${palavra}, sem horário`,
      numerado: true,
      destacado: false,
    },
    {
      ordem: 4,
      nome: `${Palavra} marcada`,
      definicao: "Dia e hora definidos",
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: `${Palavra} marcada`,
      numerado: false,
      destacado: true,
    },
    {
      ordem: 5,
      nome: `No-show (Marcou ${palavra} e sumiu)`,
      definicao: `A ${palavra} estava marcada e o lead não compareceu`,
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: `No-show (Marcou ${palavra} e sumiu)`,
      numerado: true,
      destacado: false,
    },
    {
      ordem: 6,
      nome: "Precisa reagendar (Pediu para reagendar)",
      definicao: `A ${palavra} estava marcada e o lead avisou antes que ia precisar remarcar (diferente de No-show, que é sumiço sem aviso)`,
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: "Precisa reagendar (Pediu para reagendar)",
      numerado: false,
      destacado: false,
    },
    {
      ordem: 7,
      nome: `Follow após ${palavra}`,
      definicao: `A ${palavra} aconteceu, mas ainda não deu pra saber se vira oportunidade ou não — precisa de retorno`,
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: `Follow após ${palavra}`,
      numerado: false,
      destacado: true,
    },
    {
      ordem: 8,
      nome: "Oportunidades para o fim do mês",
      definicao: `${publico === "imobiliario" ? "Visitou" : "Reuniu"}, proposta na mesa, não comprou ainda`,
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: `${Palavra} feita, sem fechar`,
      numerado: true,
      destacado: false,
    },
    {
      ordem: 9,
      nome: "Base",
      definicao:
        "Passou por todo o processo e não virou nada. Também recebe os do nível 1 que estouraram os 5 dias",
      prazo_dias: null,
      destino_ao_estourar: null,
      etiqueta_wpp: "Base",
      numerado: true,
      destacado: false,
    },
  ];
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json(401, { erro: "Não autenticado" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseChamador = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: erroUser,
  } = await supabaseChamador.auth.getUser();

  if (erroUser || !user) {
    return json(401, { erro: "Não autenticado" });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: chamador, error: erroChamador } = await admin
    .from("usuarios")
    .select("super_admin")
    .eq("id", user.id)
    .single();

  if (erroChamador || !chamador?.super_admin) {
    return json(403, { erro: "Só o dono da plataforma pode cadastrar clientes novos" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { erro: "Corpo da requisição inválido" });
  }

  const nomeEmpresa = String(body.nome_empresa ?? "").trim();
  const nomeAdmin = String(body.nome_admin ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");
  const publico = String(body.publico ?? "");

  if (!nomeEmpresa || !nomeAdmin || !email || senha.length < 6) {
    return json(400, {
      erro: "Nome da empresa, nome do admin, e-mail e senha (mínimo 6 caracteres) são obrigatórios",
    });
  }

  if (publico !== "mentoria" && publico !== "imobiliario") {
    return json(400, { erro: "Escolha o público da empresa: serviço/mentoria/consultoria ou imobiliário" });
  }

  const { data: novaOrg, error: erroOrg } = await admin
    .from("orgs")
    .insert({ nome: nomeEmpresa, publico })
    .select("id")
    .single();

  if (erroOrg || !novaOrg) {
    return json(400, { erro: erroOrg?.message ?? "Não deu pra criar a empresa" });
  }

  const { data: novoAuth, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (erroAuth || !novoAuth.user) {
    await admin.from("orgs").delete().eq("id", novaOrg.id);
    return json(400, { erro: erroAuth?.message ?? "Não deu pra criar o login" });
  }

  const { error: erroUsuario } = await admin.from("usuarios").insert({
    id: novoAuth.user.id,
    org_id: novaOrg.id,
    nome: nomeAdmin,
    papel: "admin",
    dono: true,
  });

  if (erroUsuario) {
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    await admin.from("orgs").delete().eq("id", novaOrg.id);
    return json(400, { erro: erroUsuario.message });
  }

  const { error: erroNiveis } = await admin.from("niveis").insert(
    niveisPadrao(publico).map((nivel) => ({ ...nivel, org_id: novaOrg.id }))
  );

  const { error: erroMetas } = await admin.from("metas_config").insert({
    org_id: novaOrg.id,
    usuario_id: novoAuth.user.id,
    piso_leads_dia: 30,
    piso_reunioes_dia: 3,
    taxa_agendamento_min: 0.1,
    taxa_comparecimento_min: 0.8,
    taxa_venda_min: 0.4,
  });

  if (erroNiveis || erroMetas) {
    return json(207, {
      aviso:
        "A empresa e o admin foram criados, mas faltou terminar de configurar o funil ou as metas padrão — fale com o suporte.",
      detalhe: erroNiveis?.message ?? erroMetas?.message,
    });
  }

  return json(200, { ok: true, org_id: novaOrg.id });
});
