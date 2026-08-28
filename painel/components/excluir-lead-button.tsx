"use client";

import { useActionState } from "react";
import { arquivarLead, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ExcluirLeadButton({ leadId, nome }: { leadId: string; nome: string }) {
  const acaoComId = arquivarLead.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);

  return (
    <form
      action={acaoFormulario}
      onSubmit={(e) => {
        if (
          !confirm(
            `Tem certeza que quer excluir o lead "${nome}"? Ele vai sumir de todas as telas.`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="space-y-1"
    >
      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pendente ? "Excluindo..." : "Excluir lead"}
      </button>
    </form>
  );
}
