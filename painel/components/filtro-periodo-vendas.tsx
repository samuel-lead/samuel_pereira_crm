"use client";

import { useRouter } from "next/navigation";

export function FiltroPeriodoVendas({
  periodos,
  periodoInicial,
}: {
  periodos: { valor: string; nome: string }[];
  periodoInicial?: string;
}) {
  const router = useRouter();

  function aoMudar(evento: React.ChangeEvent<HTMLSelectElement>) {
    const valor = evento.target.value;
    router.push(valor ? `/leads/vendas?periodo=${valor}` : "/leads/vendas");
  }

  return (
    <select
      value={periodoInicial ?? ""}
      onChange={aoMudar}
      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Todos os períodos</option>
      {periodos.map((periodo) => (
        <option key={periodo.valor} value={periodo.valor}>
          {periodo.nome}
        </option>
      ))}
    </select>
  );
}
