import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { FiltroUsuarioSelect } from "@/components/filtro-usuario-select";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { anexarUltimaAtividade } from "@/lib/leads/atividade";
import {
  buscarMetaReceitaMes,
  calcularReceitaOrg,
  inicioDoMes,
} from "@/lib/metricas";
import { NIVEIS_PRE_VENDAS, numerarNiveis, type NivelResumo } from "@/lib/niveis";

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  entrou_nivel_em: string;
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
    .select(
      "id, nome, telefone_e164, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id"
    )
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .in("nivel_ordem", NIVEIS_PRE_VENDAS)
    .order("declarado_em", { ascending: false });

  if (usuarioFiltro) {
    consulta = consulta.eq("responsavel_id", usuarioFiltro);
  }

  const [{ data: niveisData }, { data: leadsData }, { data: usuarioAtual }, { data: usuariosData }] =
    await Promise.all([
      supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
      consulta,
      user
        ? supabase.from("usuarios").select("org_id, papel").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("usuarios").select("id, nome").order("nome"),
    ]);

  const todosNiveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const niveis = todosNiveis.filter((nivel) => NIVEIS_PRE_VENDAS.includes(nivel.ordem));
  const leads = (leadsData ?? []) as LeadResumo[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const usuarios = usuariosData ?? [];

  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const orgId = usuarioAtual?.org_id ?? null;

  const [receitaOrgMes, metaReceita] = orgId
    ? await Promise.all([
        calcularReceitaOrg(supabase, orgId, inicioDoMes(agora), amanha),
        buscarMetaReceitaMes(supabase, orgId, agora.getFullYear(), agora.getMonth() + 1),
      ])
    : [null, null];

  const leadsComAtividade = await anexarUltimaAtividade(supabase, leads);

  const leadsPorNivel: Record<number, typeof leadsComAtividade> = {};
  for (const lead of leadsComAtividade) {
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} sendo trabalhados
          </p>
          {receitaOrgMes !== null && (
            <MetaReceitaWidget
              compacta
              metaReceita={metaReceita}
              receitaAtual={receitaOrgMes}
              podeEditar={souAdmin}
            />
          )}
        </div>

        <KanbanBoard
          niveis={niveis}
          leadsPorNivel={leadsPorNivel}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
          numerosVisiveis={numerosVisiveis}
        />
      </main>
    </>
  );
}
