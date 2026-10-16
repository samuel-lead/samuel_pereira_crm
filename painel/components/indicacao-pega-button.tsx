"use client";

import { useState, useTransition } from "react";
import { marcarIndicacaoPega } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

// Só o dono da plataforma vê (ver lead-modal-conteudo.tsx). Marcado, o lead
// some dos lembretes de indicação do WhatsApp; clicar de novo desmarca.
export function IndicacaoPegaButton({
  leadId,
  jaPegou,
}: {
  leadId: string;
  jaPegou: boolean;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await marcarIndicacaoPega(leadId, !jaPegou);
      if (resultado) {
        setErro(resultado);
        return;
      }
      modalAtivo?.recarregar();
    });
  }

  return (
    <div className="space-y-1">
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
          jaPegou
            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {pendente
          ? "Salvando..."
          : jaPegou
            ? "✅ Indicação já pega (clique para desmarcar)"
            : "Indicação já pega"}
      </button>
      <p className="text-xs text-neutral-400">
        {jaPegou
          ? "Essa pessoa não aparece mais nos lembretes de indicação."
          : "Marque quando já tiver pegado a indicação dessa pessoa — ela sai dos lembretes."}
      </p>
    </div>
  );
}
