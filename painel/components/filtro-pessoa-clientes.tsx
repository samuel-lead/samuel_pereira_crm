"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconeChevronBaixo } from "@/components/icons";

// Filtro em formato de cartão (rótulo pequeno em cima, valor embaixo) pra
// ficar no mesmo padrão do cartão de busca da tela Clientes. Usado pra
// filtrar por SDR e por Closer. Guarda a escolha na URL (?sdr=… / ?closer=…)
// e mantém o resto (período, busca) como estava.
export function FiltroPessoaClientes({
  rotulo,
  parametro,
  atual,
  opcoes,
}: {
  rotulo: string;
  parametro: "sdr" | "closer";
  atual?: string;
  opcoes: { id: string; nome: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function escolher(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set(parametro, id);
    else params.delete(parametro);
    const query = params.toString();
    setAberto(false);
    router.push(query ? `/leads/vendas?${query}` : "/leads/vendas", { scroll: false });
  }

  const selecionada = opcoes.find((o) => o.id === atual);
  const ativo = !!selecionada;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className={`flex h-full min-w-[150px] items-center justify-between gap-3 rounded-xl border px-4 py-2 text-left shadow-sm outline-none transition ${
          ativo
            ? "border-blue-200 bg-blue-50 hover:bg-blue-100"
            : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        <span className="flex flex-col gap-0.5">
          <span className={`text-[10px] font-medium ${ativo ? "text-blue-500" : "text-neutral-500"}`}>
            {rotulo}
          </span>
          <span className={`text-sm font-medium ${ativo ? "text-blue-700" : "text-neutral-900"}`}>
            {selecionada ? selecionada.nome : "Todos"}
          </span>
        </span>
        <IconeChevronBaixo
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${
            ativo ? "text-blue-500" : "text-neutral-400"
          } ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-30 mt-1.5 max-h-72 w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => escolher("")}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-50 ${
              !atual ? "font-medium text-blue-700" : "text-neutral-500"
            }`}
          >
            Todos
          </button>
          {opcoes.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              onClick={() => escolher(opcao.id)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-50 ${
                opcao.id === atual ? "font-medium text-blue-700" : "text-neutral-700"
              }`}
            >
              {opcao.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
