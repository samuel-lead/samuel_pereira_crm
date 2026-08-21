"use client";

import { useState } from "react";
import { compartilharNoWhatsApp } from "@/lib/whatsapp";
import type { Metricas } from "@/lib/metricas";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

function montarTexto(titulo: string, subtitulo: string | undefined, m: Metricas) {
  return [
    `📊 ${titulo}${subtitulo ? ` — ${subtitulo}` : ""}`,
    "",
    `Leads trabalhados: ${m.leadsTrabalhados}`,
    `Reuniões marcadas: ${m.reunioesMarcadas}`,
    `Reuniões realizadas: ${m.reunioesRealizadas}`,
    `No-show: ${m.noShow}`,
    `Vendas: ${m.vendas}`,
    `Receita: ${formatarMoeda(m.receita)}`,
    "",
    `Taxa de agendamento: ${formatarPercentual(m.taxaAgendamento)}`,
    `Taxa de comparecimento: ${formatarPercentual(m.taxaComparecimento)}`,
    `Taxa de venda: ${formatarPercentual(m.taxaVenda)}`,
  ].join("\n");
}

export function CompartilharRelatorioButton({
  titulo,
  subtitulo,
  metricas,
}: {
  titulo: string;
  subtitulo?: string;
  metricas: Metricas;
}) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    const texto = montarTexto(titulo, subtitulo, metricas);
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    compartilharNoWhatsApp(texto);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      className="flex shrink-0 items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
    >
      {copiado ? "Copiado ✓" : "Enviar no WhatsApp"}
    </button>
  );
}
