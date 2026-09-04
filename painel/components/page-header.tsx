"use client";

import { useEffect, useRef } from "react";

// Além de renderizar o título, mede a própria altura e guarda numa
// variável CSS (--page-header-altura) — usada por seções que precisam
// grudar (sticky) logo abaixo dele, tipo o filtro de período da tela de
// Métricas, sem precisar chutar um valor fixo em pixel.
export function PageHeader({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function medir() {
      document.documentElement.style.setProperty(
        "--page-header-altura",
        `${el!.getBoundingClientRect().height}px`
      );
    }

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header
      ref={ref}
      className="border-b border-neutral-200 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur md:sticky md:top-0 md:z-20 sm:px-6 sm:py-6"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="h-4 w-1 shrink-0 rounded-full bg-[#2563eb] sm:h-8 sm:w-1.5" />
          <h1 className="min-w-0 break-words text-sm font-semibold text-neutral-700 sm:text-3xl sm:font-extrabold sm:tracking-tight sm:text-neutral-900">
            {titulo}
          </h1>
        </div>
        {acao && <div className="min-w-0">{acao}</div>}
      </div>
    </header>
  );
}
