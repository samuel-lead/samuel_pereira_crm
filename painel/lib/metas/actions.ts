"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { diasUteisEntre, inicioDoMes } from "@/lib/metricas";

export type EstadoMeta = { erro: string | null };

// Meta é sempre sobre receita — o dinheiro que entra no caixa, não o valor
// bruto da venda (faturamento). É uma meta só, da empresa toda — não por
// usuário. Só admin pode definir/editar (todo mundo só visualiza).
export async function definirMetaReceita(
  _estadoAnterior: EstadoMeta,
  formData: FormData
): Promise<EstadoMeta> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erro: "Não autenticado" };
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("id, org_id, papel")
    .eq("id", user.id)
    .single();

  if (erroUsuario || !usuario) {
    return { erro: "Usuário não encontrado" };
  }

  if (usuario.papel !== "admin") {
    return { erro: "Só administradores podem definir a meta." };
  }

  const valorRaw = String(formData.get("meta_receita") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe um valor de meta válido" };
  }

  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;

  const { data: org } = await supabase
    .from("orgs")
    .select("ticket_medio_padrao")
    .eq("id", usuario.org_id)
    .single();

  const ticketMedio = Number(org?.ticket_medio_padrao ?? 0);
  const inicio = inicioDoMes(agora);
  const inicioProximoMes = new Date(ano, mes, 1);
  const diasUteis = diasUteisEntre(inicio, inicioProximoMes);

  const { error } = await supabase.from("metas_mensais").upsert(
    {
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      ano,
      mes,
      meta_receita: valor,
      ticket_medio: ticketMedio,
      dias_uteis: diasUteis,
    },
    { onConflict: "org_id,ano,mes" }
  );

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/leads");
  revalidatePath("/dashboard");
  return { erro: null };
}
