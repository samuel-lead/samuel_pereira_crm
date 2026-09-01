import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IscaCapturaForm } from "@/components/isca-captura-form";

// Página pública de captura de uma isca — sem login, aberta pra qualquer
// visitante que clicar no link (dominio.com/<slug>). O middleware
// (lib/supabase/middleware.ts) já libera esse caminho antes de chegar
// aqui, checando se o slug bate com uma isca ativa.
export default async function IscaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: isca } = await supabase
    .from("iscas")
    .select("nome")
    .eq("slug", slug)
    .eq("ativo", true)
    .is("arquivado_em", null)
    .maybeSingle();

  if (!isca) {
    notFound();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f5f7] px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-bold text-neutral-900">{isca.nome}</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Preenche seus dados pra liberar o acesso · leva menos de 2 minutos
        </p>
        <IscaCapturaForm slug={slug} nomeIsca={isca.nome} />
      </div>
    </div>
  );
}
