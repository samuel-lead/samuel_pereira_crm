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
    document.documentElement.classList.toggle("dark", novoEscuro);
    localStorage.setItem("tema", novoEscuro ? "escuro" : "claro");
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
      className="flex h-9 flex-1 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-700"
    >
      {escuro ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
