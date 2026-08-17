"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoExclusao = { erro: string | null; precisaTransferir?: boolean };
export type EstadoFormulario = { erro: string | null };

export async function excluirUsuario(
  usuarioId: string,
  _estadoAnterior: EstadoExclusao,
  formData: FormData
): Promise<EstadoExclusao> {
  const supabase = await createClient();

  const transferirPara = String(formData.get("transferir_para") ?? "").trim() || null;

  const { error } = await supabase.rpc("excluir_usuario", {
    usuario_id_alvo: usuarioId,
    transferir_para: transferirPara,
  });

  if (error) {
    return {
      erro: error.message,
      precisaTransferir: error.message.includes("vinculadas"),
    };
  }

  revalidatePath("/usuarios");
  return { erro: null };
}

export async function criarUsuario(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const wppComercial = String(formData.get("wpp_comercial") ?? "").trim() || null;
  const papel = String(formData.get("papel") ?? "membro");
  const paginasPermitidas = formData.getAll("paginas_permitidas").map(String);

  if (!nome || !email || senha.length < 6) {
    return { erro: "Nome, e-mail e senha (mínimo 6 caracteres) são obrigatórios" };
  }

  const { error } = await supabase.functions.invoke("criar-usuario", {
    body: {
      nome,
      email,
      senha,
      papel,
      paginas_permitidas: paginasPermitidas,
      wpp_comercial_e164: wppComercial,
    },
  });

  if (error) {
    let mensagem = error.message ?? "Não deu pra criar o usuário";
    const contexto = (error as { context?: Response }).context;
    if (contexto instanceof Response) {
      try {
        const corpo = (await contexto.clone().json()) as { erro?: string };
        if (corpo?.erro) mensagem = corpo.erro;
      } catch {
        // resposta sem corpo JSON, mantém a mensagem padrão
      }
    }
    return { erro: mensagem };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function atualizarPermissoes(
  usuarioId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const papel = String(formData.get("papel") ?? "membro");
  const paginasPermitidas = formData.getAll("paginas_permitidas").map(String);

  const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
    usuario_id_alvo: usuarioId,
    novo_papel: papel,
    novas_paginas: paginasPermitidas,
  });

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}
