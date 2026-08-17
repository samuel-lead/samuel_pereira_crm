import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
import { calcularMetricas, inicioDaSemana, inicioDoMes } from "@/lib/metricas";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, org_id")
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

  const [metricasSemana, metricasMes] = await Promise.all([
    calcularMetricas(supabase, usuario!.id, inicioDaSemana(agora), amanha),
    calcularMetricas(supabase, usuario!.id, inicioDoMes(agora), amanha),
  ]);

  return (
    <>
      <PageHeader titulo="Métricas" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
        <SecaoPeriodo titulo="Esta semana" metricas={metricasSemana} metas={metas} />
        <SecaoPeriodo titulo="Este mês" metricas={metricasMes} metas={metas} />

        <p className="text-xs text-neutral-400">
          Taxas e piso são constantes do sistema — nunca baixam por
          performance. Calculado direto no banco, sem estimativa.
        </p>
      </main>
    </>
  );
}
