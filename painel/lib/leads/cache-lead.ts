"use client";

import { buscarDetalhesDoLead, type DetalhesLead } from "@/lib/leads/actions";

// Cache simples em memória (só desse navegador, some ao recarregar a
// página) — existe só pra abrir o pop-up parecer instantâneo. A pessoa
// passa o mouse num card (prefetchLead), a busca já começa; quando ela
// clica de verdade, o dado já está pronto (ou quase).
const cache = new Map<string, DetalhesLead>();
const emAndamento = new Map<string, Promise<DetalhesLead | null>>();

export function lerLeadDoCache(leadId: string): DetalhesLead | undefined {
  return cache.get(leadId);
}

export function salvarLeadNoCache(leadId: string, dados: DetalhesLead) {
  cache.set(leadId, dados);
}

export function prefetchLead(leadId: string) {
  if (cache.has(leadId) || emAndamento.has(leadId)) return;
  const promessa = buscarDetalhesDoLead(leadId).then((resultado) => {
    if (resultado.dados) cache.set(leadId, resultado.dados);
    emAndamento.delete(leadId);
    return resultado.dados;
  });
  emAndamento.set(leadId, promessa);
}
