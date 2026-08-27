"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

// O confirm() nativo do navegador sempre escreve "OK"/"Cancelar" — não dá
// pra mudar esse texto por código. Esse hook substitui por um aviso
// próprio, com os mesmos botões "Sim"/"Não" (ou outro texto, se passado),
// travando a tela igual até a pessoa responder.
type Pergunta = {
  mensagem: string;
  simLabel: string;
  naoLabel: string;
};

export function useConfirmacaoTravaTela() {
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const resolverRef = useRef<((resposta: boolean) => void) | null>(null);

  const perguntar = useCallback(
    (mensagem: string, simLabel = "Sim", naoLabel = "Não") => {
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setPergunta({ mensagem, simLabel, naoLabel });
      });
    },
    []
  );

  function responder(resposta: boolean) {
    resolverRef.current?.(resposta);
    resolverRef.current = null;
    setPergunta(null);
  }

  const modal =
    pergunta && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
              <p className="whitespace-pre-line text-sm text-neutral-800">
                {pergunta.mensagem}
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => responder(false)}
                  className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                >
                  {pergunta.naoLabel}
                </button>
                <button
                  type="button"
                  onClick={() => responder(true)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  {pergunta.simLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { perguntar, modal };
}
