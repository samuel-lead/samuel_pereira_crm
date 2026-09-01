import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LinkLead } from "@/components/link-lead";
import { corDoNivel, numerarNiveis, rotuloNivel, rotuloNivelCurto, type NivelResumo } from "@/lib/niveis";
import { MenuSelect } from "@/components/menu-select";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { resolverPeriodo } from "@/lib/periodo";
import { removerAcento } from "@/lib/texto";

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
  searchParams: Promise<{
    nivel?: string;
    busca?: string;
    periodo?: string;
    mesAno?: string;
    de?: string;
    ate?: string;
  }>;
}) {
  const { nivel, busca, periodo, mesAno, de, ate } = await searchParams;
  const supabase = await createClient();

  const periodoResolvido = resolverPeriodo({ periodo, mesAno, de, ate }, new Date());

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
    consulta = consulta.ilike("nome_busca", `%${removerAcento(busca)}%`);
  }
  if (periodoResolvido) {
    consulta = consulta
      .gte("declarado_em", periodoResolvido.inicio.toISOString())
      .lt("declarado_em", periodoResolvido.fim.toISOString());
  }

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    consulta,
  ]);
  const niveis = (niveisData ?? []) as NivelResumo[];
  const numerosVisiveis = numerarNiveis(niveis);
  const leads = (leadsData ?? []) as LeadLinha[];

  const filtroAtivo = Boolean(nivel || busca || periodoResolvido);

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
        <div className="mb-6 flex flex-wrap items-stretch gap-3">
          <FiltroPeriodo
            baseHref="/leads/lista"
            periodoAtual={periodoResolvido?.chave ?? null}
            mesAnoAtual={mesAno}
            deAtual={de}
            ateAtual={ate}
            outrosParams={{ nivel, busca }}
          />

          <form className="flex flex-1 flex-wrap items-stretch divide-x divide-neutral-100 rounded-xl border border-neutral-200 bg-white shadow-sm">
            {periodo && <input type="hidden" name="periodo" value={periodo} />}
            {mesAno && <input type="hidden" name="mesAno" value={mesAno} />}
            {de && <input type="hidden" name="de" value={de} />}
            {ate && <input type="hidden" name="ate" value={ate} />}
            <div className="flex min-w-[160px] flex-col justify-center gap-0.5 px-4 py-2">
              <label className="text-[10px] font-medium text-neutral-500" htmlFor="busca">
                Buscar por nome
              </label>
              <input
                id="busca"
                name="busca"
                defaultValue={busca ?? ""}
                placeholder="Ex.: Marcos"
                className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
              />
            </div>

            <div className="flex min-w-[150px] flex-col justify-center gap-0.5 px-4 py-2">
              <label className="text-[10px] font-medium text-neutral-500" htmlFor="nivel">
                Nível
              </label>
              <MenuSelect
                id="nivel"
                name="nivel"
                defaultValue={nivel ?? ""}
                variante="sem-borda"
                options={[
                  { value: "", label: "Todos" },
                  ...niveis.map((n) => ({
                    value: String(n.ordem),
                    label: rotuloNivel(n, numerosVisiveis.get(n.ordem)),
                  })),
                ]}
              />
            </div>

            <div className="flex items-center gap-3 px-4 py-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Filtrar
              </button>
              {filtroAtivo && (
                <Link
                  href="/leads/lista"
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
                >
                  Limpar
                </Link>
              )}
            </div>
          </form>

          <div className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm">
            {leads.length} lead{leads.length === 1 ? "" : "s"}
          </div>
        </div>

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
                        <LinkLead
                          leadId={lead.id}
                          className="font-medium text-neutral-900 hover:underline"
                        >
                          {lead.nome}
                        </LinkLead>
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
