import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

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
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex gap-2">
          <Link
            href="/leads/novo"
            className="rounded bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            + Novo lead
          </Link>
          <LogoutButton />
        </div>
      </div>

      <div className="space-y-8">
        {niveis.map((nivel) => {
          const leadsDoNivel = leadsPorNivel.get(nivel.ordem) ?? [];
          return (
            <section key={nivel.ordem}>
              <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">
                {nivel.ordem}. {nivel.nome} ({leadsDoNivel.length})
              </h2>
              {leadsDoNivel.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  Nenhum lead neste nível.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-200 rounded border border-neutral-200">
                  {leadsDoNivel.map((lead) => (
                    <li key={lead.id}>
                      <Link
                        href={`/leads/${lead.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
                      >
                        <span>
                          <span className="font-medium">{lead.nome}</span>
                          {lead.telefone_e164 && (
                            <span className="ml-2 text-sm text-neutral-500">
                              {lead.telefone_e164}
                            </span>
                          )}
                        </span>
                        {lead.origem && (
                          <span className="text-xs text-neutral-400">
                            {lead.origem}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
