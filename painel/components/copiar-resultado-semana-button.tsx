"use client";

import { useState } from "react";
import type { Metricas, NegociacoesAbertas } from "@/lib/metricas";
import { Reunioes, Faturamento, Receita, funilConsorcio } from "@/lib/terminologia";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

function montarRelatorio(
  periodo: string,
  metricas: Metricas,
  negociacoes: NegociacoesAbertas,
  publicoOrg: string
) {
  // Mesma regra da taxa de comparecimento: só reunião cuja data já passou
  // pode entrar na conta, senão reunião futura já marcada infla a base.
  const taxaNoShow =
    metricas.reunioesDevidas > 0 ? metricas.noShow / metricas.reunioesDevidas : null;
  const faturamentoVirouCaixa =
    metricas.faturamento > 0 ? metricas.receita / metricas.faturamento : null;

  // Funil de consórcio (Banker): sem reunião — propostas iniciadas, ligações
  // e vendas no lugar de agendamento/comparecimento/no-show.
  if (funilConsorcio(publicoOrg)) {
    const propostas = metricas.propostasIniciadas ?? 0;
    const taxaProposta = metricas.leadsTrabalhados > 0 ? propostas / metricas.leadsTrabalhados : null;
    const taxaVendaProposta = propostas > 0 ? metricas.vendas / propostas : null;
    return [
      "📊 Resultado do período",
      `🗓️ Período: ${periodo}`,
      "",
      `➡ Leads novos: ${metricas.leadsTrabalhados}`,
      `➡ Ligações feitas: ${metricas.ligacoes}`,
      `➡ Ligações atendidas: ${metricas.ligacoesAtendidas}`,
      `➡ Propostas iniciadas: ${propostas}`,
      `➡ Vendas: ${metricas.vendas}`,
      "",
      "📈 Taxas",
      `➡ Taxa de proposta iniciada: ${formatarPercentual(taxaProposta)}`,
      `➡ Taxa de venda sobre proposta: ${formatarPercentual(taxaVendaProposta)}`,
      "",
      "💰 Fechamento",
      `➡ ${Receita(publicoOrg)}: ${formatarMoeda(metricas.receita)}`,
      `➡ ${Faturamento(publicoOrg)}: ${formatarMoeda(metricas.faturamento)}`,
      `➡ Ticket médio: ${metricas.ticketMedio !== null ? formatarMoeda(metricas.ticketMedio) : "—"}`,
      `➡ Negociações em aberto: ${negociacoes.quantidade}`,
      `➡ Valor em negociação: ${formatarMoeda(negociacoes.valor)}`,
    ].join("\n");
  }

  return [
    "📊 Resultado do período",
    `🗓️ Período: ${periodo}`,
    "",
    `➡ Leads novos: ${metricas.leadsTrabalhados}`,
    `➡ ${Reunioes(publicoOrg)} marcadas: ${metricas.reunioesMarcadas}`,
    `➡ ${Reunioes(publicoOrg)} realizadas: ${metricas.reunioesRealizadas}`,
    `➡ Vendas: ${metricas.vendas}`,
    "",
    "📈 Taxas",
    `➡ Taxa de agendamento: ${formatarPercentual(metricas.taxaAgendamento)}`,
    `➡ Taxa de comparecimento: ${formatarPercentual(metricas.taxaComparecimento)}`,
    `➡ Taxa de no-show: ${formatarPercentual(taxaNoShow)}`,
    `➡ Taxa de conversão em vendas: ${formatarPercentual(metricas.taxaVenda)}`,
    `➡ ${Faturamento(publicoOrg)} que virou caixa: ${formatarPercentual(faturamentoVirouCaixa)}`,
    "",
    "💰 Fechamento",
    `➡ ${Receita(publicoOrg)}: ${formatarMoeda(metricas.receita)}`,
    `➡ ${Faturamento(publicoOrg)}: ${formatarMoeda(metricas.faturamento)}`,
    `➡ Ticket médio: ${metricas.ticketMedio !== null ? formatarMoeda(metricas.ticketMedio) : "—"}`,
    `➡ Negociações em aberto: ${negociacoes.quantidade}`,
    `➡ Valor em negociação: ${formatarMoeda(negociacoes.valor)}`,
  ].join("\n");
}

export function CopiarResultadoSemanaButton({
  periodo,
  metricas,
  negociacoes,
  publicoOrg = "mentoria",
}: {
  periodo: string;
  metricas: Metricas;
  negociacoes: NegociacoesAbertas;
  publicoOrg?: string;
}) {
  const [copiado, setCopiado] = useState(false);

  function aoClicar() {
    const texto = montarRelatorio(periodo, metricas, negociacoes, publicoOrg);
    navigator.clipboard?.writeText(texto).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-50"
    >
      {copiado ? "Copiado ✓" : "Copiar resultado do período"}
    </button>
  );
}
