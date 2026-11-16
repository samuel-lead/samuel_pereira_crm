import { PaginaDeLeads, type ParametrosLeads } from "@/components/pagina-de-leads";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<ParametrosLeads> }) {
  return PaginaDeLeads({ searchParams, funil: null });
}
