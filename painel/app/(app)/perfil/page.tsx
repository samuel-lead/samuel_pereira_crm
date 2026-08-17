import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FotoPerfilForm } from "@/components/foto-perfil-form";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nome, foto_url")
    .eq("id", user!.id)
    .single();

  return (
    <>
      <PageHeader titulo="Meu perfil" />

      <main className="max-w-2xl px-6 py-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            Foto de perfil
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Aparece no lugar da sua inicial em Usuários e em outras telas do
            CRM.
          </p>

          <FotoPerfilForm nome={usuario?.nome ?? ""} fotoUrl={usuario?.foto_url ?? null} />
        </div>
      </main>
    </>
  );
}
