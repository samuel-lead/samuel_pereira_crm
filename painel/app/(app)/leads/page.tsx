import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { KanbanBoard } from "@/components/kanban-board";
import { FiltrosLeads } from "@/components/filtros-leads";
import { BuscaLeads } from "@/components/busca-leads";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { anexarUltimaAtividade } from "@/lib/leads/atividade";
import { diasDesde } from "@/lib/datas";
import {
  buscarMetaReceitaMes,
  calcularReceitaOrg,
  inicioDoMes,
} from "@/lib/metricas";
import { NIVEIS_PRE_VENDAS, COLUNAS_PRE_VENDAS, numerarNiveis, type NivelResumo } from "@/lib/niveis";

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
  proximo_follow_em: string | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ usuario?: string; origem?: string; busca?: string; parado?: string }>;
}) {
  const {
    usuario: usuarioFiltro,
    origem: origemFiltro,
    busca: buscaFiltro,
    parado: paradoFiltro,
  } = await searchParams;
  const supabase = await createClient();
  const { user, usuario: usuarioAtual } = await usuarioAutenticado();

  let consulta = supabase
    .from("leads")
    .select(
      "id, nome, telefone_e164, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id, proximo_follow_em"
    )
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .in("nivel_ordem", NIVEIS_PRE_VENDAS)
    // Mais recente primeiro dentro de cada coluna — assim, quando um card
    // é movido (arrastado ou editado), ele sobe pro topo da coluna nova.
    .order("entrou_nivel_em", { ascending: false });

  if (usuarioFiltro) {
    consulta = consulta.eq("responsavel_id", usuarioFiltro);
  }
  if (origemFiltro) {
    consulta = consulta.eq("origem", origemFiltro);
  }
  if (buscaFiltro) {
    consulta = consulta.ilike("nome", `%${buscaFiltro}%`);
  }

  const [
    { data: niveisData },
    { data: leadsData },
    { data: usuariosData },
    { data: origensData },
  ] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
    supabase.from("usuarios").select("id, nome").order("nome"),
    supabase
      .from("leads")
      .select("origem")
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .in("nivel_ordem", NIVEIS_PRE_VENDAS)
      .not("origem", "is", null),
  ]);

  const origens = Array.from(
    new Set((origensData ?? []).map((lead) => lead.origem as string))
  ).sort();

  const todosNiveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const nivelPorOrdem = new Map(todosNiveis.map((nivel) => [nivel.ordem, nivel]));
  const niveis = COLUNAS_PRE_VENDAS.map((ordem) => nivelPorOrdem.get(ordem)).filter(
    (nivel): nivel is NivelResumo => !!nivel
  );
  const leads = (leadsData ?? []) as LeadResumo[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const usuarios = usuariosData ?? [];

  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const orgId = usuarioAtual?.org_id ?? null;

  const inicioHoje = new Date(agora);
  inicioHoje.setHours(0, 0, 0, 0);

  const consultaLigacoesHoje = user
    ? supabase
        .from("interacoes")
        .select("id", { count: "exact", head: true })
        .eq("tipo", "ligacao")
        .is("excluido_em", null)
        .gte("ocorreu_em", inicioHoje.toISOString())
        .lt("ocorreu_em", amanha.toISOString())
    : null;

  const consultaCallsMarcadasHoje = user
    ? supabase
        .from("reunioes")
        .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
        .is("leads.arquivado_em", null)
        .gte("marcada_em", inicioHoje.toISOString())
        .lt("marcada_em", amanha.toISOString())
    : null;

  const consultaCallsRealizadasHoje = user
    ? supabase
        .from("reunioes")
        .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
        .eq("status", "realizada")
        .is("leads.arquivado_em", null)
        .gte("agendada_para", inicioHoje.toISOString())
        .lt("agendada_para", amanha.toISOString())
    : null;

  function filtrarPorEscopo<T extends { eq: (coluna: string, valor: string) => T }>(
    consulta: T
  ) {
    return souAdmin && orgId
      ? consulta.eq("org_id", orgId)
      : consulta.eq("usuario_id", user!.id);
  }

  const [
    { count: ligacoesHoje },
    { count: callsMarcadasHoje },
    { count: callsRealizadasHoje },
    [receitaOrgMes, metaReceita],
    leadsComAtividade,
  ] = await Promise.all([
    consultaLigacoesHoje ? filtrarPorEscopo(consultaLigacoesHoje) : { count: null },
    consultaCallsMarcadasHoje ? filtrarPorEscopo(consultaCallsMarcadasHoje) : { count: null },
    consultaCallsRealizadasHoje ? filtrarPorEscopo(consultaCallsRealizadasHoje) : { count: null },
    orgId
      ? Promise.all([
          calcularReceitaOrg(supabase, orgId, inicioDoMes(agora), amanha),
          buscarMetaReceitaMes(supabase, orgId, agora.getFullYear(), agora.getMonth() + 1),
        ])
      : Promise.resolve([null, null] as const),
    anexarUltimaAtividade(supabase, leads),
  ]);

  // Mesmo critério do selo vermelho "Xd parado" de cada card. Lead com
  // próximo contato marcado (e ainda não vencido) não conta — já tem
  // plano, só volta a contar depois que a data passar sem ninguém ter
  // mexido nele.
  function ehParado(lead: (typeof leadsComAtividade)[number]) {
    const proximoContatoPendente =
      !!lead.proximo_follow_em && new Date(lead.proximo_follow_em).getTime() > Date.now();
    return diasDesde(lead.ultima_atividade_em) >= 1 && !proximoContatoPendente;
  }

  const leadsParados = leadsComAtividade.filter(ehParado).length;

  // Clicar no selo "X leads parados" filtra o quadro inteiro pra mostrar só
  // eles — sem precisar abrir cada coluna procurando.
  const mostrarSoParados = paradoFiltro === "1";
  const leadsExibidos = mostrarSoParados
    ? leadsComAtividade.filter(ehParado)
    : leadsComAtividade;

  const leadsPorNivel: Record<number, typeof leadsComAtividade> = {};
  for (const lead of leadsExibidos) {
    const lista = leadsPorNivel[lead.nivel_ordem] ?? [];
    lista.push(lead);
    leadsPorNivel[lead.nivel_ordem] = lista;
  }

  const parametrosFiltro = new URLSearchParams();
  if (usuarioFiltro) parametrosFiltro.set("usuario", usuarioFiltro);
  if (origemFiltro) parametrosFiltro.set("origem", origemFiltro);
  if (buscaFiltro) parametrosFiltro.set("busca", buscaFiltro);
  const parametrosSemParado = parametrosFiltro.toString();
  parametrosFiltro.set("parado", "1");
  const parametrosComParado = parametrosFiltro.toString();
  const hrefLigarParado = `/leads${parametrosComParado ? `?${parametrosComParado}` : ""}`;
  const hrefTirarParado = `/leads${parametrosSemParado ? `?${parametrosSemParado}` : ""}`;

  return (
    <>
      <BarraFixaKanban>
        <PageHeader
          titulo="Gestão dos leads"
          acao={
            <div className="flex items-center gap-3">
              <BuscaLeads />
              <FiltrosLeads
                usuarios={usuarios}
                origens={origens}
                usuarioInicial={usuarioFiltro}
                origemInicial={origemFiltro}
              />
              <Link
                href="/leads/novo"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                + Novo lead
              </Link>
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-neutral-500">
              {mostrarSoParados
                ? `${leadsExibidos.length} lead${leadsExibidos.length === 1 ? "" : "s"} parado${leadsExibidos.length === 1 ? "" : "s"} sendo mostrados`
                : `${leads.length} lead${leads.length === 1 ? "" : "s"} sendo trabalhados`}
            </p>
            {mostrarSoParados ? (
              <Link
                href={hrefTirarParado}
                className="rounded-full border border-red-600 bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Ver todos ✕
              </Link>
            ) : (
              leadsParados > 0 && (
                <Link
                  href={hrefLigarParado}
                  title="Clique pra ver só os leads parados"
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100"
                >
                  {leadsParados} lead{leadsParados === 1 ? "" : "s"} parado{leadsParados === 1 ? "" : "s"}
                </Link>
              )
            )}
            {ligacoesHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {ligacoesHoje} ligaç{ligacoesHoje === 1 ? "ão" : "ões"} hoje
                {souAdmin ? " (equipe)" : ""}
              </span>
            )}
            {callsMarcadasHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {callsMarcadasHoje} call{callsMarcadasHoje === 1 ? "" : "s"} marcada
                {callsMarcadasHoje === 1 ? "" : "s"} hoje
                {souAdmin ? " (equipe)" : ""}
              </span>
            )}
            {callsRealizadasHoje !== null && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {callsRealizadasHoje} call{callsRealizadasHoje === 1 ? "" : "s"} realizada
                {callsRealizadasHoje === 1 ? "" : "s"} hoje
                {souAdmin ? " (equipe)" : ""}
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
      </BarraFixaKanban>

      <main
        className="flex flex-col overflow-hidden px-6 py-6"
        style={{ height: "calc(100vh - var(--kanban-barra-altura, 0px))" }}
      >
        <KanbanBoard
          niveis={niveis}
          leadsPorNivel={leadsPorNivel}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
          usuarios={usuarios}
          numerosVisiveis={numerosVisiveis}
        />
      </main>
    </>
  );
}
