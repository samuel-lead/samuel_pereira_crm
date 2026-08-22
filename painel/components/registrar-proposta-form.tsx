"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { registrarProposta, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

function formatarCentavos(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RegistrarPropostaForm({
  leadId,
  propostaAtual,
}: {
  leadId: string;
  propostaAtual?: {
    valor: number | null;
    enviadaEm: string | null;
    observacao: string | null;
  };
}) {
  const acaoComId = registrarProposta.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [centavos, setCentavos] = useState(0);
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

  function aoDigitarValor(evento: ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = evento.target.value.replace(/\D/g, "");
    setCentavos(somenteDigitos ? Number(somenteDigitos) : 0);
  }

  const temProposta = propostaAtual?.valor != null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-amber-800">Proposta</h2>

      {temProposta ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-white/60 p-2 text-xs text-amber-800">
          <p className="font-semibold">
            {propostaAtual!.valor!.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
          {propostaAtual!.enviadaEm && (
            <p className="text-amber-600">
              Enviada em {formatarData(propostaAtual!.enviadaEm)}
            </p>
          )}
          {propostaAtual!.observacao && <p className="mt-1">{propostaAtual!.observacao}</p>}
        </div>
      ) : (
        <p className="mb-3 text-xs text-amber-700">
          Registre aqui quando mandar uma proposta pro lead, antes de fechar a venda.
        </p>
      )}

      <form action={acaoFormulario} className="space-y-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-amber-800">
            Valor da proposta (R$)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={centavos ? formatarCentavos(centavos) : ""}
            onChange={aoDigitarValor}
            placeholder="Quanto foi oferecido"
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
          <input
            type="hidden"
            name="proposta_valor"
            value={centavos ? (centavos / 100).toFixed(2) : ""}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-amber-800">
            Observação
          </label>
          <textarea
            name="proposta_observacao"
            rows={2}
            placeholder="Ex.: condições combinadas, prazo pra resposta..."
            className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

        <button
          type="submit"
          disabled={pendente}
          className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
            salvo ? "bg-green-600 hover:bg-green-600" : "bg-amber-600 hover:bg-amber-700"
          }`}
        >
          {pendente
            ? "Salvando..."
            : salvo
              ? "Salvo ✓"
              : temProposta
                ? "Atualizar proposta"
                : "Registrar proposta"}
        </button>
      </form>
    </div>
  );
}
