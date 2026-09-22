"use client";

import { useState, useTransition } from "react";
import { moverLeadNivel } from "@/lib/leads/actions";
import { MOTIVOS_BASE } from "@/lib/niveis";
import { MenuSelect } from "@/components/menu-select";
import { IconeAlvo } from "@/components/icons";

const NIVEL_BASE = 9;

// Botão embaixo da Meta, do lado direito — não é linha inteira, é só um
// pouco maior que um botão normal, do mesmo tamanho/coluna da Meta acima
// dele (Samuel foi bem específico: nada de ocupar a largura toda). Atalho
// pra mandar um lead direto pra Base sem abrir o card. Solta o card aqui e
// abre um miniformulário só com o motivo (mesma trava obrigatória de
// moverLeadNivel/atualizarLead: sem motivo não move, "Desqualificado"
// também pede o detalhe). Se o lead estiver em "Reunião marcada", o
// servidor recusa (a reunião ficaria perdida) — mesma regra de sempre, o
// erro aparece aqui dentro.
export function BaseDropzone() {
  const [dropInfo, setDropInfo] = useState<{ leadId: string; nivelOrigem: number } | null>(null);
  const [sobre, setSobre] = useState(false);
  const [motivoBase, setMotivoBase] = useState("");
  const [motivoBaseDetalhe, setMotivoBaseDetalhe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function fechar() {
    setDropInfo(null);
    setErro(null);
    setMotivoBase("");
    setMotivoBaseDetalhe("");
  }

  function aoSoltar(e: React.DragEvent) {
    e.preventDefault();
    setSobre(false);
    const leadId = e.dataTransfer.getData("text/plain");
    const nivelOrigem = Number(e.dataTransfer.getData("application/x-nivel-origem"));
    if (!leadId) return;
    setErro(null);
    setMotivoBase("");
    setMotivoBaseDetalhe("");
    setDropInfo({ leadId, nivelOrigem });
  }

  function confirmar() {
    if (!dropInfo) return;
    if (!motivoBase) {
      setErro("Escolha o motivo.");
      return;
    }
    if (motivoBase === "desqualificado" && !motivoBaseDetalhe.trim()) {
      setErro("Descreva por que está desqualificado.");
      return;
    }
    setErro(null);
    iniciarTransicao(() => {
      moverLeadNivel(
        dropInfo.leadId,
        NIVEL_BASE,
        undefined,
        undefined,
        undefined,
        motivoBase,
        motivoBaseDetalhe || undefined
      ).then((erroServidor) => {
        if (erroServidor) {
          setErro(erroServidor);
          return;
        }
        fechar();
      });
    });
  }

  return (
    <div className="relative w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          if (!sobre) setSobre(true);
        }}
        onDragLeave={() => setSobre(false)}
        onDrop={aoSoltar}
        className={`flex w-80 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
          sobre
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-neutral-200 bg-white text-neutral-500"
        }`}
      >
        <IconeAlvo className="h-4 w-4 shrink-0" />
        Base de leads
      </div>

      {/* Solto aqui, o formulário não fica preso na largura estreita do
          botão — flutua por cima, bem maior e destacado (Samuel pegou ao
          vivo: do jeito espremido, "não dava nem pra ver"). */}
      {dropInfo && (
        <div className="absolute right-0 top-0 z-30 w-96 space-y-2 rounded-xl border-2 border-blue-400 bg-white p-4 shadow-2xl ring-4 ring-blue-100">
          <p className="text-sm font-bold text-blue-900">Por que esse lead está indo pra Base?</p>
          <MenuSelect
            placeholder="Selecione o motivo..."
            disabled={pendente}
            value={motivoBase}
            onChange={setMotivoBase}
            abrirAoMontar
            options={MOTIVOS_BASE.map((m) => ({ value: m.valor, label: m.nome }))}
          />
          {motivoBase === "desqualificado" && (
            <textarea
              value={motivoBaseDetalhe}
              onChange={(e) => setMotivoBaseDetalhe(e.target.value)}
              placeholder="Descreva por que está desqualificado..."
              rows={3}
              className="w-full rounded-md border border-blue-300 bg-white px-2.5 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500"
            />
          )}
          {erro && <p className="text-sm font-medium text-red-600">{erro}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={confirmar}
              className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pendente ? "Movendo..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={fechar}
              className="shrink-0 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
