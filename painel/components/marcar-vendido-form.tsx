"use client";

import { useActionState } from "react";
import { marcarVendido, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function MarcarVendidoForm({ leadId }: { leadId: string }) {
  const acaoComId = marcarVendido.bind(null, leadId);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-emerald-800">
        Fechar venda
      </h2>
      <p className="mb-3 text-xs text-emerald-700">
        Ao marcar como vendido, o lead sai do Funil e da Base e vai pra
        Clientes.
      </p>
      <form action={acaoFormulario} className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-emerald-800">
            Valor da venda (R$)
          </label>
          <input
            name="valor_venda"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Preço combinado com o lead"
            className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-emerald-800">
            Receita recebida (R$)
          </label>
          <input
            name="receita_venda"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="Quanto já entrou no caixa"
            className="w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        {estado.erro && (
          <p className="text-sm text-red-600">{estado.erro}</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
        >
          Marcar como vendido
        </button>
      </form>
    </div>
  );
}
