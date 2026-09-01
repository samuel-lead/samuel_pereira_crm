// Checa se um número tem WhatsApp de verdade, chamando o Z-API. Usada
// pela página pública de captura da isca — quando a pessoa digita o
// WhatsApp, o formulário chama essa função pra avisar na hora se o
// número parece errado. Não precisa de login (é a página pública quem
// chama), então não expõe nada além de um "existe sim/não".
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  let telefone: string | null = null;
  try {
    const corpo = await req.json();
    telefone = typeof corpo.telefone === "string" ? corpo.telefone.replace(/\D/g, "") : null;
  } catch {
    // corpo vazio ou inválido — trata como telefone ausente abaixo
  }

  if (!telefone || telefone.length < 12) {
    return json(400, { erro: "Telefone inválido" });
  }

  const instancia = Deno.env.get("ZAPI_INSTANCIA_A");
  const token = Deno.env.get("ZAPI_TOKEN_A");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN_A");

  if (!instancia || !token) {
    // Sem Z-API configurado — devolve "não sei dizer" em vez de erro,
    // pra não travar ninguém preenchendo o formulário.
    return json(200, { existe: null });
  }

  try {
    const resposta = await fetch(
      `https://api.z-api.io/instances/${instancia}/token/${token}/contacts/check-whatsapp?phone=${telefone}`,
      { headers: clientToken ? { "Client-Token": clientToken } : {} }
    );

    if (!resposta.ok) {
      return json(200, { existe: null });
    }

    const dados = await resposta.json();
    const item = Array.isArray(dados) ? dados[0] : dados;
    const existe = typeof item?.exists === "boolean" ? item.exists : null;

    return json(200, { existe });
  } catch {
    return json(200, { existe: null });
  }
});
