import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LeadCard } from "@/components/lead-card";

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  valor_venda: number | null;
  vendido_em: string | null;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, valor_venda, vendido_em")
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .order("vendido_em", { ascending: false });

  const leads = (data ?? []) as LeadVendido[];
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.valor_venda ?? 0), 0);

  return (
    <>
      <PageHeader
        titulo="Vendas"
        acao={
          <Link href="/leads" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Voltar pro funil
          </Link>
        }
      />

      <main className="px-6 py-6">
        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-600 to-sky-500 p-6 text-white shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
            Receita total em vendas
          </p>
          <p className="mt-1 text-4xl font-extrabold">{formatarMoeda(totalReceita)}</p>
          <p className="mt-1 text-sm text-emerald-100">
            {leads.length} venda{leads.length === 1 ? "" : "s"} fechada
            {leads.length === 1 ? "" : "s"}
          </p>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-neutral-400">Nenhuma venda ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                id={lead.id}
                nome={lead.nome}
                telefoneE164={lead.telefone_e164}
                badgeClasse="bg-emerald-200 text-emerald-700"
                rodape={
                  <p className="mt-1 text-xs font-medium text-emerald-700">
                    {lead.valor_venda != null && formatarMoeda(Number(lead.valor_venda))}
                    {lead.vendido_em ? ` · ${formatarData(lead.vendido_em)}` : ""}
                  </p>
                }
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
