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
    <div className="flex flex-wrap items-center gap-2">
      {OPCOES.map((opcao) => (
        <button
          key={opcao.valor}
          type="button"
          onClick={() => irPara(opcao.valor)}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
            periodoAtual === opcao.valor
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {opcao.label}
        </button>
      ))}

      <button
        type="button"
        onClick={() => setMostrarCustom((v) => !v)}
        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
          periodoAtual === "custom"
            ? "bg-blue-600 text-white shadow-sm"
            : "bg-white text-neutral-600 hover:bg-neutral-100"
        }`}
      >
        Período customizado
      </button>

      {mostrarCustom && (
        <form onSubmit={aplicarCustom} className="flex items-center gap-2">
          <input
            type="date"
            value={de}
            onChange={(e) => setDe(e.target.value)}
            required
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-sm text-neutral-400">até</span>
          <input
            type="date"
            value={ate}
            onChange={(e) => setAte(e.target.value)}
            required
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Aplicar
          </button>
        </form>
      )}
    </div>
  );
}
