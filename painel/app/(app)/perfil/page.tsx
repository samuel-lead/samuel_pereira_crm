import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { FotoPerfilForm } from "@/components/foto-perfil-form";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { TrocarTelefoneForm } from "@/components/trocar-telefone-form";

export default async function PerfilPage() {
  const { user, usuario } = await usuarioAutenticado();

  const supabase = await createClient();
  const { data: dadosTelefone } = usuario
    ? await supabase
        .from("usuarios")
        .select("wpp_comercial_e164")
        .eq("id", usuario.id)
        .single()
    : { data: null };

  return (
    <>
      <PageHeader titulo="Meu perfil" />

      <main className="max-w-2xl px-6 py-6 space-y-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-800">
            Meus dados
          </h2>

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

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            WhatsApp
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Usamos esse número pra avisos importantes, tipo lembrete de contato.
          </p>

          <TrocarTelefoneForm telefoneAtual={dadosTelefone?.wpp_comercial_e164 ?? null} />
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold text-neutral-800">
            Trocar senha
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Depois de trocar, você continua logado — não precisa entrar de novo.
          </p>

          <TrocarSenhaForm />
        </div>
      </main>
    </>
  );
}
