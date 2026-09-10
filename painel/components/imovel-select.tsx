"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconeCheck, IconeChevronBaixo } from "@/components/icons";

type Imovel = { id: string; titulo: string; bairro: string | null; cidade: string | null };

function rotuloImovel(imovel: Imovel) {
  const local = [imovel.bairro, imovel.cidade].filter(Boolean).join(", ");
  return local ? `${imovel.titulo} — ${local}` : imovel.titulo;
}

export function ImovelSelect({
  imoveis,
  valorInicial,
}: {
  imoveis: Imovel[];
  valorInicial?: string | null;
}) {
  const [selecionado, setSelecionado] = useState(valorInicial ?? "");
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

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

  const imoveisFiltrados = useMemo(() => {
    if (!busca.trim()) return imoveis;
    const alvo = busca.toLowerCase();
    return imoveis.filter((i) => rotuloImovel(i).toLowerCase().includes(alvo));
  }, [busca, imoveis]);

  const imovelSelecionado = imoveis.find((i) => i.id === selecionado);
  const rotulo = imovelSelecionado ? rotuloImovel(imovelSelecionado) : "Sem imóvel vinculado";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
          imovelSelecionado ? "text-neutral-900" : "text-neutral-400"
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
              placeholder="Buscar imóvel..."
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-sm text-neutral-900 outline-none focus:border-blue-400"
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                onClick={() => {
                  setSelecionado("");
                  setAberto(false);
                  setBusca("");
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                  !selecionado ? "bg-blue-50 font-medium text-blue-700" : "text-neutral-500"
                }`}
              >
                Sem imóvel vinculado
                {!selecionado && <IconeCheck className="h-4 w-4 shrink-0 text-blue-600" />}
              </button>
            </li>
            {imoveisFiltrados.length === 0 && (
              <li className="px-3 py-2 text-sm text-neutral-400">Nenhum imóvel encontrado</li>
            )}
            {imoveisFiltrados.map((imovel) => (
              <li key={imovel.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelecionado(imovel.id);
                    setAberto(false);
                    setBusca("");
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-blue-50 ${
                    selecionado === imovel.id
                      ? "bg-blue-50 font-medium text-blue-700"
                      : "text-neutral-700"
                  }`}
                >
                  <span className="truncate">{rotuloImovel(imovel)}</span>
                  {selecionado === imovel.id && (
                    <IconeCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <input type="hidden" name="imovel_id" value={selecionado} />
    </div>
  );
}
