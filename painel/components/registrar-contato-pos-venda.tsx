"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarContatoPosVenda } from "@/lib/leads/actions";

// Botão "Registrar contato" da aba Pós-venda: abre um quadrinho pra escrever o
// que foi conversado e (opcional) marcar o dia do próximo contato.
export function RegistrarContatoPosVenda({ leadId, nome }: { leadId: string; nome: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [proximo, setProximo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    setErro(null);
    if (!texto.trim()) return setErro("Escreva o que foi feito ou conversado no contato.");
    if (!proximo) return setErro("Informe a data do próximo contato.");
    if (!motivo.trim()) return setErro("Informe o motivo do próximo contato.");
    iniciar(async () => {
      const r = await registrarContatoPosVenda(leadId, texto, proximo, motivo);
      if (r.erro) {
        setErro(r.erro);
        return;
      }
      setAberto(false);
      setTexto("");
      setProximo("");
      setMotivo("");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
      >
        Registrar contato
      </button>
      {aberto && (
        <div className="absolute right-0 z-30 mt-2 w-80 space-y-3 rounded-xl border border-neutral-200 bg-white p-4 text-left shadow-xl">
          <p className="text-sm font-semibold text-neutral-800">Contato de pós-venda — {nome}</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600" htmlFor={`pv-texto-${leadId}`}>
              O que foi feito ou conversado *
            </label>
            <textarea
              id={`pv-texto-${leadId}`}
              rows={3}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600" htmlFor={`pv-prox-${leadId}`}>
              Próximo contato *
            </label>
            {/* Clicar em QUALQUER lugar do campo abre o calendário (não só no ícone). */}
            <input
              id={`pv-prox-${leadId}`}
              type="date"
              required
              value={proximo}
              onChange={(e) => setProximo(e.target.value)}
              onClick={(e) => e.currentTarget.showPicker?.()}
              className="w-full cursor-pointer rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600" htmlFor={`pv-motivo-${leadId}`}>
              Motivo do próximo contato *
            </label>
            <input
              id={`pv-motivo-${leadId}`}
              type="text"
              required
              maxLength={300}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Comprovante de pagamento às 15h"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pendente}
              onClick={salvar}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
