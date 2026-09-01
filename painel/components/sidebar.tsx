"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { SinoNotificacoes } from "@/components/sino-notificacoes";
import { ThemeToggle } from "@/components/theme-toggle";
import { IconeFunil, IconeLista, IconeAtividade, IconeMetricas, IconeUsuarios, IconeConfig, IconeAlvo, IconeMoeda, IconeEstrela, IconeClientePagante, IconeLixeira, IconeCasa, IconeCarta, IconeIma } from "@/components/icons";

const GRUPOS = [
  {
    titulo: "Funil",
    itens: [
      { href: "/leads", label: "Pré-vendas", Icone: IconeFunil, pagina: "funil" },
      { href: "/reunioes", label: "Vendas", Icone: IconeMoeda, pagina: "reunioes" },
      { href: "/leads/vendas", label: "Clientes", Icone: IconeClientePagante, pagina: "funil" },
      { href: "/leads/base", label: "Base de leads", Icone: IconeAlvo, pagina: "funil" },
      { href: "/imoveis", label: "Imóveis", Icone: IconeCasa, pagina: "imoveis", somenteImobiliario: true },
      { href: "/cartas-contempladas", label: "Cartas contempladas", Icone: IconeCarta, pagina: "cartas_contempladas", somenteImobiliario: true },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/dashboard", label: "Métricas", Icone: IconeMetricas, pagina: "metricas" },
      { href: "/leads/lista", label: "Lista de leads", Icone: IconeLista, pagina: "lista" },
      { href: "/atividades", label: "Atividades", Icone: IconeAtividade, pagina: "atividades" },
      { href: "/bonus-sdr", label: "Bônus SDR", Icone: IconeEstrela, pagina: "admin" },
    ],
  },
  {
    titulo: "Admin",
    itens: [
      { href: "/usuarios", label: "Usuários", Icone: IconeUsuarios, pagina: "admin" },
      { href: "/iscas", label: "Captura de leads", Icone: IconeIma, pagina: "admin" },
      { href: "/leads/excluidos", label: "Excluídos", Icone: IconeLixeira, pagina: "admin" },
      { href: "/configuracoes", label: "Configurações", Icone: IconeConfig, pagina: "admin" },
    ],
  },
];

export function Sidebar({
  isAdmin = true,
  paginasPermitidas = [],
  nomeUsuario = "",
  fotoUsuario = null,
  cargo = "Membro",
  funcao = null,
  publicoOrg = "mentoria",
}: {
  isAdmin?: boolean;
  paginasPermitidas?: string[];
  nomeUsuario?: string;
  fotoUsuario?: string | null;
  cargo?: string;
  funcao?: string | null;
  publicoOrg?: string;
}) {
  const pathname = usePathname();
  const [colapsado, setColapsado] = useState(false);
  const gruposVisiveis = GRUPOS.map((grupo) => ({
    ...grupo,
    itens: grupo.itens.filter((item) => {
      // Imóveis é exclusivo do público imobiliário — vale pra admin
      // também, diferente do resto (que admin sempre vê tudo).
      if (item.somenteImobiliario && publicoOrg !== "imobiliario") return false;
      // Bônus SDR não existe no imobiliário — vale pra admin também.
      if (item.href === "/bonus-sdr" && publicoOrg === "imobiliario") return false;
      if (isAdmin) return true;
      // Bônus SDR é automático pra quem tem função SDR, não depende das
      // páginas liberadas manualmente — Closer não vê essa página.
      if (item.href === "/bonus-sdr") return funcao === "sdr";
      return item.pagina !== "admin" && paginasPermitidas.includes(item.pagina);
    }),
  })).filter((grupo) => grupo.itens.length > 0);

  return (
    <aside
      className={`flex h-full shrink-0 flex-col rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/10 transition-all duration-200 ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-5">
        <Link href="/leads" className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2563eb] text-sm font-bold text-white shadow-sm">
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

      <nav className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3">
        {gruposVisiveis.map((grupo) => (
          <div key={grupo.titulo} className="space-y-1">
            {!colapsado && (
              <p className="px-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {grupo.titulo}
              </p>
            )}
            {grupo.itens.map(({ href, label, Icone }) => {
              const ativo = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={colapsado ? label : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    colapsado ? "justify-center" : ""
                  } ${
                    ativo
                      ? "bg-[#2563eb] text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icone className="h-4 w-4 shrink-0" />
                  {!colapsado && label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-slate-800 p-3">
        <Link
          href="/perfil"
          title={colapsado ? nomeUsuario : undefined}
          className={`mb-3 flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-slate-800 ${
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
            className="mb-2 flex w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-700"
          >
            Meu perfil
          </Link>
        )}

        <LogoutButton compacto={colapsado} escuro />
      </div>
    </aside>
  );
}
