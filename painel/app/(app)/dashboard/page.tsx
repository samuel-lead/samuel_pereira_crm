import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
import { VendasPorCanal } from "@/components/vendas-por-canal";
import { VendasPorProduto } from "@/components/vendas-por-produto";
import { PerformanceSdr } from "@/components/performance-sdr";
import { LeadsPorOrigem } from "@/components/leads-por-origem";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import {
  calcularMetricas,
  calcularVendasPorCanal,
  calcularVendasPorProduto,
  calcularMetricasPorUsuario,
  calcularLeadsPorOrigem,
  calcularReceitaOrg,
  buscarMetaReceitaMes,
  inicioDaSemana,
  fimDaSemana,
  inicioDoMes,
} from "@/lib/metricas";

function formatarDataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, org_id, papel")
    .eq("id", user!.id)
    .single();

  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const souAdmin = usuario!.papel === "admin";
  const inicioSemana = inicioDaSemana(agora);
  const fimSemana = fimDaSemana(inicioSemana);
  const inicioMes = inicioDoMes(agora);
  const subtituloSemana = `domingo a sábado · ${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)}`;

  const [
    metricasSemana,
    metricasMes,
    vendasPorCanal,
    vendasPorProduto,
    performanceSemanaSdr,
    leadsPorOrigemSemana,
    leadsPorOrigemMes,
    receitaOrgMes,
    metaReceita,
    { data: metasData },
  ] = await Promise.all([
    calcularMetricas(supabase, usuario!.id, inicioSemana, amanha),
    calcularMetricas(supabase, usuario!.id, inicioMes, amanha),
    souAdmin
      ? calcularVendasPorCanal(supabase, usuario!.org_id, inicioMes, amanha)
      : Promise.resolve([]),
    souAdmin
      ? calcularVendasPorProduto(supabase, usuario!.org_id, inicioMes, amanha)
      : Promise.resolve([]),
    souAdmin
      ? calcularMetricasPorUsuario(supabase, usuario!.org_id, inicioSemana, amanha)
      : Promise.resolve([]),
    souAdmin
      ? calcularLeadsPorOrigem(supabase, usuario!.org_id, inicioSemana, amanha)
      : Promise.resolve([]),
    souAdmin
      ? calcularLeadsPorOrigem(supabase, usuario!.org_id, inicioMes, amanha)
      : Promise.resolve([]),
    calcularReceitaOrg(supabase, usuario!.org_id, inicioMes, amanha),
    buscarMetaReceitaMes(supabase, usuario!.org_id, agora.getFullYear(), agora.getMonth() + 1),
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
  ]);

  const metas = metasData as MetasConfig | null;

  return (
    <>
      <PageHeader titulo="Métricas" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
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
            />
            <SecaoPeriodo titulo="Este mês" metricas={metricasMes} metas={metas} />
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {souAdmin ? (
              <>
                Ainda não tem metas configuradas pra essa organização.{" "}
                <Link href="/configuracoes" className="font-medium underline">
                  Defina o piso de leads/reuniões e as taxas em Configurações
                </Link>{" "}
                pra ver o progresso aqui.
              </>
            ) : (
              "Ainda não tem metas configuradas pra essa organização. Peça pra um admin configurar em Configurações."
            )}
          </div>
        )}

        {souAdmin && (
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
                dados={performanceSemanaSdr}
                periodo={`${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)}`}
              />
            </div>
          </section>
        )}

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
