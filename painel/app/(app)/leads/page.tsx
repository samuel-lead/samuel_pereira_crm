import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import type { NivelResumo } from "@/lib/niveis";

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  status: string;
};

export default async function LeadsPage() {
  const supabase = await createClient();

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    supabase
      .from("leads")
      .select("id, nome, telefone_e164, origem, nivel_ordem, declarado_em, status")
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .order("declarado_em", { ascending: false }),
  ]);

  const niveis = ((niveisData ?? []) as NivelResumo[]).filter((nivel) => nivel.ordem !== 7);
  const leads = (leadsData ?? []) as LeadResumo[];

  const leadsPorNivel: Record<number, LeadResumo[]> = {};
  for (const lead of leads) {
    const lista = leadsPorNivel[lead.nivel_ordem] ?? [];
    lista.push(lead);
    leadsPorNivel[lead.nivel_ordem] = lista;
  }

  return (
    <>
      <PageHeader
        titulo="Leads"
        acao={
          <Link
            href="/leads/novo"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
          >
            + Novo lead
          </Link>
        }
      />

      <main className="px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} sendo trabalhados
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/leads/base"
              className="text-sm font-medium text-stone-600 hover:text-stone-700"
            >
              Base →
            </Link>
            <Link
              href="/leads/vendas"
              className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              Vendas →
            </Link>
            <Link
              href="/leads/lista"
              className="text-sm font-medium text-violet-600 hover:text-violet-700"
            >
              Ver em lista →
            </Link>
          </div>
        </div>

        <KanbanBoard niveis={niveis} leadsPorNivel={leadsPorNivel} />
      </main>
    </>
  );
}
