"use client";

import { useState } from "react";
import { Calls, ehGondolas, relatorioSemCalls } from "@/lib/terminologia";

// Relatório da Banker - Consorcio (Samuel, 27/10/26): é o modelo que o time
// já usa no grupo, então o texto tem que sair exatamente nesse formato —
// Lista pedida em 29/10/26: leads novos, ligações feitas, conversas
// (ligações atendidas) e propostas iniciadas — sem "Atualizou CRM?".
function montarRelatorioBanker(
  periodoLabel: string,
  leadsNovos: number,
  ligacoesFeitas: number,
  ligacoesAtendidas: number,
  propostasIniciadas: number
) {
  return [
    `🗓️Período: ${periodoLabel}`,
    "",
    `➡️ Leads novos: ${leadsNovos}`,
    `➡️ Ligações feitas: ${ligacoesFeitas}`,
    `➡️ Conversas (ligações atendidas): ${ligacoesAtendidas}`,
    `➡️ Propostas iniciadas: ${propostasIniciadas}`,
  ].join("\n");
}

function montarRelatorio(
  periodoLabel: string,
  callsMarcadas: number,
  callsReagendadas: number,
  ligacoesFeitas: number,
  ligacoesAtendidas: number,
  propostasIniciadas: number,
  publicoOrg: string,
  leadsNovos: number
) {
  if (relatorioSemCalls(publicoOrg)) {
    return montarRelatorioBanker(periodoLabel, leadsNovos, ligacoesFeitas, ligacoesAtendidas, propostasIniciadas);
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
  propostasIniciadas = 0,
  leadsNovos = 0,
  publicoOrg = "mentoria",
}: {
  periodoLabel: string;
  callsMarcadas: number;
  callsReagendadas: number;
  ligacoesFeitas: number;
  ligacoesAtendidas?: number;
  propostasIniciadas?: number;
  leadsNovos?: number;
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
      propostasIniciadas,
      publicoOrg,
      leadsNovos
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
