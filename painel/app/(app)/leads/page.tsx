import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { KanbanBoard } from "@/components/kanban-board";
import { ProximosContatosLista } from "@/components/proximos-contatos-lista";
import { FiltrosLeads } from "@/components/filtros-leads";
import { BuscaLeads } from "@/components/busca-leads";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { MetricasColapsaveis } from "@/components/metricas-colapsaveis";
import { FiltrosColapsaveis } from "@/components/filtros-colapsaveis";
import { StatCell } from "@/components/stat-cell";
import { CartaoVendas } from "@/components/cartao-vendas";
import { anexarUltimaAtividade } from "@/lib/leads/atividade";
import { diasUteisDesde, inicioDoDia, UM_DIA_MS } from "@/lib/datas";
import {
  buscarMetaReceitaMes,
  calcularReceitaOrg,
  calcularVendasHoje,
  inicioDoMes,
} from "@/lib/metricas";
import { NIVEIS_PRE_VENDAS, COLUNAS_PRE_VENDAS, numerarNiveis, type NivelResumo } from "@/lib/niveis";
import { Calls } from "@/lib/terminologia";
import { removerAcento } from "@/lib/texto";

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  instagram: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  entrou_nivel_em: string;
  status: string;
  responsavel_id: string | null;
  proximo_follow_em: string | null;
  oportunidade_futura: boolean;
  isca_respostas: { nivel_qualificacao: string | null }[] | null;
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    usuario?: string;
    origem?: string;
    busca?: string;
    parado?: string;
    contato?: string;
  }>;
}) {
  const {
    usuario: usuarioFiltro,
    origem: origemFiltro,
    busca: buscaFiltro,
    parado: paradoFiltro,
    contato: contatoFiltro,
  } = await searchParams;
  const supabase = await createClient();
  const { user, usuario: usuarioAtual } = await usuarioAutenticado();

  let consulta = supabase
    .from("leads")
    .select(
      "id, nome, telefone_e164, instagram, foto_url, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id, proximo_follow_em, oportunidade_futura, isca_respostas(nivel_qualificacao)"
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
    consulta = consulta.ilike("nome_busca", `%${removerAcento(buscaFiltro)}%`);
  }

  const [
    { data: niveisData },
    { data: leadsData },
    { data: usuariosData },
    { data: origensData },
  ] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
    supabase.from("usuarios").select("id, nome, foto_url").order("nome"),
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
  const publicoOrg = usuarioAtual?.publico_org ?? "mentoria";

  const agora = new Date();
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);
  const inicioMes = inicioDoMes(agora);

  const orgId = usuarioAtual?.org_id ?? null;

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
        .eq("reagendada", false)
        .gte("marcada_em", inicioHoje.toISOString())
        .lt("marcada_em", amanha.toISOString())
    : null;

  const consultaReagendamentosHoje = user
    ? supabase
        .from("reunioes")
        .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
        .is("leads.arquivado_em", null)
        .eq("reagendada", true)
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

  const consultaNoShowHoje = user
    ? supabase
        .from("reunioes")
        .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
        .eq("status", "nao_compareceu")
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

  // Reuniões ainda "marcada" com a data já passada — ao arrastar esse lead
  // de volta pra "Reunião marcada", o Kanban precisa saber pra perguntar na
  // hora (aviso) se a pessoa sumiu ou avisou antes de remarcar.
  const consultaReuniaoAnteriorPendente = orgId
    ? supabase
        .from("reunioes")
        .select("lead_id")
        .eq("org_id", orgId)
        .eq("status", "marcada")
        .lt("agendada_para", agora.toISOString())
    : null;

  // Lead com reunião marcada não conta como "parado" no selo vermelho —
  // já tem o próximo passo combinado (ver ehParado mais abaixo).
  const consultaReuniaoAgendada = orgId
    ? supabase
        .from("reunioes")
        .select("lead_id, agendada_para")
        .eq("org_id", orgId)
        .eq("status", "marcada")
        .order("marcada_em", { ascending: false })
    : null;

  const [
    { count: ligacoesHoje },
    { count: callsMarcadasHoje },
    { count: reagendamentosHoje },
    { count: callsRealizadasHoje },
    { count: noShowHoje },
    [receitaOrgMes, metaReceita],
    leadsComAtividadeBase,
    { data: reunioesAnterioresPendentesData },
    vendasHoje,
    { data: reunioesAgendadaData },
  ] = await Promise.all([
    consultaLigacoesHoje ? filtrarPorEscopo(consultaLigacoesHoje) : { count: null },
    consultaCallsMarcadasHoje ? filtrarPorEscopo(consultaCallsMarcadasHoje) : { count: null },
    consultaReagendamentosHoje ? filtrarPorEscopo(consultaReagendamentosHoje) : { count: null },
    consultaCallsRealizadasHoje ? filtrarPorEscopo(consultaCallsRealizadasHoje) : { count: null },
    consultaNoShowHoje ? filtrarPorEscopo(consultaNoShowHoje) : { count: null },
    orgId
      ? Promise.all([
          calcularReceitaOrg(supabase, orgId, inicioMes, amanha),
          buscarMetaReceitaMes(supabase, orgId, inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1),
        ])
      : Promise.resolve([null, null] as const),
    anexarUltimaAtividade(supabase, leads),
    consultaReuniaoAnteriorPendente ?? Promise.resolve({ data: null }),
    orgId ? calcularVendasHoje(supabase, orgId, inicioHoje, amanha) : Promise.resolve(null),
    consultaReuniaoAgendada ?? Promise.resolve({ data: [] as { lead_id: string; agendada_para: string }[] }),
  ]);

  const leadsComReuniaoPendente = new Set(
    (reunioesAnterioresPendentesData ?? []).map((r) => r.lead_id)
  );
  // Um lead pode ter mais de uma reunião "marcada" ao longo do tempo (ex.:
  // remarcações) — pega só a mais recente.
  const reuniaoAgendadaPorLead = new Map<string, string>();
  for (const reuniao of reunioesAgendadaData ?? []) {
    if (!reuniaoAgendadaPorLead.has(reuniao.lead_id)) {
      reuniaoAgendadaPorLead.set(reuniao.lead_id, reuniao.agendada_para);
    }
  }
  const leadsComAtividade = leadsComAtividadeBase.map((lead) => ({
    ...lead,
    temReuniaoAnteriorPendente: leadsComReuniaoPendente.has(lead.id),
    nivelQualificacao: lead.isca_respostas?.[0]?.nivel_qualificacao ?? null,
    reuniao_agendada_para: reuniaoAgendadaPorLead.get(lead.id) ?? null,
  }));

  // Mesmo critério do selo vermelho de cada card: "parado" (1 dia útil sem
  // nenhuma atividade, e sem próximo contato/reunião pendente ainda por
  // vencer) OU "atrasado" (próximo contato ou reunião já venceu a data e
  // ninguém atualizou — esse acende na hora, sem esperar 1 dia parado).
  function ehParado(lead: (typeof leadsComAtividade)[number]) {
    const proximoContatoPendente =
      !!lead.proximo_follow_em && new Date(lead.proximo_follow_em).getTime() > Date.now();
    const contatoAtrasado =
      !!lead.proximo_follow_em && new Date(lead.proximo_follow_em).getTime() < Date.now();
    const reuniaoMarcadaPendente =
      !!lead.reuniao_agendada_para && new Date(lead.reuniao_agendada_para).getTime() > Date.now();
    const reuniaoAtrasada =
      !!lead.reuniao_agendada_para && new Date(lead.reuniao_agendada_para).getTime() < Date.now();
    const parado =
      diasUteisDesde(lead.ultima_atividade_em) >= 1 &&
      !proximoContatoPendente &&
      !reuniaoMarcadaPendente &&
      !lead.oportunidade_futura;
    return parado || contatoAtrasado || reuniaoAtrasada;
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

  // Só em Novos Leads (ordem 0): quem já veio filtrado de uma isca fica
  // por hierarquia de qualificação — super qualificado primeiro, depois
  // qualificado, depois desqualificado. Quem não respondeu isca nenhuma
  // fica por último. .sort é estável, então dentro de cada faixa mantém
  // a ordem por data de entrada que já veio antes.
  const RANK_QUALIFICACAO_NOVOS_LEADS: Record<string, number> = {
    super_qualificado: 0,
    qualificado: 1,
    desqualificado: 2,
  };
  if (leadsPorNivel[0]) {
    leadsPorNivel[0] = [...leadsPorNivel[0]].sort(
      (a, b) =>
        (RANK_QUALIFICACAO_NOVOS_LEADS[a.nivelQualificacao ?? ""] ?? 3) -
        (RANK_QUALIFICACAO_NOVOS_LEADS[b.nivelQualificacao ?? ""] ?? 3)
    );
  }

  // Leads com próximo contato marcado — modo à parte do Kanban por nível:
  // troca as colunas por uma lista só, dividida em "hoje" e "futuros", pra
  // planejar o dia sem precisar procurar coluna por coluna.
  const leadsComProximoContato = leadsComAtividade.filter((lead) => !!lead.proximo_follow_em);
  const mostrarSoContato = contatoFiltro === "1";

  const parametrosFiltro = new URLSearchParams();
  if (usuarioFiltro) parametrosFiltro.set("usuario", usuarioFiltro);
  if (origemFiltro) parametrosFiltro.set("origem", origemFiltro);
  if (buscaFiltro) parametrosFiltro.set("busca", buscaFiltro);
  const parametrosSemParado = parametrosFiltro.toString();
  parametrosFiltro.set("parado", "1");
  const parametrosComParado = parametrosFiltro.toString();
  const hrefLigarParado = `/leads${parametrosComParado ? `?${parametrosComParado}` : ""}`;
  const hrefTirarParado = `/leads${parametrosSemParado ? `?${parametrosSemParado}` : ""}`;

  const parametrosParaContato = new URLSearchParams();
  if (usuarioFiltro) parametrosParaContato.set("usuario", usuarioFiltro);
  if (origemFiltro) parametrosParaContato.set("origem", origemFiltro);
  if (buscaFiltro) parametrosParaContato.set("busca", buscaFiltro);
  parametrosParaContato.set("contato", "1");
  const hrefLigarContato = `/leads?${parametrosParaContato.toString()}`;
  const hrefTirarContato = `/leads${parametrosSemParado ? `?${parametrosSemParado}` : ""}`;

  return (
    <>
      <BarraFixaKanban>
        <PageHeader
          titulo="Gestão dos leads"
          acao={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <BuscaLeads />
              <FiltrosColapsaveis>
                <div className="flex flex-wrap items-center gap-3">
                  <FiltrosLeads
                    usuarios={usuarios}
                    origens={origens}
                    usuarioInicial={usuarioFiltro}
                    origemInicial={origemFiltro}
                  />
                  <Link
                    href="/leads/importar"
                    className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
                  >
                    Importar leads
                  </Link>
                  <Link
                    href="/leads/novo"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  >
                    + Novo lead
                  </Link>
                </div>
              </FiltrosColapsaveis>
            </div>
          }
        />

        <MetricasColapsaveis>
        <div className="space-y-2.5 border-b border-neutral-200 px-6 py-4">
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex flex-1 flex-wrap divide-x divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <StatCell
                label={mostrarSoParados ? "Leads parados/atrasados" : "Leads ao todo"}
                value={mostrarSoParados ? leadsExibidos.length : leads.length}
                sub={
                  mostrarSoParados ? (
                    <Link href={hrefTirarParado} className="font-medium text-red-600 hover:underline">
                      Ver todos ✕
                    </Link>
                  ) : (
                    leadsParados > 0 && (
                      <Link
                        href={hrefLigarParado}
                        title="Clique pra ver só os leads parados ou atrasados"
                        className="inline-flex items-center gap-1.5 font-medium text-red-600 hover:underline"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {leadsParados} parado{leadsParados === 1 ? "" : "s"}/atrasado{leadsParados === 1 ? "" : "s"}
                      </Link>
                    )
                  )
                }
              />
              {ligacoesHoje !== null && (
                <StatCell
                  label="Ligações hoje"
                  value={ligacoesHoje}
                  sub={souAdmin ? "Time todo" : undefined}
                />
              )}
              {callsMarcadasHoje !== null && (
                <StatCell
                  label={`${Calls(publicoOrg)} marcadas hoje`}
                  value={callsMarcadasHoje}
                  sub={souAdmin ? "Time todo" : undefined}
                />
              )}
              {callsRealizadasHoje !== null && (
                <StatCell
                  label={`${Calls(publicoOrg)} realizadas hoje`}
                  value={callsRealizadasHoje}
                  sub={souAdmin ? "Time todo" : undefined}
                />
              )}
              {vendasHoje !== null && vendasHoje.vendas > 0 && (
                <CartaoVendas
                  label="Vendas hoje"
                  vendas={vendasHoje.vendas}
                  faturamento={vendasHoje.faturamento}
                  receita={vendasHoje.receita}
                />
              )}
              {reagendamentosHoje !== null && reagendamentosHoje > 0 && (
                <StatCell label="Reagendamentos hoje" value={reagendamentosHoje} />
              )}
              {noShowHoje !== null && noShowHoje > 0 && (
                <StatCell label="No-show hoje" value={noShowHoje} />
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

          {(leadsComProximoContato.length > 0 || mostrarSoContato) && (
            <div className="flex flex-wrap items-center gap-4 px-1 text-xs">
              {mostrarSoContato ? (
                <Link href={hrefTirarContato} className="font-medium text-teal-600 hover:underline">
                  Ver todos ✕
                </Link>
              ) : (
                <Link
                  href={hrefLigarContato}
                  title="Clique pra ver só os leads com próximo contato marcado"
                  className="inline-flex items-center gap-1.5 font-medium text-teal-600 hover:underline"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  {leadsComProximoContato.length} com próximo contato
                </Link>
              )}
            </div>
          )}
        </div>
        </MetricasColapsaveis>
      </BarraFixaKanban>

      <main className="flex flex-col px-4 py-4 md:h-[calc(100vh-var(--kanban-barra-altura,0px))] md:overflow-hidden md:px-6 md:py-6">
        {mostrarSoContato ? (
          <ProximosContatosLista leads={leadsComProximoContato} usuarios={usuarios} />
        ) : (
          <KanbanBoard
            niveis={niveis}
            leadsPorNivel={leadsPorNivel}
            souAdmin={souAdmin}
            usuarioAtualId={user?.id ?? null}
            usuarios={usuarios}
            numerosVisiveis={numerosVisiveis}
            publicoOrg={publicoOrg}
          />
        )}
      </main>
    </>
  );
}
