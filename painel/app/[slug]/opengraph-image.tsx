import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

// Imagem do preview de link (WhatsApp, etc.) — antes mostrava o logo
// genérico "MV" do CRM, que não faz sentido pra quem recebe o link de
// uma isca. Gera um cartão simples, no mesmo estilo escuro/verde do
// formulário, com o nome da isca em destaque.
export const alt = "Meu Vendedor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: isca } = await supabase
    .from("iscas")
    .select("nome, material_url")
    .eq("slug", slug)
    .eq("ativo", true)
    .is("arquivado_em", null)
    .maybeSingle();

  const nome = isca?.nome ?? "Meu Vendedor";
  const subtitulo = isca?.material_url
    ? "Preenche seus dados pra liberar o acesso"
    : "Preenche seus dados pra nossa equipe entrar em contato";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: "#0b0e13",
          padding: "90px",
        }}
      >
        <div
          style={{
            width: 64,
            height: 8,
            backgroundColor: "#4ade80",
            borderRadius: 4,
            marginBottom: 44,
            display: "flex",
          }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#eef1f6",
            lineHeight: 1.25,
            maxWidth: 1000,
            display: "flex",
          }}
        >
          {nome}
        </div>
        <div style={{ fontSize: 30, color: "#8b93a1", marginTop: 28, display: "flex" }}>
          {subtitulo}
        </div>
      </div>
    ),
    { ...size }
  );
}
