"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  atualizarBonusSdrConfig,
  type EstadoBonusSdrConfig,
} from "@/lib/configuracoes/actions";
import type { BonusSdrConfig } from "@/lib/metricas";
import { calls, call } from "@/lib/terminologia";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const campoDestaqueClasse =
  "w-full rounded-md border border-green-300 bg-green-50/60 px-3 py-2 text-sm font-bold text-green-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";
const labelClasse = "text-xs font-semibold text-neutral-700";
const tituloSecaoClasse = "mb-2 text-sm font-bold uppercase tracking-wide text-neutral-800";
const estadoInicial: EstadoBonusSdrConfig = { erro: null };

function Campo({
  name,
  label,
  defaultValue,
  prefixo,
  destaque,
}: {
  name: string;
  label: string;
  defaultValue: number;
  prefixo?: string;
  destaque?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className={labelClasse} htmlFor={name}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        {prefixo && (
          <span className={destaque ? "text-sm font-bold text-green-700" : "text-sm text-neutral-400"}>
            {prefixo}
          </span>
        )}
        <input
          id={name}
          name={name}
          type="number"
          min={0}
          step="any"
          required
          defaultValue={defaultValue}
          className={destaque ? campoDestaqueClasse : campoClasse}
        />
      </div>
    </div>
  );
}

export function BonusSdrConfigForm({
  config,
  publicoOrg = "mentoria",
}: {
  config: BonusSdrConfig;
  publicoOrg?: string;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(
    atualizarBonusSdrConfig,
    estadoInicial
  );
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

  return (
    <form action={acaoFormulario} className="space-y-5">
      <div>
        <p className={tituloSecaoClasse}>
          Bônus por volume de {calls(publicoOrg)} realizadas no mês
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo name="calls_tier1_qtd" label="A partir de" defaultValue={config.calls_tier1_qtd} />
            <Campo name="calls_tier1_valor" label="Bônus" defaultValue={config.calls_tier1_valor} prefixo="R$" destaque />
          </div>
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo name="calls_tier2_qtd" label="A partir de" defaultValue={config.calls_tier2_qtd} />
            <Campo name="calls_tier2_valor" label="Bônus" defaultValue={config.calls_tier2_valor} prefixo="R$" destaque />
          </div>
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo name="calls_tier3_qtd" label="A partir de" defaultValue={config.calls_tier3_qtd} />
            <Campo name="calls_tier3_valor" label="Bônus" defaultValue={config.calls_tier3_valor} prefixo="R$" destaque />
          </div>
        </div>
      </div>

      <div>
        <p className={tituloSecaoClasse}>
          Bônus por {call(publicoOrg)} realizada que foi marcada no fim de semana
        </p>
        <div className="max-w-[200px] space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
          <Campo
            name="valor_call_fim_semana"
            label="Valor por call"
            defaultValue={config.valor_call_fim_semana}
            prefixo="R$"
            destaque
          />
        </div>
      </div>

      <div>
        <p className={tituloSecaoClasse}>
          Bônus por faturamento do mês
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo
              name="faturamento_tier1_valor"
              label="A partir de"
              defaultValue={config.faturamento_tier1_valor}
              prefixo="R$"
            />
            <Campo
              name="faturamento_tier1_bonus"
              label="Bônus"
              defaultValue={config.faturamento_tier1_bonus}
              prefixo="R$"
              destaque
            />
          </div>
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo
              name="faturamento_tier2_valor"
              label="A partir de"
              defaultValue={config.faturamento_tier2_valor}
              prefixo="R$"
            />
            <Campo
              name="faturamento_tier2_bonus"
              label="Bônus"
              defaultValue={config.faturamento_tier2_bonus}
              prefixo="R$"
              destaque
            />
          </div>
          <div className="space-y-2 rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
            <Campo
              name="faturamento_tier3_valor"
              label="A partir de"
              defaultValue={config.faturamento_tier3_valor}
              prefixo="R$"
            />
            <Campo
              name="faturamento_tier3_bonus"
              label="Bônus"
              defaultValue={config.faturamento_tier3_bonus}
              prefixo="R$"
              destaque
            />
          </div>
        </div>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}
