import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { FiltrosLeads } from "@/components/filtros-leads";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { anexarUltimaAtividade } from "@/lib/leads/atividade";
import {
  buscarMetaReceitaMes,
  buscarUltimaVenda,
  calcularReceitaOrg,
  calcularVendasHoje,
  inicioDoMes,
} from "@/lib/metricas";
import {
  NIVEIS_VENDAS,
  NIVEL_OPORTUNIDADE_FUTURA,
  ORDEM_OPORTUNIDADE_FUTURA,
  numerarNiveis,
  type NivelResumo,
} from "@/lib/niveis";

const NIVEL_OPORTUNIDADES = 7;

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarTempoDecorrido(dataISO: string) {
  const diffMs = Date.now() - new Date(dataISO).getTime();
  const minutos = Math.floor(diffMs / 60_000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);

  if (dias > 0) return `há ${dias} dia${dias === 1 ? "" : "s"}`;
  if (horas > 0) return `há ${horas} hora${horas === 1 ? "" : "s"}`;
  if (minutos > 0) return `há ${minutos} minuto${minutos === 1 ? "" : "s"}`;
  return "agora mesmo";
}

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
  oportunidade_futura: boolean;
  valor_venda: number | null;
  proposta_valor: number | null;
  proximo_follow_em: string | null;
};

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; origem?: string }>;
}) {
  const { usuario: usuarioFiltro, origem: origemFiltro } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let consulta = supabase
    .from("leads")
    .select(
      "id, nome, telefone_e164, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id, oportunidade_futura, valor_venda, proposta_valor, proximo_follow_em"
    )
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .in("nivel_ordem", NIVEIS_VENDAS)
    .order("declarado_em", { ascending: false });

  if (usuarioFiltro) {
    consulta = consulta.eq("responsavel_id", usuarioFiltro);
  }
  if (origemFiltro) {
    consulta = consulta.eq("origem", origemFiltro);
  }

  const [
    { data: niveisData },
    { data: leadsData },
    { data: usuarioAtual },
    { data: usuariosData },
    { data: origensData },
  ] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
    user
      ? supabase.from("usuarios").select("org_id, papel").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase
      .from("leads")
      .select("origem")
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .in("nivel_ordem", NIVEIS_VENDAS)
      .not("origem", "is", null),
  ]);

  const origens = Array.from(
    new Set((origensData ?? []).map((lead) => lead.origem as string))
  ).sort();

  const todosNiveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const niveis = [
    ...todosNiveis.filter((nivel) => NIVEIS_VENDAS.includes(nivel.ordem)),
    NIVEL_OPORTUNIDADE_FUTURA,
  ];
  const leads = (leadsData ?? []) as LeadResumo[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const usuarios = usuariosData ?? [];

  const leadsComProposta = leads.filter((lead) => lead.proposta_valor != null);
  const totalPropostas = leadsComProposta.reduce(
    (soma, lead) => soma + Number(lead.proposta_valor),
    0
  );

  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const orgId = usuarioAtual?.org_id ?? null;

  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const [receitaOrgMes, metaReceita, vendasHoje, ultimaVenda] = orgId
    ? await Promise.all([
        calcularReceitaOrg(supabase, orgId, inicioDoMes(agora), amanha),
        buscarMetaReceitaMes(supabase, orgId, agora.getFullYear(), agora.getMonth() + 1),
        calcularVendasHoje(supabase, orgId, inicioHoje, amanha),
        buscarUltimaVenda(supabase, orgId),
      ])
    : [null, null, null, null];

  const leadsComAtividade = await anexarUltimaAtividade(supabase, leads);

  const leadsPorNivel: Record<number, typeof leadsComAtividade> = {};
  for (const lead of leadsComAtividade) {
    // "Oportunidades futuras" é uma divisão visual dentro do nível 7, não
    // um nível separado — separa aqui na hora de montar as colunas.
    const chave =
      lead.nivel_ordem === NIVEL_OPORTUNIDADES && lead.oportunidade_futura
        ? ORDEM_OPORTUNIDADE_FUTURA
        : lead.nivel_ordem;
    const lista = leadsPorNivel[chave] ?? [];
    lista.push(lead);
    leadsPorNivel[chave] = lista;
  }

  return (
    <>
      <PageHeader
        titulo="Gestão de vendas"
        acao={
          <FiltrosLeads
            usuarios={usuarios}
            origens={origens}
            usuarioInicial={usuarioFiltro}
            origemInicial={origemFiltro}
            baseHref="/reunioes"
          />
        }
      />

      <main className="px-6 py-6">
        {leadsComProposta.length > 0 && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
            <span>💰</span>
            <span>
              {leadsComProposta.length} proposta{leadsComProposta.length === 1 ? "" : "s"} em
              aberto — {formatarMoeda(totalPropostas)}
            </span>
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-500">
              {leads.length} lead{leads.length === 1 ? "" : "s"} em vendas
            </p>
            {vendasHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {vendasHoje.vendas} venda{vendasHoje.vendas === 1 ? "" : "s"} hoje
              </span>
            )}
            {vendasHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatarMoeda(vendasHoje.faturamento)} faturamento hoje
              </span>
            )}
            {vendasHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {formatarMoeda(vendasHoje.receita)} receita hoje
              </span>
            )}
            {ultimaVenda !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Última venda {formatarTempoDecorrido(ultimaVenda)}
              </span>
            )}
          </div>
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
          usuarios={usuarios}
          mostrarValor
          numerosVisiveis={numerosVisiveis}
        />
      </main>
    </>
  );
}
