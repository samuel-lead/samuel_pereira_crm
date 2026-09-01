"use client";

import { useState } from "react";
import { IconeChevronBaixo } from "@/components/icons";

// Mesma ideia do "Ver métricas": no celular só a busca de lead fica
// sempre visível — os filtros (usuário, funil, importar, novo lead) ficam
// escondidos atrás desse botão, pra não competir com os cards. No
// desktop sempre aparece tudo, igual sempre foi.
export function FiltrosColapsaveis({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 shadow-sm md:hidden"
      >
        Filtros
        <IconeChevronBaixo className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      <div className={`${aberto ? "mt-2 block" : "hidden"} md:m-0 md:block`}>{children}</div>
    </div>
  );
}
