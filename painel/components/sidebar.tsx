"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { SinoNotificacoes } from "@/components/sino-notificacoes";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconeFunil, IconeLista, IconeAtividade, IconeMetricas, IconeUsuarios, IconeConfig, IconeAlvo, IconeMoeda, IconeEstrela, IconeClientePagante, IconeIntegracao } from "@/components/icons";

const ITENS = [
  { href: "/leads", label: "Pré-vendas", Icone: IconeFunil, pagina: "funil" },
  { href: "/reunioes", label: "Vendas", Icone: IconeMoeda, pagina: "reunioes" },
  { href: "/dashboard", label: "Métricas", Icone: IconeMetricas, pagina: "metricas" },
  { href: "/leads/lista", label: "Lista de leads", Icone: IconeLista, pagina: "lista" },
  { href: "/atividades", label: "Atividades", Icone: IconeAtividade, pagina: "atividades" },
  { href: "/bonus-sdr", label: "Bônus SDR", Icone: IconeEstrela, pagina: "admin" },
  { href: "/leads/base", label: "Base de leads", Icone: IconeAlvo, pagina: "funil" },
  { href: "/leads/vendas", label: "Clientes", Icone: IconeClientePagante, pagina: "funil" },
  { href: "/usuarios", label: "Usuários", Icone: IconeUsuarios, pagina: "admin" },
  { href: "/integracoes", label: "Integrações", Icone: IconeIntegracao, pagina: "admin" },
  { href: "/configuracoes", label: "Configurações", Icone: IconeConfig, pagina: "admin" },
];

export function Sidebar({
  isAdmin = true,
  paginasPermitidas = [],
  nomeUsuario = "",
  fotoUsuario = null,
  cargo = "Membro",
}: {
  isAdmin?: boolean;
  paginasPermitidas?: string[];
  nomeUsuario?: string;
  fotoUsuario?: string | null;
  cargo?: string;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const itensVisiveis = ITENS.filter((item) =>
    isAdmin ? true : item.pagina !== "admin" && paginasPermitidas.includes(item.pagina)
  );

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200 ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-5">
        <Link href="/leads" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-sky-500 text-sm font-bold text-white shadow-sm">
            MV
          </span>
          {!colapsado && (
            <span className="truncate text-base font-semibold text-white">
              Meu Vendedor
            </span>
          )}
        </Link>
        {!colapsado && (
          <button
            type="button"
            onClick={() => setColapsado(true)}
            title="Recolher menu"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
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
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            »
          </button>
        </div>
      )}

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3">
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
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icone className="h-4 w-4 shrink-0" />
              {!colapsado && label}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-3">
        <Link
          href="/perfil"
          title={colapsado ? nomeUsuario : undefined}
          className={`mb-3 flex items-center gap-2 rounded-md px-1 py-1 transition hover:bg-slate-800 ${
            colapsado ? "justify-center" : ""
          }`}
        >
          <AvatarUsuario nome={nomeUsuario} fotoUrl={fotoUsuario} tamanho="h-9 w-9 text-sm" />
          {!colapsado && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{nomeUsuario}</p>
              <p className="text-xs text-slate-400">{cargo}</p>
            </div>
          )}
        </Link>

        <div className={`mb-3 flex gap-2 ${colapsado ? "flex-col items-center" : ""}`}>
          <SinoNotificacoes />
          <ThemeToggle colapsado={colapsado} />
        </div>

        {!colapsado && (
          <Link
            href="/perfil"
            className="mb-2 flex w-full items-center justify-center rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Trocar minha senha
          </Link>
        )}

        <LogoutButton compacto={colapsado} escuro />
      </div>
    </aside>
  );
}
