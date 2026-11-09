"use client";

import { useState, useTransition } from "react";
import { passarLeadParaSdr } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

// Samuel (09/11/26): quem abordou o lead passa ele pro SDR que vai qualificar.
// O SDR da abordagem fica guardado no lead — não se perde na troca.
export function PassarLeadParaSdr({
  leadId,
  opcoes,
}: {
  leadId: string;
  opcoes: { id: string; nome: string }[];
}) {
  const modalAtivo = useLeadModalAtivo();
  const [aberto, setAberto] = useState(false);
  const [sdrId, setSdrId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (opcoes.length === 0) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
      >
        Passar pra outro SDR
      </button>
    );
  }

  function confirmar() {
    if (!sdrId) {
      setErro("Escolha pra qual SDR passar.");
      return;
    }
    setErro(null);
    iniciar(async () => {
      const resultado = await passarLeadParaSdr(leadId, sdrId);
      if (resultado) {
        setErro(resultado);
        return;
      }
      setAberto(false);
      modalAtivo?.recarregar();
    });
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
      <select
        value={sdrId}
        onChange={(e) => setSdrId(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-800"
      >
        <option value="">Passar pra qual SDR...</option>
        {opcoes.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nome}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={confirmar}
        disabled={pendente}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pendente ? "Passando..." : "Passar o lead"}
      </button>
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="text-xs text-neutral-500 hover:underline"
      >
        Cancelar
      </button>
      <p className="w-full text-xs text-neutral-400">
        Quem fez a abordagem continua registrado no lead. O novo SDR recebe o aviso no WhatsApp.
      </p>
      {erro && <p className="w-full text-xs text-red-600">{erro}</p>}
    </div>
  );
}
