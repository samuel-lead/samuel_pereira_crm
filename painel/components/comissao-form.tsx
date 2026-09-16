"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { atualizarMinhaComissao } from "@/lib/usuarios/actions";
import type { EstadoFormulario } from "@/lib/usuarios/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ComissaoForm({ comissaoAtual }: { comissaoAtual: number | null }) {
  const [estado, acaoFormulario, pendente] = useActionState(atualizarMinhaComissao, estadoInicial);
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  return (
    <form action={acaoFormulario} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="comissao_percentual">
          % de comissão
        </label>
        <div className="relative">
          <input
            id="comissao_percentual"
            name="comissao_percentual"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            defaultValue={comissaoAtual ?? ""}
            placeholder="Ex.: 1,5"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-8 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            %
          </span>
        </div>
      </div>

      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar comissão"}
      </button>
    </form>
  );
}
