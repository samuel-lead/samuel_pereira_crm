"use client";

import { useRouter } from "next/navigation";

export function FiltroUsuarioSelect({
  usuarios,
  valorInicial,
}: {
  usuarios: { id: string; nome: string }[];
  valorInicial?: string;
}) {
  const router = useRouter();

  function aoMudar(e: React.ChangeEvent<HTMLSelectElement>) {
    const valor = e.target.value;
    router.push(valor ? `/leads?usuario=${valor}` : "/leads");
  }

  return (
    <select
      value={valorInicial ?? ""}
      onChange={aoMudar}
      className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
    >
      <option value="">Filtrar por usuário</option>
      {usuarios.map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.nome}
        </option>
      ))}
    </select>
  );
}
