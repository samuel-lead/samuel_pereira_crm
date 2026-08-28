"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { registrarLigacao } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

export function RegistrarLigacaoButton({ leadId }: { leadId: string }) {
  const modalAtivo = useLeadModalAtivo();
  const [erro, setErro] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<"atendida" | "nao_atendida" | null>(null);
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function aoEscolher(atendida: boolean) {
    setAberto(false);
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await registrarLigacao(leadId, atendida);
        modalAtivo?.recarregar();
        // Fica "travado" mais um instante depois de registrar — sem isso o
        // botão volta ao normal rápido demais e o SDR clica de novo achando
        // que não registrou, criando ligação duplicada.
        setRegistrado(atendida ? "atendida" : "nao_atendida");
        setTimeout(() => setRegistrado(null), 2000);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra registrar a ligação");
      }
    });
  }

  const rotulo = pendente
    ? "Registrando..."
    : registrado === "atendida"
      ? "Ligação atendida ✓"
      : registrado === "nao_atendida"
        ? "Ligação não atendida ✓"
        : "Registrar ligação";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        disabled={pendente || !!registrado}
        className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed ${
          registrado
            ? "border-green-300 bg-green-50 text-green-700"
            : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        }`}
      >
        {rotulo}
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => aoEscolher(true)}
            className="block w-full px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-green-50 hover:text-green-700"
          >
            Foi atendida
          </button>
          <button
            type="button"
            onClick={() => aoEscolher(false)}
            className="block w-full border-t border-neutral-100 px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-red-50 hover:text-red-700"
          >
            Não atendida
          </button>
        </div>
      )}

      {erro && <p className="mt-1.5 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
