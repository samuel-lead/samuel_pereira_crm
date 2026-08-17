"use client";

import { useActionState } from "react";
import { excluirUsuario, type EstadoExclusao } from "@/lib/usuarios/actions";

const estadoInicial: EstadoExclusao = { erro: null };

export function ExcluirUsuarioButton({
  usuarioId,
  nome,
}: {
  usuarioId: string;
  nome: string;
}) {
  const acaoComId = excluirUsuario.bind(null, usuarioId);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);

  return (
    <form
      action={acaoFormulario}
      onSubmit={(e) => {
        if (!confirm(`Excluir o acesso de ${nome}? Essa ação não pode ser desfeita.`)) {
          e.preventDefault();
        }
      }}
      className="inline-flex flex-col items-end gap-1"
    >
      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Excluir acesso
      </button>
      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
    </form>
  );
}
