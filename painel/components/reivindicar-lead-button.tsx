"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { reivindicarLead, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ReivindicarLeadButton({ leadId }: { leadId: string }) {
  const acaoComId = reivindicarLead.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [pego, setPego] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setPego(true);
      }
    }
  }, [pendente, estado]);

  return (
    <form action={acaoFormulario} className="space-y-1">
      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente || pego}
        className={`rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-sm transition disabled:opacity-70 ${
          pego ? "bg-green-600" : "bg-amber-600 hover:bg-amber-700"
        }`}
      >
        {pendente ? "Pegando..." : pego ? "Lead pego ✓" : "Pegar esse lead pra mim"}
      </button>
    </form>
  );
}
