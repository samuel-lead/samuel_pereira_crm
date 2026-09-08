// Samuel (dono da plataforma) não tem como ver a senha de um cliente
// nunca — ela nem fica salva em texto puro em lugar nenhum, só um hash
// que não dá pra reverter (é assim que login seguro funciona em
// qualquer sistema, não é uma limitação daqui). Em vez de "recuperar" a
// senha antiga, essa função troca por uma nova, escolhida agora — só o
// dono da plataforma (super_admin) pode chamar, pra qualquer empresa.

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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
    return json(403, { erro: "Só o dono da plataforma pode redefinir senha de outra empresa" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { erro: "Corpo da requisição inválido" });
  }

  const orgId = String(body.org_id ?? "").trim();
  const novaSenha = String(body.nova_senha ?? "");

  if (!orgId || novaSenha.length < 6) {
    return json(400, { erro: "Empresa e nova senha (mínimo 6 caracteres) são obrigatórios" });
  }

  const { data: adminDaOrg, error: erroBusca } = await admin
    .from("usuarios")
    .select("id, nome")
    .eq("org_id", orgId)
    .eq("papel", "admin")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (erroBusca || !adminDaOrg) {
    return json(404, { erro: "Essa empresa não tem um usuário admin cadastrado" });
  }

  const { error: erroSenha } = await admin.auth.admin.updateUserById(adminDaOrg.id, {
    password: novaSenha,
  });

  if (erroSenha) {
    return json(400, { erro: erroSenha.message });
  }

  return json(200, { ok: true, admin_nome: adminDaOrg.nome });
});
