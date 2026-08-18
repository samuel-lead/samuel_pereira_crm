"use client";

import { useRouter } from "next/navigation";

export function FiltroCloserSelect({
  closers,
  valorInicial,
}: {
  closers: { id: string; nome: string }[];
  valorInicial?: string;
}) {
  const router = useRouter();

  function aoMudar(e: React.ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value;
    router.push(valor ? `/reunioes?closer=${valor}` : "/reunioes");
  }

  return (
    <select
      value={valorInicial ?? ""}
      onChange={aoMudar}
      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
    >
      <option value="">Filtrar por closer</option>
      {closers.map((closer) => (
        <option key={closer.id} value={closer.id}>
          {closer.nome}
        </option>
      ))}
    </select>
  );
}
