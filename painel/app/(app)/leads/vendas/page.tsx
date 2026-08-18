import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { IconeMoeda } from "@/components/icons";

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
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-700 to-teal-500 p-7 text-white shadow-2xl shadow-emerald-950/50 ring-1 ring-white/10">
          <IconeMoeda className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

          <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-emerald-200">
            <IconeMoeda className="h-3.5 w-3.5" />
            Receita total em vendas
          </p>
          <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {formatarMoeda(totalReceita)}
          </p>
          <p className="relative mt-2 text-sm font-medium text-emerald-100">
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
