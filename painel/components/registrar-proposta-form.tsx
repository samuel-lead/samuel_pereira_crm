"use client";

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from "react";
import { registrarProposta, type EstadoFormulario } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";

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
  const modalAtivo = useLeadModalAtivo();
  const acaoComId = registrarProposta.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [centavos, setCentavos] = useState(0);
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);
  const temProposta = propostaAtual?.valor != null;
  const [editando, setEditando] = useState(!temProposta);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        setEditando(false);
        modalAtivo?.recarregar();
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

  function aoDigitarValor(evento: ChangeEvent<HTMLInputElement>) {
    const somenteDigitos = evento.target.value.replace(/\D/g, "");
    setCentavos(somenteDigitos ? Number(somenteDigitos) : 0);
  }

  // Já tem proposta registrada e não está editando: mostra só o resumo, em
  // vez do formulário inteiro sempre visível — some da tela a repetição de
  // "dois campos de valor" com o de Fechar venda logo abaixo.
  if (temProposta && !editando) {
    return (
      <div className="rounded-md border border-amber-200 bg-white/60 p-2.5 text-xs text-amber-800">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
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
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 text-[11px] font-medium text-amber-700 underline hover:text-amber-900"
          >
            Editar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {!temProposta && (
        <p className="text-xs text-amber-700">
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

        <div className="flex gap-2">
          {temProposta && (
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={pendente}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
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
        </div>
      </form>
    </div>
  );
}
