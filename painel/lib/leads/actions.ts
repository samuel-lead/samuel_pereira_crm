"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

export async function criarLead(formData: FormData) {
  const { supabase, usuario } = await contextoUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefone = String(formData.get("telefone") ?? "").trim() || null;
  const origem = String(formData.get("origem") ?? "").trim() || null;

  if (!nome) {
    throw new Error("Nome é obrigatório");
  }

  const { error } = await supabase.from("leads").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    nome,
    telefone_e164: telefone,
    origem,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  redirect("/leads");
}

export async function atualizarLead(leadId: string, formData: FormData) {
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

  if (!nome) {
    throw new Error("Nome é obrigatório");
  }

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    throw new Error("Lead não encontrado");
  }

  const nivelMudou = novoNivel !== leadAtual.nivel_ordem;

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
    throw new Error(error.message);
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
      throw new Error(erroHistorico.message);
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  redirect("/leads");
}
