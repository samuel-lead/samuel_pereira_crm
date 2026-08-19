import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { buscarIntegracao, STATUS_LABEL } from "@/lib/integracoes";

export default async function IntegracaoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const integracao = buscarIntegracao(id);

  if (!integracao) {
    notFound();
  }

  const status = STATUS_LABEL[integracao.status];

  return (
    <>
      <PageHeader
        titulo={integracao.nome}
        acao={
          <Link
            href="/integracoes"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Voltar
          </Link>
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

          {integracao.comoConectar && (
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Como conectar
              </h3>
              {integracao.comoConectar.map((passo) => (
                <div
                  key={passo.titulo}
                  className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {passo.titulo}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">{passo.descricao}</p>
                </div>
              ))}
              <p className="text-xs text-neutral-400">
                Quando quiser seguir com essa, me avisa que a gente combina os
                próximos passos.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
