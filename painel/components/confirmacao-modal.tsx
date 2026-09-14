"use client";

import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";

// O confirm() nativo do navegador sempre escreve "OK"/"Cancelar" — não dá
// pra mudar esse texto por código. Esse hook substitui por um aviso
// próprio, com os mesmos botões "Sim"/"Não" (ou outro texto, se passado),
// travando a tela igual até a pessoa responder.
type PerguntaSimNao = {
  tipo: "sim_nao";
  mensagem: string;
  simLabel: string;
  naoLabel: string;
};

// Mesma trava de tela, mas pra pedir um texto curto (ex.: motivo de uma
// movimentação) em vez de sim/não — usada onde arrastar o card não dá
// espaço pra um campo de texto dentro do próprio card.
type PerguntaTexto = {
  tipo: "texto";
  mensagem: string;
  placeholder: string;
  confirmarLabel: string;
};

// Substitui alert() — nativo trava a renderização do navegador (e em
// Chrome, chamado durante/logo depois de um drag-and-drop, às vezes trava
// a página de vez, exigindo recarregar várias vezes pra voltar a
// responder a cliques — foi exatamente esse o problema real por trás do
// "não consigo abrir os cards" que o Samuel relatou; o Kanban chamava
// alert(erro) direto ao falhar uma movimentação arrastada).
type PerguntaAviso = {
  tipo: "aviso";
  mensagem: string;
};

type Pergunta = PerguntaSimNao | PerguntaTexto | PerguntaAviso;

export function useConfirmacaoTravaTela() {
  const [pergunta, setPergunta] = useState<Pergunta | null>(null);
  const [textoDigitado, setTextoDigitado] = useState("");
  const resolverBoolRef = useRef<((resposta: boolean) => void) | null>(null);
  const resolverTextoRef = useRef<((resposta: string | null) => void) | null>(null);
  const resolverAvisoRef = useRef<(() => void) | null>(null);

  const perguntar = useCallback(
    (mensagem: string, simLabel = "Sim", naoLabel = "Não") => {
      return new Promise<boolean>((resolve) => {
        resolverBoolRef.current = resolve;
        setPergunta({ tipo: "sim_nao", mensagem, simLabel, naoLabel });
      });
    },
    []
  );

  const perguntarTexto = useCallback(
    (mensagem: string, placeholder = "", confirmarLabel = "Confirmar") => {
      return new Promise<string | null>((resolve) => {
        resolverTextoRef.current = resolve;
        setTextoDigitado("");
        setPergunta({ tipo: "texto", mensagem, placeholder, confirmarLabel });
      });
    },
    []
  );

  function responder(resposta: boolean) {
    resolverBoolRef.current?.(resposta);
    resolverBoolRef.current = null;
    setPergunta(null);
  }

  function responderTexto(valor: string | null) {
    resolverTextoRef.current?.(valor);
    resolverTextoRef.current = null;
    setPergunta(null);
  }

  const avisar = useCallback((mensagem: string) => {
    return new Promise<void>((resolve) => {
      resolverAvisoRef.current = resolve;
      setPergunta({ tipo: "aviso", mensagem });
    });
  }, []);

  function responderAviso() {
    resolverAvisoRef.current?.();
    resolverAvisoRef.current = null;
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
              {pergunta.tipo === "aviso" ? (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={responderAviso}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              ) : pergunta.tipo === "texto" ? (
                <>
                  <textarea
                    autoFocus
                    rows={3}
                    value={textoDigitado}
                    onChange={(e) => setTextoDigitado(e.target.value)}
                    placeholder={pergunta.placeholder}
                    className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => responderTexto(null)}
                      className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!textoDigitado.trim()}
                      onClick={() => responderTexto(textoDigitado.trim())}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {pergunta.confirmarLabel}
                    </button>
                  </div>
                </>
              ) : (
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
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return { perguntar, perguntarTexto, avisar, modal };
}
