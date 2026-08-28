"use client";

import { useTransition } from "react";
import { excluirInteracao } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

export function ExcluirInteracaoButton({
  leadId,
  interacaoId,
}: {
  leadId: string;
  interacaoId: string;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar() {
    iniciarTransicao(async () => {
      try {
        await excluirInteracao(leadId, interacaoId);
        modalAtivo?.recarregar();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Não deu pra excluir");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      title="Excluir esse registro"
      className="rounded-md px-2 py-1 text-xs text-neutral-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 disabled:opacity-100 disabled:text-neutral-300"
    >
      {pendente ? "..." : "Excluir"}
    </button>
  );
}
