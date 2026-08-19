import type { SupabaseClient } from "@supabase/supabase-js";

// "Atividade" de um lead = ou ele mudou de nível, ou alguém registrou uma
// nota nele — o que tiver acontecido mais recente. Usado pra sinalizar nos
// quadros Kanban quando o lead fica parado sem ninguém mexer.
export async function anexarUltimaAtividade<
  T extends { id: string; entrou_nivel_em: string },
>(supabase: SupabaseClient, leads: T[]): Promise<(T & { ultima_atividade_em: string })[]> {
  const leadIds = leads.map((lead) => lead.id);
  const { data: interacoesData } = leadIds.length
    ? await supabase
        .from("interacoes")
        .select("lead_id, ocorreu_em")
        .in("lead_id", leadIds)
        .is("excluido_em", null)
        .order("ocorreu_em", { ascending: false })
    : { data: [] as { lead_id: string; ocorreu_em: string }[] };

  const ultimaInteracaoPorLead = new Map<string, string>();
  for (const interacao of interacoesData ?? []) {
    if (!ultimaInteracaoPorLead.has(interacao.lead_id)) {
      ultimaInteracaoPorLead.set(interacao.lead_id, interacao.ocorreu_em);
    }
  }

  return leads.map((lead) => {
    const ultimaInteracao = ultimaInteracaoPorLead.get(lead.id);
    const ultimaAtividadeEm =
      ultimaInteracao &&
      new Date(ultimaInteracao).getTime() > new Date(lead.entrou_nivel_em).getTime()
        ? ultimaInteracao
        : lead.entrou_nivel_em;
    return { ...lead, ultima_atividade_em: ultimaAtividadeEm };
  });
}
