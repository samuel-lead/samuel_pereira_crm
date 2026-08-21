import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import { FiltroPeriodoVendas } from "@/components/filtro-periodo-vendas";
import { IconeMoeda } from "@/components/icons";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  produto: string | null;
  valor_venda: number | null;
  receita_venda: number | null;
  vendido_em: string | null;
  responsavel_id: string | null;
};

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  produto: string | null;
  valor_venda: number | null;
  receita_venda: number | null;
  nivel_ordem: number;
  responsavel_id: string | null;
  ultima_atividade_em?: string;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo: periodoFiltro } = await searchParams;
  const supabase = await createClient();
  const { user, usuario: usuarioAtual } = await usuarioAutenticado();

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, produto, valor_venda, receita_venda, vendido_em, responsavel_id")
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .order("vendido_em", { ascending: false });

  if (periodoFiltro && /^\d{4}-\d{2}$/.test(periodoFiltro)) {
    const [ano, mes] = periodoFiltro.split("-").map(Number);
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);
    consulta = consulta.gte("vendido_em", inicio.toISOString()).lt("vendido_em", fim.toISOString());
  }

  const [{ data: leadsData }, { data: todasVendasData }] = await Promise.all([
    consulta,
    supabase
      .from("leads")
      .select("vendido_em")
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .not("vendido_em", "is", null),
  ]);

  const chavesPeriodo = new Set(
    (todasVendasData ?? []).map((v) => {
      const data = new Date(v.vendido_em as string);
      return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
    })
  );
  const periodos = Array.from(chavesPeriodo)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((chave) => {
      const [ano, mes] = chave.split("-").map(Number);
      return { valor: chave, nome: `${NOMES_MES[mes - 1]} de ${ano}` };
    });

  const leads = (leadsData ?? []) as LeadVendido[];
  const souAdmin = usuarioAtual?.papel === "admin";
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);

  // Reaproveita o card do Kanban do funil — os selos de venda/receita/
  // produto já existem ali (mostrarValor), só passa os dados reais.
  const leadsKanban: LeadResumo[] = leads.map((lead) => ({
    id: lead.id,
    nome: lead.nome,
    telefone_e164: lead.telefone_e164,
    origem: lead.origem,
    produto: lead.produto,
    valor_venda: lead.valor_venda,
    receita_venda: lead.receita_venda,
    nivel_ordem: 4,
    responsavel_id: lead.responsavel_id,
    ultima_atividade_em: lead.vendido_em ?? undefined,
  }));

  return (
    <>
      <PageHeader
        titulo="Clientes"
        acao={
          periodos.length > 0 ? (
            <FiltroPeriodoVendas periodos={periodos} periodoInicial={periodoFiltro} />
          ) : undefined
        }
      />

      <main className="px-6 py-6">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-700 to-green-500 p-7 text-white shadow-2xl shadow-green-950/50 ring-1 ring-white/10">
          <IconeMoeda className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

          <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-200">
            <IconeMoeda className="h-3.5 w-3.5" />
            Receita total em vendas
          </p>
          <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {formatarMoeda(totalReceita)}
          </p>
          <p className="relative mt-2 text-sm font-medium text-green-100">
            {leads.length} venda{leads.length === 1 ? "" : "s"} fechada
            {leads.length === 1 ? "" : "s"}
          </p>
        </div>

        <KanbanBoard
          niveis={[{ ordem: 4, nome: "Clientes", numerado: false, destacado: true }]}
          leadsPorNivel={{ 4: leadsKanban }}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
          mostrarParado={false}
          mostrarValor
        />
      </main>
    </>
  );
}
