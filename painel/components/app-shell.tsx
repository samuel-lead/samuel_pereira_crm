"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { IconeMenu } from "@/components/icons";

// No celular não cabe o menu lateral fixo — vira uma gaveta que abre por
// cima do conteúdo (com um fundo escurecido atrás) em vez de dividir a
// tela. No desktop continua exatamente como sempre foi.
export function AppShell({
  children,
  ...sidebarProps
}: {
  children: React.ReactNode;
} & React.ComponentProps<typeof Sidebar>) {
  const [menuAberto, setMenuAberto] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7] md:gap-3 md:p-3">
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition hover:bg-neutral-100"
        >
          <IconeMenu className="h-5 w-5" />
        </button>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2563eb] text-xs font-bold text-white">
          MV
        </span>
        <span className="truncate text-sm font-semibold text-neutral-900">Meu Vendedor</span>
      </div>

      {menuAberto && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <Sidebar {...sidebarProps} abertoMobile={menuAberto} onFecharMobile={() => setMenuAberto(false)} />

      <div className="min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0">{children}</div>
    </div>
  );
}
