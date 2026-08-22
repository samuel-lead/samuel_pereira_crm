"use client";

import { useTransition } from "react";
import { atualizarPropriaFuncao } from "@/lib/usuarios/actions";

export function MinhaFuncaoSelect({ funcaoAtual }: { funcaoAtual: string | null }) {
  const [pendente, iniciarTransicao] = useTransition();

  function aoMudar(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("funcao", e.target.value);
    iniciarTransicao(async () => {
      await atualizarPropriaFuncao(formData);
    });
  }

  return (
    <select
      defaultValue={funcaoAtual ?? ""}
      onChange={aoMudar}
      disabled={pendente}
      title="Sua função no processo comercial — você continua administrador"
      className="shrink-0 rounded-full border-none bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 outline-none disabled:opacity-50"
    >
      <option value="">Todas as funções</option>
      <option value="sdr">SDR</option>
      <option value="closer">Closer</option>
    </select>
  );
}
