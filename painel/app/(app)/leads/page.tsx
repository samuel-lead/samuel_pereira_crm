import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BarraFixaKanban } from "@/components/barra-fixa-kanban";
import { KanbanBoard } from "@/components/kanban-board";
import { ProximosContatosLista } from "@/components/proximos-contatos-lista";
import { FiltrosLeads } from "@/components/filtros-leads";
import { BuscaLeads } from "@/components/busca-leads";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
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
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  entrou_nivel_em: string;
  status: string;
  responsavel_id: string | null;
  proximo_follow_em: string | null;
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
      "id, nome, telefone_e164, foto_url, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id, proximo_follow_em, isca_respostas(nivel_qualificacao)"
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
  ]);

  const leadsComReuniaoPendente = new Set(
    (reunioesAnterioresPendentesData ?? []).map((r) => r.lead_id)
  );
  const leadsComAtividade = leadsComAtividadeBase.map((lead) => ({
    ...lead,
    temReuniaoAnteriorPendente: leadsComReuniaoPendente.has(lead.id),
    nivelQualificacao: lead.isca_respostas?.[0]?.nivel_qualificacao ?? null,
  }));

  // Mesmo critério do selo vermelho "Xd parado" de cada card. Lead com
  // próximo contato marcado (e ainda não vencido) não conta — já tem
  // plano, só volta a contar depois que a data passar sem ninguém ter
  // mexido nele.
  function ehParado(lead: (typeof leadsComAtividade)[number]) {
    const proximoContatoPendente =
      !!lead.proximo_follow_em && new Date(lead.proximo_follow_em).getTime() > Date.now();
    return diasUteisDesde(lead.ultima_atividade_em) >= 1 && !proximoContatoPendente;
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
            <div className="flex flex-wrap items-center gap-3">
              <BuscaLeads />
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
          }
        />

        <div className="space-y-2.5 border-b border-neutral-200 px-6 py-4">
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex flex-1 flex-wrap divide-x divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <StatCell
                label={mostrarSoParados ? "Leads parados" : "Leads ao todo"}
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
                        title="Clique pra ver só os leads parados"
                        className="inline-flex items-center gap-1.5 font-medium text-red-600 hover:underline"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        {leadsParados} parado{leadsParados === 1 ? "" : "s"}
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
