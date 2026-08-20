import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NovoLeadForm } from "@/components/novo-lead-form";

export default async function NovoLeadPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: usuariosData }, { data: usuarioAtual }, { data: origensData }] =
    await Promise.all([
      supabase.from("usuarios").select("id, nome, funcao").order("nome"),
      user
        ? supabase.from("usuarios").select("papel").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
      supabase.from("origens").select("id, nome").order("nome"),
    ]);

  const usuarios = usuariosData ?? [];
  const origens = origensData ?? [];
  const souAdmin = usuarioAtual?.papel === "admin";

  return (
    <>
      <PageHeader titulo="Novo lead" />

      <main className="mx-auto max-w-lg bg-[#f4f5f7] px-6 py-10">
        <NovoLeadForm usuarios={usuarios} origens={origens} souAdmin={souAdmin} />
      </main>
    </>
  );
}
