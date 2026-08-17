"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type EstadoExclusao = { erro: string | null };

export async function excluirUsuario(
  usuarioId: string,
  _estadoAnterior: EstadoExclusao
): Promise<EstadoExclusao> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("excluir_usuario", {
    usuario_id_alvo: usuarioId,
  });

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/usuarios");
  return { erro: null };
}
