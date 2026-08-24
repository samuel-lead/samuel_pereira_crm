"use client";

import { useState } from "react";
import { Calls } from "@/lib/terminologia";

function formatarPeriodo(data: Date) {
  return data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
}

function montarRelatorio(
  data: Date,
  callsMarcadas: number,
  callsReagendadas: number,
  ligacoesFeitas: number,
  publicoOrg: string
) {
  return [
    `🗓️Período: ${formatarPeriodo(data)}`,
    "",
    `➡ ${Calls(publicoOrg)} marcadas: ${callsMarcadas}`,
    `➡ ${Calls(publicoOrg)} reagendadas: ${callsReagendadas}`,
    `➡ Prospecções feitas no IG? `,
    `➡ Ligações feitas? ${ligacoesFeitas}`,
    `➡ Atualizou CRM? `,
  ].join("\n");
}

export function CopiarRelatorioButton({
  data,
  callsMarcadas,
  callsReagendadas,
  ligacoesFeitas,
  publicoOrg = "mentoria",
}: {
  data: Date;
  callsMarcadas: number;
  callsReagendadas: number;
  ligacoesFeitas: number;
  publicoOrg?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    const texto = montarRelatorio(data, callsMarcadas, callsReagendadas, ligacoesFeitas, publicoOrg);
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
