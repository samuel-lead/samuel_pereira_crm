import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { OrigensConfig } from "@/components/origens-config";
import { ProdutosConfig } from "@/components/produtos-config";
import { MetasConfigForm } from "@/components/metas-config-form";

type MetasConfig = {
  piso_leads_dia: number;
  piso_reunioes_dia: number;
  taxa_agendamento_min: number;
  taxa_comparecimento_min: number;
  taxa_venda_min: number;
};

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const souSuperAdmin = usuario?.super_admin === true;
  const souAdmin = usuario?.papel === "admin";

  const [{ data: metasData }, { data: origensData }, { data: produtosData }] = await Promise.all([
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
    souAdmin
      ? supabase.from("origens").select("id, nome").order("nome")
      : Promise.resolve({ data: null }),
    souAdmin
      ? supabase.from("produtos").select("id, nome").order("nome")
      : Promise.resolve({ data: null }),
  ]);

  const metas = metasData as MetasConfig | null;
  const origens = origensData ?? [];
  const produtos = produtosData ?? [];

  return (
    <>
      <PageHeader titulo="Configurações" />

      <main className="max-w-2xl px-6 py-6">
        {souSuperAdmin && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Empresas clientes
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Gerencie os clientes que usam esse CRM — cadastrar acesso novo,
              suspender ou reativar.
            </p>
            <Link
              href="/empresas"
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              Gerenciar empresas
            </Link>
          </div>
        )}

        {metas && (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Metas e taxas do sistema
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              O piso é chão, nunca teto — bater ele não é motivo pra reduzir.
              As taxas não mudam sozinhas por performance, só se você trocar
              aqui.
            </p>
            <MetasConfigForm metas={metas} />
          </div>
        )}

        {souAdmin && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Origens dos leads
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Lista que aparece no cadastro do lead. Quem cadastra também
              pode digitar uma origem nova ali — ela entra aqui
              automaticamente. Renomear uma origem atualiza todos os leads
              que já usam ela.
            </p>
            <OrigensConfig origens={origens} />
          </div>
        )}

        {souAdmin && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Produtos
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Lista que aparece ao marcar uma venda. Renomear um produto
              atualiza todos os leads que já usam ele.
            </p>
            <ProdutosConfig produtos={produtos} />
          </div>
        )}
      </main>
    </>
  );
}
