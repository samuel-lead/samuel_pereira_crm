import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { NovoLeadForm } from "@/components/novo-lead-form";

export default async function NovoLeadPage() {
  const supabase = await createClient();

  const { data: usuariosData } = await supabase
    .from("usuarios")
    .select("id, nome")
    .order("nome");

  const usuarios = usuariosData ?? [];

  return (
    <>
      <PageHeader titulo="Novo lead" />

      <main className="mx-auto max-w-lg px-6 py-10">
        <NovoLeadForm usuarios={usuarios} />
      </main>
    </>
  );
}
