"use client";

import { useState, useTransition } from "react";
import { registrarLigacao } from "@/lib/leads/actions";

export function RegistrarLigacaoButton({ leadId }: { leadId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await registrarLigacao(leadId);
        // Fica "travado" mais um instante depois de registrar — sem isso o
        // botão volta ao normal rápido demais e o SDR clica de novo achando
        // que não registrou, criando ligação duplicada.
        setRegistrado(true);
        setTimeout(() => setRegistrado(false), 2000);
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
        disabled={pendente || registrado}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed ${
          registrado
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        }`}
      >
        {pendente ? "Registrando..." : registrado ? "Ligação registrada ✓" : "Registrar ligação"}
      </button>
      {erro && <p className="mt-1.5 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
