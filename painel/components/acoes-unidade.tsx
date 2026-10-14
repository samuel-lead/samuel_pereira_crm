"use client";

import { useState, useTransition } from "react";
import { mudarStatusUnidade, removerUnidade } from "@/lib/imoveis/unidades-actions";

// Troca a situação da unidade e remove (arquiva) — ao lado de cada linha.
export function AcoesUnidade({
  imovelId,
  unidadeId,
  status,
}: {
  imovelId: string;
  unidadeId: string;
  status: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function mudar(novo: string) {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await mudarStatusUnidade(imovelId, unidadeId, novo);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu");
      }
    });
  }

  function remover() {
    if (!window.confirm("Remover essa unidade da lista?")) return;
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await removerUnidade(imovelId, unidadeId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu");
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <select
        value={status}
        disabled={pendente}
        onChange={(e) => mudar(e.target.value)}
        className="rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-xs"
      >
        <option value="disponivel">Disponível</option>
        <option value="reservada">Reservada</option>
        <option value="vendida">Vendida</option>
        <option value="indisponivel">Indisponível</option>
      </select>
      <button
        type="button"
        onClick={remover}
        disabled={pendente}
        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Remover
      </button>
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </div>
  );
}
