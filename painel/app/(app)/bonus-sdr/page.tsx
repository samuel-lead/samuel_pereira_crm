import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BonusSdrTabela } from "@/components/bonus-sdr";
import { calcularBonusPorSdr, inicioDoMes } from "@/lib/metricas";
import { inicioDoDia, UM_DIA_MS } from "@/lib/datas";

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export default async function BonusSdrPage() {
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const amanha = new Date(inicioDoDia(agora).getTime() + UM_DIA_MS);
  const inicioMes = inicioDoMes(agora);

  const bonus = await calcularBonusPorSdr(supabase, usuario!.org_id, inicioMes, amanha);

  return (
    <>
      <PageHeader titulo="Bônus SDR" />

      <main className="space-y-4 bg-[#f4f5f7] px-6 py-6">
        <BonusSdrTabela
          dados={bonus}
          periodo={MESES[inicioMes.getUTCMonth()]}
          publicoOrg={usuario!.publico_org}
        />
      </main>
    </>
  );
}
