import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { BuscaLeads } from "@/components/busca-leads";
import { FiltrosLeads } from "@/components/filtros-leads";
import { BaseLeadsBoard, type LeadBase, type MotivoBase } from "@/components/base-leads-board";
import { aplicarBuscaLead } from "@/lib/busca-leads";
import { buscarTodas, emPedacos } from "@/lib/supabase/paginar";
import { NIVEIS_REATIVACAO, numerarNiveis, type NivelResumo } from "@/lib/niveis";
import { funilConsorcio } from "@/lib/terminologia";

type LeadComHistorico = LeadBase & {
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
  proposta_enviada_em: string | null;
  motivo_base: string | null;
  motivo_base_detalhe: string | null;
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
  searchParams: Promise<{ busca?: string; origem?: string }>;
}) {
  const { busca: buscaFiltro, origem: origemFiltro } = await searchParams;
  const supabase = await createClient();
  const { usuario: usuarioAtual } = await usuarioAutenticado();
  const souAdmin = usuarioAtual?.papel === "admin";
  const publicoOrg = usuarioAtual?.publico_org ?? "mentoria";

  // Em pedaços de 1000 (o Supabase corta em 1000 calado) — a Base de uma
  // empresa com importação grande (ex.: 3.400 leads) aparecia incompleta.
  const montarConsulta = (de: number, ate: number) => {
    let consulta = supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, instagram, foto_url, origem, quem_indicou, responsavel_id, entrou_nivel_em, criterio_problema, criterio_urgencia, criterio_capacidade, proposta_enviada_em, proposta_valor, motivo_base, motivo_base_detalhe, voltar_da_base_em"
      )
      .eq("nivel_ordem", 9)
      .neq("status", "vendido")
      .is("arquivado_em", null);

    if (origemFiltro) {
      consulta = consulta.eq("origem", origemFiltro);
    }

    if (buscaFiltro) {
      consulta = aplicarBuscaLead(consulta, buscaFiltro);
    }

    return consulta
      .order("entrou_nivel_em", { ascending: false })
      .order("id")
      .range(de, ate);
  };

  const [
    { data: leadsData },
    { data: usuariosData },
    { data: niveisData },
    { data: origensData },
  ] = await Promise.all([
    buscarTodas(montarConsulta),
    supabase.from("usuarios").select("id, nome, foto_url, funcao, papel"),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    // Funis que existem na Base (não só os que o filtro atual deixou passar).
    buscarTodas<{ origem: string | null }>((de, ate) =>
      supabase
        .from("leads")
        .select("origem")
        .eq("nivel_ordem", 9)
        .neq("status", "vendido")
        .is("arquivado_em", null)
        .not("origem", "is", null)
        .order("id")
        .range(de, ate)
    ),
  ]);
  const origens = Array.from(
    new Set((origensData ?? []).map((lead) => lead.origem as string))
  ).sort();
  const todosNiveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const niveisReativacao = todosNiveis.filter((nivel) => NIVEIS_REATIVACAO.includes(nivel.ordem));

  const leads = (leadsData ?? []) as LeadComHistorico[];
  const leadIds = leads.map((l) => l.id);

  // .in() com milhares de ids estoura o tamanho do endereço da requisição —
  // busca em pedaços de 200 ids e junta, ordenando pela data de novo.
  type ReuniaoBase = { lead_id: string; status: string; agendada_para: string };
  const reunioesData: ReuniaoBase[] = [];
  for (const pedaco of emPedacos(leadIds, 200)) {
    const { data } = await supabase
      .from("reunioes")
      .select("lead_id, status, agendada_para")
      .in("lead_id", pedaco)
      .order("agendada_para", { ascending: false });
    reunioesData.push(...((data ?? []) as ReuniaoBase[]));
  }
  reunioesData.sort(
    (a, b) => new Date(b.agendada_para).getTime() - new Date(a.agendada_para).getTime()
  );

  // A mais recente por lead — reunioesData já vem ordenado por data desc.
  const ultimaReuniaoPorLead = new Map<string, string>();
  for (const reuniao of reunioesData) {
    if (!ultimaReuniaoPorLead.has(reuniao.lead_id)) {
      ultimaReuniaoPorLead.set(reuniao.lead_id, reuniao.status);
    }
  }

  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));
  const fotoPorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.foto_url]));
  const usuarios = usuariosData ?? [];

  const leadsPorMotivo: Record<MotivoBase, LeadBase[]> = {
    desqualificado: [],
    nao_reagendados: [],
    proposta_nao_comprou: [],
    nao_iniciou_conversa: [],
    qualificou_sumiu: [],
    iniciou_sem_interesse: [],
    farming: [],
    sem_condicao_pagar: [],
    comprou_concorrente: [],
  };

  for (const lead of leads) {
    let motivo = calcularMotivo(lead, ultimaReuniaoPorLead.get(lead.id));
    // Consórcio não tem as colunas "Não reagendados" e "qualifiquei e sumiu": o
    // que cair nelas (lead antigo sem motivo salvo) vai pra "não teve interesse".
    if (funilConsorcio(publicoOrg) && (motivo === "nao_reagendados" || motivo === "qualificou_sumiu")) {
      motivo = "iniciou_sem_interesse";
    }
    leadsPorMotivo[motivo].push(lead);
  }

  return (
    <>
      <BarraFixaKanban>
        <PageHeader
          titulo="Base de leads"
          acao={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <BuscaLeads />
              <FiltrosLeads
                usuarios={[]}
                origens={origens}
                origemInicial={origemFiltro}
                baseHref="/leads/base"
                esconderUsuarios
              />
            </div>
          }
        />

        <div className="border-b border-neutral-200 px-6 py-4">
          <p className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} que não viraram vendas,
            divididos pelos motivos
          </p>
        </div>
      </BarraFixaKanban>

      <main className="flex flex-col px-4 py-4 md:h-[calc(100vh-var(--kanban-barra-altura,0px))] md:overflow-hidden md:px-6 md:py-6">
        <BaseLeadsBoard
          leadsPorMotivo={leadsPorMotivo}
          nomePorUsuario={nomePorUsuario}
          fotoPorUsuario={fotoPorUsuario}
          niveisReativacao={niveisReativacao}
          numerosVisiveis={numerosVisiveis}
          usuarios={usuarios}
          souAdmin={souAdmin}
          publicoOrg={publicoOrg}
        />
      </main>
    </>
  );
}
