"use client";

import { useState } from "react";
import type { DadosTrafego } from "@/components/relatorio-trafego";
import { leadsDoTrafegoParaPdf, type LeadTrafegoPdf } from "@/app/(app)/dashboard/leads-trafego-pdf-action";
import { MOTIVOS_BASE } from "@/lib/niveis";
import { Reuniao } from "@/lib/terminologia";
import { formatarTelefone, slugificar } from "@/lib/texto";

// Ketlyn (11/11/26): um clique baixa o PDF dos leads de tráfego (formulários):
// página de resumo (os mesmos números do relatório) + a ficha de cada lead.
// Os números do resumo já vêm prontos da tela; só a lista de leads é buscada
// no clique. O PDF é montado aqui no navegador.

const AZUL: [number, number, number] = [37, 99, 235];
const AZUL_ESCURO: [number, number, number] = [15, 23, 42];
const TEXTO: [number, number, number] = [55, 55, 55];
const CLARO: [number, number, number] = [115, 115, 115];
const ZEBRA: [number, number, number] = [244, 246, 248];

const NOME_MOTIVO = new Map<string, string>(MOTIVOS_BASE.map((m) => [m.valor, m.nome]));
const NOME_URG: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa", desconhecida: "não informada" };
const NOME_CAP: Record<string, string> = { sim: "Sim", parcial: "Parcial", nao: "Não", desconhecida: "não informada" };
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// A fonte padrão do PDF só entende letras latinas (com acento, ok). Emoji e
// símbolos raros viram lixo no papel — tiramos antes de escrever.
function limpar(texto: string | null | undefined) {
  return (texto ?? "").replace(/[^ -~ -ÿ]/g, "").replace(/\s+/g, " ").trim();
}
function dataBr(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
function brl(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function pct(parte: number, todo: number) {
  if (!todo) return "—";
  return `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
function mesRotulo(aaaamm: string) {
  const [a, m] = aaaamm.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

async function gerarPdf(d: DadosTrafego, leads: LeadTrafegoPdf[], publicoOrg: string, titulo: string, arquivo: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  const margem = 15;
  const limiteY = altura - 20;
  const r = d.resumo;

  function faixa(subtitulo: string) {
    doc.setFillColor(...AZUL_ESCURO);
    doc.rect(0, 0, largura, 24, "F");
    doc.setFillColor(...AZUL);
    doc.rect(0, 0, 3, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Leads de tráfego", margem, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(limpar(subtitulo), margem, 18);
  }
  function secao(texto: string, y: number) {
    doc.setFillColor(...AZUL);
    doc.rect(margem, y - 4.5, 1.5, 6, "F");
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(limpar(texto), margem + 4, y);
    return y + 6;
  }
  // Tabela simples: colunas com posição x e alinhamento; zebra.
  function tabela(
    y: number,
    cabecalho: string[],
    linhas: string[][],
    xs: number[],
    direita: boolean[] = []
  ) {
    const larg = largura - margem * 2;
    function cab(yy: number) {
      doc.setFillColor(...AZUL_ESCURO);
      doc.rect(margem, yy, larg, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      cabecalho.forEach((c, i) =>
        doc.text(limpar(c), direita[i] ? xs[i] : xs[i], yy + 4.8, { align: direita[i] ? "right" : "left" })
      );
      return yy + 7;
    }
    y = cab(y);
    linhas.forEach((l, i) => {
      if (y + 7 > limiteY) {
        doc.addPage();
        faixa(titulo);
        y = cab(32);
      }
      if (i % 2 === 0) {
        doc.setFillColor(...ZEBRA);
        doc.rect(margem, y, larg, 7, "F");
      }
      doc.setTextColor(...TEXTO);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      l.forEach((c, j) => doc.text(limpar(c), xs[j], y + 4.8, { align: direita[j] ? "right" : "left" }));
      y += 7;
    });
    return y + 5;
  }
  function garantir(y: number, precisa: number) {
    if (y + precisa > limiteY) {
      doc.addPage();
      faixa(titulo);
      return 32;
    }
    return y;
  }

  // ---------- Página 1: resumo ----------
  faixa(titulo);
  let y = 33;
  doc.setTextColor(...CLARO);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(
    `Todo o histórico  ·  primeiro lead em ${dataBr(r.primeiroLead)}, último em ${dataBr(r.ultimoLead)}`,
    margem,
    y
  );
  y += 8;

  y = secao("Do lead até a venda", y);
  const Reun = Reuniao(publicoOrg);
  y = tabela(
    y,
    ["Etapa", "Leads", "% dos que chegaram"],
    [
      ["Leads que chegaram", String(r.chegaram), "100%"],
      ["Entraram em conversa", String(r.emConversa), pct(r.emConversa, r.chegaram)],
      ["Qualificados (3 critérios)", String(r.qualificados), pct(r.qualificados, r.chegaram)],
      [`${Reun} marcada`, String(r.comReuniao), pct(r.comReuniao, r.chegaram)],
      [`${Reun} realizada`, String(r.realizadas), pct(r.realizadas, r.chegaram)],
      ["Venda", String(r.vendas), pct(r.vendas, r.chegaram)],
    ],
    [margem + 2, 130, largura - margem - 2],
    [false, true, true]
  );
  doc.setTextColor(...CLARO);
  doc.setFontSize(8.5);
  doc.text(
    `Arquivados depois: ${r.arquivados}  ·  ${r.noShow} não vieram  ·  Vendido: ${brl(r.valorVendas)}`,
    margem,
    y - 2
  );
  y += 6;

  y = garantir(y, 30);
  y = secao("Onde cada lead está agora (sem contar os arquivados)", y);
  y = tabela(
    y,
    ["Fase", "Leads"],
    d.etapas.map((e) => [e.etapa, String(e.leads)]),
    [margem + 2, largura - margem - 2],
    [false, true]
  );

  if (d.motivosBase.length > 0) {
    y = garantir(y, 30);
    y = secao("Por que foram pra Base", y);
    y = tabela(
      y,
      ["Motivo", "Leads"],
      d.motivosBase.map((m) => [NOME_MOTIVO.get(m.motivo) ?? (m.motivo === "sem_motivo" ? "Sem motivo registrado" : m.motivo), String(m.leads)]),
      [margem + 2, largura - margem - 2],
      [false, true]
    );
  }

  y = garantir(y, 40);
  y = secao("Urgência e capacidade de pagar", y);
  y = tabela(
    y,
    ["Urgência", "Leads", "Capacidade de pagar", "Leads"],
    [
      ["Alta", String(r.urgencia.alta), "Sim", String(r.capacidade.sim)],
      ["Média", String(r.urgencia.media), "Parcial", String(r.capacidade.parcial)],
      ["Baixa", String(r.urgencia.baixa), "Não", String(r.capacidade.nao)],
      ["Não informada", String(r.urgencia.desconhecida), "Não informada", String(r.capacidade.desconhecida)],
    ],
    [margem + 2, 90, 110, largura - margem - 2],
    [false, true, false, true]
  );

  if (d.meses.length > 0) {
    y = garantir(y, 30);
    y = secao("Mês a mês (mês em que o lead chegou)", y);
    y = tabela(
      y,
      ["Mês", "Chegaram", "Em conversa", "Qualificados", Reun, "Vendas"],
      d.meses.map((m) => [
        mesRotulo(m.mes),
        String(m.chegaram),
        String(m.em_conversa),
        String(m.qualificados),
        String(m.com_reuniao),
        String(m.vendas),
      ]),
      [margem + 2, 80, 105, 135, 160, largura - margem - 2],
      [false, true, true, true, true, true]
    );
  }

  // ---------- Fichas dos leads ----------
  doc.addPage();
  faixa(`${titulo}  ·  lista de leads`);
  y = 33;
  doc.setTextColor(...CLARO);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text(`${leads.length} lead${leads.length === 1 ? "" : "s"}, do que chegou primeiro ao mais recente`, margem, y);
  y += 6;

  const larguraFicha = largura - margem * 2;
  leads.forEach((l, i) => {
    // Texto livre do lead (o que ele quer resolver / motivo da Base) pode ter
    // várias linhas: quebra pra caber e mede a altura da ficha antes de desenhar.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const problema = l.problema ? (doc.splitTextToSize(`Quer resolver: ${limpar(l.problema)}`, larguraFicha - 6) as string[]).slice(0, 4) : [];
    const motivo =
      l.motivoBase || l.motivoBaseDetalhe
        ? (doc.splitTextToSize(
            `Motivo da Base: ${NOME_MOTIVO.get(l.motivoBase ?? "") ?? limpar(l.motivoBase)}${l.motivoBaseDetalhe ? ` — ${limpar(l.motivoBaseDetalhe)}` : ""}`,
            larguraFicha - 6
          ) as string[]).slice(0, 3)
        : [];
    const alturaFicha = 17 + (problema.length + motivo.length) * 4 + 3;
    y = garantir(y, alturaFicha);

    if (i % 2 === 0) {
      doc.setFillColor(...ZEBRA);
      doc.rect(margem, y, larguraFicha, alturaFicha - 1.5, "F");
    }
    let yy = y + 5.5;
    doc.setTextColor(23, 23, 23);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`${i + 1}. ${limpar(l.nome) || "Sem nome"}`, margem + 3, yy);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXTO);
    doc.text(l.telefone ? formatarTelefone(l.telefone) : "sem telefone", largura - margem - 3, yy, { align: "right" });

    yy += 5;
    doc.setFontSize(8.5);
    doc.setTextColor(...CLARO);
    doc.text(
      `Formulário: ${limpar(l.formulario)}  ·  Chegou em ${dataBr(l.chegouEm)}  ·  Último contato: ${dataBr(l.ultimoContatoEm)}`,
      margem + 3,
      yy
    );
    yy += 4;
    doc.setTextColor(...TEXTO);
    doc.setFont("helvetica", "bold");
    doc.text(`Fase: ${limpar(l.fase)}${l.arquivado ? " (arquivado)" : ""}${l.vendido ? `  ·  VENDIDO ${brl(l.valorVenda)}` : ""}`, margem + 3, yy);
    doc.setFont("helvetica", "normal");
    yy += 4;
    const extras = [
      `Responsável: ${limpar(l.responsavel) || "sem responsável"}`,
      `Urgência: ${NOME_URG[l.urgencia] ?? l.urgencia}`,
      `Pagar: ${NOME_CAP[l.capacidade] ?? l.capacidade}`,
      l.email ? `E-mail: ${limpar(l.email)}` : "",
      l.instagram ? `Instagram: ${limpar(l.instagram)}` : "",
    ].filter(Boolean);
    doc.text(extras.join("  ·  "), margem + 3, yy);
    problema.forEach((linha) => {
      yy += 4;
      doc.text(linha, margem + 3, yy);
    });
    motivo.forEach((linha) => {
      yy += 4;
      doc.text(linha, margem + 3, yy);
    });
    y += alturaFicha;
  });

  // Rodapé com número da página.
  const total = doc.getNumberOfPages();
  const geradoEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setDrawColor(220, 220, 220);
    doc.line(margem, altura - 14, largura - margem, altura - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...CLARO);
    doc.text(`Gerado em ${geradoEm}`, margem, altura - 9);
    doc.text(`Página ${p} de ${total}`, largura - margem, altura - 9, { align: "right" });
  }

  doc.save(arquivo);
}

export function BaixarPdfTrafego({
  d,
  publicoOrg,
  nomeOrigem,
}: {
  d: DadosTrafego;
  publicoOrg: string;
  nomeOrigem: string;
}) {
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function baixar() {
    setGerando(true);
    setErro(null);
    try {
      const res = await leadsDoTrafegoParaPdf(d.origem);
      if ("erro" in res) {
        setErro(res.erro);
        return;
      }
      const hoje = new Date().toISOString().slice(0, 10);
      await gerarPdf(d, res.leads, publicoOrg, nomeOrigem, `leads-de-trafego-${slugificar(nomeOrigem)}-${hoje}.pdf`);
    } catch {
      setErro("Erro ao gerar o PDF. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={baixar}
        disabled={gerando}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 20h16" />
        </svg>
        {gerando ? "Gerando PDF..." : "Baixar PDF"}
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
