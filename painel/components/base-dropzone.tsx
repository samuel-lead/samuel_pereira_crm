"use client";

import { useState, useTransition } from "react";
import { moverLeadNivel } from "@/lib/leads/actions";
import { MOTIVOS_BASE } from "@/lib/niveis";
import { MenuSelect } from "@/components/menu-select";
import { IconeAlvo } from "@/components/icons";

const NIVEL_BASE = 9;

// Faixa grandona embaixo do resumo do topo, em Pré-vendas e Vendas —
// atalho pra mandar um lead direto pra Base sem abrir o card (Samuel
// pediu, e pediu destacado/horizontal, não mais flutuante no canto). Solta
// o card aqui e abre um miniformulário só com o motivo (mesma trava
// obrigatória de moverLeadNivel/atualizarLead: sem motivo não move,
// "Desqualificado" também pede o detalhe). Se o lead estiver em "Reunião
// marcada", o servidor recusa (a reunião ficaria perdida) — mesma regra de
// sempre, o erro aparece aqui dentro.
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

  if (dropInfo) {
    return (
      <div className="space-y-2 rounded-xl border-2 border-blue-400 bg-blue-50 p-3 shadow-sm">
        <p className="text-sm font-semibold text-blue-900">
          Por que esse lead está indo pra Base?
        </p>
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-[220px] flex-1">
            <MenuSelect
              placeholder="Selecione o motivo..."
              disabled={pendente}
              value={motivoBase}
              onChange={setMotivoBase}
              abrirAoMontar
              options={MOTIVOS_BASE.map((m) => ({ value: m.valor, label: m.nome }))}
            />
          </div>
          <button
            type="button"
            disabled={pendente}
            onClick={confirmar}
            className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pendente ? "Movendo..." : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={fechar}
            className="shrink-0 rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            Cancelar
          </button>
        </div>
        {motivoBase === "desqualificado" && (
          <textarea
            value={motivoBaseDetalhe}
            onChange={(e) => setMotivoBaseDetalhe(e.target.value)}
            placeholder="Descreva por que está desqualificado..."
            rows={2}
            className="w-full rounded-md border border-blue-300 bg-white px-2 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-500"
          />
        )}
        {erro && <p className="text-xs font-medium text-red-600">{erro}</p>}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!sobre) setSobre(true);
      }}
      onDragLeave={() => setSobre(false)}
      onDrop={aoSoltar}
      className={`flex w-full items-center justify-center gap-2.5 rounded-xl border-2 border-dashed px-4 py-4 text-sm font-bold transition ${
        sobre
          ? "scale-[1.01] border-blue-500 bg-blue-50 text-blue-700"
          : "border-neutral-300 bg-white text-neutral-500"
      }`}
    >
      <IconeAlvo className="h-5 w-5 shrink-0" />
      Arraste um lead até aqui pra mandar pra Base
    </div>
  );
}
