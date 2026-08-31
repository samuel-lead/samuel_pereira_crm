"use client";

import { useActionState } from "react";
import { excluirUsuario, type EstadoExclusao } from "@/lib/usuarios/actions";
import { MenuSelect } from "@/components/menu-select";

const estadoInicial: EstadoExclusao = { erro: null };

export function ExcluirUsuarioButton({
  usuarioId,
  nome,
  outrosUsuarios,
}: {
  usuarioId: string;
  nome: string;
  outrosUsuarios: { id: string; nome: string }[];
}) {
  const acaoComId = excluirUsuario.bind(null, usuarioId);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);

  return (
    <form
      action={acaoFormulario}
      onSubmit={(e) => {
        if (!estado.precisaTransferir) {
          if (!confirm(`Excluir o acesso de ${nome}? Essa ação não pode ser desfeita.`)) {
            e.preventDefault();
          }
        }
      }}
      className="inline-flex flex-col items-end gap-2"
    >
      {estado.precisaTransferir && (
        <div className="w-56 space-y-1 rounded-md border border-amber-200 bg-amber-50 p-2 text-left">
          <label className="block text-xs font-medium text-amber-800">
            Transferir leads e atividades de {nome} pra:
          </label>
          <MenuSelect
            name="transferir_para"
            placeholder="Selecione..."
            options={outrosUsuarios.map((u) => ({ value: u.id, label: u.nome }))}
          />
        </div>
      )}

      <button
        type="submit"
        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        {estado.precisaTransferir ? "Transferir e excluir" : "Excluir acesso"}
      </button>
      {estado.erro && (
        <p className="max-w-56 text-right text-xs text-red-600">{estado.erro}</p>
      )}
    </form>
  );
}
