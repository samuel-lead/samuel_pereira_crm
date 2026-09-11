"use server";

import { revalidatePath } from "next/cache";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";

async function contextoUsuario() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

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

// Data de hoje no fuso do Brasil — sem isso, um servidor rodando em UTC
// (Vercel) podia marcar a atividade no dia errado pra quem usa de noite.
function hojeBrasil() {
  const agora = new Date();
  const local = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ano = local.getFullYear();
  const mes = String(local.getMonth() + 1).padStart(2, "0");
  const dia = String(local.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export async function buscarRotinaHoje(): Promise<string[]> {
  const { supabase, usuario } = await contextoUsuario();

  const { data } = await supabase
    .from("rotina_diaria_status")
    .select("atividade")
    .eq("usuario_id", usuario.id)
    .eq("data", hojeBrasil());

  return (data ?? []).map((r) => r.atividade);
}

export async function alternarAtividadeRotina(
  atividade: string,
  concluida: boolean
): Promise<{ erro: string | null }> {
  const { supabase, usuario } = await contextoUsuario();
  const data = hojeBrasil();

  if (concluida) {
    const { error } = await supabase
      .from("rotina_diaria_status")
      .upsert(
        { org_id: usuario.org_id, usuario_id: usuario.id, data, atividade },
        { onConflict: "usuario_id,data,atividade" }
      );
    if (error) return { erro: error.message };
  } else {
    const { error } = await supabase
      .from("rotina_diaria_status")
      .delete()
      .eq("usuario_id", usuario.id)
      .eq("data", data)
      .eq("atividade", atividade);
    if (error) return { erro: error.message };
  }

  revalidatePath("/rotina");
  return { erro: null };
}
