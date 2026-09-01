import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NovoUsuarioForm } from "@/components/novo-usuario-form";
import { usuarioAutenticado } from "@/lib/supabase/server";

export default async function NovoUsuarioPage() {
  const { usuario } = await usuarioAutenticado();

  return (
    <>
      <PageHeader
        titulo="Novo usuário"
        acao={
          <Link
            href="/usuarios"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancelar
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <NovoUsuarioForm publicoOrg={usuario?.publico_org ?? "mentoria"} />
        </div>
      </main>
    </>
  );
}
