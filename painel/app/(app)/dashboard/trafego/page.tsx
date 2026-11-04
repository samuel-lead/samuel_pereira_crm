import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  RelatorioTrafego,
  FILTROS_LEADS,
  type DadosTrafego,
  type ChaveFiltro,
} from "@/components/relatorio-trafego";
import { funilGondolas } from "@/lib/terminologia";

// Relatório "Leads de tráfego" (Samuel, 04/11/26): origem, o que chegou, o
// que queriam, qualificação e até virar reunião e venda. Só admin; não vale
// pra Inove Gôndolas (que não tem tráfego) nem pro imobiliário. Os números
// saem prontos do banco (função relatorio_trafego).

export default async function TrafegoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string; filtro?: string }>;
}) {
  const { origem: origemParam, filtro: filtroParam } = await searchParams;
  const { usuario } = await usuarioAutenticado();
  if (!usuario || (usuario.papel !== "admin" && !usuario.super_admin)) redirect("/dashboard");
  const publicoOrg = usuario.publico_org ?? "mentoria";
  if (funilGondolas(publicoOrg) || publicoOrg === "imobiliario") redirect("/dashboard");

  const supabase = await createClient();
  const filtro = (FILTROS_LEADS.some((f) => f.chave === filtroParam) ? filtroParam : "todos") as ChaveFiltro;

  // Sem origem escolhida: tenta a que se chama "Tráfego". Se essa não existir
  // na empresa, escolhe a que tem "tráfego" no nome ou, na falta, a maior.
  let origem = origemParam ?? "Tráfego";
  let { data, error } = await supabase.rpc("relatorio_trafego", { p_origem: origem });
  let d = data as DadosTrafego | null;
  if (!origemParam && d && d.resumo.chegaram === 0 && d.origens.length > 0) {
    const parecida = d.origens.find((o) => /tr[aá]fego/i.test(o.origem));
    origem = (parecida ?? d.origens[0]).origem;
    ({ data, error } = await supabase.rpc("relatorio_trafego", { p_origem: origem }));
    d = data as DadosTrafego | null;
  }

  if (error || !d) {
    return (
      <>
        <PageHeader titulo="Leads de tráfego" />
        <main className="bg-[#f4f5f7] px-6 py-6">
          <p className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
            Não foi possível carregar o relatório agora. Tente de novo em alguns minutos.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader titulo="Leads de tráfego" />
      <RelatorioTrafego d={d} filtro={filtro} publicoOrg={publicoOrg} />
    </>
  );
}
