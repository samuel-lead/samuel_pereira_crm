import { notFound } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { BuscaLeads } from "@/components/busca-leads";
import { BaseLeadsBoard, type LeadBase, type MotivoBase } from "@/components/base-leads-board";
import { aplicarBuscaLead } from "@/lib/busca-leads";
import { buscarTodasEmParalelo } from "@/lib/supabase/paginar";
import { niveisReativacaoDaOrg, numerarNiveis, type NivelResumo, ordenarNiveisDoFunil } from "@/lib/niveis";
import { ORG_ID_SAMUEL } from "@/lib/scripts-sdr";

// Farm (Samuel, 16/11/26): funil novo, só no CRM do Samuel por enquanto.
// Primeira versão: mostra os leads que estão em Farming (os mesmos da coluna
// "Farming" da Base de leads), numa tela só deles.
export default async function FarmPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca: buscaFiltro } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.org_id !== ORG_ID_SAMUEL) notFound();

  const souAdmin = usuario.papel === "admin";
  const publicoOrg = usuario.publico_org ?? "mentoria";

  const montarConsulta = (de: number, ate: number) => {
    let consulta = supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, instagram, foto_url, origem, quem_indicou, responsavel_id, entrou_nivel_em, proposta_valor, motivo_base_detalhe, voltar_da_base_em"
      )
      .eq("nivel_ordem", 9)
      .eq("motivo_base", "farming")
      .neq("status", "vendido")
      .is("arquivado_em", null);

    if (buscaFiltro) {
      consulta = aplicarBuscaLead(consulta, buscaFiltro);
    }

    return consulta.order("entrou_nivel_em", { ascending: false }).order("id").range(de, ate);
  };

  const [{ data: leadsData }, { data: usuariosData }, { data: niveisData }] = await Promise.all([
    buscarTodasEmParalelo(montarConsulta),
    supabase.from("usuarios").select("id, nome, foto_url, funcao, papel"),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
  ]);

  const todosNiveis = ordenarNiveisDoFunil((niveisData ?? []) as NivelResumo[]);
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const niveisReativacao = todosNiveis.filter((nivel) => niveisReativacaoDaOrg(publicoOrg).includes(nivel.ordem));

  const leads = (leadsData ?? []) as LeadBase[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));
  const fotoPorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.foto_url]));

  const leadsPorMotivo: Record<MotivoBase, LeadBase[]> = {
    desqualificado: [],
    nao_reagendados: [],
    proposta_nao_comprou: [],
    nao_iniciou_conversa: [],
    qualificou_sumiu: [],
    iniciou_sem_interesse: [],
    farming: leads,
    sem_condicao_pagar: [],
    comprou_concorrente: [],
  };

  return (
    <>
      <BarraFixaKanban>
        <PageHeader
          titulo="Farm"
          acao={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <BuscaLeads />
            </div>
          }
        />
        <div className="border-b border-neutral-200 px-6 py-4">
          <p className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} em Farm
          </p>
        </div>
      </BarraFixaKanban>

      <main className="flex flex-col px-4 py-4 md:h-[calc(100vh-var(--kanban-barra-altura,0px))] md:overflow-hidden md:px-6 md:py-6">
        <BaseLeadsBoard
          leadsPorMotivo={leadsPorMotivo}
          apenasColunas={["farming"]}
          nomePorUsuario={nomePorUsuario}
          fotoPorUsuario={fotoPorUsuario}
          niveisReativacao={niveisReativacao}
          numerosVisiveis={numerosVisiveis}
          usuarios={usuariosData ?? []}
          souAdmin={souAdmin}
          publicoOrg={publicoOrg}
        />
      </main>
    </>
  );
}
