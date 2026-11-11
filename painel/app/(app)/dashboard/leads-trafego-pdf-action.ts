"use server";

import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { relatorioTrafegoLiberado } from "@/lib/paginas-ocultas";

// Ketlyn (11/11/26): lista completa dos leads de tráfego (formulários) pro
// PDF da Visão geral. Só admin de imobiliária liberada; o banco (RLS) ainda
// limita tudo à empresa da pessoa.

export type LeadTrafegoPdf = {
  nome: string;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  formulario: string;
  fase: string;
  arquivado: boolean;
  chegouEm: string | null;
  ultimoContatoEm: string | null;
  responsavel: string | null;
  urgencia: string;
  capacidade: string;
  problema: string | null;
  motivoBase: string | null;
  motivoBaseDetalhe: string | null;
  vendido: boolean;
  valorVenda: number | null;
};

export async function leadsDoTrafegoParaPdf(
  origem: string
): Promise<{ leads: LeadTrafegoPdf[] } | { erro: string }> {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || (usuario.papel !== "admin" && !usuario.super_admin)) return { erro: "Sem permissão." };
  if (usuario.publico_org !== "imobiliario") return { erro: "Sem permissão." };

  const supabase = await createClient();
  if (!(await relatorioTrafegoLiberado(supabase, usuario.org_id))) return { erro: "Sem permissão." };

  let consulta = supabase
    .from("leads")
    .select(
      "nome, telefone_e164, email, instagram, origem, nivel_ordem, status, arquivado_em, declarado_em, ultimo_contato_em, responsavel_id, criterio_urgencia, criterio_capacidade, criterio_problema, motivo_base, motivo_base_detalhe, valor_venda"
    )
    .eq("org_id", usuario.org_id)
    .order("declarado_em", { ascending: true })
    .limit(5000);
  consulta = origem === "__trafego__" ? consulta.like("origem", "Formulário:%") : consulta.eq("origem", origem);

  const [{ data: leads, error }, { data: niveis }, { data: usuarios }] = await Promise.all([
    consulta,
    supabase.from("niveis").select("ordem, nome").eq("org_id", usuario.org_id),
    supabase.from("usuarios").select("id, nome").eq("org_id", usuario.org_id),
  ]);
  if (error || !leads) return { erro: "Não foi possível buscar os leads agora." };

  const nomeNivel = new Map((niveis ?? []).map((n) => [n.ordem as number, n.nome as string]));
  const nomeUsuario = new Map((usuarios ?? []).map((u) => [u.id as string, u.nome as string]));

  return {
    leads: leads.map((l) => ({
      nome: l.nome ?? "",
      telefone: l.telefone_e164 ?? null,
      email: l.email ?? null,
      instagram: l.instagram ?? null,
      formulario: String(l.origem ?? "").replace(/^Formulário:\s*/, ""),
      fase: nomeNivel.get(l.nivel_ordem as number) ?? `Nível ${l.nivel_ordem}`,
      arquivado: l.arquivado_em !== null,
      chegouEm: l.declarado_em ?? null,
      ultimoContatoEm: l.ultimo_contato_em ?? null,
      responsavel: l.responsavel_id ? nomeUsuario.get(l.responsavel_id as string) ?? null : null,
      urgencia: l.criterio_urgencia ?? "desconhecida",
      capacidade: l.criterio_capacidade ?? "desconhecida",
      problema: l.criterio_problema ?? null,
      motivoBase: l.motivo_base ?? null,
      motivoBaseDetalhe: l.motivo_base_detalhe ?? null,
      vendido: l.status === "vendido",
      valorVenda: l.valor_venda ?? null,
    })),
  };
}
