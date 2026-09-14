"use client";

import { useActionState } from "react";
import { atualizarUsuarioAdmin, type EstadoFormulario } from "@/lib/usuarios/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function EditarUsuarioForm({
  usuarioId,
  nomeAtual,
  whatsappAtual,
}: {
  usuarioId: string;
  nomeAtual: string;
  whatsappAtual: string | null;
}) {
  const acaoComId = atualizarUsuarioAdmin.bind(null, usuarioId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="nome">
          Nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          defaultValue={nomeAtual}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="wpp_comercial">
          WhatsApp
        </label>
        <input
          id="wpp_comercial"
          name="wpp_comercial"
          type="tel"
          defaultValue={whatsappAtual ?? ""}
          placeholder="+55 62 99999-9999"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <p className="text-xs text-neutral-400">
          É pra esse número que vão os lembretes automáticos (lead novo,
          contato atrasado, reunião chegando...).
        </p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {pendente ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
