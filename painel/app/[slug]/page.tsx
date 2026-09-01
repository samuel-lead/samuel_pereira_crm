import { notFound } from "next/navigation";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { IscaCapturaForm } from "@/components/isca-captura-form";

// Fonte só dessa página pública (não mexe na fonte do resto do painel) —
// Samuel achou a fonte padrão feia aqui, Inter é mais legível pra uma
// página de captura que qualquer visitante vai ver.
const fonte = Inter({ subsets: ["latin"] });

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

  const [{ data: isca }, { data: pixels }] = await Promise.all([
    supabase
      .from("iscas")
      .select("nome")
      .eq("slug", slug)
      .eq("ativo", true)
      .is("arquivado_em", null)
      .maybeSingle(),
    supabase.rpc("buscar_pixels_org", { p_slug: slug }).maybeSingle(),
  ]);

  if (!isca) {
    notFound();
  }

  const idsPixel = pixels as { meta_pixel_id: string | null; google_tag_id: string | null } | null;

  return (
    <div className={`min-h-screen overflow-x-hidden bg-[#0b0e13] ${fonte.className}`}>
      <IscaCapturaForm
        slug={slug}
        nomeIsca={isca.nome}
        metaPixelId={idsPixel?.meta_pixel_id ?? null}
        googleTagId={idsPixel?.google_tag_id ?? null}
      />
    </div>
  );
}
