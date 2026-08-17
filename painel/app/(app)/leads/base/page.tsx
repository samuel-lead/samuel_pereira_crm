import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { KanbanBoard } from "@/components/kanban-board";
import type { NivelResumo } from "@/lib/niveis";

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  responsavel_id: string | null;
};

export default async function BasePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: niveisData }, { data: leadsData }, { data: usuarioAtual }] = await Promise.all([
    supabase.from("niveis").select("ordem, nome, numerado, destacado").eq("ordem", 7),
    supabase
      .from("leads")
      .select("id, nome, telefone_e164, origem, nivel_ordem, responsavel_id")
      .eq("nivel_ordem", 7)
      .is("arquivado_em", null)
      .order("entrou_nivel_em", { ascending: false }),
    user
      ? supabase.from("usuarios").select("papel").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  // Sem numeração aqui — "Nível X" só faz sentido dentro da sequência
  // completa do funil, não num quadro de coluna única. E com destaque de
  // cor sólida, igual a coluna "Leads" do funil, pra não ficar sem graça.
  const niveis = ((niveisData ?? []) as NivelResumo[]).map((nivel) => ({
    ...nivel,
    numerado: false,
    destacado: true,
  }));
  const leads = (leadsData ?? []) as LeadResumo[];
  const souAdmin = usuarioAtual?.papel === "admin";

  const leadsPorNivel: Record<number, LeadResumo[]> = { 7: leads };

  return (
    <>
      <PageHeader titulo="Base de Leads" />

      <main className="px-6 py-6">
        <KanbanBoard
          niveis={niveis}
          leadsPorNivel={leadsPorNivel}
          souAdmin={souAdmin}
          usuarioAtualId={user?.id ?? null}
        />
      </main>
    </>
  );
}
