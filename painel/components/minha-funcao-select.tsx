"use client";

import { useState, useTransition } from "react";
import { atualizarPropriaFuncao } from "@/lib/usuarios/actions";
import { MenuSelect } from "@/components/menu-select";

export function MinhaFuncaoSelect({ funcaoAtual }: { funcaoAtual: string | null }) {
  const [pendente, iniciarTransicao] = useTransition();
  const [valor, setValor] = useState(funcaoAtual ?? "");

  function aoMudar(novoValor: string) {
    setValor(novoValor);
    const formData = new FormData();
    formData.set("funcao", novoValor);
    iniciarTransicao(async () => {
      await atualizarPropriaFuncao(formData);
    });
  }

  return (
    <MenuSelect
      variante="pilula"
      titulo="Sua função no processo comercial — você continua administrador"
      disabled={pendente}
      value={valor}
      onChange={aoMudar}
      options={[
        { value: "", label: "Todas as funções" },
        { value: "sdr", label: "SDR" },
        { value: "closer", label: "Closer" },
      ]}
    />
  );
}
