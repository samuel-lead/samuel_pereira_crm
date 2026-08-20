import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { atualizarMetasConfig } from "@/lib/configuracoes/actions";
import { OrigensConfig } from "@/components/origens-config";

type MetasConfig = {
  piso_leads_dia: number;
  piso_reunioes_dia: number;
  taxa_agendamento_min: number;
  taxa_comparecimento_min: number;
  taxa_venda_min: number;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("org_id, papel, super_admin")
    .eq("id", user!.id)
    .single();

  const souSuperAdmin = usuario?.super_admin === true;
  const souAdmin = usuario?.papel === "admin";

  const [{ data: metasData }, { data: origensData }] = await Promise.all([
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
  ]);

  const metas = metasData as MetasConfig | null;
  const origens = origensData ?? [];

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
            <form action={atualizarMetasConfig} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClasse} htmlFor="piso_leads_dia">
                    Piso de leads/dia
                  </label>
                  <input
                    id="piso_leads_dia"
                    name="piso_leads_dia"
                    type="number"
                    min={1}
                    required
                    defaultValue={metas.piso_leads_dia}
                    className={campoClasse}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClasse} htmlFor="piso_reunioes_dia">
                    Piso de reuniões/dia
                  </label>
                  <input
                    id="piso_reunioes_dia"
                    name="piso_reunioes_dia"
                    type="number"
                    min={1}
                    required
                    defaultValue={metas.piso_reunioes_dia}
                    className={campoClasse}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClasse} htmlFor="taxa_agendamento_min">
                    Taxa de agendamento mín. (%)
                  </label>
                  <input
                    id="taxa_agendamento_min"
                    name="taxa_agendamento_min"
                    type="number"
                    min={1}
                    max={100}
                    step="0.1"
                    required
                    defaultValue={Math.round(Number(metas.taxa_agendamento_min) * 1000) / 10}
                    className={campoClasse}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClasse} htmlFor="taxa_comparecimento_min">
                    Taxa de comparecimento mín. (%)
                  </label>
                  <input
                    id="taxa_comparecimento_min"
                    name="taxa_comparecimento_min"
                    type="number"
                    min={1}
                    max={100}
                    step="0.1"
                    required
                    defaultValue={Math.round(Number(metas.taxa_comparecimento_min) * 1000) / 10}
                    className={campoClasse}
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClasse} htmlFor="taxa_venda_min">
                    Taxa de venda mín. (%)
                  </label>
                  <input
                    id="taxa_venda_min"
                    name="taxa_venda_min"
                    type="number"
                    min={1}
                    max={100}
                    step="0.1"
                    required
                    defaultValue={Math.round(Number(metas.taxa_venda_min) * 1000) / 10}
                    className={campoClasse}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
              >
                Salvar
              </button>
            </form>
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
      </main>
    </>
  );
}
