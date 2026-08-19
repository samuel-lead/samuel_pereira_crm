"use client";

import { useRouter } from "next/navigation";

const classeSelect =
  "rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function FiltrosLeads({
  usuarios,
  origens,
  usuarioInicial,
  origemInicial,
  baseHref = "/leads",
}: {
  usuarios: { id: string; nome: string }[];
  origens: string[];
  usuarioInicial?: string;
  origemInicial?: string;
  baseHref?: string;
}) {
  const router = useRouter();

  function construirUrl(usuario: string, origem: string) {
    const params = new URLSearchParams();
    if (usuario) params.set("usuario", usuario);
    if (origem) params.set("origem", origem);
    const query = params.toString();
    return query ? `${baseHref}?${query}` : baseHref;
  }

  function aoMudarUsuario(evento: React.ChangeEvent<HTMLSelectElement>) {
    router.push(construirUrl(evento.target.value, origemInicial ?? ""));
  }

  function aoMudarOrigem(evento: React.ChangeEvent<HTMLSelectElement>) {
    router.push(construirUrl(usuarioInicial ?? "", evento.target.value));
  }

  return (
    <div className="flex items-center gap-2">
      <select value={usuarioInicial ?? ""} onChange={aoMudarUsuario} className={classeSelect}>
        <option value="">Filtrar por usuário</option>
        {usuarios.map((usuario) => (
          <option key={usuario.id} value={usuario.id}>
            {usuario.nome}
          </option>
        ))}
      </select>

      <select value={origemInicial ?? ""} onChange={aoMudarOrigem} className={classeSelect}>
        <option value="">Filtrar por funil</option>
        {origens.map((origem) => (
          <option key={origem} value={origem}>
            {origem}
          </option>
        ))}
      </select>
    </div>
  );
}
