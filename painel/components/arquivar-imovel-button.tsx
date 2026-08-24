"use client";

import { useActionState } from "react";
import { arquivarImovel, type EstadoFormulario } from "@/lib/imoveis/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ArquivarImovelButton({ imovelId }: { imovelId: string }) {
  const acaoComId = arquivarImovel.bind(null, imovelId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    if (!confirm("Tem certeza que quer excluir esse imóvel? Ele sai da lista, mas fica guardado.")) {
      evento.preventDefault();
    }
  }

  return (
    <form action={acaoFormulario} onSubmit={aoSubmeter}>
      {estado.erro && <p className="mb-2 text-sm text-red-600">{estado.erro}</p>}
      <button
        type="submit"
        disabled={pendente}
        className="rounded-md border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60"
      >
        {pendente ? "Excluindo..." : "Excluir imóvel"}
      </button>
    </form>
  );
}
