"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { registrarLigacao } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { IconeTelefone } from "@/components/icons";

export function RegistrarLigacaoButton({
  leadId,
  variante = "padrao",
}: {
  leadId: string;
  // "destaque" é a versão chamativa usada no cabeçalho do card do lead
  // (Samuel pediu botão "clicável, chamativo") — cor sólida em vez de
  // borda neutra.
  variante?: "padrao" | "destaque";
}) {
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
        className={`flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed ${
          registrado
            ? "bg-green-600 text-white"
            : variante === "destaque"
              ? "bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700 hover:shadow-md disabled:opacity-60"
              : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        }`}
      >
        {variante === "destaque" && !registrado && <IconeTelefone className="h-4 w-4 shrink-0" />}
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
