import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NovoLeadForm } from "@/components/novo-lead-form";
import { ehImobiliario } from "@/lib/terminologia";

export default async function NovoLeadPage() {
  const supabase = await createClient();
  const { usuario: usuarioAtual } = await usuarioAutenticado();

  const ehImob = ehImobiliario(usuarioAtual?.publico_org ?? "mentoria");

  const [{ data: usuariosData }, { data: origensData }, { data: imoveisData }] = await Promise.all([
    supabase.from("usuarios").select("id, nome, funcao, papel").order("nome"),
    supabase.from("origens").select("id, nome").order("nome"),
    // Imóvel de interesse (opcional) só existe no imobiliário.
    ehImob
      ? supabase
          .from("imoveis")
          .select("id, titulo, bairro, cidade")
          .is("arquivado_em", null)
          .order("titulo")
      : Promise.resolve({ data: null }),
  ]);

  const usuarios = usuariosData ?? [];
  const origens = origensData ?? [];
  const souAdmin = usuarioAtual?.papel === "admin";

  return (
    <>
      <PageHeader titulo="Novo lead" />

      <main className="mx-auto max-w-lg bg-[#f4f5f7] px-6 py-10">
        <NovoLeadForm
          usuarios={usuarios}
          origens={origens}
          souAdmin={souAdmin}
          imoveis={ehImob ? (imoveisData ?? []) : undefined}
        />
      </main>
    </>
  );
}
