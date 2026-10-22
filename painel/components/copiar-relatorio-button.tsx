"use client";

import { useState } from "react";
import { Calls, ehGondolas, relatorioSemCalls } from "@/lib/terminologia";

function montarRelatorio(
  periodoLabel: string,
  callsMarcadas: number,
  callsReagendadas: number,
  ligacoesFeitas: number,
  publicoOrg: string
) {
  return [
    `🗓️Período: ${periodoLabel}`,
    "",
    ...(relatorioSemCalls(publicoOrg)
      ? []
      : [
          `➡ ${Calls(publicoOrg)} marcadas: ${callsMarcadas}`,
          `➡ ${Calls(publicoOrg)} reagendadas: ${callsReagendadas}`,
        ]),
    // Inove Gôndolas não prospecta pelo Instagram (Samuel, 22/10/26).
    ...(ehGondolas(publicoOrg) ? [] : [`➡ Prospecções feitas no IG? `]),
    `➡ Ligações feitas? ${ligacoesFeitas}`,
    `➡ Atualizou CRM? `,
  ].join("\n");
}

export function CopiarRelatorioButton({
  periodoLabel,
  callsMarcadas,
  callsReagendadas,
  ligacoesFeitas,
  publicoOrg = "mentoria",
}: {
  periodoLabel: string;
  callsMarcadas: number;
  callsReagendadas: number;
  ligacoesFeitas: number;
  publicoOrg?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    const texto = montarRelatorio(periodoLabel, callsMarcadas, callsReagendadas, ligacoesFeitas, publicoOrg);
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
    >
      {copiado ? "Copiado ✓" : "Copiar"}
    </button>
  );
}
