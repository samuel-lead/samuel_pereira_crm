"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { revalidarListasLeads } from "@/lib/leads/actions";

// Pop-up que abre por cima do Kanban ao clicar num card, em vez de navegar
// pra uma página cheia — o quadro (Pré-vendas/Vendas/Base) nunca sai da
// tela, então fechar o pop-up sempre volta pro lugar certo. Fecha com o X,
// Esc, ou clicando fora — todos usam router.back(), que é o que "desfaz" a
// rota interceptada e volta pro Kanban por baixo.
export function ModalLead({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Revalida as colunas do Kanban só agora, na saída — chamar isso enquanto
  // o pop-up ainda tá aberto faz o Next.js trocar ele por uma página cheia
  // sozinho (ver comentário em atualizarLead, lib/leads/actions.ts).
  async function fechar() {
    await revalidarListasLeads();
    router.back();
  }

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10 sm:pt-16"
      onClick={fechar}
    >
      <div
        className="relative w-full max-w-5xl rounded-xl bg-[#f4f5f7] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fechar}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-neutral-500 shadow-md hover:bg-neutral-100 hover:text-neutral-800"
        >
          ✕
        </button>
        <div className="max-h-[85vh] overflow-y-auto rounded-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
