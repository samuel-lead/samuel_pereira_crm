"use client";

import { useState } from "react";

// Depois de cadastrar o cliente em "Nova empresa" (com e-mail e senha já
// escolhidos por quem criou), esse botão só copia o link de login pra
// mandar pro cliente — ele entra com o que já foi cadastrado, não cria
// conta nova aqui (isso não existe nesse sistema, tudo é cadastrado pelo
// dono da plataforma).
export function CopiarLinkLoginButton({ className }: { className?: string }) {
  const [copiado, setCopiado] = useState(false);

  async function aoClicar() {
    const link = `${window.location.origin}/login`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt("Copie o link:", link);
    }
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={
        className ??
        "rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
      }
    >
      {copiado ? "Link copiado ✓" : "Copiar link de login"}
    </button>
  );
}
