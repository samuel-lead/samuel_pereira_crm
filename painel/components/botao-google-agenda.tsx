"use client";

import { useState, useTransition } from "react";
import { salvarReuniaoNoGoogleAgenda } from "@/lib/leads/actions";

// Clica e já cai na Google Agenda de verdade — Samuel pediu que fosse um
// clique só, sem passar por mais nada. Se a reunião já tinha sido salva
// antes (reagendou, por exemplo), clicar de novo ATUALIZA o mesmo evento
// em vez de criar um duplicado (ver google_event_id em reunioes).
export function BotaoGoogleAgenda({ reuniaoId }: { reuniaoId: string }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  function aoClicar() {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await salvarReuniaoNoGoogleAgenda(reuniaoId);
      if (resultado.erro) {
        setErro(resultado.erro);
        return;
      }
      setSalvo(true);
      if (resultado.eventoUrl) {
        window.open(resultado.eventoUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-60 ${
          salvo
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "✓ Salvo na Google Agenda" : "Salvar na Google Agenda"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
