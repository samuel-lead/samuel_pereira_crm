import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { BuscaLeads } from "@/components/busca-leads";
import { BaseLeadsBoard, type LeadBase, type MotivoBase } from "@/components/base-leads-board";

type LeadComHistorico = LeadBase & {
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  proposta_enviada_em: string | null;
  motivo_base: string | null;
};

// Motivo já vem escolhido na hora de mover o lead pra Base (ver
// editar-lead-form.tsx). Isso aqui é só reserva pra lead antigo que caiu
// aqui antes dessa escolha existir e nunca teve o motivo salvo.
function calcularMotivo(
  lead: LeadComHistorico,
  ultimaReuniaoStatus: string | undefined
): MotivoBase {
  if (lead.motivo_base) return lead.motivo_base as MotivoBase;

  if (lead.proposta_enviada_em) return "proposta_nao_comprou";

  if (ultimaReuniaoStatus === "nao_compareceu" || ultimaReuniaoStatus === "cancelada") {
    return "nao_reagendados";
  }

  const foiQualificado =
    !!lead.criterio_problema ||
    lead.criterio_urgencia !== "desconhecida" ||
    lead.criterio_capacidade !== "desconhecida";

  return foiQualificado ? "qualificou_sumiu" : "nao_iniciou_conversa";
}

export default async function BasePage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca: buscaFiltro } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("leads")
    .select(
      "id, nome, telefone_e164, foto_url, origem, responsavel_id, entrou_nivel_em, criterio_problema, criterio_urgencia, criterio_capacidade, proposta_enviada_em, proposta_valor, motivo_base"
    )
    .eq("nivel_ordem", 9)
    .neq("status", "vendido")
    .is("arquivado_em", null)
    .order("entrou_nivel_em", { ascending: false });

  if (buscaFiltro) {
    consulta = consulta.ilike("nome", `%${buscaFiltro}%`);
  }

  const [{ data: leadsData }, { data: usuariosData }] = await Promise.all([
    consulta,
    supabase.from("usuarios").select("id, nome"),
  ]);

  const leads = (leadsData ?? []) as LeadComHistorico[];
  const leadIds = leads.map((l) => l.id);

  const { data: reunioesData } = leadIds.length
    ? await supabase
        .from("reunioes")
        .select("lead_id, status, agendada_para")
        .in("lead_id", leadIds)
        .order("agendada_para", { ascending: false })
    : { data: [] as { lead_id: string; status: string; agendada_para: string }[] };

  // A mais recente por lead — reunioesData já vem ordenado por data desc.
  const ultimaReuniaoPorLead = new Map<string, string>();
  for (const reuniao of reunioesData ?? []) {
    if (!ultimaReuniaoPorLead.has(reuniao.lead_id)) {
      ultimaReuniaoPorLead.set(reuniao.lead_id, reuniao.status);
    }
  }

  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const leadsPorMotivo: Record<MotivoBase, LeadBase[]> = {
    nao_reagendados: [],
    proposta_nao_comprou: [],
    nao_iniciou_conversa: [],
    qualificou_sumiu: [],
    iniciou_sem_interesse: [],
  };

  for (const lead of leads) {
    const motivo = calcularMotivo(lead, ultimaReuniaoPorLead.get(lead.id));
    leadsPorMotivo[motivo].push(lead);
  }

  return (
    <>
      <BarraFixaKanban>
        <PageHeader titulo="Base de leads" acao={<BuscaLeads />} />

        <div className="border-b border-neutral-200 px-6 py-4">
          <p className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} que não viraram vendas,
            divididos pelos motivos
          </p>
        </div>
      </BarraFixaKanban>

      <main
        className="flex flex-col overflow-hidden px-6 py-6"
        style={{ height: "calc(100vh - var(--kanban-barra-altura, 0px))" }}
      >
        <BaseLeadsBoard leadsPorMotivo={leadsPorMotivo} nomePorUsuario={nomePorUsuario} />
      </main>
    </>
  );
}
