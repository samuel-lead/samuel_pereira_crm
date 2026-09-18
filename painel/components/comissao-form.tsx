"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { atualizarMinhaComissao } from "@/lib/usuarios/actions";
import type { EstadoFormulario } from "@/lib/usuarios/actions";

const estadoInicial: EstadoFormulario = { erro: null };

export function ComissaoForm({
  comissaoAtual,
  tipoAtual,
  valorFixoAtual,
}: {
  comissaoAtual: number | null;
  tipoAtual: "percentual" | "fixo";
  valorFixoAtual: number | null;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(atualizarMinhaComissao, estadoInicial);
  const [salvo, setSalvo] = useState(false);
  const [tipo, setTipo] = useState<"percentual" | "fixo">(tipoAtual);
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

  return (
    <form action={acaoFormulario} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700">Como você ganha por venda</label>
        <input type="hidden" name="comissao_tipo" value={tipo} />
        <div className="inline-flex w-full rounded-md border border-neutral-300 bg-neutral-50 p-0.5">
          <button
            type="button"
            onClick={() => setTipo("percentual")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
              tipo === "percentual" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500"
            }`}
          >
            % da venda
          </button>
          <button
            type="button"
            onClick={() => setTipo("fixo")}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
              tipo === "fixo" ? "bg-white text-blue-700 shadow-sm" : "text-neutral-500"
            }`}
          >
            Valor fixo por imóvel
          </button>
        </div>
      </div>

      {tipo === "percentual" ? (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="comissao_percentual">
            % de comissão
          </label>
          <div className="relative">
            <input
              id="comissao_percentual"
              name="comissao_percentual"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.01}
              defaultValue={comissaoAtual ?? ""}
              placeholder="Ex.: 1,5"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-8 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
              %
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="comissao_valor_fixo">
            Valor fixo por imóvel vendido (R$)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
              R$
            </span>
            <input
              id="comissao_valor_fixo"
              name="comissao_valor_fixo"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.01}
              defaultValue={valorFixoAtual ?? ""}
              placeholder="Ex.: 500"
              className="w-full rounded-md border border-neutral-300 py-2 pl-9 pr-3 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-neutral-400">
            Esse valor entra como sua receita em toda venda, não importa o preço do imóvel.
          </p>
        </div>
      )}

      {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar comissão"}
      </button>
    </form>
  );
}
