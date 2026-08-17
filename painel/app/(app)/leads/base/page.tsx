import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LeadCard } from "@/components/lead-card";

type LeadBase = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  entrou_nivel_em: string;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default async function BasePage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, entrou_nivel_em")
    .eq("nivel_ordem", 7)
    .is("arquivado_em", null)
    .order("entrou_nivel_em", { ascending: false });

  const leads = (data ?? []) as LeadBase[];

  return (
    <>
      <PageHeader
        titulo="Base"
        acao={
          <Link href="/leads" className="text-sm text-neutral-500 hover:text-neutral-700">
            ← Voltar pro funil
          </Link>
        }
      />

      <main className="px-6 py-6">
        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-stone-600 via-stone-600 to-neutral-800 p-6 text-white shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-200">
            Base pra reaquecer
          </p>
          <p className="mt-1 text-4xl font-extrabold">{leads.length}</p>
          <p className="mt-1 text-sm text-stone-200">
            Passaram por tudo e não viraram nada, ou estouraram os 5 dias sem
            engatar.
          </p>
        </div>

        {leads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-neutral-400">Ninguém na base agora.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                id={lead.id}
                nome={lead.nome}
                telefoneE164={lead.telefone_e164}
                badgeClasse="bg-stone-200 text-stone-700"
                rodape={
                  <p className="mt-1 text-[11px] text-neutral-400">
                    Na base desde {formatarData(lead.entrou_nivel_em)}
                    {lead.origem ? ` · ${lead.origem}` : ""}
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
