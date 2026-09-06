import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { BotaoVoltar } from "@/components/botao-voltar";
import { buscarIntegracao, STATUS_LABEL } from "@/lib/integracoes";
import { usuarioAutenticado } from "@/lib/supabase/server";

export default async function IntegracaoDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { conectado, erro } = await searchParams;
  const { usuario } = await usuarioAutenticado();
  const integracao = buscarIntegracao(id, usuario!.publico_org);

  if (!integracao) {
    notFound();
  }

  const status = STATUS_LABEL[integracao.status];
  const linkConectarGoogle = `https://hgloheptxqdjpwzgquku.supabase.co/functions/v1/google-calendar-iniciar?org_id=${usuario!.org_id}`;

  return (
    <>
      <PageHeader
        titulo={integracao.nome}
        acao={
          <BotaoVoltar
            fallbackHref="/integracoes"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          />
        }
      />

      <main className="max-w-2xl px-6 py-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-lg font-bold ${integracao.corIcone}`}
            >
              {integracao.letraIcone}
            </span>
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                {integracao.nome}
              </h2>
              <span
                className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${status.classe}`}
              >
                {status.texto}
              </span>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              O que faz
            </h3>
            <p className="text-sm text-neutral-700">{integracao.oQueFaz}</p>
          </div>

          {integracao.infoConexao && (
            <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">{integracao.infoConexao}</p>
            </div>
          )}

          {conectado === "1" && (
            <div className="mt-5 rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800">
                ✓ Google Agenda conectada! Agora dá pra salvar uma reunião marcada
                direto na agenda, pelo botão dentro do card do lead.
              </p>
            </div>
          )}

          {erro && (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">
                Não deu pra conectar: {decodeURIComponent(erro)}
              </p>
            </div>
          )}

          {id === "google-calendar" && (
            <div className="mt-5">
              {usuario!.papel === "admin" ? (
                <a
                  href={linkConectarGoogle}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                >
                  Conectar com Google
                </a>
              ) : (
                <p className="text-xs text-neutral-400">
                  Só um admin pode conectar essa integração.
                </p>
              )}
            </div>
          )}

          {integracao.avisoImportante && (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">Antes de começar: </span>
                {integracao.avisoImportante}
              </p>
            </div>
          )}

          {integracao.comoConectar && (
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Passo a passo pra conectar
              </h3>
              {integracao.comoConectar.map((passo) => (
                <div
                  key={passo.numero}
                  className="flex gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-700">
                    {passo.numero}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-neutral-800">
                        {passo.titulo}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          passo.quemFaz === "voce"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {passo.quemFaz === "voce" ? "Você faz" : "Eu construo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">{passo.descricao}</p>
                  </div>
                </div>
              ))}
              <p className="text-xs text-neutral-400">
                Quando quiser seguir com essa, me avisa que a gente começa
                pelos passos que são seus.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
