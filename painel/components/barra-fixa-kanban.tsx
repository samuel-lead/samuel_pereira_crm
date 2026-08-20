"use client";

import { useEffect, useRef } from "react";

// Fica no topo da página (título + métricas) enquanto só os cards do Kanban
// rolam. Mede a própria altura e guarda numa variável CSS pra os cabeçalhos
// das colunas do Kanban saberem exatamente onde parar de "grudados".
export function BarraFixaKanban({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function medir() {
      document.documentElement.style.setProperty(
        "--kanban-barra-altura",
        `${el!.getBoundingClientRect().height}px`
      );
    }

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="sticky top-0 z-20 bg-[#f4f5f7]">
      {children}
    </div>
  );
}
