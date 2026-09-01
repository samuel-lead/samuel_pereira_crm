"use client";

import { useState } from "react";
import { IconeChevronBaixo } from "@/components/icons";

// No celular, as métricas do topo competiam com os cards de lead pela
// atenção — o negócio de verdade (mexer nos leads) é o que precisa
// aparecer primeiro. Aqui elas ficam escondidas atrás de um botão por
// padrão; no desktop (onde tem espaço de sobra) continuam sempre visíveis.
export function MetricasColapsaveis({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex w-full items-center justify-between px-4 py-2 text-xs font-semibold text-neutral-500 md:hidden"
      >
        {aberto ? "Esconder métricas" : "Ver métricas"}
        <IconeChevronBaixo className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`} />
      </button>
      <div className={`${aberto ? "block" : "hidden"} md:block`}>{children}</div>
    </div>
  );
}
