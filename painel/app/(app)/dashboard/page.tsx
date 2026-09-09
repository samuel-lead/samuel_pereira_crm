import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { GraficoEvolucaoMensal } from "@/components/grafico-evolucao-mensal";
import { VendasPorCanal } from "@/components/vendas-por-canal";
import { VendasPorProduto } from "@/components/vendas-por-produto";
import { PerformanceSdr } from "@/components/performance-sdr";
import { LeadsPorOrigem } from "@/components/leads-por-origem";
import { LeadsRecentes, type LeadRecente } from "@/components/leads-recentes";
import { ProximasReunioes, type ReuniaoProxima } from "@/components/proximas-reunioes";
import { ReunioesAtrasadas, type ReuniaoAtrasada } from "@/components/reunioes-atrasadas";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { CopiarResultadoSemanaButton } from "@/components/copiar-resultado-semana-button";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import {
  calcularMetricas,
  calcularMetricasOrg,
  calcularVendasPorCanal,
  calcularVendasPorProduto,
  calcularMetricasPorUsuario,
  calcularLeadsPorOrigem,
  calcularResumoAno,
  calcularReceitaOrg,
  calcularFaturamentoOrg,
  calcularNegociacoesAbertas,
  buscarMetaReceitaMes,
  inicioDoMes,
} from "@/lib/metricas";
import { inicioDoDia, UM_DIA_MS, periodoAnteriorSemana, periodoAnteriorMes, periodoAnterior } from "@/lib/datas";
import { resolverPeriodo, formatarDataCurta, type ChavePeriodo } from "@/lib/periodo";
import { numerarNiveis } from "@/lib/niveis";

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;
const NIVEL_REAGENDAMENTO = 6;
import { call, calls, reunioes, Reunioes, Sdr, ehImobiliario } from "@/lib/terminologia";

// Semana e mês comparam com o pedaço de calendário anterior de verdade
// (periodoAnteriorSemana/Mes, já existentes); os demais atalhos usam o
// deslocamento genérico pela mesma duração.
function resolverPeriodoAnterior(chave: ChavePeriodo, inicio: Date, fim: Date, agora: Date) {
  if (chave === "semana") return periodoAnteriorSemana(inicio, agora);
  if (chave === "mes") return periodoAnteriorMes(inicio, agora);
  return periodoAnterior(inicio, fim);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mesAno?: string; de?: string; ate?: string; anoEvolucao?: string }>;
}) {
  const { periodo, mesAno, de, ate, anoEvolucao } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);
  const inicioMesAtual = inicioDoMes(agora);
  const anoAtualNumero = inicioHoje.getUTCFullYear();
  const anoEvolucaoNumero = anoEvolucao ? Number(anoEvolucao) : anoAtualNumero;
  const anoEvolucaoResolvido =
    Number.isFinite(anoEvolucaoNumero) && anoEvolucaoNumero > 0 ? anoEvolucaoNumero : anoAtualNumero;

  const souAdmin = usuario!.papel === "admin";

  const periodoResolvido =
    resolverPeriodo({ periodo, mesAno, de, ate }, agora) ?? resolverPeriodo({ periodo: "mes" }, agora)!;
  const anteriorResolvido = resolverPeriodoAnterior(
    periodoResolvido.chave,
    periodoResolvido.inicio,
    periodoResolvido.fim,
    agora
  );

  const [
    metricasHoje,
    metricas,
    metricasLeadsNovos,
    metricasAnteriores,
    vendasPorCanal,
    vendasPorProduto,
    performancePeriodoSdr,
    leadsPorOrigem,
    resumoAnoEvolucao,
    receitaOrgMes,
    metaReceita,
    negociacoesAbertas,
    { data: metasData },
    { data: niveisData },
    { data: leadsRecentesData },
    { count: leadsUltimaHora },
    { data: reunioesProximasData },
    { data: leadsAtrasadosData },
    { data: usuariosData },
  ] = await Promise.all([
    // Só o SDR usa isso — o admin já vê todo mundo na tabela "Performance
    // por SDR" (com o mesmo botão de copiar). Isso é sempre HOJE,
    // independente do filtro do painel (é um check-in diário).
    souAdmin
      ? Promise.resolve(null)
      : calcularMetricas(supabase, usuario!.id, inicioHoje, amanha, {
          apenasDeclaradosNoPeriodo: true,
        }),
    calcularMetricasOrg(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    // "Leads novos" do card tem que ser só quem entrou de verdade no
    // período — sem o carry-forward de lead de mês anterior que só teve
    // reunião agora (isso o leadsTrabalhados normal, acima, já cobre pra
    // quem precisa dele, tipo a Taxa de Agendamento).
    calcularMetricasOrg(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim, {
      apenasDeclaradosNoPeriodo: true,
    }),
    calcularMetricasOrg(supabase, usuario!.org_id, anteriorResolvido.inicio, anteriorResolvido.fim),
    calcularVendasPorCanal(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    calcularVendasPorProduto(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    // "Leads Novos" da tabela também precisa ser estrito, mesmo motivo do
    // card acima — sem isso, a coluna mostrava o número largo (com
    // carry-forward) embaixo de um título que promete "novos".
    calcularMetricasPorUsuario(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim, {
      apenasDeclaradosNoPeriodo: true,
    }),
    calcularLeadsPorOrigem(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim, {
      apenasDeclaradosNoPeriodo: true,
    }),
    calcularResumoAno(supabase, usuario!.org_id, anoEvolucaoResolvido),
    // Meta de receita é sempre do mês civil corrente — não depende do
    // filtro. Imobiliário acompanha VGV (valor_venda), não receita
    // (dinheiro recebido) — Samuel pediu essa troca.
    ehImobiliario(usuario!.publico_org)
      ? calcularFaturamentoOrg(supabase, usuario!.org_id, inicioMesAtual, amanha)
      : calcularReceitaOrg(supabase, usuario!.org_id, inicioMesAtual, amanha),
    buscarMetaReceitaMes(supabase, usuario!.org_id, inicioMesAtual.getUTCFullYear(), inicioMesAtual.getUTCMonth() + 1),
    calcularNegociacoesAbertas(supabase, usuario!.org_id),
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    // "Leads recentes" — os últimos que chegaram, sempre os mais novos,
    // independente do filtro de período escolhido lá em cima.
    supabase
      .from("leads")
      .select(
        "id, nome, foto_url, origem, nivel_ordem, declarado_em, responsavel_id, isca_respostas(nivel_qualificacao)"
      )
      .eq("org_id", usuario!.org_id)
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .order("declarado_em", { ascending: false })
      .limit(5),
    // Quantos leads chegaram na última hora — número em destaque em cima
    // da lista de "Leads recentes".
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", usuario!.org_id)
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .gte("declarado_em", new Date(agora.getTime() - 60 * 60 * 1000).toISOString()),
    // "Próximas reuniões" — só as que ainda vão acontecer, mais próxima
    // primeiro, igual já é feito na coluna "Reunião marcada" do Kanban.
    // Sem limite — mostra todas, a lista rola dentro do card (Samuel
    // pediu: só umas 5 visíveis de cada vez, o resto no scroll).
    supabase
      .from("reunioes")
      .select("id, lead_id, agendada_para, reagendada, closer_id, usuario_id")
      .eq("org_id", usuario!.org_id)
      .eq("status", "marcada")
      .gte("agendada_para", agora.toISOString())
      .order("agendada_para", { ascending: true }),
    // "Reuniões que não aconteceram" — conta pelo nível ATUAL do lead, não
    // pelo histórico da reunião: só entra quem está agora mesmo em "Reunião
    // marcada" (e já passou da data), "No-show" ou "Precisa reagendar".
    // Samuel foi explícito: se o lead já foi ajustado e saiu de lá, some
    // da lista na hora, mesmo que a reunião antiga ainda exista no banco.
    supabase
      .from("leads")
      .select("id, nome, foto_url, nivel_ordem, entrou_nivel_em, responsavel_id")
      .eq("org_id", usuario!.org_id)
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .in("nivel_ordem", [NIVEL_REUNIAO_MARCADA, NIVEL_NO_SHOW, NIVEL_REAGENDAMENTO]),
    supabase.from("usuarios").select("id, nome"),
  ]);

  const idsLeadsAtrasados = (leadsAtrasadosData ?? []).map((l) => l.id);
  // Pega a reunião mais recente de cada lead atrasado — é ela que tem a
  // data, o SDR e o Closer pra mostrar no card.
  const { data: reunioesDosAtrasadosData } = idsLeadsAtrasados.length
    ? await supabase
        .from("reunioes")
        .select("lead_id, agendada_para, status, closer_id, usuario_id, marcada_em")
        .in("lead_id", idsLeadsAtrasados)
        .order("marcada_em", { ascending: false })
    : { data: [] as { lead_id: string; agendada_para: string; status: string; closer_id: string | null; usuario_id: string; marcada_em: string }[] };

  const ultimaReuniaoPorLead = new Map<
    string,
    { agendada_para: string; status: string; closer_id: string | null; usuario_id: string }
  >();
  for (const r of reunioesDosAtrasadosData ?? []) {
    if (!ultimaReuniaoPorLead.has(r.lead_id)) ultimaReuniaoPorLead.set(r.lead_id, r);
  }

  const idsLeadsProximasReunioes = (reunioesProximasData ?? []).map((r) => r.lead_id);
  const idsLeadsReunioes = Array.from(new Set([...idsLeadsProximasReunioes, ...idsLeadsAtrasados]));
  const { data: leadsDasReunioesData } = idsLeadsReunioes.length
    ? await supabase
        .from("leads")
        .select("id, nome, foto_url")
        .in("id", idsLeadsReunioes)
        .is("arquivado_em", null)
    : { data: [] as { id: string; nome: string; foto_url: string | null }[] };

  const metas = metasData as MetasConfig | null;
  const publicoOrg = usuario!.publico_org;

  const todosNiveis = (niveisData ?? []) as { ordem: number; nome: string; numerado: boolean; destacado: boolean }[];
  const nomePorNivel = new Map(todosNiveis.map((n) => [n.ordem, n.nome]));
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const nomePorUsuarioId = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const leadsRecentes: LeadRecente[] = (leadsRecentesData ?? []).map((lead) => {
    const numero = numerosVisiveis.get(lead.nivel_ordem);
    const nomeNivel = nomePorNivel.get(lead.nivel_ordem) ?? "—";
    return {
      id: lead.id,
      nome: lead.nome,
      foto_url: lead.foto_url,
      origem: lead.origem,
      declarado_em: lead.declarado_em,
      etapa: numero ? `N${numero} - ${nomeNivel}` : nomeNivel,
      nomeResponsavel: lead.responsavel_id ? (nomePorUsuarioId.get(lead.responsavel_id) ?? null) : null,
      nivelQualificacao:
        (lead.isca_respostas?.[0]?.nivel_qualificacao as LeadRecente["nivelQualificacao"]) ?? null,
    };
  });

  const leadPorId = new Map((leadsDasReunioesData ?? []).map((l) => [l.id, l]));
  const proximasReunioes: ReuniaoProxima[] = (reunioesProximasData ?? [])
    .map((r) => {
      const lead = leadPorId.get(r.lead_id);
      if (!lead) return null;
      return {
        id: r.id,
        agendadaPara: r.agendada_para,
        reagendada: r.reagendada,
        lead,
        nomeSdr: nomePorUsuarioId.get(r.usuario_id) ?? null,
        nomeCloser: r.closer_id ? (nomePorUsuarioId.get(r.closer_id) ?? null) : null,
      };
    })
    .filter((item): item is ReuniaoProxima => item !== null);

  const STATUS_POR_NIVEL: Record<number, ReuniaoAtrasada["status"]> = {
    [NIVEL_REUNIAO_MARCADA]: "marcada",
    [NIVEL_NO_SHOW]: "nao_compareceu",
    [NIVEL_REAGENDAMENTO]: "cancelada",
  };

  const reunioesAtrasadas: ReuniaoAtrasada[] = (leadsAtrasadosData ?? [])
    .map((leadAtrasado) => {
      const lead = leadPorId.get(leadAtrasado.id);
      const ultimaReuniao = ultimaReuniaoPorLead.get(leadAtrasado.id);
      if (!lead || !ultimaReuniao) return null;
      // Em "Reunião marcada", só conta como atrasada se a data já passou —
      // se ainda está por vir, é uma reunião futura normal (já aparece em
      // "Próximas reuniões"), não uma que "deveria ter acontecido".
      if (
        leadAtrasado.nivel_ordem === NIVEL_REUNIAO_MARCADA &&
        new Date(ultimaReuniao.agendada_para) >= agora
      ) {
        return null;
      }
      return {
        id: leadAtrasado.id,
        agendadaPara: ultimaReuniao.agendada_para,
        status: STATUS_POR_NIVEL[leadAtrasado.nivel_ordem],
        lead,
        nomeSdr: nomePorUsuarioId.get(ultimaReuniao.usuario_id) ?? null,
        nomeCloser: ultimaReuniao.closer_id ? (nomePorUsuarioId.get(ultimaReuniao.closer_id) ?? null) : null,
      };
    })
    .filter((item): item is ReuniaoAtrasada => item !== null)
    .sort((a, b) => new Date(a.agendadaPara).getTime() - new Date(b.agendadaPara).getTime());

  return (
    <>
      <PageHeader titulo="Métricas" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
        {!souAdmin && metricasHoje && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">Meu relatório de hoje</h2>
              <p className="text-xs text-neutral-500">
                {metricasHoje.reunioesMarcadas}{" "}
                {metricasHoje.reunioesMarcadas === 1 ? call(publicoOrg) : calls(publicoOrg)} marcada
                {metricasHoje.reunioesMarcadas === 1 ? "" : "s"} · {metricasHoje.ligacoes} ligaç
                {metricasHoje.ligacoes === 1 ? "ão" : "ões"}, {formatarDataCurta(agora)}.
              </p>
            </div>
            <CopiarRelatorioButton
              periodoLabel={formatarDataCurta(agora)}
              callsMarcadas={metricasHoje.reunioesMarcadas}
              callsReagendadas={metricasHoje.reunioesReagendadas}
              ligacoesFeitas={metricasHoje.ligacoes}
              publicoOrg={publicoOrg}
            />
          </section>
        )}

        <MetaReceitaWidget
          metaReceita={metaReceita}
          receitaAtual={receitaOrgMes}
          podeEditar={souAdmin}
          publicoOrg={publicoOrg}
        />

        <div className="sticky top-0 z-10 -mx-6 bg-[#f4f5f7] px-6 py-2 md:top-[var(--page-header-altura,64px)]">
          <FiltroPeriodo
            baseHref="/dashboard"
            periodoAtual={periodoResolvido.chave}
            mesAnoAtual={mesAno}
            deAtual={de}
            ateAtual={ate}
          />
        </div>

        {metas ? (
          <SecaoPeriodo
            titulo={periodoResolvido.titulo}
            subtitulo={periodoResolvido.subtitulo}
            metricas={metricas}
            metricasAnteriores={metricasAnteriores}
            metas={metas}
            publicoOrg={publicoOrg}
            leadsNovos={metricasLeadsNovos.leadsTrabalhados}
            acao={
              souAdmin ? (
                <CopiarResultadoSemanaButton
                  periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
                  metricas={metricas}
                  negociacoes={negociacoesAbertas}
                  publicoOrg={publicoOrg}
                />
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {souAdmin ? (
              <>
                Ainda não tem metas configuradas pra essa organização.{" "}
                <Link href="/configuracoes" className="font-medium underline">
                  Defina o piso de leads/{reunioes(publicoOrg)} e as taxas em Configurações
                </Link>{" "}
                pra ver o progresso aqui.
              </>
            ) : (
              "Ainda não tem metas configuradas pra essa organização. Peça pra um admin configurar em Configurações."
            )}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <ReunioesAtrasadas reunioes={reunioesAtrasadas} publicoOrg={publicoOrg} />
          <ProximasReunioes
            reunioes={proximasReunioes}
            publicoOrg={publicoOrg}
            total={proximasReunioes.length}
          />
        </div>

        <GraficoEvolucaoMensal
          dados={resumoAnoEvolucao}
          ano={anoEvolucaoResolvido}
          anoAtual={anoAtualNumero}
          mesAtual={anoEvolucaoResolvido === anoAtualNumero ? inicioHoje.getUTCMonth() + 1 : 0}
        />

        <section>
          <h2 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-neutral-900">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
            Visão geral da equipe
          </h2>
          <div className="space-y-4">
            <LeadsRecentes leads={leadsRecentes} leadsUltimaHora={leadsUltimaHora ?? 0} publicoOrg={publicoOrg} />
            <LeadsPorOrigem
              titulo={`Origens dos leads — ${periodoResolvido.titulo.toLowerCase()}`}
              dados={leadsPorOrigem}
              diasUteis={metricas.diasUteis}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <VendasPorCanal dados={vendasPorCanal} periodo={periodoResolvido.titulo} />
              <VendasPorProduto dados={vendasPorProduto} periodo={periodoResolvido.titulo} />
            </div>
            <PerformanceSdr
              titulo={`Performance por ${Sdr(publicoOrg)} — ${periodoResolvido.titulo.toLowerCase()}`}
              dados={performancePeriodoSdr}
              periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
              publicoOrg={publicoOrg}
            />
          </div>
        </section>

      </main>
    </>
  );
}
