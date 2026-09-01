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
import Link from "next/link";
import { anexarUltimaAtividade } from "@/lib/leads/atividade";
import { removerAcento } from "@/lib/texto";
import { diasUteisDesde, inicioDoDia, UM_DIA_MS } from "@/lib/datas";
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

const NIVEL_OPORTUNIDADES = 8;

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
  reuniao_agendada_para?: string | null;
  isca_respostas: { nivel_qualificacao: string | null }[] | null;
};

export default async function VendasPage({
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
      "id, nome, telefone_e164, foto_url, origem, nivel_ordem, declarado_em, entrou_nivel_em, status, responsavel_id, oportunidade_futura, valor_venda, proposta_valor, proximo_follow_em, isca_respostas(nivel_qualificacao)"
    )
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .in("nivel_ordem", NIVEIS_VENDAS)
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
  const publicoOrg = usuarioAtual?.publico_org ?? "mentoria";

  const leadsComProposta = leads.filter((lead) => lead.proposta_valor != null);
  const totalPropostas = leadsComProposta.reduce(
    (soma, lead) => soma + Number(lead.proposta_valor),
    0
  );

  const agora = new Date();
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);
  const inicioMes = inicioDoMes(agora);

  const orgId = usuarioAtual?.org_id ?? null;

  const leadIds = leads.map((lead) => lead.id);

  const [
    [receitaOrgMes, metaReceita, vendasHoje, ultimaVenda, vendasMes],
    { data: reunioesMarcadasData },
  ] = await Promise.all([
      orgId
        ? Promise.all([
            calcularReceitaOrg(supabase, orgId, inicioMes, amanha),
            buscarMetaReceitaMes(supabase, orgId, inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1),
            calcularVendasHoje(supabase, orgId, inicioHoje, amanha),
            buscarUltimaVenda(supabase, orgId),
            // Mesma função de "vendas hoje", só que passando o início do mês
            // em vez de hoje — ela já é genérica por período.
            calcularVendasHoje(supabase, orgId, inicioMes, amanha),
          ])
        : Promise.resolve([null, null, null, null, null] as const),
      leadIds.length
        ? supabase
            .from("reunioes")
            .select("lead_id, agendada_para")
            .in("lead_id", leadIds)
            .eq("status", "marcada")
            .order("marcada_em", { ascending: false })
        : Promise.resolve({ data: [] as { lead_id: string; agendada_para: string }[] }),
    ]);

  // Um lead pode ter mais de uma reunião "marcada" ao longo do tempo (ex.:
  // remarcações) — pega só a mais recente pra mostrar no card.
  const reuniaoAgendadaPorLead = new Map<string, string>();
  for (const reuniao of reunioesMarcadasData ?? []) {
    if (!reuniaoAgendadaPorLead.has(reuniao.lead_id)) {
      reuniaoAgendadaPorLead.set(reuniao.lead_id, reuniao.agendada_para);
    }
  }

  const leadsComAtividade = await anexarUltimaAtividade(
    supabase,
    leads.map((lead) => ({
      ...lead,
      reuniao_agendada_para: reuniaoAgendadaPorLead.get(lead.id) ?? null,
      nivelQualificacao: lead.isca_respostas?.[0]?.nivel_qualificacao ?? null,
    }))
  );

  // Mesmo critério do selo vermelho "Xd parado" de cada card, igual em
  // Pré-vendas. Lead com próximo contato marcado (e ainda não vencido) não
  // conta — já tem plano, só volta a contar depois que a data passar sem
  // ninguém ter mexido nele.
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

  // Leads com próximo contato marcado — modo à parte do Kanban por nível:
  // troca as colunas por uma lista só, dividida em "hoje" e "futuros".
  const leadsComProximoContato = leadsComAtividade.filter((lead) => !!lead.proximo_follow_em);
  const mostrarSoContato = contatoFiltro === "1";

  const parametrosFiltro = new URLSearchParams();
  if (usuarioFiltro) parametrosFiltro.set("usuario", usuarioFiltro);
  if (origemFiltro) parametrosFiltro.set("origem", origemFiltro);
  if (buscaFiltro) parametrosFiltro.set("busca", buscaFiltro);
  const parametrosSemParado = parametrosFiltro.toString();
  parametrosFiltro.set("parado", "1");
  const parametrosComParado = parametrosFiltro.toString();
  const hrefLigarParado = `/reunioes${parametrosComParado ? `?${parametrosComParado}` : ""}`;
  const hrefTirarParado = `/reunioes${parametrosSemParado ? `?${parametrosSemParado}` : ""}`;

  const parametrosParaContato = new URLSearchParams();
  if (usuarioFiltro) parametrosParaContato.set("usuario", usuarioFiltro);
  if (origemFiltro) parametrosParaContato.set("origem", origemFiltro);
  if (buscaFiltro) parametrosParaContato.set("busca", buscaFiltro);
  parametrosParaContato.set("contato", "1");
  const hrefLigarContato = `/reunioes?${parametrosParaContato.toString()}`;
  const hrefTirarContato = `/reunioes${parametrosSemParado ? `?${parametrosSemParado}` : ""}`;

  return (
    <>
      <BarraFixaKanban>
        <PageHeader
          titulo="Gestão de vendas"
          acao={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
              <BuscaLeads />
              <FiltrosColapsaveis>
                <FiltrosLeads
                  usuarios={usuarios}
                  origens={origens}
                  usuarioInicial={usuarioFiltro}
                  origemInicial={origemFiltro}
                  baseHref="/reunioes"
                />
              </FiltrosColapsaveis>
            </div>
          }
        />

        <MetricasColapsaveis>
        <div className="space-y-2.5 border-b border-neutral-200 px-6 py-4">
          <div className="flex flex-wrap items-stretch gap-3">
            <div className="flex flex-1 flex-wrap divide-x divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
              <StatCell
                label={mostrarSoParados ? "Leads parados" : "Leads em vendas"}
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
              {vendasHoje !== null && vendasHoje.vendas > 0 && (
                <CartaoVendas
                  label="Vendas hoje"
                  vendas={vendasHoje.vendas}
                  faturamento={vendasHoje.faturamento}
                  receita={vendasHoje.receita}
                />
              )}
              {vendasMes !== null && (
                <CartaoVendas
                  label="Vendas no mês"
                  vendas={vendasMes.vendas}
                  faturamento={vendasMes.faturamento}
                  receita={vendasMes.receita}
                />
              )}
              <StatCell
                label="Propostas em aberto"
                value={leadsComProposta.length}
                sub={leadsComProposta.length > 0 ? formatarMoeda(totalPropostas) : undefined}
              />
              {ultimaVenda !== null && (
                <StatCell label="Última venda" value={formatarTempoDecorrido(ultimaVenda)} />
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
            mostrarValor
            numerosVisiveis={numerosVisiveis}
            publicoOrg={publicoOrg}
          />
        )}
      </main>
    </>
  );
}
