import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BuscaLeads } from "@/components/busca-leads";
import { corDoNivel, numerarNiveis, rotuloNivelCurto, type NivelResumo } from "@/lib/niveis";

type LeadExcluido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  arquivado_em: string;
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeadsExcluidosPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string }>;
}) {
  const { busca: buscaFiltro } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, nivel_ordem, arquivado_em")
    .not("arquivado_em", "is", null)
    .order("arquivado_em", { ascending: false });

  if (buscaFiltro) {
    consulta = consulta.ilike("nome", `%${buscaFiltro}%`);
  }

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
  ]);

  const niveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(niveis);
  const leads = (leadsData ?? []) as LeadExcluido[];

  return (
    <>
      <PageHeader titulo="Excluídos" acao={<BuscaLeads />} />

      <main className="px-6 py-6">
        <p className="mb-4 max-w-2xl text-sm text-neutral-500">
          Leads excluídos são aqueles que não têm o perfil de cliente ideal
          (ICP) ou foram mal-educados com a gente. Eles saem do funil, mas
          ficam guardados aqui — nada é apagado de verdade.
        </p>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Nível</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Excluído em</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhum lead excluído
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const nivelDoLead = niveis.find((n) => n.ordem === lead.nivel_ordem);
                  const cor = corDoNivel(lead.nivel_ordem);
                  return (
                    <tr key={lead.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {lead.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {lead.telefone_e164 ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cor.badge}`}
                        >
                          {nivelDoLead
                            ? rotuloNivelCurto(nivelDoLead, numerosVisiveis.get(nivelDoLead.ordem))
                            : lead.nivel_ordem}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {lead.origem ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatarData(lead.arquivado_em)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
