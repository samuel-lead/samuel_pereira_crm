"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { IconeFunil, IconeLista, IconeAtividade, IconeConfig } from "@/components/icons";

const ITENS = [
  { href: "/leads", label: "Funil (Kanban)", Icone: IconeFunil },
  { href: "/leads/lista", label: "Lista de leads", Icone: IconeLista },
  { href: "/atividades", label: "Atividades", Icone: IconeAtividade },
  { href: "/configuracoes", label: "Configurações", Icone: IconeConfig },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <Link href="/leads" className="flex items-center gap-2 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-600 to-sky-500 text-sm font-bold text-white shadow-sm">
          MV
        </span>
        <span className="text-base font-semibold text-neutral-900">
          Meu Vendedor
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {ITENS.map(({ href, label, Icone }) => {
          const ativo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                ativo
                  ? "bg-violet-50 text-violet-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 p-3">
        <LogoutButton />
      </div>
    </aside>
  );
}
