import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { IscaCapturaForm } from "@/components/isca-captura-form";

// Fonte só dessa página pública (não mexe na fonte do resto do painel) —
// Samuel achou a fonte padrão feia aqui, Inter é mais legível pra uma
// página de captura que qualquer visitante vai ver.
const fonte = Inter({ subsets: ["latin"] });

// Nunca guarda em cache — sem isso, o Next podia servir pra algumas
// pessoas uma versão velha da página (de antes da isca existir/estar
// ativa), enquanto outras já viam a versão certa — dava 404 pra uns e
// funcionava pra outros no mesmo link, dependendo de qual servidor
// atendesse o visitante.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Sem isso, o link compartilhado no WhatsApp mostrava sempre "Meu
// Vendedor" (o título genérico do site inteiro) em vez do nome da isca.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: isca } = await supabase
    .from("iscas")
    .select("nome, material_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .is("arquivado_em", null)
    .maybeSingle();

  if (!isca) return { title: "Meu Vendedor" };

  const descricao = isca.material_url
    ? "Preenche seus dados pra liberar o acesso — leva menos de 2 minutos."
    : "Preenche seus dados pra nossa equipe entrar em contato — leva menos de 2 minutos.";
  return {
    title: isca.nome,
    description: descricao,
    openGraph: { title: isca.nome, description: descricao },
  };
}

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
      .select("nome, material_url")
      .eq("slug", slug)
      .eq("ativo", true)
      .is("arquivado_em", null)
      .maybeSingle(),
    supabase.rpc("buscar_pixels_org", { p_slug: slug }).maybeSingle(),
  ]);

  if (!isca) {
    notFound();
  }

  const idsPixel = pixels as {
    meta_pixel_id: string | null;
    google_tag_id: string | null;
    instagram_url: string | null;
  } | null;

  return (
    <div className={`min-h-screen overflow-x-hidden bg-[#0b0e13] ${fonte.className}`}>
      <IscaCapturaForm
        slug={slug}
        nomeIsca={isca.nome}
        soCadastro={!isca.material_url}
        metaPixelId={idsPixel?.meta_pixel_id ?? null}
        googleTagId={idsPixel?.google_tag_id ?? null}
        instagramUrl={idsPixel?.instagram_url ?? null}
      />
    </div>
  );
}
