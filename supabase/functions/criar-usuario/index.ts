// Cria um novo usuário do CRM (login + linha em public.usuarios).
// Só quem chama como admin da própria org pode criar. Usa a chave
// service_role — por isso vive numa Edge Function, nunca no painel.

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PAGINAS_VALIDAS = ["funil", "lista", "atividades", "reunioes", "metricas"];
const FUNCOES_VALIDAS = ["sdr", "closer"];

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
    .select("org_id, papel")
    .eq("id", user.id)
    .single();

  if (erroChamador || !chamador || chamador.papel !== "admin") {
    return json(403, { erro: "Só administradores podem cadastrar usuários" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { erro: "Corpo da requisição inválido" });
  }

  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const senha = String(body.senha ?? "");
  const wppComercial = String(body.wpp_comercial_e164 ?? "").trim() || null;
  const papel = body.papel === "admin" ? "admin" : "membro";
  const paginasEnviadas = Array.isArray(body.paginas_permitidas)
    ? (body.paginas_permitidas as unknown[]).filter(
        (p): p is string => typeof p === "string" && PAGINAS_VALIDAS.includes(p)
      )
    : [];
  const paginasPermitidas = papel === "admin" ? PAGINAS_VALIDAS : paginasEnviadas;
  const funcaoRaw = String(body.funcao ?? "").trim();
  const funcao = FUNCOES_VALIDAS.includes(funcaoRaw) ? funcaoRaw : null;

  if (!nome || !email || senha.length < 6) {
    return json(400, {
      erro: "Nome, e-mail e senha (mínimo 6 caracteres) são obrigatórios",
    });
  }

  const { data: novoAuth, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  });

  if (erroAuth || !novoAuth.user) {
    return json(400, { erro: erroAuth?.message ?? "Não deu pra criar o login" });
  }

  const { error: erroInsert } = await admin.from("usuarios").insert({
    id: novoAuth.user.id,
    org_id: chamador.org_id,
    nome,
    papel,
    funcao,
    paginas_permitidas: paginasPermitidas,
    wpp_comercial_e164: wppComercial,
  });

  if (erroInsert) {
    await admin.auth.admin.deleteUser(novoAuth.user.id);
    return json(400, { erro: erroInsert.message });
  }

  return json(200, { ok: true });
});
