"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registrarNota, type EstadoFormulario } from "@/lib/leads/actions";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const estadoInicial: EstadoFormulario = { erro: null };

export function RegistrarNotaForm({ leadId }: { leadId: string }) {
  const acaoComId = registrarNota.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [adicionado, setAdicionado] = useState(false);
  const enviandoRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        formRef.current?.reset();
        setAdicionado(true);
        const timeout = setTimeout(() => setAdicionado(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  return (
    <form ref={formRef} action={acaoFormulario} className="space-y-2">
      <textarea
        name="conteudo"
        required
        rows={3}
        placeholder="Ex.: liguei, ficou de ver a agenda e responder amanhã..."
        className={campoClasse}
      />

      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md border px-3 py-2 text-sm font-medium transition disabled:opacity-60 ${
          adicionado
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100"
        }`}
      >
        {pendente ? "Adicionando..." : adicionado ? "Adicionado ✓" : "Adicionar à linha do tempo"}
      </button>
    </form>
  );
}
