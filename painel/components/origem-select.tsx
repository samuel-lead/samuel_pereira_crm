"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconeCheck, IconeChevronBaixo } from "@/components/icons";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function OrigemSelect({
  origens,
  valorInicial,
  onChange,
}: {
  origens: { id: string; nome: string }[];
  valorInicial?: string;
  onChange?: (valor: string) => void;
}) {
  const nomes = origens.map((o) => o.nome);
  const ehConhecida = valorInicial ? nomes.includes(valorInicial) : false;
  const [selecionado, setSelecionado] = useState(
    valorInicial ? (ehConhecida ? valorInicial : "Outro") : ""
  );
  const [outro, setOutro] = useState(ehConhecida ? "" : valorInicial ?? "");
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora — igual qualquer menu suspenso normal.
  useEffect(() => {
    function aoClicarFora(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
        setBusca("");
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function aoMudarSelecionado(valor: string) {
    setSelecionado(valor);
    setAberto(false);
    setBusca("");
    onChange?.(valor === "Outro" ? outro : valor);
  }

  function aoMudarOutro(valor: string) {
    setOutro(valor);
    onChange?.(valor);
  }

  // Muita origem com nome parecido (ex.: "Lista de fechamento n.1/n.3/n.5")
  // — a busca evita clicar na errada por engano.
  const origensFiltradas = useMemo(() => {
    if (!busca.trim()) return origens;
    const alvo = busca.toLowerCase();
    return origens.filter((o) => o.nome.toLowerCase().includes(alvo));
  }, [busca, origens]);

  const rotulo = selecionado === "Outro" ? "Outro..." : selecionado || "Selecione a origem...";

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setAberto((v) => !v)}
          className={`flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
            selecionado ? "text-neutral-900" : "text-neutral-400"
          }`}
        >
          <span className="truncate">{rotulo}</span>
          <IconeChevronBaixo
            className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${aberto ? "rotate-180" : ""}`}
          />
        </button>

        {aberto && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
            <div className="border-b border-neutral-100 p-2">
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar origem..."
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-400"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto py-1">
              {origensFiltradas.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-400">Nenhuma origem encontrada</li>
              )}
              {origensFiltradas.map((origem) => (
                <li key={origem.id}>
                  <button
                    type="button"
                    onClick={() => aoMudarSelecionado(origem.nome)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                      selecionado === origem.nome
                        ? "bg-blue-50 font-medium text-blue-700"
                        : "text-neutral-700"
                    }`}
                  >
                    <span className="truncate">{origem.nome}</span>
                    {selecionado === origem.nome && (
                      <IconeCheck className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </button>
                </li>
              ))}
              <li className="border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => aoMudarSelecionado("Outro")}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                    selecionado === "Outro"
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-neutral-700"
                  }`}
                >
                  Outro...
                  {selecionado === "Outro" && (
                    <IconeCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>

      {selecionado === "Outro" && (
        <input
          value={outro}
          onChange={(e) => aoMudarOutro(e.target.value)}
          placeholder="Qual? Fica salva pra próxima vez"
          className={campoClasse}
        />
      )}

      <input
        type="hidden"
        name="origem"
        value={selecionado === "Outro" ? outro : selecionado}
      />
    </div>
  );
}
