import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { CopiarLinkIscaButton } from "@/components/copiar-link-isca-button";
import { ArquivarIscaButton } from "@/components/arquivar-isca-button";

type IscaLinha = {
  id: string;
  nome: string;
  slug: string;
  material_url: string | null;
  ativo: boolean;
};

export default async function IscasPage() {
  const supabase = await createClient();
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const dominio = `${protocolo}://${host}`;

  const { data } = await supabase
    .from("iscas")
    .select("id, nome, slug, material_url, ativo")
    .is("arquivado_em", null)
    .order("created_at", { ascending: false });

  const iscas = (data ?? []) as IscaLinha[];

  return (
    <>
      <PageHeader
        titulo="Iscas"
        acao={
          <Link
            href="/iscas/novo"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Nova isca
          </Link>
        }
      />

      <main className="space-y-4 px-6 py-6">
        <p className="text-sm text-neutral-500">
          Cada isca tem um link público próprio. Quem clicar preenche nome e
          WhatsApp, já vira lead aqui no CRM e recebe o link do material na
          hora — sem você precisar mandar nada.
        </p>

        {iscas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-10 text-center text-sm text-neutral-400">
            Nenhuma isca criada ainda.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {iscas.map((isca) => (
              <div key={isca.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-900">{isca.nome}</p>
                    {!isca.material_url && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase text-blue-700">
                        Só cadastro
                      </span>
                    )}
                    {!isca.ativo && (
                      <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500">
                        Inativa
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-400">
                    {dominio}/{isca.slug}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <CopiarLinkIscaButton link={`${dominio}/${isca.slug}`} />
                  <Link
                    href={`/iscas/${isca.id}`}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Editar
                  </Link>
                  <ArquivarIscaButton iscaId={isca.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
