import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/top-bar";
import { KanbanBoard } from "@/components/kanban-board";

type NivelResumo = {
  ordem: number;
  nome: string;
};

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
};

export default async function LeadsPage() {
  const supabase = await createClient();

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome").order("ordem"),
    supabase
      .from("leads")
      .select("id, nome, telefone_e164, origem, nivel_ordem, declarado_em")
      .is("arquivado_em", null)
      .order("declarado_em", { ascending: false }),
  ]);

  const niveis = (niveisData ?? []) as NivelResumo[];
  const leads = (leadsData ?? []) as LeadResumo[];

  const leadsPorNivel: Record<number, LeadResumo[]> = {};
  for (const lead of leads) {
    const lista = leadsPorNivel[lead.nivel_ordem] ?? [];
    lista.push(lead);
    leadsPorNivel[lead.nivel_ordem] = lista;
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <TopBar
        acaoPrincipal={
          <Link
            href="/leads/novo"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
          >
            + Novo lead
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">
            Funil de leads
          </h1>
          <span className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} no total
          </span>
        </div>

        <KanbanBoard niveis={niveis} leadsPorNivel={leadsPorNivel} />
      </main>
    </div>
  );
}
