import { notFound } from "next/navigation";
import { usuarioAutenticado } from "@/lib/supabase/server";
import { ORG_ID_SAMUEL } from "@/lib/scripts-sdr";
import { PaginaDeLeads, type ParametrosLeads } from "@/components/pagina-de-leads";

// Farming (Samuel, 16/11/26): funil com as mesmas etapas do Pré-vendas, só no
// CRM do Samuel por enquanto.
export default async function FarmingPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosLeads>;
}) {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.org_id !== ORG_ID_SAMUEL) notFound();
  return PaginaDeLeads({ searchParams, funil: "farming" });
}
