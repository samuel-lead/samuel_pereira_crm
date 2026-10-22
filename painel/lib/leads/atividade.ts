import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarTodas, emPedacos } from "@/lib/supabase/paginar";

// "Atividade" de um lead = ou ele mudou de nível, ou alguém registrou uma
// nota nele — o que tiver acontecido mais recente. Usado pra sinalizar nos
// quadros Kanban quando o lead fica parado sem ninguém mexer.
export async function anexarUltimaAtividade<
  T extends { id: string; entrou_nivel_em: string },
>(supabase: SupabaseClient, leads: T[]): Promise<(T & { ultima_atividade_em: string })[]> {
  const leadIds = leads.map((lead) => lead.id);
  // Em pedaços de 200 leads (lista de ids grande demais estoura o tamanho do
  // endereço da requisição) e cada pedaço de 1000 em 1000 (limite de linhas
  // do Supabase) — antes, com mais de ~1000 leads, a maioria ficava sem a
  // data da última atividade.
  const resultados = await Promise.all(
    emPedacos(leadIds, 200).map((ids) =>
      buscarTodas<{ lead_id: string; ocorreu_em: string }>((de, ate) =>
        supabase
          .from("interacoes")
          .select("lead_id, ocorreu_em")
          .in("lead_id", ids)
          .is("excluido_em", null)
          .order("ocorreu_em", { ascending: false })
          .order("id")
          .range(de, ate)
      )
    )
  );

  const ultimaInteracaoPorLead = new Map<string, string>();
  for (const { data } of resultados) {
    for (const interacao of data) {
      const atual = ultimaInteracaoPorLead.get(interacao.lead_id);
      if (!atual || new Date(interacao.ocorreu_em).getTime() > new Date(atual).getTime()) {
        ultimaInteracaoPorLead.set(interacao.lead_id, interacao.ocorreu_em);
      }
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
