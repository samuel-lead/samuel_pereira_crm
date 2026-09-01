"use client";

import { useTransition } from "react";
import { arquivarIsca } from "@/lib/iscas/actions";

export function ArquivarIscaButton({ iscaId }: { iscaId: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar() {
    if (!confirm("Arquivar essa isca? O link para de funcionar pra quem clicar nele depois disso.")) {
      return;
    }
    iniciarTransicao(() => {
      arquivarIsca(iscaId).catch((erro: unknown) => {
        alert(erro instanceof Error ? erro.message : "Não deu pra arquivar");
      });
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {pendente ? "Arquivando..." : "Arquivar"}
    </button>
  );
}
