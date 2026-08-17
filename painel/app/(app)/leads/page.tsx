import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { FiltroUsuarioSelect } from "@/components/filtro-usuario-select";
import type { NivelResumo } from "@/lib/niveis";

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  status: string;
  responsavel_id: string | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string }>;
}) {
  const { usuario: usuarioFiltro } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, nivel_ordem, declarado_em, status, responsavel_id")
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .order("declarado_em", { ascending: false });

  if (usuarioFiltro) {
    consulta = consulta.eq("responsavel_id", usuarioFiltro);
  }

  const [{ data: niveisData }, { data: leadsData }, { data: usuarioAtual }, { data: usuariosData }] =
    await Promise.all([
      supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
      consulta,
      user
        ? supabase.from("usuarios").select("papel").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("usuarios").select("id, nome").order("nome"),
    ]);

  const niveis = ((niveisData ?? []) as NivelResumo[]).filter((nivel) => nivel.ordem !== 7);
  const leads = (leadsData ?? []) as LeadResumo[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const usuarios = usuariosData ?? [];

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
          <div className="flex items-center gap-3">
            <FiltroUsuarioSelect usuarios={usuarios} valorInicial={usuarioFiltro} />
            <Link
              href="/leads/novo"
              className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
            >
              + Novo lead
            </Link>
          </div>
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

        <KanbanBoard
          niveis={niveis}
          leadsPorNivel={leadsPorNivel}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
        />
      </main>
    </>
  );
}
