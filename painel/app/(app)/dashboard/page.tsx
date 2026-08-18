import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
import { VendasPorCanal } from "@/components/vendas-por-canal";
import { PerformanceSdr } from "@/components/performance-sdr";
import { LeadsPorOrigem } from "@/components/leads-por-origem";
import {
  calcularMetricas,
  calcularVendasPorCanal,
  calcularMetricasPorUsuario,
  calcularLeadsPorOrigem,
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

  const { data: metasData } = await supabase
    .from("metas_config")
    .select(
      "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
    )
    .eq("org_id", usuario!.org_id)
    .single();

  const metas = metasData as MetasConfig;
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
    performanceSemanaSdr,
    leadsPorOrigemSemana,
    leadsPorOrigemMes,
  ] = await Promise.all([
    calcularMetricas(supabase, usuario!.id, inicioSemana, amanha),
    calcularMetricas(supabase, usuario!.id, inicioMes, amanha),
    souAdmin
      ? calcularVendasPorCanal(supabase, usuario!.org_id, inicioMes, amanha)
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
  ]);

  return (
    <>
      <PageHeader titulo="Métricas" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
        <SecaoPeriodo
          titulo="Esta semana"
          subtitulo={subtituloSemana}
          metricas={metricasSemana}
          metas={metas}
        />
        <SecaoPeriodo titulo="Este mês" metricas={metricasMes} metas={metas} />

        {souAdmin && (
          <section>
            <h2 className="mb-3 text-lg font-bold text-neutral-900">Visão da equipe</h2>
            <div className="space-y-4">
              <LeadsPorOrigem
                titulo={`Origem dos leads — semana (${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)})`}
                dados={leadsPorOrigemSemana}
              />
              <LeadsPorOrigem titulo="Origem dos leads — mês" dados={leadsPorOrigemMes} />
              <VendasPorCanal dados={vendasPorCanal} />
              <PerformanceSdr
                dados={performanceSemanaSdr}
                periodo={`${formatarDataCurta(inicioSemana)} a ${formatarDataCurta(fimSemana)}`}
              />
            </div>
          </section>
        )}

        <p className="text-xs text-neutral-400">
          Taxas e piso são constantes do sistema — nunca baixam por
          performance. Calculado direto no banco, sem estimativa.
        </p>
      </main>
    </>
  );
}
