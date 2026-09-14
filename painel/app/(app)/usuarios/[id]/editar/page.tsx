import { notFound } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BotaoVoltar } from "@/components/botao-voltar";
import { EditarUsuarioForm } from "@/components/editar-usuario-form";

type UsuarioLinha = {
  id: string;
  nome: string;
  wpp_comercial_e164: string | null;
};

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { usuario: usuarioLogado } = await usuarioAutenticado();

  // Só admin edita — mesmo padrão de Permissões: a página confia no
  // server action pra checar de novo (garantia real), aqui é só pra não
  // mostrar um formulário fantasma pra quem não pode salvar nada.
  if (usuarioLogado?.papel !== "admin") {
    notFound();
  }

  const { data } = await supabase.rpc("listar_usuarios_da_org");
  const usuarios = (data ?? []) as UsuarioLinha[];
  const usuario = usuarios.find((u) => u.id === id);

  if (!usuario) {
    notFound();
  }

  return (
    <>
      <PageHeader
        titulo={`Editar ${usuario.nome}`}
        acao={
          <BotaoVoltar
            fallbackHref="/usuarios"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          />
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <EditarUsuarioForm
            usuarioId={usuario.id}
            nomeAtual={usuario.nome}
            whatsappAtual={usuario.wpp_comercial_e164}
          />
        </div>
      </main>
    </>
  );
}
