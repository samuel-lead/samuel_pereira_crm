import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { INTEGRACOES, STATUS_LABEL } from "@/lib/integracoes";

export default function IntegracoesPage() {
  return (
    <>
      <PageHeader titulo="Integrações" />

      <main className="max-w-3xl px-6 py-6">
        <p className="mb-6 text-sm text-neutral-500">
          Canais e ferramentas que alimentam o CRM automaticamente, sem
          precisar digitar nada na mão. Clique numa pra ver os detalhes.
        </p>

        <div className="space-y-3">
          {INTEGRACOES.map((integracao) => {
            const status = STATUS_LABEL[integracao.status];
            return (
              <Link
                key={integracao.id}
                href={`/integracoes/${integracao.id}`}
                className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-bold ${integracao.corIcone}`}
                >
                  {integracao.letraIcone}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {integracao.nome}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${status.classe}`}
                    >
                      {status.texto}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {integracao.descricaoCurta}
                  </p>
                </div>
                <span className="mt-1 shrink-0 text-neutral-300">›</span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
