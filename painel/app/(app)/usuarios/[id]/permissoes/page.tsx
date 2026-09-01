import { notFound } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BotaoVoltar } from "@/components/botao-voltar";
import { EditarPermissoesForm } from "@/components/editar-permissoes-form";

type UsuarioLinha = {
  id: string;
  nome: string;
  papel: string;
  funcao: string | null;
  paginas_permitidas: string[];
};

export default async function PermissoesUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { usuario: usuarioLogado } = await usuarioAutenticado();

  const { data } = await supabase.rpc("listar_usuarios_da_org");
  const usuarios = (data ?? []) as UsuarioLinha[];
  const usuario = usuarios.find((u) => u.id === id);

  if (!usuario) {
    notFound();
  }

  return (
    <>
      <PageHeader
        titulo={`Permissões de ${usuario.nome}`}
        acao={
          <BotaoVoltar
            fallbackHref="/usuarios"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          />
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <EditarPermissoesForm
            usuarioId={usuario.id}
            papelAtual={usuario.papel}
            funcaoAtual={usuario.funcao}
            paginasAtuais={usuario.paginas_permitidas ?? []}
            publicoOrg={usuarioLogado?.publico_org ?? "mentoria"}
          />
        </div>
      </main>
    </>
  );
}
