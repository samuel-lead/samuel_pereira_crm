// Chamada depois de salvar um lead que tem Instagram preenchido (ver
// lib/leads/actions.ts) — busca a foto de perfil pública numa API paga
// (RapidAPI, "Easy Social Media Service") e guarda uma cópia no Storage
// do próprio Supabase, porque o link que a API devolve costuma expirar.
// Best-effort: qualquer falha aqui não deve travar o salvamento do lead
// que chamou essa função.

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Aceita "@usuario", "usuario", ou um link do Instagram em qualquer
// formato (com ou sem www, com parâmetros na URL, com ou sem barra no
// final) — extrai só o nome de usuário.
function extrairUsername(valor: string): string | null {
  let v = valor.trim();
  if (!v) return null;
  v = v.replace(/^@/, "");
  const match = v.match(/instagram\.com\/([^/?]+)/i);
  if (match) v = match[1];
  v = v.split("?")[0].replace(/\/+$/, "");
  return v || null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { erro: "Método não permitido" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

  if (!rapidApiKey) {
    return json(500, { erro: "RAPIDAPI_KEY não configurada nas secrets" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  let corpo: { leadId?: string };
  try {
    corpo = await req.json();
  } catch {
    return json(400, { erro: "Corpo inválido" });
  }

  if (!corpo.leadId) return json(400, { erro: "leadId é obrigatório" });

  const { data: lead, error: erroLead } = await supabase
    .from("leads")
    .select("instagram")
    .eq("id", corpo.leadId)
    .single();

  if (erroLead || !lead) return json(404, { erro: "Lead não encontrado" });

  if (!lead.instagram) {
    return json(200, { pulado: true, motivo: "Lead sem Instagram cadastrado" });
  }

  const username = extrairUsername(lead.instagram);
  if (!username) {
    return json(200, { pulado: true, motivo: "Não deu pra identificar o usuário do Instagram" });
  }

  const respostaPerfil = await fetch(
    `https://easy-instagram-service.p.rapidapi.com/username?username=${encodeURIComponent(username)}&random=${crypto.randomUUID()}`,
    {
      headers: {
        "x-rapidapi-host": "easy-instagram-service.p.rapidapi.com",
        "x-rapidapi-key": rapidApiKey,
      },
    }
  );

  if (!respostaPerfil.ok) {
    return json(400, { erro: "Não achei esse perfil no Instagram — confira se o @ está certo." });
  }

  const perfil = await respostaPerfil.json();
  const fotoPerfilUrl = perfil.profile_pic_url as string | undefined;

  if (!fotoPerfilUrl) {
    return json(400, { erro: "Esse perfil não tem foto pública disponível." });
  }

  const respostaImagem = await fetch(fotoPerfilUrl);
  if (!respostaImagem.ok) {
    return json(400, { erro: "Não consegui baixar a foto do Instagram." });
  }

  const imagemBytes = new Uint8Array(await respostaImagem.arrayBuffer());
  const tipoConteudo = respostaImagem.headers.get("content-type") ?? "image/jpeg";

  const { error: erroUpload } = await supabase.storage
    .from("leads-fotos")
    .upload(corpo.leadId, imagemBytes, { upsert: true, contentType: tipoConteudo });

  if (erroUpload) {
    return json(400, { erro: `Não deu pra guardar a foto: ${erroUpload.message}` });
  }

  const { data: urlPublica } = supabase.storage.from("leads-fotos").getPublicUrl(corpo.leadId);
  const fotoFinal = `${urlPublica.publicUrl}?v=${Date.now()}`;

  const { error: erroAtualizar } = await supabase
    .from("leads")
    .update({ foto_url: fotoFinal })
    .eq("id", corpo.leadId);

  if (erroAtualizar) {
    return json(400, { erro: erroAtualizar.message });
  }

  await supabase.rpc("registrar_uso_instagram_foto");

  return json(200, { fotoUrl: fotoFinal });
});
