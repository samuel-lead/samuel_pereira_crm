import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { corDoNivel, numerarNiveis, rotuloNivel, rotuloNivelCurto, type NivelResumo } from "@/lib/niveis";

type LeadLinha = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
  ultimo_contato_em: string | null;
};

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function ListaLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ nivel?: string; busca?: string; de?: string; ate?: string }>;
}) {
  const { nivel, busca, de, ate } = await searchParams;
  const supabase = await createClient();

  let consulta = supabase
    .from("leads")
    .select(
      "id, nome, telefone_e164, origem, nivel_ordem, declarado_em, ultimo_contato_em"
    )
    .is("arquivado_em", null)
    .neq("status", "vendido")
    .order("declarado_em", { ascending: false });

  if (nivel) {
    consulta = consulta.eq("nivel_ordem", Number(nivel));
  }
  if (busca) {
    consulta = consulta.ilike("nome", `%${busca}%`);
  }
  if (de) {
    consulta = consulta.gte("declarado_em", `${de}T00:00:00`);
  }
  if (ate) {
    const fim = new Date(`${ate}T00:00:00`);
    fim.setDate(fim.getDate() + 1);
    consulta = consulta.lt("declarado_em", fim.toISOString());
  }

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
  ]);
  const niveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(niveis);
  const leads = (leadsData ?? []) as LeadLinha[];

  const filtroAtivo = Boolean(nivel || busca || de || ate);

  return (
    <>
      <PageHeader
        titulo="Lista de leads"
        acao={
          <Link
            href="/leads/novo"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Novo lead
          </Link>
        }
      />

      <main className="px-6 py-6">
        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500" htmlFor="busca">
              Buscar por nome
            </label>
            <input
              id="busca"
              name="busca"
              defaultValue={busca ?? ""}
              placeholder="Ex.: Marcos"
              className="w-48 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500" htmlFor="nivel">
              Nível
            </label>
            <select
              id="nivel"
              name="nivel"
              defaultValue={nivel ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {niveis.map((n) => (
                <option key={n.ordem} value={n.ordem}>
                  {rotuloNivel(n, numerosVisiveis.get(n.ordem))}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500" htmlFor="de">
              Entrou de
            </label>
            <input
              id="de"
              name="de"
              type="date"
              defaultValue={de ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500" htmlFor="ate">
              até
            </label>
            <input
              id="ate"
              name="ate"
              type="date"
              defaultValue={ate ?? ""}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Filtrar
          </button>

          {filtroAtivo && (
            <Link
              href="/leads/lista"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Limpar filtro
            </Link>
          )}

          <span className="ml-auto text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
          </span>
        </form>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Nível</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Declarado em</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhum lead encontrado
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
                          title={
                            nivelDoLead
                              ? rotuloNivel(nivelDoLead, numerosVisiveis.get(nivelDoLead.ordem))
                              : undefined
                          }
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
                        {formatarData(lead.declarado_em)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {formatarData(lead.ultimo_contato_em)}
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
