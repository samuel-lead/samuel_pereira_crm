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

export type RotinaEquipe = {
  // Últimos 7 dias (do mais antigo pro de hoje), "AAAA-MM-DD".
  dias: string[];
  pessoas: { id: string; nome: string; porDia: Record<string, string[]> }[];
};

// Só admin: quem da equipe (SDRs) marcou o quê na rotina, hoje e nos 6
// dias anteriores. Samuel pediu pra conferir se o time realmente usa o
// check — antes o admin abria a tela e via só a própria rotina.
export async function buscarRotinaEquipe(): Promise<RotinaEquipe | null> {
  const { supabase, usuario } = await contextoUsuario();

  const { data: eu } = await supabase
    .from("usuarios")
    .select("papel")
    .eq("id", usuario.id)
    .single();
  if (eu?.papel !== "admin") return null;

  const hoje = hojeBrasil();
  const [ano, mes, dia] = hoje.split("-").map(Number);
  const dias: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.UTC(ano, mes - 1, dia - i));
    dias.push(d.toISOString().slice(0, 10));
  }

  const [{ data: sdrs }, { data: marcacoes }] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nome")
      .eq("org_id", usuario.org_id)
      .eq("funcao", "sdr")
      .order("nome"),
    supabase
      .from("rotina_diaria_status")
      .select("usuario_id, data, atividade")
      .eq("org_id", usuario.org_id)
      .gte("data", dias[0])
      .lte("data", hoje),
  ]);

  const pessoas = (sdrs ?? []).map((sdr) => {
    const porDia: Record<string, string[]> = {};
    for (const m of marcacoes ?? []) {
      if (m.usuario_id !== sdr.id) continue;
      (porDia[m.data] ??= []).push(m.atividade);
    }
    return { id: sdr.id, nome: sdr.nome, porDia };
  });

  return { dias, pessoas };
}
