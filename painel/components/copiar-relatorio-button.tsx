"use client";

import { useState } from "react";
import { Calls, ehGondolas, relatorioSemCalls } from "@/lib/terminologia";

// Relatório da Banker - Consorcio (Samuel, 27/10/26): é o modelo que o time
// já usa no grupo, então o texto tem que sair exatamente nesse formato —
// "Propostas iniciadas" e "Atualizou CRM?" ficam pra pessoa preencher.
function montarRelatorioBanker(periodoLabel: string, ligacoesFeitas: number, ligacoesAtendidas: number) {
  return [
    `🗓️Período: ${periodoLabel}`,
    "",
    `➡️ Ligações feitas? ${ligacoesFeitas}`,
    `➡️ Ligações atendidas: ${ligacoesAtendidas}`,
    "➡️ Propostas iniciadas: ",
    "➡️ Atualizou CRM? ",
  ].join("\n");
}

function montarRelatorio(
  periodoLabel: string,
  callsMarcadas: number,
  callsReagendadas: number,
  ligacoesFeitas: number,
  ligacoesAtendidas: number,
  publicoOrg: string
) {
  if (relatorioSemCalls(publicoOrg)) {
    return montarRelatorioBanker(periodoLabel, ligacoesFeitas, ligacoesAtendidas);
  }
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
  ligacoesAtendidas = 0,
  publicoOrg = "mentoria",
}: {
  periodoLabel: string;
  callsMarcadas: number;
  callsReagendadas: number;
  ligacoesFeitas: number;
  ligacoesAtendidas?: number;
  publicoOrg?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    const texto = montarRelatorio(
      periodoLabel,
      callsMarcadas,
      callsReagendadas,
      ligacoesFeitas,
      ligacoesAtendidas,
      publicoOrg
    );
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
