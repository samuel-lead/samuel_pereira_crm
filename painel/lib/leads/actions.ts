"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = { erro: string | null };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;
const NIVEL_REUNIAO_FEITA = 6;

async function contextoUsuario() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, org_id")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  return { supabase, usuario };
}

function mensagemAmigavel(codigo: string | undefined, mensagemOriginal: string) {
  if (codigo === "23505") {
    return "Já existe um lead com esse telefone.";
  }
  return mensagemOriginal;
}

// Mantém a tabela `reunioes` em sincronia com a mudança de nível.
// Entrando em "Reunião marcada": cria a reunião (data de agendamento = agora,
// data da reunião = o que a pessoa informou). Saindo de "Reunião marcada"
// pra "No Show" ou "Reunião feita": atualiza o status da reunião mais recente.
async function sincronizarReuniao(
  supabase: SupabaseServerClient,
  params: {
    orgId: string;
    usuarioId: string;
    leadId: string;
    deOrdem: number;
    paraOrdem: number;
    agendadaPara?: string | null;
  }
): Promise<string | null> {
  const { orgId, usuarioId, leadId, deOrdem, paraOrdem, agendadaPara } = params;

  if (paraOrdem === NIVEL_REUNIAO_MARCADA && deOrdem !== NIVEL_REUNIAO_MARCADA) {
    if (!agendadaPara) {
      return "Informe a data e hora da reunião.";
    }

    const data = new Date(agendadaPara);
    if (Number.isNaN(data.getTime())) {
      return "Data da reunião inválida.";
    }

    const { error } = await supabase.from("reunioes").insert({
      org_id: orgId,
      usuario_id: usuarioId,
      lead_id: leadId,
      agendada_para: data.toISOString(),
      status: "marcada",
    });

    if (error) return error.message;
    return null;
  }

  if (
    deOrdem === NIVEL_REUNIAO_MARCADA &&
    (paraOrdem === NIVEL_NO_SHOW || paraOrdem === NIVEL_REUNIAO_FEITA)
  ) {
    const { data: reuniao } = await supabase
      .from("reunioes")
      .select("id")
      .eq("lead_id", leadId)
      .eq("status", "marcada")
      .order("marcada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reuniao) {
      const novoStatus = paraOrdem === NIVEL_NO_SHOW ? "nao_compareceu" : "realizada";
      const { error } = await supabase
        .from("reunioes")
        .update({ status: novoStatus })
        .eq("id", reuniao.id);
      if (error) return error.message;
    }
    return null;
  }

  return null;
}

export async function criarLead(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const origem = String(formData.get("origem") ?? "").trim() || null;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { error } = await supabase.from("leads").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    nome,
    telefone_e164: telefone,
    origem,
  });

  if (error) {
    return { erro: mensagemAmigavel(error.code, error.message) };
  }

  revalidatePath("/leads");
  redirect("/leads");
}

export async function atualizarLead(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const origem = String(formData.get("origem") ?? "").trim() || null;
  const criterioProblema =
    String(formData.get("criterio_problema") ?? "").trim() || null;
  const criterioUrgencia = String(
    formData.get("criterio_urgencia") ?? "desconhecida"
  );
  const criterioCapacidade = String(
    formData.get("criterio_capacidade") ?? "desconhecida"
  );
  const novoNivel = Number(formData.get("nivel_ordem"));
  const reuniaoData = String(formData.get("reuniao_data") ?? "").trim() || null;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    return { erro: "Lead não encontrado" };
  }

  const nivelMudou = novoNivel !== leadAtual.nivel_ordem;

  if (nivelMudou) {
    const erroReuniao = await sincronizarReuniao(supabase, {
      orgId: usuario.org_id,
      usuarioId: usuario.id,
      leadId,
      deOrdem: leadAtual.nivel_ordem,
      paraOrdem: novoNivel,
      agendadaPara: reuniaoData,
    });
    if (erroReuniao) {
      return { erro: erroReuniao };
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nome,
      telefone_e164: telefone,
      origem,
      criterio_problema: criterioProblema,
      criterio_urgencia: criterioUrgencia,
      criterio_capacidade: criterioCapacidade,
      nivel_ordem: novoNivel,
      ...(nivelMudou ? { entrou_nivel_em: new Date().toISOString() } : {}),
    })
    .eq("id", leadId);

  if (error) {
    return { erro: mensagemAmigavel(error.code, error.message) };
  }

  if (nivelMudou) {
    const { error: erroHistorico } = await supabase
      .from("nivel_historico")
      .insert({
        org_id: usuario.org_id,
        lead_id: leadId,
        de_ordem: leadAtual.nivel_ordem,
        para_ordem: novoNivel,
        motivo: "Editado manualmente no painel",
        automatico: false,
      });

    if (erroHistorico) {
      return { erro: erroHistorico.message };
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect("/leads");
}

export async function moverLeadNivel(
  leadId: string,
  novoNivel: number,
  agendadaPara?: string | null
) {
  const { supabase, usuario } = await contextoUsuario();

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    throw new Error("Lead não encontrado");
  }

  if (leadAtual.nivel_ordem === novoNivel) {
    return;
  }

  const erroReuniao = await sincronizarReuniao(supabase, {
    orgId: usuario.org_id,
    usuarioId: usuario.id,
    leadId,
    deOrdem: leadAtual.nivel_ordem,
    paraOrdem: novoNivel,
    agendadaPara,
  });
  if (erroReuniao) {
    throw new Error(erroReuniao);
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nivel_ordem: novoNivel,
      entrou_nivel_em: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    throw new Error(mensagemAmigavel(error.code, error.message));
  }

  const { error: erroHistorico } = await supabase.from("nivel_historico").insert({
    org_id: usuario.org_id,
    lead_id: leadId,
    de_ordem: leadAtual.nivel_ordem,
    para_ordem: novoNivel,
    motivo: "Arrastado no Kanban",
    automatico: false,
  });

  if (erroHistorico) {
    throw new Error(erroHistorico.message);
  }

  revalidatePath("/leads");
  revalidatePath("/leads/lista");
  revalidatePath(`/leads/${leadId}`);
}

export async function marcarVendido(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase } = await contextoUsuario();

  const valorRaw = String(formData.get("valor_venda") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe o valor da venda" };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      status: "vendido",
      valor_venda: valor,
      vendido_em: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    return { erro: error.message };
  }

  const { data: reuniao } = await supabase
    .from("reunioes")
    .select("id")
    .eq("lead_id", leadId)
    .order("marcada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reuniao) {
    await supabase
      .from("reunioes")
      .update({ resultado: "vendeu", valor })
      .eq("id", reuniao.id);
  }

  revalidatePath("/leads");
  revalidatePath("/leads/lista");
  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export async function registrarNota(leadId: string, formData: FormData) {
  const { supabase, usuario } = await contextoUsuario();

  const conteudo = String(formData.get("conteudo") ?? "").trim();

  if (!conteudo) {
    throw new Error("Escreva algo pra registrar");
  }

  const { error } = await supabase.from("interacoes").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    lead_id: leadId,
    tipo: "nota",
    canal: "manual",
    conteudo,
    ocorreu_em: new Date().toISOString(),
    origem: "declarado",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leads/${leadId}`);
}

export async function arquivarLead(leadId: string) {
  const { supabase } = await contextoUsuario();

  const { error } = await supabase
    .from("leads")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath("/leads/lista");
  revalidatePath("/leads/base");
  revalidatePath("/leads/vendas");
  redirect("/leads");
}
