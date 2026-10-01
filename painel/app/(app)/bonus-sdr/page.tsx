import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { BonusSdrTabela } from "@/components/bonus-sdr";
import { calcularBonusPorSdr, type BonusSdrConfig } from "@/lib/metricas";
import { resolverPeriodo } from "@/lib/periodo";

// Samuel pediu um filtro de mês aqui — antes a tela só mostrava o mês
// atual, sem jeito nenhum de olhar o bônus de um mês passado. O bônus é
// uma conta inerentemente mensal (as faixas de tiers são por mês), então
// só os atalhos "Mês atual"/"Mês passado" + o seletor "Escolher mês" —
// não faz sentido oferecer "Hoje"/"Semana" aqui.
export default async function BonusSdrPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mesAno?: string }>;
}) {
  const { periodo, mesAno } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const periodoResolvido =
    resolverPeriodo({ periodo, mesAno }, agora) ?? resolverPeriodo({ periodo: "mes" }, agora)!;

  const [bonus, { data: configData }] = await Promise.all([
    calcularBonusPorSdr(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    supabase.from("bonus_sdr_config").select("*").eq("org_id", usuario!.org_id).maybeSingle(),
  ]);
  const config = (configData as BonusSdrConfig | null) ?? undefined;

  return (
    <>
      <PageHeader titulo="Bônus SDR" />

      <main className="space-y-4 bg-[#f4f5f7] px-6 py-6">
        <FiltroPeriodo
          baseHref="/bonus-sdr"
          periodoAtual={periodoResolvido.chave}
          mesAnoAtual={mesAno}
          atalhos={["mes", "mes_passado"]}
          publicoOrg={usuario!.publico_org}
        />

        <BonusSdrTabela
          dados={bonus}
          periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
          publicoOrg={usuario!.publico_org}
          config={config}
        />
      </main>
    </>
  );
}
