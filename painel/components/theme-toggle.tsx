"use client";

import { useEffect, useState } from "react";
import { IconeLua, IconeSol } from "@/components/icons";

export function ThemeToggle({ colapsado = false }: { colapsado?: boolean }) {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novoEscuro = !escuro;
    setEscuro(novoEscuro);

    // Desliga as transições de cor de TODOS os elementos só na hora da
    // troca. Com centenas de cards na tela, cada um animando cor/fundo
    // (150ms) ao mesmo tempo, o navegador travava bem no finalzinho
    // (Samuel pegou isso ao vivo). Sem animar, a troca é instantânea e
    // fluida; as transições voltam logo em seguida pro hover normal.
    const estilo = document.createElement("style");
    estilo.appendChild(
      document.createTextNode("*,*::before,*::after{transition:none!important}")
    );
    document.head.appendChild(estilo);

    document.documentElement.classList.toggle("dark", novoEscuro);
    try {
      localStorage.setItem("tema", novoEscuro ? "escuro" : "claro");
    } catch {
      // sem localStorage (janela privada etc.) — só não lembra o tema depois
    }

    // Força o navegador a aplicar a troca ANTES de religar as transições.
    window.getComputedStyle(document.body).opacity;
    window.setTimeout(() => estilo.remove(), 50);
  }

  // No modo colapsado (rail estreito) não cabe o texto — mantém só o ícone.
  if (colapsado) {
    return (
      <button
        type="button"
        onClick={alternar}
        title={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
      >
        {escuro ? <IconeSol className="h-4 w-4" /> : <IconeLua className="h-4 w-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={alternar}
      className="flex h-9 w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
    >
      {escuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
