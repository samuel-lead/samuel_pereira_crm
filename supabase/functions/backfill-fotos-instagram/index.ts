// TEMPORÁRIA — roda uma vez só, pra preencher a foto dos leads que já
// tinham Instagram cadastrado antes da busca automática existir. Depois
// de usada, desativar (mesma lógica de buscar-foto-instagram, mas em
// lote e com service_role, já que roda sem sessão de usuário).
import { createClient } from "jsr:@supabase/supabase-js@2";

function extrairUsername(valor: string): string | null {
  let v = valor.trim();
  if (!v) return null;
  v = v.replace(/^@/, "");
  const match = v.match(/instagram\.com\/([^/?]+)/i);
  if (match) v = match[1];
  v = v.split("?")[0].replace(/\/+$/, "");
  return v || null;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  // Processa em lotes pequenos — a função tem um limite de 150s de
  // execução, e o plano grátis da API é lento/limitado, então dá pra
  // estourar isso com muitos leads de uma vez. Chamar de novo pega de
  // onde parou, porque quem já tem foto sai da lista.
  const { data: leads } = await admin
    .from("leads")
    .select("id, instagram, org_id")
    .not("instagram", "is", null)
    .neq("instagram", "")
    .or("foto_url.is.null,foto_url.eq.")
    .limit(5);

  const resultados: Record<string, unknown>[] = [];

  for (const lead of leads ?? []) {
    const username = extrairUsername(lead.instagram as string);
    if (!username) {
      resultados.push({ leadId: lead.id, ok: false, motivo: "sem username" });
      continue;
    }

    try {
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
        resultados.push({ leadId: lead.id, username, ok: false, motivo: `perfil ${respostaPerfil.status}` });
        continue;
      }

      const perfil = await respostaPerfil.json();
      const fotoPerfilUrl = perfil.profile_pic_url as string | undefined;
      if (!fotoPerfilUrl) {
        resultados.push({ leadId: lead.id, username, ok: false, motivo: "sem profile_pic_url" });
        continue;
      }

      const respostaImagem = await fetch(fotoPerfilUrl);
      if (!respostaImagem.ok) {
        resultados.push({ leadId: lead.id, username, ok: false, motivo: "download falhou" });
        continue;
      }

      const imagemBytes = new Uint8Array(await respostaImagem.arrayBuffer());
      const tipoConteudo = respostaImagem.headers.get("content-type") ?? "image/jpeg";

      const { error: erroUpload } = await admin.storage
        .from("leads-fotos")
        .upload(lead.id, imagemBytes, { upsert: true, contentType: tipoConteudo });

      if (erroUpload) {
        resultados.push({ leadId: lead.id, username, ok: false, motivo: erroUpload.message });
        continue;
      }

      const { data: urlPublica } = admin.storage.from("leads-fotos").getPublicUrl(lead.id);
      const fotoFinal = `${urlPublica.publicUrl}?v=${Date.now()}`;

      await admin.from("leads").update({ foto_url: fotoFinal }).eq("id", lead.id);
      await admin.rpc("registrar_uso_instagram_foto");

      resultados.push({ leadId: lead.id, username, ok: true });
    } catch (e) {
      resultados.push({ leadId: lead.id, username, ok: false, motivo: String(e) });
    }

    // Respeita o rate limit da API — não dispara tudo de uma vez.
    await new Promise((r) => setTimeout(r, 4000));
  }

  const sucesso = resultados.filter((r) => r.ok).length;

  return new Response(
    JSON.stringify({ total: resultados.length, sucesso, falha: resultados.length - sucesso, resultados }),
    { headers: { "Content-Type": "application/json" } }
  );
});
