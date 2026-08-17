import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/top-bar";
import { corDoNivel } from "@/lib/niveis";

type NivelResumo = {
  ordem: number;
  nome: string;
};

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  declarado_em: string;
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default async function LeadsPage() {
  const supabase = await createClient();

  const [{ data: niveisData }, { data: leadsData }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome").order("ordem"),
    supabase
      .from("leads")
      .select("id, nome, telefone_e164, origem, nivel_ordem, declarado_em")
      .is("arquivado_em", null)
      .order("declarado_em", { ascending: false }),
  ]);

  const niveis = (niveisData ?? []) as NivelResumo[];
  const leads = (leadsData ?? []) as LeadResumo[];

  const leadsPorNivel = new Map<number, LeadResumo[]>();
  for (const lead of leads) {
    const lista = leadsPorNivel.get(lead.nivel_ordem) ?? [];
    lista.push(lead);
    leadsPorNivel.set(lead.nivel_ordem, lista);
  }

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      <TopBar
        acaoPrincipal={
          <Link
            href="/leads/novo"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-neutral-800"
          >
            + Novo lead
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-4 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold text-neutral-900">
            Funil de leads
          </h1>
          <span className="text-sm text-neutral-500">
            {leads.length} lead{leads.length === 1 ? "" : "s"} no total
          </span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6">
          {niveis.map((nivel) => {
            const leadsDoNivel = leadsPorNivel.get(nivel.ordem) ?? [];
            const cor = corDoNivel(nivel.ordem);

            return (
              <section
                key={nivel.ordem}
                className="flex w-72 shrink-0 flex-col rounded-lg bg-neutral-100"
              >
                <div className="rounded-t-lg border-b border-neutral-200 bg-white px-3 py-3">
                  <div className={`mb-2 h-1 w-8 rounded-full ${cor.faixa}`} />
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-800">
                      {nivel.nome}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cor.badge}`}
                    >
                      {leadsDoNivel.length}
                    </span>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {leadsDoNivel.length === 0 ? (
                    <p className="rounded-md border border-dashed border-neutral-300 bg-white/50 px-3 py-6 text-center text-xs text-neutral-400">
                      Nenhum lead aqui
                    </p>
                  ) : (
                    leadsDoNivel.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="group rounded-md border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${cor.badge}`}
                          >
                            {iniciais(lead.nome)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                              {lead.nome}
                            </p>
                            {lead.telefone_e164 && (
                              <p className="truncate text-xs text-neutral-500">
                                {lead.telefone_e164}
                              </p>
                            )}
                            {lead.origem && (
                              <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                {lead.origem}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
