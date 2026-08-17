import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  valor_venda: number | null;
  vendido_em: string | null;
  responsavel_id: string | null;
};

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  responsavel_id: string | null;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: leadsData }, { data: usuarioAtual }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, nome, telefone_e164, valor_venda, vendido_em, responsavel_id")
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .order("vendido_em", { ascending: false }),
    user
      ? supabase.from("usuarios").select("papel").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const leads = (leadsData ?? []) as LeadVendido[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.valor_venda ?? 0), 0);

  // Reaproveita o card do Kanban do funil — o "origem" vira o valor da
  // venda + data, pra mostrar isso de um jeito bonito (o mesmo selo que já
  // existe pro card), em vez de um rodapé solto.
  const leadsKanban: LeadResumo[] = leads.map((lead) => ({
    id: lead.id,
    nome: lead.nome,
    telefone_e164: lead.telefone_e164,
    origem:
      lead.valor_venda != null
        ? `${formatarMoeda(Number(lead.valor_venda))}${
            lead.vendido_em ? ` · ${formatarData(lead.vendido_em)}` : ""
          }`
        : null,
    nivel_ordem: 4,
    responsavel_id: lead.responsavel_id,
  }));

  return (
    <>
      <PageHeader titulo="Clientes" />

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

        <KanbanBoard
          niveis={[{ ordem: 4, nome: "Clientes", numerado: false, destacado: true }]}
          leadsPorNivel={{ 4: leadsKanban }}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
        />
      </main>
    </>
  );
}
