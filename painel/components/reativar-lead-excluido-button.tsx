"use client";

import { useState, useTransition } from "react";
import { IconeReativar } from "@/components/icons";
import { reativarLeadExcluido } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

// Lead que já foi excluído não pode ser excluído de novo — esse botão
// troca o "Excluir lead" quando o lead vem da aba Excluídos. Diferente da
// reativação de Base/Repescagem (que deixa escolher o nível), aqui vai
// direto pra Novos Leads — a pessoa já tinha saído do funil inteiro.
export function ReativarLeadExcluidoButton({ leadId }: { leadId: string }) {
  const modalAtivo = useLeadModalAtivo();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await reativarLeadExcluido(leadId);
      if (resultado) {
        setErro(resultado);
        return;
      }
      modalAtivo?.recarregar();
    });
  }

  return (
    <div className="space-y-1">
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 py-2.5 text-sm font-bold text-neutral-700 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-60"
      >
        <IconeReativar className="h-4 w-4" />
        {pendente ? "Reativando..." : "Reativar lead"}
      </button>
    </div>
  );
}
