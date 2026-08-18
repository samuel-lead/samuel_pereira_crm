import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AlternarStatusOrgButton } from "@/components/alternar-status-org-button";

type OrgLinha = {
  id: string;
  nome: string;
  status: string;
  criado_em: string;
  admin_nome: string | null;
  admin_email: string | null;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function EmpresasPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_organizacoes_super_admin");
  const empresas = (data ?? []) as OrgLinha[];

  return (
    <>
      <PageHeader
        titulo="Empresas"
        acao={
          <Link
            href="/empresas/nova"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
          >
            + Nova empresa
          </Link>
        }
      />

      <main className="max-w-3xl px-6 py-6">
        <p className="mb-4 text-sm text-neutral-500">
          Cada empresa é um cliente seu usando esse CRM, com os próprios
          leads e usuários — totalmente separado dos outros.
        </p>

        <div className="space-y-3">
          {empresas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
              Nenhuma empresa cadastrada ainda
            </p>
          ) : (
            empresas.map((empresa) => (
              <div
                key={empresa.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-neutral-900">{empresa.nome}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        empresa.status === "ativo"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {empresa.status === "ativo" ? "Ativo" : "Suspenso"}
                    </span>
                  </div>
                  <p className="truncate text-sm text-neutral-500">
                    {empresa.admin_nome ?? "Sem admin"}
                    {empresa.admin_email ? ` · ${empresa.admin_email}` : ""}
                  </p>
                  <p className="text-xs text-neutral-400">
                    Desde {formatarData(empresa.criado_em)}
                  </p>
                </div>

                <AlternarStatusOrgButton
                  orgId={empresa.id}
                  status={empresa.status}
                  nome={empresa.nome}
                />
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
