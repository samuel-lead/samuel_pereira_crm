"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { atualizarMeuNome } from "@/lib/usuarios/actions";
import type { EstadoFormulario } from "@/lib/usuarios/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function TrocarNomeForm({ nomeAtual }: { nomeAtual: string }) {
  const [estado, acaoFormulario, pendente] = useActionState(atualizarMeuNome, estadoInicial);
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
        <label className="text-sm font-medium text-neutral-700" htmlFor="nome">
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          maxLength={80}
          defaultValue={nomeAtual}
          placeholder="Como você quer aparecer no CRM"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar nome"}
      </button>
    </form>
  );
}
