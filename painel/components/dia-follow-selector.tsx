"use client";

import { useState, useTransition } from "react";
import { definirDiaFollow } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

const DIAS = [1, 2, 3, 4, 5] as const;

export function DiaFollowSelector({
  leadId,
  diaFollow,
}: {
  leadId: string;
  diaFollow: number | null;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar(dia: number) {
    setErro(null);
    const novoValor = diaFollow === dia ? null : dia;
    iniciarTransicao(async () => {
      try {
        await definirDiaFollow(leadId, novoValor);
        modalAtivo?.recarregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra salvar");
      }
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">Dia do Follow</h2>
      <p className="mb-3 text-xs text-neutral-500">
        Em que dia da sequência de follow esse lead está.
      </p>
      <div className="flex gap-2">
        {DIAS.map((dia) => (
          <button
            key={dia}
            type="button"
            disabled={pendente}
            onClick={() => aoClicar(dia)}
            className={`flex h-10 flex-1 items-center justify-center rounded-md text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
              diaFollow === dia
                ? "bg-blue-600 text-white"
                : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {dia}
          </button>
        ))}
      </div>
      {erro && <p className="mt-2 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
