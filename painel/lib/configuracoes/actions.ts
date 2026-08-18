"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoFoto = { erro: string | null };

const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;

export async function atualizarFotoPerfil(
  _estadoAnterior: EstadoFoto,
  formData: FormData
): Promise<EstadoFoto> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Não autenticado" };
  }

  const arquivo = formData.get("foto");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma imagem" };
  }

  if (!arquivo.type.startsWith("image/")) {
    return { erro: "O arquivo precisa ser uma imagem" };
  }

  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return { erro: "Imagem muito grande (máximo 2MB)" };
  }

  const { error: erroUpload } = await supabase.storage
    .from("avatars")
    .upload(user.id, arquivo, { upsert: true, contentType: arquivo.type });

  if (erroUpload) {
    return { erro: erroUpload.message };
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(user.id);
  const fotoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: erroUpdate } = await supabase
    .from("usuarios")
    .update({ foto_url: fotoUrl })
    .eq("id", user.id);

  if (erroUpdate) {
    return { erro: erroUpdate.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/usuarios");
  return { erro: null };
}

export async function atualizarOrg(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (erroUsuario || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const vocabularioEncontro = String(formData.get("vocabulario_encontro") ?? "").trim();
  const criterio1 = String(formData.get("criterio_1_label") ?? "").trim();
  const criterio2 = String(formData.get("criterio_2_label") ?? "").trim();
  const criterio3 = String(formData.get("criterio_3_label") ?? "").trim();
  const ticketMedioRaw = String(formData.get("ticket_medio_padrao") ?? "").trim();
  const ticketMedio = ticketMedioRaw ? Number(ticketMedioRaw) : null;

  if (!nome || !vocabularioEncontro || !criterio1 || !criterio2 || !criterio3) {
    throw new Error("Todos os campos de texto são obrigatórios");
  }

  const { error } = await supabase
    .from("orgs")
    .update({
      nome,
      vocabulario_encontro: vocabularioEncontro,
      criterio_1_label: criterio1,
      criterio_2_label: criterio2,
      criterio_3_label: criterio3,
      ticket_medio_padrao: ticketMedio,
    })
    .eq("id", usuario.org_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/configuracoes");
}

export async function atualizarMetasConfig(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("org_id, papel")
    .eq("id", user.id)
    .single();

  if (erroUsuario || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  if (usuario.papel !== "admin") {
    throw new Error("Só admin pode editar metas e taxas do sistema");
  }

  const pisoLeadsDia = Number(formData.get("piso_leads_dia"));
  const pisoReunioesDia = Number(formData.get("piso_reunioes_dia"));
  const taxaAgendamentoMin = Number(formData.get("taxa_agendamento_min")) / 100;
  const taxaComparecimentoMin = Number(formData.get("taxa_comparecimento_min")) / 100;
  const taxaVendaMin = Number(formData.get("taxa_venda_min")) / 100;

  if (
    !Number.isFinite(pisoLeadsDia) || pisoLeadsDia <= 0 ||
    !Number.isFinite(pisoReunioesDia) || pisoReunioesDia <= 0 ||
    !Number.isFinite(taxaAgendamentoMin) || taxaAgendamentoMin <= 0 || taxaAgendamentoMin > 1 ||
    !Number.isFinite(taxaComparecimentoMin) || taxaComparecimentoMin <= 0 || taxaComparecimentoMin > 1 ||
    !Number.isFinite(taxaVendaMin) || taxaVendaMin <= 0 || taxaVendaMin > 1
  ) {
    throw new Error("Valores inválidos — piso maior que zero, taxas entre 1% e 100%");
  }

  const { error } = await supabase
    .from("metas_config")
    .update({
      piso_leads_dia: pisoLeadsDia,
      piso_reunioes_dia: pisoReunioesDia,
      taxa_agendamento_min: taxaAgendamentoMin,
      taxa_comparecimento_min: taxaComparecimentoMin,
      taxa_venda_min: taxaVendaMin,
    })
    .eq("org_id", usuario.org_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath("/metricas");
}
