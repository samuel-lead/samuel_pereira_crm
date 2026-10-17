import { PageHeader } from "@/components/page-header";
import { ImportarLeadsForm } from "@/components/importar-leads-form";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";

export default async function ImportarLeadsPage() {
  const { usuario } = await usuarioAutenticado();
  const supabase = await createClient();
  const { data: origensData } = await supabase.from("origens").select("id, nome").order("nome");

  return (
    <>
      <PageHeader titulo="Importar leads" />

      <main className="mx-auto max-w-2xl bg-[#f4f5f7] px-6 py-10">
        <ImportarLeadsForm publicoOrg={usuario?.publico_org ?? "mentoria"} origens={origensData ?? []} />
      </main>
    </>
  );
}
