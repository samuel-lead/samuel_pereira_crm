"use client";

import { useTransition } from "react";
import { atualizarFuncaoDoUsuario } from "@/lib/usuarios/actions";

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

  function aoMudar(e: React.ChangeEvent<HTMLSelectElement>) {
    const formData = new FormData();
    formData.set("usuario_id", usuarioId);
    formData.set("papel_atual", papelAtual);
    paginasAtuais.forEach((pagina) => formData.append("paginas_atuais", pagina));
    formData.set("funcao", e.target.value);
    iniciarTransicao(async () => {
      await atualizarFuncaoDoUsuario(formData);
    });
  }

  return (
    <select
      defaultValue={funcaoAtual ?? ""}
      onChange={aoMudar}
      disabled={pendente}
      title="Função no processo comercial"
      className="shrink-0 rounded-full border-none bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 outline-none disabled:opacity-50"
    >
      <option value="">— Sem função —</option>
      <option value="sdr">SDR</option>
      <option value="closer">Closer</option>
    </select>
  );
}
