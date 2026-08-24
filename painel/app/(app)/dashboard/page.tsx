import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
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
  calcularReceitaOrg,
  calcularNegociacoesAbertas,
  buscarMetaReceitaMes,
  inicioDaSemana,
  fimDaSemana,
  inicioDoMes,
} from "@/lib/metricas";
import { inicioDoDia, UM_DIA_MS } from "@/lib/datas";
import { call, calls, reunioes } from "@/lib/terminologia";

function formatarDataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);

  const souAdmin = usuario!.papel === "admin";
  const inicioSemana = inicioDaSemana(agora);
  const fimSemana = fimDaSemana(inicioSemana);
  const inicioMes = inicioDoMes(agora);
  const subtituloSemana = `domingo a sábado · ${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)}`;

  const [
    metricasHoje,
    metricasSemana,
    metricasMes,
    vendasPorCanal,
    vendasPorProduto,
    performanceDiaSdr,
    performanceSemanaSdr,
    leadsPorOrigemSemana,
    leadsPorOrigemMes,
    receitaOrgMes,
    metaReceita,
    negociacoesAbertas,
    { data: metasData },
  ] = await Promise.all([
    // Só o SDR usa isso — o admin já tem seu próprio dia na tabela
    // "Performance do dia por SDR" (com o mesmo botão de copiar).
    souAdmin
      ? Promise.resolve(null)
      : calcularMetricas(supabase, usuario!.id, inicioHoje, amanha, {
          apenasDeclaradosNoPeriodo: true,
        }),
    // Todo mundo vê a organização inteira aqui — SDR também compete de
    // igual pra igual com o time, não só com a própria produção. A única
    // coisa que fica exclusiva do admin é o botão de copiar o resultado
    // da semana (mais abaixo, na prop `acao`).
    calcularMetricasOrg(supabase, usuario!.org_id, inicioSemana, amanha),
    calcularMetricasOrg(supabase, usuario!.org_id, inicioMes, amanha),
    calcularVendasPorCanal(supabase, usuario!.org_id, inicioMes, amanha),
    calcularVendasPorProduto(supabase, usuario!.org_id, inicioMes, amanha),
    // "Performance do dia" é o único relatório de DIA — leads trabalhados
    // aqui conta só quem entrou hoje mesmo (ver comentário em calcularMetricas).
    calcularMetricasPorUsuario(supabase, usuario!.org_id, inicioHoje, amanha, {
      apenasDeclaradosNoPeriodo: true,
    }),
    calcularMetricasPorUsuario(supabase, usuario!.org_id, inicioSemana, amanha),
    calcularLeadsPorOrigem(supabase, usuario!.org_id, inicioSemana, amanha),
    calcularLeadsPorOrigem(supabase, usuario!.org_id, inicioMes, amanha),
    calcularReceitaOrg(supabase, usuario!.org_id, inicioMes, amanha),
    buscarMetaReceitaMes(supabase, usuario!.org_id, inicioMes.getUTCFullYear(), inicioMes.getUTCMonth() + 1),
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

        {metas ? (
          <>
            <SecaoPeriodo
              titulo="Esta semana"
              subtitulo={subtituloSemana}
              metricas={metricasSemana}
              metas={metas}
              publicoOrg={publicoOrg}
              acao={
                souAdmin ? (
                  <CopiarResultadoSemanaButton
                    periodo={`${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)}`}
                    metricas={metricasSemana}
                    negociacoes={negociacoesAbertas}
                    publicoOrg={publicoOrg}
                  />
                ) : undefined
              }
            />
            <SecaoPeriodo titulo="Este mês" metricas={metricasMes} metas={metas} publicoOrg={publicoOrg} />
          </>
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

        <section>
          <h2 className="mb-3 text-lg font-bold text-neutral-900">Visão da equipe</h2>
          <div className="space-y-4">
            <LeadsPorOrigem
              titulo={`Origem dos leads — semana (${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)})`}
              dados={leadsPorOrigemSemana}
              diasUteis={metricasSemana.diasUteis}
            />
            <LeadsPorOrigem
              titulo="Origem dos leads — mês"
              dados={leadsPorOrigemMes}
              diasUteis={metricasMes.diasUteis}
            />
            <VendasPorCanal dados={vendasPorCanal} />
            <VendasPorProduto dados={vendasPorProduto} />
            <PerformanceSdr
              titulo="Performance do dia por SDR"
              dados={performanceDiaSdr}
              periodo={`Hoje, ${formatarDataCurta(agora)}.`}
              dataRelatorio={agora}
              publicoOrg={publicoOrg}
            />
            <PerformanceSdr
              titulo="Performance da semana por SDR"
              dados={performanceSemanaSdr}
              periodo={`Semana de ${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)} (domingo a sábado).`}
              publicoOrg={publicoOrg}
            />
          </div>
        </section>

        {souAdmin && (
          <div className="flex justify-center pt-2">
            <Link
              href="/ano"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Ver o ano inteiro →
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
