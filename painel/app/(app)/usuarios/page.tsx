import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ExcluirUsuarioButton } from "@/components/excluir-usuario-button";

type UsuarioLinha = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function UsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase.rpc("listar_usuarios_da_org");
  const usuarios = (data ?? []) as UsuarioLinha[];

  return (
    <>
      <PageHeader titulo="Usuários" />

      <main className="max-w-2xl px-6 py-6">
        <p className="mb-4 text-sm text-neutral-500">
          Todo mundo com acesso ao CRM. Quando alguém sair da empresa,
          exclua o acesso aqui — ele não consegue mais entrar.
        </p>

        <div className="space-y-3">
          {usuarios.map((usuario) => (
            <div
              key={usuario.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-bold text-white">
                  {iniciais(usuario.nome)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">
                    {usuario.nome}
                    {usuario.id === user?.id && (
                      <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        você
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-neutral-500">{usuario.email}</p>
                  <p className="text-xs text-neutral-400">
                    Desde {formatarData(usuario.criado_em)}
                  </p>
                </div>
              </div>

              {usuario.id !== user?.id && (
                <ExcluirUsuarioButton usuarioId={usuario.id} nome={usuario.nome} />
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
