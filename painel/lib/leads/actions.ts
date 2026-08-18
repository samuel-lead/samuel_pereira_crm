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
    .select("id, org_id, papel")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  return { supabase, usuario };
}

type UsuarioContexto = { id: string; org_id: string; papel: string };

const ERRO_SEM_PERMISSAO = "Você só pode mexer em leads que são seus.";

// Só admin ou o próprio responsável pelo lead podem alterar/arquivar/anotar.
// Todo mundo com acesso ao Funil continua enxergando o lead (visão de equipe).
async function garantirPodeEditar(
  supabase: SupabaseServerClient,
  usuario: UsuarioContexto,
  leadId: string
): Promise<string | null> {
  if (usuario.papel === "admin") return null;

  const { data: lead, error } = await supabase
    .from("leads")
    .select("responsavel_id")
    .eq("id", leadId)
    .single();

  if (error || !lead) return "Lead não encontrado";
  if (lead.responsavel_id !== usuario.id) return ERRO_SEM_PERMISSAO;
  return null;
}

function mensagemAmigavel(codigo: string | undefined, mensagemOriginal: string) {
  if (codigo === "23505") {
    return "Já existe um lead com esse telefone.";
  }
  return mensagemOriginal;
}

// Mantém a tabela `reunioes` em sincronia com a mudança de nível.
// Entrando em "Reunião marcada": cria a reunião (data de agendamento = o
// que a pessoa informou, default agora — data da reunião = o que a pessoa
// informou). Saindo de "Reunião marcada" pra "No Show" ou "Reunião feita":
// atualiza o status da reunião mais recente.
async function sincronizarReuniao(
  supabase: SupabaseServerClient,
  params: {
    orgId: string;
    usuarioId: string;
    leadId: string;
    deOrdem: number;
    paraOrdem: number;
    agendadaPara?: string | null;
    marcadaEm?: string | null;
    closerId?: string | null;
  }
): Promise<string | null> {
  const { orgId, usuarioId, leadId, deOrdem, paraOrdem, agendadaPara, marcadaEm, closerId } = params;

  if (paraOrdem === NIVEL_REUNIAO_MARCADA && deOrdem !== NIVEL_REUNIAO_MARCADA) {
    if (!agendadaPara) {
      return "Informe a data e hora da reunião.";
    }

    const data = new Date(agendadaPara);
    if (Number.isNaN(data.getTime())) {
      return "Data da reunião inválida.";
    }

    let dataMarcada = new Date();
    if (marcadaEm) {
      const parsed = new Date(marcadaEm);
      if (Number.isNaN(parsed.getTime())) {
        return "Data de agendamento inválida.";
      }
      dataMarcada = parsed;
    }

    const { error } = await supabase.from("reunioes").insert({
      org_id: orgId,
      usuario_id: usuarioId,
      lead_id: leadId,
      agendada_para: data.toISOString(),
      marcada_em: dataMarcada.toISOString(),
      closer_id: closerId || null,
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
  const responsavelId =
    usuario.papel === "admin"
      ? String(formData.get("responsavel_id") ?? "").trim() || null
      : usuario.id;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { error } = await supabase.from("leads").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    nome,
    telefone_e164: telefone,
    origem,
    responsavel_id: responsavelId,
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
  const email = String(formData.get("email") ?? "").trim() || null;
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
  const reuniaoMarcadaEm = String(formData.get("marcada_em") ?? "").trim() || null;
  const closerId = String(formData.get("closer_id") ?? "").trim() || null;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem, responsavel_id")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    return { erro: "Lead não encontrado" };
  }

  if (usuario.papel !== "admin" && leadAtual.responsavel_id !== usuario.id) {
    return { erro: ERRO_SEM_PERMISSAO };
  }

  // Só admin pode trocar quem é o responsável; o "dono" do lead mantém o
  // valor atual (o formulário nem mostra o campo editável pra ele).
  const responsavelId =
    usuario.papel === "admin"
      ? String(formData.get("responsavel_id") ?? "").trim() || null
      : leadAtual.responsavel_id;

  const nivelMudou = novoNivel !== leadAtual.nivel_ordem;

  if (nivelMudou) {
    const erroReuniao = await sincronizarReuniao(supabase, {
      orgId: usuario.org_id,
      usuarioId: usuario.id,
      leadId,
      deOrdem: leadAtual.nivel_ordem,
      paraOrdem: novoNivel,
      agendadaPara: reuniaoData,
      marcadaEm: reuniaoMarcadaEm,
      closerId,
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
      email,
      origem,
      criterio_problema: criterioProblema,
      criterio_urgencia: criterioUrgencia,
      criterio_capacidade: criterioCapacidade,
      nivel_ordem: novoNivel,
      responsavel_id: responsavelId,
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
    .select("nivel_ordem, responsavel_id")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    throw new Error("Lead não encontrado");
  }

  if (usuario.papel !== "admin" && leadAtual.responsavel_id !== usuario.id) {
    throw new Error(ERRO_SEM_PERMISSAO);
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
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const valorRaw = String(formData.get("valor_venda") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe o valor da venda" };
  }

  const receitaRaw = String(formData.get("receita_venda") ?? "").trim();
  const receita = receitaRaw ? Number(receitaRaw) : null;

  if (!receita || receita <= 0) {
    return { erro: "Informe a receita recebida" };
  }

  const produto = String(formData.get("produto") ?? "").trim() || null;

  const { error } = await supabase
    .from("leads")
    .update({
      status: "vendido",
      valor_venda: valor,
      receita_venda: receita,
      produto,
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

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

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
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

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

// Lead sem responsável (ex.: chegou de uma campanha, sem dono definido)
// pode ser "pego" por qualquer usuário com acesso ao Funil.
export async function reivindicarLead(leadId: string) {
  const { supabase, usuario } = await contextoUsuario();

  const { data: lead, error: erroAtual } = await supabase
    .from("leads")
    .select("responsavel_id")
    .eq("id", leadId)
    .single();

  if (erroAtual || !lead) {
    throw new Error("Lead não encontrado");
  }

  if (lead.responsavel_id !== null) {
    throw new Error("Esse lead já tem responsável.");
  }

  const { error } = await supabase
    .from("leads")
    .update({ responsavel_id: usuario.id })
    .eq("id", leadId);

  if (error) {
    throw new Error(mensagemAmigavel(error.code, error.message));
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}
