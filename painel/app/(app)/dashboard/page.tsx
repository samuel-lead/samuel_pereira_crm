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
  calcularNegociacoesAbertas,
  buscarMetaReceitaMes,
  inicioDoMes,
} from "@/lib/metricas";
import { inicioDoDia, UM_DIA_MS, periodoAnteriorSemana, periodoAnteriorMes, periodoAnterior } from "@/lib/datas";
import { resolverPeriodo, formatarDataCurta, type ChavePeriodo } from "@/lib/periodo";
import { call, calls, reunioes, Reunioes } from "@/lib/terminologia";

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
    performanceDiaSdr,
    performancePeriodoSdr,
    leadsPorOrigem,
    resumoAnoEvolucao,
    receitaOrgMes,
    metaReceita,
    negociacoesAbertas,
    { data: metasData },
  ] = await Promise.all([
    // Só o SDR usa isso — o admin já tem seu próprio dia na tabela
    // "Performance do dia por SDR" (com o mesmo botão de copiar). Isso é
    // sempre HOJE, independente do filtro do painel (é um check-in diário).
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
    calcularMetricasPorUsuario(supabase, usuario!.org_id, inicioHoje, amanha, {
      apenasDeclaradosNoPeriodo: true,
    }),
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
    // Meta de receita é sempre do mês civil corrente — não depende do filtro.
    calcularReceitaOrg(supabase, usuario!.org_id, inicioMesAtual, amanha),
    buscarMetaReceitaMes(supabase, usuario!.org_id, inicioMesAtual.getUTCFullYear(), inicioMesAtual.getUTCMonth() + 1),
    calcularNegociacoesAbertas(supabase, usuario!.org_id),
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
  ]);

  const metas = metasData as MetasConfig | null;
  const publicoOrg = usuario!.publico_org;

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
              data={agora}
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
            <LeadsPorOrigem
              titulo={`Origem dos leads — ${periodoResolvido.titulo.toLowerCase()}`}
              dados={leadsPorOrigem}
              diasUteis={metricas.diasUteis}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <VendasPorCanal dados={vendasPorCanal} />
              <VendasPorProduto dados={vendasPorProduto} />
            </div>
            <PerformanceSdr
              titulo="Performance do dia por SDR"
              dados={performanceDiaSdr}
              periodo={`Hoje, ${formatarDataCurta(agora)}.`}
              dataRelatorio={agora}
              publicoOrg={publicoOrg}
            />
            <PerformanceSdr
              titulo={`Performance por SDR — ${periodoResolvido.titulo.toLowerCase()}`}
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
