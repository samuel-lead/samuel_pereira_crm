"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { editarVenda, type EstadoFormulario } from "@/lib/leads/actions";
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
  valorInicial,
}: {
  name: string;
  label: string;
  valorInicial: number | null;
}) {
  const [centavos, setCentavos] = useState(
    valorInicial ? Math.round(valorInicial * 100) : 0
  );

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
        className="w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
      />
      <input type="hidden" name={name} value={centavos ? (centavos / 100).toFixed(2) : ""} />
    </div>
  );
}

export function EditarVendaForm({
  leadId,
  valorVenda,
  receitaVenda,
  produto,
  produtos,
}: {
  leadId: string;
  valorVenda: number | null;
  receitaVenda: number | null;
  produto: string | null;
  produtos: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const acaoComId = editarVenda.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="text-xs font-medium text-green-700 underline hover:text-green-800"
      >
        Editar valores da venda
      </button>
    );
  }

  return (
    <form action={acaoFormulario} className="space-y-2 border-t border-green-200 pt-3">
      <CampoMoeda name="valor_venda" label="Valor da venda (R$)" valorInicial={valorVenda} />
      <CampoMoeda name="receita_venda" label="Receita recebida (R$) — opcional" valorInicial={receitaVenda} />
      <div>
        <label className="mb-1 block text-xs font-medium text-green-800">
          Produto
        </label>
        <ProdutoSelect produtos={produtos} valorInicial={produto ?? undefined} />
      </div>
      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pendente}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
            salvo ? "bg-green-700 hover:bg-green-700" : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="rounded-md border border-green-300 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
