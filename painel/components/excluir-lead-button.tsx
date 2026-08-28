"use client";

import { useActionState, useEffect, useRef } from "react";
import { arquivarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

const estadoInicial: EstadoFormulario = { erro: null };

export function ExcluirLeadButton({ leadId, nome }: { leadId: string; nome: string }) {
  const modalAtivo = useLeadModalAtivo();
  const acaoComId = arquivarLead.bind(null, leadId, !modalAtivo);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        // Lead sumiu — não faz sentido "recarregar" o pop-up dele, fecha.
        modalAtivo?.fechar();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

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
