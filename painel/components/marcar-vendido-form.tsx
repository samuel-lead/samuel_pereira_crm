"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { marcarVendido, type EstadoFormulario } from "@/lib/leads/actions";
import { ProdutoSelect } from "@/components/produto-select";

const estadoInicial: EstadoFormulario = { erro: null };

function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function CampoMoeda({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  const [centavos, setCentavos] = useState(0);

  function aoDigitar(evento: ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = evento.target.value.replace(/\D/g, "");
    setCentavos(somenteDigitos ? Number(somenteDigitos) : 0);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-green-800">
        {label}
      </label>
      <input
        type="text"
        inputMode="numeric"
        value={centavos ? formatarCentavos(centavos) : ""}
        onChange={aoDigitar}
        placeholder={placeholder}
        className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
      <input type="hidden" name={name} value={centavos ? (centavos / 100).toFixed(2) : ""} />
    </div>
  );
}

export function MarcarVendidoForm({ leadId }: { leadId: string }) {
  const acaoComId = marcarVendido.bind(null, leadId);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-green-800">
        Fechar venda
      </h2>
      <p className="mb-3 text-xs text-green-700">
        Ao marcar como vendido, o lead sai do Funil e vai para Clientes.
      </p>
      <form action={acaoFormulario} className="space-y-2">
        <CampoMoeda
          name="valor_venda"
          label="Valor da venda (R$)"
          placeholder="Preço combinado com o lead"
        />
        <CampoMoeda
          name="receita_venda"
          label="Receita recebida (R$)"
          placeholder="Quanto entrou no caixa"
        />
        {estado.erro && (
          <p className="text-sm text-red-600">{estado.erro}</p>
        )}
        <button
          type="submit"
          className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-700"
        >
          Marcar como vendido
        </button>

        <div>
          <label className="mb-1 block text-xs font-medium text-green-800">
            Produto
          </label>
          <ProdutoSelect />
        </div>
      </form>
    </div>
  );
}
