import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { OrigensConfig } from "@/components/origens-config";
import { ProdutosConfig } from "@/components/produtos-config";
import { MetasConfigForm } from "@/components/metas-config-form";
import { BonusSdrConfigForm } from "@/components/bonus-sdr-config-form";
import type { BonusSdrConfig } from "@/lib/metricas";

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

  const souAdmin = usuario?.papel === "admin";
  const ehImobiliario = usuario?.publico_org === "imobiliario";

  const [{ data: metasData }, { data: origensData }, { data: produtosData }, { data: bonusSdrData }] =
    await Promise.all([
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
      souAdmin && !ehImobiliario
        ? supabase.from("bonus_sdr_config").select("*").eq("org_id", usuario!.org_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const metas = metasData as MetasConfig | null;
  const origens = origensData ?? [];
  const produtos = produtosData ?? [];
  const bonusSdrConfig = bonusSdrData as BonusSdrConfig | null;

  return (
    <>
      <PageHeader titulo="Configurações" />

      <main className="max-w-5xl px-6 py-6">
        {metas && (
          <div className="mb-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Metas e taxas do sistema
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              O piso é chão, nunca teto — bater ele não é motivo pra reduzir.
              As taxas não mudam sozinhas por performance, só se você trocar
              aqui.
            </p>
            <MetasConfigForm metas={metas} publicoOrg={usuario!.publico_org} />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {souAdmin && (
            <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
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
            <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
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
        </div>

        {bonusSdrConfig && (
          <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-neutral-800">
              Valores do bônus SDR
            </h2>
            <p className="mb-4 text-xs text-neutral-500">
              Os valores usados no cálculo da página Bônus SDR do mês atual.
            </p>
            <BonusSdrConfigForm config={bonusSdrConfig} publicoOrg={usuario!.publico_org} />
          </div>
        )}
      </main>
    </>
  );
}
