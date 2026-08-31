"use client";

import { useState, useTransition } from "react";
import { atualizarFuncaoDoUsuario } from "@/lib/usuarios/actions";
import { MenuSelect } from "@/components/menu-select";

export function FuncaoUsuarioSelect({
  usuarioId,
  papelAtual,
  paginasAtuais,
  funcaoAtual,
}: {
  usuarioId: string;
  papelAtual: string;
  paginasAtuais: string[];
  funcaoAtual: string | null;
}) {
  const [pendente, iniciarTransicao] = useTransition();
  const [valor, setValor] = useState(funcaoAtual ?? "");

  function aoMudar(novoValor: string) {
    setValor(novoValor);
    const formData = new FormData();
    formData.set("usuario_id", usuarioId);
    formData.set("papel_atual", papelAtual);
    paginasAtuais.forEach((pagina) => formData.append("paginas_atuais", pagina));
    formData.set("funcao", novoValor);
    iniciarTransicao(async () => {
      await atualizarFuncaoDoUsuario(formData);
    });
  }

  return (
    <MenuSelect
      variante="pilula"
      titulo="Função no processo comercial"
      disabled={pendente}
      value={valor}
      onChange={aoMudar}
      options={[
        { value: "", label: "— Sem função —" },
        { value: "sdr", label: "SDR" },
        { value: "closer", label: "Closer" },
      ]}
    />
  );
}
