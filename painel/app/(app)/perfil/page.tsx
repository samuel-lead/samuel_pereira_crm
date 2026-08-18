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

      <main className="max-w-2xl px-6 py-6 space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            Meus dados
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Só pra conferir — editar nome ou e-mail ainda não dá por aqui.
          </p>

          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-neutral-500">Nome</dt>
              <dd className="font-medium text-neutral-900">{usuario?.nome ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">E-mail</dt>
              <dd className="font-medium text-neutral-900">{user?.email ?? "—"}</dd>
            </div>
          </dl>
        </div>

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
