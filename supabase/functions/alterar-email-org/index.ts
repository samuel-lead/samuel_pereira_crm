// Troca o e-mail de login do admin de uma empresa cliente — usado quando
// o cliente perde acesso ao e-mail cadastrado e precisa entrar com outro.
// Só o dono da plataforma (super_admin) pode chamar, pra qualquer empresa.
// email_confirm:true já deixa o novo e-mail valendo na hora, sem precisar
// clicar em link de confirmação (mesmo padrão de criar-usuario/criar-cliente).

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
    return json(403, { erro: "Só o dono da plataforma pode alterar o e-mail de outra empresa" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { erro: "Corpo da requisição inválido" });
  }

  const orgId = String(body.org_id ?? "").trim();
  const novoEmail = String(body.novo_email ?? "").trim().toLowerCase();

  if (!orgId || !novoEmail || !novoEmail.includes("@")) {
    return json(400, { erro: "Empresa e um e-mail válido são obrigatórios" });
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

  const { error: erroEmail } = await admin.auth.admin.updateUserById(adminDaOrg.id, {
    email: novoEmail,
    email_confirm: true,
  });

  if (erroEmail) {
    return json(400, { erro: erroEmail.message });
  }

  return json(200, { ok: true, admin_nome: adminDaOrg.nome });
});
