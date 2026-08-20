import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ResumoAno } from "@/components/resumo-ano";
import { FiltroAnoSelect } from "@/components/filtro-ano-select";
import { calcularResumoAno } from "@/lib/metricas";

export default async function AnoPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const anoAtual = agora.getFullYear();
  const anoNumero = anoParam ? Number(anoParam) : anoAtual;
  const ano = Number.isFinite(anoNumero) && anoNumero > 0 ? anoNumero : anoAtual;

  const resumo = await calcularResumoAno(supabase, usuario!.org_id, ano);

  return (
    <>
      <PageHeader
        titulo={`Ano ${ano}`}
        acao={
          <div className="flex items-center gap-3">
            <FiltroAnoSelect anoSelecionado={ano} anoAtual={anoAtual} />
            <Link
              href="/dashboard"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              ← Métricas
            </Link>
          </div>
        }
      />

      <main className="bg-[#f4f5f7] px-6 py-6">
        <ResumoAno dados={resumo} mesAtual={ano === anoAtual ? agora.getMonth() + 1 : 0} />
      </main>
    </>
  );
}
