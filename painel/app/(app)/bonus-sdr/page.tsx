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
// não faz sentido oferecer "Hoje"/"Semana" aqui. O botão "Período
// personalizado" do FiltroPeriodo não some (é fixo no componente), por
// isso de/ate também são lidos aqui, senão a tela ignorava a data
// escolhida nele e voltava sempre pro mês atual.
export default async function BonusSdrPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mesAno?: string; de?: string; ate?: string }>;
}) {
  const { periodo, mesAno, de, ate } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const periodoResolvido =
    resolverPeriodo({ periodo, mesAno, de, ate }, agora) ?? resolverPeriodo({ periodo: "mes" }, agora)!;

  // Rótulo "inteligente" pro selo da tela (Samuel pediu explicitamente):
  // "Mês atual"/"Mês passado" nos atalhos, o nome do mês escolhido no
  // seletor, e o intervalo de datas no período personalizado — nunca o
  // genérico "Este mês" do filtro (que virava "Mês de Este mês", errado).
  const rotuloPeriodo =
    periodoResolvido.chave === "mes"
      ? "Mês atual"
      : periodoResolvido.chave === "mes_passado"
        ? "Mês passado"
        : periodoResolvido.chave === "custom"
          ? (periodoResolvido.subtitulo ?? periodoResolvido.titulo)
          : periodoResolvido.titulo;

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
          deAtual={de}
          ateAtual={ate}
          atalhos={["mes", "mes_passado"]}
          publicoOrg={usuario!.publico_org}
        />

        <BonusSdrTabela
          dados={bonus}
          periodo={rotuloPeriodo}
          publicoOrg={usuario!.publico_org}
          config={config}
        />
      </main>
    </>
  );
}
