import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ExcluirUsuarioButton } from "@/components/excluir-usuario-button";

type UsuarioLinha = {
  id: string;
  nome: string;
  email: string;
  criado_em: string;
  papel: string;
  paginas_permitidas: string[];
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
      <PageHeader
        titulo="Usuários"
        acao={
          <Link
            href="/usuarios/novo"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
          >
            + Novo usuário
          </Link>
        }
      />

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
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium text-neutral-900">
                      {usuario.nome}
                    </span>
                    {usuario.id === user?.id && (
                      <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                        você
                      </span>
                    )}
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        usuario.papel === "admin"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sky-100 text-sky-700"
                      }`}
                    >
                      {usuario.papel === "admin" ? "Administrador" : "Membro"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-neutral-500">{usuario.email}</p>
                  <p className="text-xs text-neutral-400">
                    Desde {formatarData(usuario.criado_em)}
                  </p>
                </div>
              </div>

              {usuario.id !== user?.id && (
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Link
                    href={`/usuarios/${usuario.id}/permissoes`}
                    className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                  >
                    Permissões
                  </Link>
                  <ExcluirUsuarioButton usuarioId={usuario.id} nome={usuario.nome} />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
