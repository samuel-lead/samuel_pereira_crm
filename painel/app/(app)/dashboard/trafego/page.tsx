import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { RelatorioTrafego, type DadosTrafego, type PeriodoTrafego } from "@/components/relatorio-trafego";
import { resolverPeriodo } from "@/lib/periodo";
import { bloquearSeOculta, relatorioTrafegoLiberado } from "@/lib/paginas-ocultas";
import { funilGondolas } from "@/lib/terminologia";

// Relatório "Leads de tráfego" (Samuel, 04/11/26): origem, o que chegou, o
// que queriam, qualificação e até virar reunião e venda. Só admin; não vale
// pra Inove Gôndolas (que não tem tráfego) nem pro imobiliário. Os números
// saem prontos do banco (função relatorio_trafego).

export default async function TrafegoPage({
  searchParams,
}: {
  searchParams: Promise<{ origem?: string; periodo?: string; mesAno?: string; de?: string; ate?: string }>;
}) {
  const { origem: origemParam, periodo, mesAno, de, ate } = await searchParams;
  const { usuario } = await usuarioAutenticado();
  if (!usuario || (usuario.papel !== "admin" && !usuario.super_admin)) redirect("/dashboard");
  const publicoOrg = usuario.publico_org ?? "mentoria";
  const supabase = await createClient();
  // Imobiliária só abre se foi liberada (hoje: Ketlyn). Lá o "tráfego" junta a
  // origem Trafego + todos os formulários (grupo especial "__trafego__").
  const imobLiberada = publicoOrg === "imobiliario" && (await relatorioTrafegoLiberado(supabase, usuario.org_id));
  if (funilGondolas(publicoOrg) || (publicoOrg === "imobiliario" && !imobLiberada)) redirect("/dashboard");
  // Empresa que escondeu esta página (orgs.paginas_ocultas) não abre nem
  // digitando o endereço.
  await bloquearSeOculta(supabase, usuario.org_id, "/dashboard/trafego");

  // Período do filtro (hoje, ontem, semana, mês, trimestre, mês/ano ou datas
  // próprias). Sem nada escolhido: todo o histórico.
  const resolvido = resolverPeriodo({ periodo, mesAno, de, ate }, new Date());
  const periodoTela: PeriodoTrafego = resolvido
    ? { chave: resolvido.chave, titulo: resolvido.titulo, subtitulo: resolvido.subtitulo, mesAno, de, ate }
    : null;
  const argsPeriodo = {
    p_inicio: resolvido ? resolvido.inicio.toISOString() : null,
    p_fim: resolvido ? resolvido.fim.toISOString() : null,
  };

  // Sem origem escolhida: tenta a que se chama "Tráfego". Se essa não existir
  // na empresa (e sem filtro de período), escolhe a que tem "tráfego" no nome
  // ou, na falta, a maior.
  let origem = origemParam ?? (imobLiberada ? "__trafego__" : "Tráfego");
  let { data, error } = await supabase.rpc("relatorio_trafego", { p_origem: origem, ...argsPeriodo });
  let d = data as DadosTrafego | null;
  if (!origemParam && !resolvido && d && d.resumo.chegaram === 0 && d.origens.length > 0) {
    const parecida = d.origens.find((o) => /tr[aá]fego/i.test(o.origem));
    origem = (parecida ?? d.origens[0]).origem;
    ({ data, error } = await supabase.rpc("relatorio_trafego", { p_origem: origem, ...argsPeriodo }));
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
      <RelatorioTrafego d={d} publicoOrg={publicoOrg} periodo={periodoTela} />
    </>
  );
}
