"use client";

import { createContext, useContext } from "react";

// Avisa o ModalLead (que fica muito mais pro centro da tela) que um
// painel de documento (ver botao-documento-externo.tsx) acabou de abrir
// do lado direito — pra ele se deslocar pra esquerda e não ficar coberto.
// Sem Provider (ex.: dentro de "Minha rotina", que não tem modal em
// volta), o botão simplesmente não avisa ninguém — comportamento normal.
export const ContextoPainelDocumento = createContext<{
  setDocumentoAberto: (aberto: boolean) => void;
} | null>(null);

export function usePainelDocumento() {
  return useContext(ContextoPainelDocumento);
}
