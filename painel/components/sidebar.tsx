"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { IconeFunil, IconeLista, IconeAtividade, IconeMetricas, IconeUsuarios, IconeConfig, IconeAlvo, IconeMoeda } from "@/components/icons";

const ITENS = [
  { href: "/leads", label: "Funil", Icone: IconeFunil, pagina: "funil" },
  { href: "/leads/lista", label: "Lista de leads", Icone: IconeLista, pagina: "lista" },
  { href: "/leads/base", label: "Base de Leads", Icone: IconeAlvo, pagina: "funil" },
  { href: "/leads/vendas", label: "Clientes", Icone: IconeMoeda, pagina: "funil" },
  { href: "/atividades", label: "Atividades", Icone: IconeAtividade, pagina: "atividades" },
  { href: "/dashboard", label: "Métricas", Icone: IconeMetricas, pagina: "metricas" },
  { href: "/usuarios", label: "Usuários", Icone: IconeUsuarios, pagina: "admin" },
  { href: "/configuracoes", label: "Configurações", Icone: IconeConfig, pagina: "admin" },
];

export function Sidebar({
  isAdmin = true,
  paginasPermitidas = [],
}: {
  isAdmin?: boolean;
  paginasPermitidas?: string[];
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const itensVisiveis = ITENS.filter((item) =>
    isAdmin ? true : item.pagina !== "admin" && paginasPermitidas.includes(item.pagina)
  );

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-neutral-200 bg-white transition-all duration-200 ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-5">
        <Link href="/leads" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-bold text-white shadow-sm">
            MV
          </span>
          {!colapsado && (
            <span className="truncate text-base font-semibold text-neutral-900">
              Meu Vendedor
            </span>
          )}
        </Link>
        {!colapsado && (
          <button
            type="button"
            onClick={() => setColapsado(true)}
            title="Recolher menu"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            «
          </button>
        )}
      </div>

      {colapsado && (
        <div className="px-3 pb-2">
          <button
            type="button"
            onClick={() => setColapsado(false)}
            title="Expandir menu"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          >
            »
          </button>
        </div>
      )}

      <nav className="flex-1 space-y-1 px-3">
        {itensVisiveis.map(({ href, label, Icone }) => {
          const ativo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={colapsado ? label : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                colapsado ? "justify-center" : ""
              } ${
                ativo
                  ? "bg-violet-50 text-violet-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {!colapsado && label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <LogoutButton compacto={colapsado} />
      </div>
    </aside>
  );
}
