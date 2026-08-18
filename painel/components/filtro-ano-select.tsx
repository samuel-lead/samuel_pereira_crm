"use client";

import { useRouter } from "next/navigation";

export function FiltroAnoSelect({
  anoSelecionado,
  anoAtual,
}: {
  anoSelecionado: number;
  anoAtual: number;
}) {
  const router = useRouter();

  const anos: number[] = [];
  for (let ano = anoAtual + 4; ano >= anoAtual; ano--) {
    anos.push(ano);
  }

  function aoMudar(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/ano?ano=${e.target.value}`);
  }

  return (
    <select
      value={anoSelecionado}
      onChange={aoMudar}
      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
    >
      {anos.map((ano) => (
        <option key={ano} value={ano}>
          {ano}
        </option>
      ))}
    </select>
  );
}
