"use client";

import { useEffect, useState } from "react";

const LIMIAR_ENCOLHER = 12;

export function PageHeader({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  const [encolhido, setEncolhido] = useState(false);

  useEffect(() => {
    // Nem toda página rola do mesmo jeito: a maioria rola a página inteira,
    // mas o Kanban rola cada coluna por dentro. Captura o scroll de
    // qualquer área rolável da tela (fase de captura, no document) e
    // encolhe assim que alguma delas passar do topo — só volta ao tamanho
    // normal quando todas voltarem pro topo.
    const roladas = new Set<EventTarget>();

    function aoRolar(evento: Event) {
      const alvo = evento.target as HTMLElement | null;
      if (!alvo || typeof alvo.scrollTop !== "number") return;

      if (alvo.scrollTop > LIMIAR_ENCOLHER) {
        roladas.add(alvo);
      } else {
        roladas.delete(alvo);
      }
      setEncolhido(roladas.size > 0);
    }

    document.addEventListener("scroll", aoRolar, true);
    return () => document.removeEventListener("scroll", aoRolar, true);
  }, []);

  return (
    <header
      className={`sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-6 shadow-sm backdrop-blur transition-[padding] duration-200 ${
        encolhido ? "py-3" : "py-6"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`shrink-0 rounded-full bg-[#2563eb] transition-all duration-200 ${
              encolhido ? "h-5 w-1" : "h-8 w-1.5"
            }`}
          />
          <h1
            className={`font-extrabold tracking-tight text-neutral-900 transition-all duration-200 ${
              encolhido ? "text-lg" : "text-3xl"
            }`}
          >
            {titulo}
          </h1>
        </div>
        {acao}
      </div>
    </header>
  );
}
