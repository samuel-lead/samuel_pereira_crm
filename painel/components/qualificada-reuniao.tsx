"use client";

import { useState, useTransition } from "react";
import { definirQualificadaReuniao } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

// Mostra se a reunião realizada foi qualificada ou não, e deixa corrigir
// com um clique — Samuel pediu: se o closer marcou "Não" sem querer (ou
// "Sim" errado), tem que dar pra corrigir depois.
export function QualificadaReuniao({
  leadId,
  reuniaoId,
  qualificada,
  podeEditar,
}: {
  leadId: string;
  reuniaoId: string;
  qualificada: boolean;
  podeEditar: boolean;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function corrigir() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await definirQualificadaReuniao(leadId, reuniaoId, !qualificada);
        modalAtivo?.recarregar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra salvar");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={qualificada ? "text-neutral-500" : "font-semibold text-red-600"}>
        {qualificada ? "Lead qualificado" : "Lead não qualificado"}
      </span>
      {podeEditar && (
        <button
          type="button"
          onClick={corrigir}
          disabled={pendente}
          className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {pendente ? "Salvando..." : qualificada ? "Corrigir para não qualificado" : "Corrigir para qualificado"}
        </button>
      )}
      {erro && <span className="text-red-600">{erro}</span>}
    </div>
  );
}
