"use client";

import { useState, useTransition } from "react";
import { registrarLigacao } from "@/lib/leads/actions";

export function RegistrarLigacaoButton({ leadId }: { leadId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await registrarLigacao(leadId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra registrar a ligação");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendente ? "Registrando..." : "Registrar ligação"}
      </button>
      {erro && <p className="mt-1.5 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
