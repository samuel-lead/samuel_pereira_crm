import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ResumoAno } from "@/components/resumo-ano";
import { calcularResumoAno } from "@/lib/metricas";

export default async function AnoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("org_id")
    .eq("id", user!.id)
    .single();

  const agora = new Date();
  const ano = agora.getFullYear();
  const resumo = await calcularResumoAno(supabase, usuario!.org_id, ano);

  return (
    <>
      <PageHeader titulo={`Ano ${ano}`} />

      <main className="bg-[#f4f5f7] px-6 py-6">
        <ResumoAno dados={resumo} mesAtual={agora.getMonth() + 1} />
      </main>
    </>
  );
}
