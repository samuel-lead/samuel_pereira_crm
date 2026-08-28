"use client";

import { useCallback, useEffect, useState } from "react";
import { buscarDetalhesDoLead, type DetalhesLead } from "@/lib/leads/actions";
import { ContextoLeadModalAtivo } from "@/components/contexto-lead-modal";
import { LeadModalConteudo } from "@/components/lead-modal-conteudo";

// Pop-up que abre por cima da tela atual ao clicar num lead, sem trocar
// de rota — não usa nenhuma técnica de rota do Next.js (foi exatamente
// uma rota interceptada que causou aquele 404 real em produção antes;
// esse componente não mexe em rota nenhuma, só em estado do React), então
// não corre o mesmo risco.
export function ModalLead({
  leadId,
  marcarReuniao,
  reuniaoAnteriorSumiu,
  aoFechar,
}: {
  leadId: string;
  marcarReuniao?: boolean;
  reuniaoAnteriorSumiu?: "sim" | "nao";
  aoFechar: () => void;
}) {
  const [dados, setDados] = useState<DetalhesLead | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    const resultado = await buscarDetalhesDoLead(leadId);
    setDados(resultado.dados);
    setErro(resultado.erro);
    setCarregando(false);
  }, [leadId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:pt-16"
      onClick={aoFechar}
    >
      <div
        className="relative w-full max-w-5xl rounded-xl bg-[#f4f5f7] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md hover:bg-neutral-100 hover:text-neutral-800"
        >
          ✕
        </button>

        <div className="max-h-[85vh] overflow-y-auto rounded-xl">
          {carregando ? (
            <div className="flex h-64 items-center justify-center text-sm text-neutral-400">
              Carregando...
            </div>
          ) : erro || !dados ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-sm text-red-600">{erro ?? "Não deu pra carregar esse lead"}</p>
            </div>
          ) : (
            <>
              <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-xl border-b border-neutral-200 bg-white px-5 py-4 pr-14">
                <h1 className="truncate text-lg font-bold text-neutral-900">
                  {dados.lead.nome}
                </h1>
              </div>
              <ContextoLeadModalAtivo.Provider
                value={{ recarregar: carregar, fechar: aoFechar }}
              >
                <LeadModalConteudo
                  dados={dados}
                  marcarReuniao={marcarReuniao}
                  reuniaoAnteriorSumiu={reuniaoAnteriorSumiu}
                />
              </ContextoLeadModalAtivo.Provider>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
