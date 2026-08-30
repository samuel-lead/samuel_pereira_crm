"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const OPCOES = [
  { valor: "hoje", label: "Hoje" },
  { valor: "ontem", label: "Ontem" },
  { valor: "semana", label: "Semana" },
  { valor: "mes", label: "Mês" },
] as const;

export function FiltroPeriodoDashboard({
  periodoAtual,
  deAtual,
  ateAtual,
}: {
  periodoAtual: string;
  deAtual?: string;
  ateAtual?: string;
}) {
  const router = useRouter();
  const [mostrarCustom, setMostrarCustom] = useState(periodoAtual === "custom");
  const [de, setDe] = useState(deAtual ?? "");
  const [ate, setAte] = useState(ateAtual ?? "");

  function irPara(valor: string) {
    setMostrarCustom(false);
    router.push(`/dashboard?periodo=${valor}`);
  }

  function aplicarCustom(evento: React.FormEvent) {
    evento.preventDefault();
    if (!de || !ate) return;
    router.push(`/dashboard?periodo=custom&de=${de}&ate=${ate}`);
  }

  return (
    <div className="inline-flex flex-wrap items-stretch divide-x divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        {OPCOES.map((opcao) => (
          <button
            key={opcao.valor}
            type="button"
            onClick={() => irPara(opcao.valor)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              periodoAtual === opcao.valor
                ? "bg-blue-600 text-white shadow-sm"
                : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {opcao.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setMostrarCustom((v) => !v)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            periodoAtual === "custom"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          Período personalizado
        </button>
      </div>

      {mostrarCustom && (
        <form onSubmit={aplicarCustom} className="flex items-center gap-1.5 px-4 py-2">
          <div className="flex flex-col justify-center gap-0.5">
            <label className="text-[10px] font-medium text-neutral-500" htmlFor="periodo-de">
              De
            </label>
            <input
              id="periodo-de"
              type="date"
              value={de}
              onChange={(e) => setDe(e.target.value)}
              required
              className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
            />
          </div>
          <span className="mt-3.5 text-neutral-300">–</span>
          <div className="flex flex-col justify-center gap-0.5">
            <label className="text-[10px] font-medium text-neutral-500" htmlFor="periodo-ate">
              Até
            </label>
            <input
              id="periodo-ate"
              type="date"
              value={ate}
              onChange={(e) => setAte(e.target.value)}
              required
              className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
            />
          </div>
          <button
            type="submit"
            className="ml-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
