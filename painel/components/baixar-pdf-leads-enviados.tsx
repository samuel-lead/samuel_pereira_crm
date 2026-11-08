"use client";

import { useState } from "react";
import type { LeadEnviado } from "@/lib/metricas";
import { formatarTelefone, slugificar } from "@/lib/texto";

// Samuel (08/11/26): botão no ranking de SDRs da Inove Gôndolas que baixa um
// PDF organizado com os leads que cada SDR enviou pro Elton no período
// escolhido. Os dados já vêm prontos da tela (mesma lista do ranking), então
// o PDF é montado aqui no navegador — nada novo é buscado no banco.

export type SdrParaPdf = {
  nome: string;
  leads: LeadEnviado[];
};

// A fonte padrão do PDF só entende letras latinas (com acento, ok). Emoji e
// símbolos raros viram lixo no papel — tiramos antes de escrever.
function limpar(texto: string) {
  return texto.replace(/[^ -~ -ÿ]/g, "").replace(/\s+/g, " ").trim();
}

function dataBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const VERDE: [number, number, number] = [22, 163, 74];
const VERDE_ESCURO: [number, number, number] = [21, 128, 61];
const CINZA_TEXTO: [number, number, number] = [64, 64, 64];
const CINZA_CLARO: [number, number, number] = [115, 115, 115];
const ZEBRA: [number, number, number] = [244, 246, 248];

async function gerarPdf(sdrs: SdrParaPdf[], periodo: string, arquivo: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 15;
  const colunas = { num: margem + 2, nome: margem + 14, zap: 128, data: 170 };
  const alturaLinha = 9;
  const limiteY = altura - 20;

  function cabecalhoDaPagina() {
    doc.setFillColor(...VERDE);
    doc.rect(0, 0, largura, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Leads enviados para o Elton", margem, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Inove Gôndolas  ·  ${limpar(periodo)}`, margem, 18);
  }

  function cabecalhoDaTabela(y: number) {
    doc.setFillColor(...VERDE_ESCURO);
    doc.rect(margem, y, largura - margem * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Nº", colunas.num, y + 5.4);
    doc.text("Nome do lead", colunas.nome, y + 5.4);
    doc.text("WhatsApp", colunas.zap, y + 5.4);
    doc.text("Enviado em", colunas.data, y + 5.4);
    return y + 8;
  }

  function cortar(texto: string, larguraMax: number) {
    if (doc.getTextWidth(texto) <= larguraMax) return texto;
    let corte = texto;
    while (corte.length > 1 && doc.getTextWidth(corte + "...") > larguraMax) corte = corte.slice(0, -1);
    return corte.trimEnd() + "...";
  }

  sdrs.forEach((sdr, indiceSdr) => {
    if (indiceSdr > 0) doc.addPage();
    cabecalhoDaPagina();

    // Bloco "quem é o SDR"
    doc.setTextColor(...CINZA_CLARO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SDR", margem, 36);
    doc.setTextColor(23, 23, 23);
    doc.setFontSize(20);
    doc.text(limpar(sdr.nome) || "Sem nome", margem, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...CINZA_TEXTO);
    doc.text(
      `${sdr.leads.length} lead${sdr.leads.length === 1 ? "" : "s"} enviado${sdr.leads.length === 1 ? "" : "s"} para o Elton no período`,
      margem,
      52
    );

    let y = cabecalhoDaTabela(60);
    // Do mais antigo pro mais novo fica mais fácil de conferir uma lista longa.
    const leads = [...sdr.leads].sort((a, b) => a.enviadoEm.localeCompare(b.enviadoEm));

    if (leads.length === 0) {
      doc.setTextColor(...CINZA_CLARO);
      doc.setFontSize(10);
      doc.text("Nenhum lead enviado neste período.", margem + 2, y + 8);
      return;
    }

    leads.forEach((lead, i) => {
      if (y + alturaLinha > limiteY) {
        doc.addPage();
        cabecalhoDaPagina();
        doc.setTextColor(...CINZA_TEXTO);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`${limpar(sdr.nome)} (continuação)`, margem, 33);
        y = cabecalhoDaTabela(38);
      }
      if (i % 2 === 0) {
        doc.setFillColor(...ZEBRA);
        doc.rect(margem, y, largura - margem * 2, alturaLinha, "F");
      }
      doc.setTextColor(...CINZA_TEXTO);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const baseline = y + 6;
      doc.text(String(i + 1), colunas.num, baseline);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(23, 23, 23);
      doc.text(cortar(limpar(lead.nome) || "Sem nome", colunas.zap - colunas.nome - 4), colunas.nome, baseline);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...CINZA_TEXTO);
      doc.text(lead.telefone_e164 ? formatarTelefone(lead.telefone_e164) : "sem telefone", colunas.zap, baseline);
      doc.text(dataBr(lead.enviadoEm), colunas.data, baseline);
      y += alturaLinha;
    });
  });

  // Rodapé com o número da página (depois que o total de páginas é conhecido).
  const total = doc.getNumberOfPages();
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(margem, altura - 14, largura - margem, altura - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CINZA_CLARO);
    doc.text(`Gerado em ${geradoEm}`, margem, altura - 9);
    doc.text(`Página ${p} de ${total}`, largura - margem, altura - 9, { align: "right" });
  }

  doc.save(arquivo);
}

export function BaixarPdfLeadsEnviados({
  sdrs,
  periodo,
  rotulo = "Baixar PDF",
  nomeArquivo,
  destaque = false,
}: {
  sdrs: SdrParaPdf[];
  periodo: string;
  rotulo?: string;
  nomeArquivo: string;
  destaque?: boolean;
}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState(false);

  async function baixar() {
    setGerando(true);
    setErro(false);
    try {
      await gerarPdf(sdrs, periodo, `${slugificar(nomeArquivo)}-${slugificar(periodo)}.pdf`);
    } catch {
      setErro(true);
    } finally {
      setGerando(false);
    }
  }

  return (
    <button
      type="button"
      onClick={baixar}
      disabled={gerando}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
        destaque
          ? "border-green-600 bg-green-600 text-white hover:bg-green-700"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16" />
      </svg>
      {gerando ? "Gerando..." : erro ? "Erro, tentar de novo" : rotulo}
    </button>
  );
}
