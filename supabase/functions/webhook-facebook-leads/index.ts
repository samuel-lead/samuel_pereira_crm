// Recebe os avisos de "leadgen" do Facebook/Instagram (formulário nativo
// de anúncio) e grava o lead direto em Pré-vendas → Leads (nível 0), sem
// responsável. Pública (sem JWT do Supabase) porque quem chama é o
// Facebook — a segurança vem da conferência de assinatura (HMAC) no POST
// e do verify_token no GET de configuração.

import { createClient } from "jsr:@supabase/supabase-js@2";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function assinaturaValida(
  corpoTexto: string,
  assinaturaHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!assinaturaHeader) return false;
  const partes = assinaturaHeader.split("sha256=");
  const assinaturaRecebida = partes[1];
  if (!assinaturaRecebida) return false;

  const encoder = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    "raw",
    encoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const assinaturaBuffer = await crypto.subtle.sign(
    "HMAC",
    chave,
    encoder.encode(corpoTexto)
  );
  const assinaturaCalculada = Array.from(new Uint8Array(assinaturaBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return assinaturaCalculada === assinaturaRecebida;
}

function normalizarTelefone(bruto: string | null): string | null {
  if (!bruto) return null;
  const digitos = bruto.replace(/[^\d]/g, "");
  if (!digitos) return null;
  return `+${digitos}`;
}

type CampoFacebook = { name: string; values?: string[] };

function pegarCampo(fieldData: CampoFacebook[], chaves: string[]): string | null {
  for (const chave of chaves) {
    const campo = fieldData.find((f) => f.name?.toLowerCase().includes(chave));
    if (campo?.values?.[0]) return campo.values[0];
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Facebook chama com GET uma vez, na hora de configurar o webhook, só
  // pra confirmar que essa URL é sua.
  if (req.method === "GET") {
    const modo = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const desafio = url.searchParams.get("hub.challenge");
    const tokenEsperado = Deno.env.get("FACEBOOK_VERIFY_TOKEN");

    if (modo === "subscribe" && desafio && token === tokenEsperado) {
      return new Response(desafio, { status: 200 });
    }
    return json(403, { erro: "Verificação inválida" });
  }

  if (req.method !== "POST") {
    return json(405, { erro: "Método não permitido" });
  }

  const corpoTexto = await req.text();
  const appSecret = Deno.env.get("FACEBOOK_APP_SECRET");
  const assinaturaHeader = req.headers.get("x-hub-signature-256");

  if (!appSecret || !(await assinaturaValida(corpoTexto, assinaturaHeader, appSecret))) {
    return json(401, { erro: "Assinatura inválida" });
  }

  let evento: {
    entry?: { changes?: { field?: string; value?: { leadgen_id?: string } }[] }[];
  };
  try {
    evento = JSON.parse(corpoTexto);
  } catch {
    return json(200, { ok: true });
  }

  const orgId = Deno.env.get("FACEBOOK_ORG_ID")!;
  const usuarioId = Deno.env.get("FACEBOOK_USUARIO_ID")!;
  const pageAccessToken = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN")!;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const entradas = evento.entry ?? [];

  for (const entrada of entradas) {
    for (const mudanca of entrada.changes ?? []) {
      if (mudanca.field !== "leadgen") continue;
      const leadgenId = mudanca.value?.leadgen_id;
      if (!leadgenId) continue;

      try {
        const respostaGraph = await fetch(
          `https://graph.facebook.com/v21.0/${leadgenId}?access_token=${pageAccessToken}`
        );
        const dadosLead = await respostaGraph.json();

        if (!respostaGraph.ok) {
          console.error("Erro buscando lead no Graph API:", dadosLead);
          continue;
        }

        const fieldData: CampoFacebook[] = dadosLead.field_data ?? [];
        const nome = pegarCampo(fieldData, ["full_name", "nome", "name"]) ?? "Lead do Facebook";
        const telefone = normalizarTelefone(pegarCampo(fieldData, ["phone", "telefone"]));
        const email = pegarCampo(fieldData, ["email"]);

        const { error } = await admin.from("leads").insert({
          org_id: orgId,
          usuario_id: usuarioId,
          nome,
          telefone_e164: telefone,
          email,
          origem: "Tráfego pago",
          nivel_ordem: 0,
          responsavel_id: null,
          id_externo: leadgenId,
        });

        // 23505 = já existe (mesmo leadgen_id ou mesmo telefone já
        // cadastrado) — não é erro de verdade, é o Facebook reenviando.
        if (error && error.code !== "23505") {
          console.error("Erro ao gravar lead do Facebook:", error.message);
        }
      } catch (erro) {
        console.error("Erro processando leadgen_id", leadgenId, erro);
      }
    }
  }

  return json(200, { ok: true });
});
