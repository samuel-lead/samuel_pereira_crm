"use client";

import { useTransition } from "react";
import { tornarAdmin } from "@/lib/usuarios/actions";

export function TornarAdminButton({ usuarioId, nome }: { usuarioId: string; nome: string }) {
  const [pendente, iniciarTransicao] = useTransition();

  function aoClicar() {
    if (
      !confirm(
        `Tornar ${nome} administrador? Ele passa a acessar tudo, inclusive Usuários e Configurações.`
      )
    ) {
      return;
    }
    iniciarTransicao(async () => {
      await tornarAdmin(usuarioId);
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={pendente}
      className="text-xs font-medium text-amber-600 hover:text-amber-700 disabled:opacity-60"
    >
      {pendente ? "..." : "Tornar admin"}
    </button>
  );
}
