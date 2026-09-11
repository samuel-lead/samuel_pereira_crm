// Fase 1 do agente do WhatsApp ("Samy") — recebe mensagem de texto via
// webhook da Z-API, entende com o Claude e faz UMA coisa só por enquanto:
// registrar nota num lead, sempre com eco de confirmação antes de gravar
// (regra do CLAUDE.md — nenhuma escrita vinda do WhatsApp grava direto).
//
// Fluxo: responde 200 pro Z-API imediatamente (regra do CLAUDE.md — webhook
// nunca deixa quem chamou esperando o processamento) e continua o resto
// depois, via EdgeRuntime.waitUntil. Mover nível, marcar reunião e venda
// ficam pra próxima fase — aqui só registrar_nota.
import { createClient } from "jsr:@supabase/supabase-js@2";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(supabaseUrl, serviceKey);

const ZAPI_INSTANCIA = Deno.env.get("ZAPI_INSTANCIA_A");
const ZAPI_TOKEN = Deno.env.get("ZAPI_TOKEN_A");
const ZAPI_CLIENT_TOKEN = Deno.env.get("ZAPI_CLIENT_TOKEN_A");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function normalizarTelefone(valor: string | null | undefined) {
  return (valor ?? "").replace(/\D/g, "");
}

async function enviarWhatsapp(telefone: string, mensagem: string) {
  if (!ZAPI_INSTANCIA || !ZAPI_TOKEN) return;
  try {
    await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCIA}/token/${ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    });
  } catch {
    // Falha ao enviar não pode derrubar o processamento — só não chega a
    // resposta, mas a mensagem original já foi registrada/tratada.
  }
}

type Usuario = {
  id: string;
  org_id: string;
  nome: string;
  papel: string;
};

async function acharUsuarioPorTelefone(telefoneNormalizado: string): Promise<Usuario | null> {
  const { data } = await admin
    .from("usuarios")
    .select("id, org_id, nome, papel, wpp_comercial_e164");
  const encontrado = (data ?? []).find(
    (u) => normalizarTelefone(u.wpp_comercial_e164) === telefoneNormalizado
  );
  if (!encontrado) return null;
  const { wpp_comercial_e164: _ignorar, ...usuario } = encontrado;
  return usuario as Usuario;
}

// Mesma regra de permissão de painel/lib/leads/actions.ts (garantirPodeEditar):
// admin, dono do lead, ou closer com reunião marcada ativa nesse lead.
async function podeAnotarNoLead(usuario: Usuario, leadId: string): Promise<boolean> {
  if (usuario.papel === "admin") return true;
  const { data: lead } = await admin
    .from("leads")
    .select("responsavel_id")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return false;
  if (lead.responsavel_id === usuario.id) return true;
  const { data: reuniaoAtiva } = await admin
    .from("reunioes")
    .select("id")
    .eq("lead_id", leadId)
    .eq("closer_id", usuario.id)
    .eq("status", "marcada")
    .maybeSingle();
  return !!reuniaoAtiva;
}

async function registrarNotaDeVerdade(usuario: Usuario, leadId: string, conteudo: string) {
  await admin.from("interacoes").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    lead_id: leadId,
    tipo: "nota",
    canal: "A",
    conteudo,
    ocorreu_em: new Date().toISOString(),
    origem: "declarado",
  });
  await admin.from("leads").update({ proximo_follow_em: null }).eq("id", leadId);
}

const PALAVRAS_CONFIRMA = /^(sim|confirma|confirmado|pode|isso|ok|certo|correto)\b/i;
const PALAVRAS_CANCELA = /^(n[aã]o|cancela|cancelar|errado)\b/i;

const TOOLS = [
  {
    name: "buscar_lead",
    description:
      "Busca leads da organização pelo nome (ou parte do nome). Use antes de propor_nota, pra achar o lead certo. Devolve até 5 resultados com id, nome e telefone.",
    input_schema: {
      type: "object",
      properties: { nome: { type: "string", description: "Nome ou parte do nome do lead" } },
      required: ["nome"],
    },
  },
  {
    name: "propor_nota",
    description:
      "Propõe registrar uma nota num lead específico. NUNCA grava direto — só propõe, quem mandou a mensagem confirma depois. Só chame isso depois de ter certeza de qual lead é (buscar_lead achou exatamente um resultado claro).",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "id do lead (veio de buscar_lead)" },
        conteudo: {
          type: "string",
          description: "Resumo claro e objetivo do que aconteceu, em terceira pessoa, pra virar a nota no CRM",
        },
      },
      required: ["lead_id", "conteudo"],
    },
  },
];

async function buscarLeadTool(orgId: string, nome: string) {
  const { data } = await admin
    .from("leads")
    .select("id, nome, telefone_e164")
    .eq("org_id", orgId)
    .is("arquivado_em", null)
    .ilike("nome", `%${nome}%`)
    .limit(5);
  return data ?? [];
}

async function chamarClaude(mensagens: unknown[]) {
  const resposta = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        "Você é o assistente interno de vendas do CRM 'Meu Vendedor', falando por WhatsApp com um vendedor da equipe. " +
        "Seu único trabalho nesta fase: se a mensagem descrever algo que aconteceu com um lead (uma ligação, uma resposta, um combinado) " +
        "e a pessoa parece querer isso registrado, use a ferramenta buscar_lead pra achar o lead pelo nome citado, e depois " +
        "propor_nota com um resumo claro e objetivo do que aconteceu (terceira pessoa, direto ao ponto). " +
        "Se buscar_lead não achar nada ou achar mais de um lead parecido, NÃO chame propor_nota — responda em texto simples " +
        "pedindo pra pessoa confirmar o nome completo do lead. " +
        "Se a mensagem não tiver nada a ver com um lead específico, responda em texto simples e curto explicando que por " +
        "enquanto você só sabe registrar nota em lead.",
      tools: TOOLS,
      messages: mensagens,
    }),
  });
  return resposta.json();
}

async function processarComandoNovo(usuario: Usuario, telefone: string, texto: string) {
  const mensagens: Array<{ role: string; content: unknown }> = [{ role: "user", content: texto }];

  for (let iteracao = 0; iteracao < 4; iteracao++) {
    const resultado = await chamarClaude(mensagens);
    const blocos = resultado?.content ?? [];
    const usoDeFerramenta = blocos.find((b: { type: string }) => b.type === "tool_use");

    if (!usoDeFerramenta) {
      const respostaTexto = blocos.find((b: { type: string }) => b.type === "text")?.text;
      if (respostaTexto) await enviarWhatsapp(telefone, respostaTexto);
      return;
    }

    if (usoDeFerramenta.name === "buscar_lead") {
      const encontrados = await buscarLeadTool(usuario.org_id, usoDeFerramenta.input.nome);
      mensagens.push({ role: "assistant", content: blocos });
      mensagens.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: usoDeFerramenta.id,
            content: JSON.stringify(encontrados),
          },
        ],
      });
      continue;
    }

    if (usoDeFerramenta.name === "propor_nota") {
      const { lead_id: leadId, conteudo } = usoDeFerramenta.input as {
        lead_id: string;
        conteudo: string;
      };

      const { data: lead } = await admin
        .from("leads")
        .select("id, nome, org_id")
        .eq("id", leadId)
        .eq("org_id", usuario.org_id)
        .maybeSingle();

      if (!lead) {
        await enviarWhatsapp(telefone, "Não encontrei esse lead — tenta de novo com o nome completo.");
        return;
      }

      const podeEscrever = await podeAnotarNoLead(usuario, lead.id);
      if (!podeEscrever) {
        await enviarWhatsapp(
          telefone,
          `Esse lead (${lead.nome}) não é seu — só quem é responsável por ele ou um admin pode anotar.`
        );
        return;
      }

      const resumo = `Anotar em ${lead.nome}: "${conteudo}" — confirma? (responde SIM ou NÃO)`;
      await admin.from("agente_pendencias").upsert(
        {
          org_id: usuario.org_id,
          usuario_id: usuario.id,
          lead_id: lead.id,
          tipo: "registrar_nota",
          conteudo,
          resumo,
        },
        { onConflict: "usuario_id" }
      );
      await enviarWhatsapp(telefone, resumo);
      return;
    }

    return;
  }

  await enviarWhatsapp(telefone, "Não consegui entender direito — tenta reformular?");
}

async function processarRespostaDePendencia(
  usuario: Usuario,
  telefone: string,
  pendencia: { id: string; lead_id: string; conteudo: string },
  texto: string
) {
  if (PALAVRAS_CONFIRMA.test(texto.trim())) {
    const { data: lead } = await admin
      .from("leads")
      .select("nome")
      .eq("id", pendencia.lead_id)
      .maybeSingle();
    await registrarNotaDeVerdade(usuario, pendencia.lead_id, pendencia.conteudo);
    await admin.from("agente_pendencias").delete().eq("id", pendencia.id);
    await enviarWhatsapp(telefone, `Anotado ✅ em ${lead?.nome ?? "lead"}.`);
    return;
  }

  if (PALAVRAS_CANCELA.test(texto.trim())) {
    await admin.from("agente_pendencias").delete().eq("id", pendencia.id);
    await enviarWhatsapp(telefone, "Beleza, cancelei.");
    return;
  }

  // Nem confirmou nem cancelou — descarta a pendência velha e trata essa
  // mensagem como um comando novo.
  await admin.from("agente_pendencias").delete().eq("id", pendencia.id);
  await processarComandoNovo(usuario, telefone, texto);
}

async function processar(mensagemBrutaId: string, usuario: Usuario, telefone: string, texto: string) {
  try {
    const { data: pendencia } = await admin
      .from("agente_pendencias")
      .select("id, lead_id, conteudo")
      .eq("usuario_id", usuario.id)
      .maybeSingle();

    if (pendencia) {
      await processarRespostaDePendencia(usuario, telefone, pendencia, texto);
    } else {
      await processarComandoNovo(usuario, telefone, texto);
    }

    await admin
      .from("mensagens_brutas")
      .update({ processado_em: new Date().toISOString() })
      .eq("id", mensagemBrutaId);
  } catch (erro) {
    await admin
      .from("mensagens_brutas")
      .update({ processado_em: new Date().toISOString(), erro: String(erro) })
      .eq("id", mensagemBrutaId);
  }
}

Deno.serve(async (req: Request) => {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const fromMe = payload.fromMe === true;
  const isGroup = payload.isGroup === true;
  const texto = (payload.text as { message?: string } | undefined)?.message;
  const phone = payload.phone as string | undefined;
  const messageId = payload.messageId as string | undefined;

  if (fromMe || isGroup || !texto || !phone || !messageId) {
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const telefoneNormalizado = normalizarTelefone(phone);
  const usuario = await acharUsuarioPorTelefone(telefoneNormalizado);
  if (!usuario) {
    // Número não é de ninguém da equipe — nada pra registrar, nem em
    // mensagens_brutas (a tabela exige org_id, que só sabemos depois de
    // achar o usuário).
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const { data: mensagemInserida, error: erroInsercao } = await admin
    .from("mensagens_brutas")
    .insert({
      org_id: usuario.org_id,
      canal: "A",
      provider_message_id: messageId,
      telefone_e164: telefoneNormalizado,
      payload,
    })
    .select("id")
    .single();

  if (erroInsercao) {
    // 23505 = mensagem repetida (idempotência) — já foi processada antes,
    // não reprocessa.
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  EdgeRuntime.waitUntil(processar(mensagemInserida.id, usuario, phone, texto));

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
