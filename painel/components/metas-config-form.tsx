"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  atualizarMetasConfig,
  type EstadoMetasConfig,
} from "@/lib/configuracoes/actions";
import { reunioes } from "@/lib/terminologia";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoMetasConfig = { erro: null };

type MetasConfig = {
  piso_leads_dia: number;
  piso_reunioes_dia: number;
  taxa_agendamento_min: number;
  taxa_comparecimento_min: number;
  taxa_venda_min: number;
};

export function MetasConfigForm({
  metas,
  publicoOrg = "mentoria",
}: {
  metas: MetasConfig;
  publicoOrg?: string;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(
    atualizarMetasConfig,
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
    <form action={acaoFormulario} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="piso_leads_dia">
            Piso de leads/dia
          </label>
          <input
            id="piso_leads_dia"
            name="piso_leads_dia"
            type="number"
            min={1}
            required
            defaultValue={metas.piso_leads_dia}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="piso_reunioes_dia">
            Piso de {reunioes(publicoOrg)}/dia
          </label>
          <input
            id="piso_reunioes_dia"
            name="piso_reunioes_dia"
            type="number"
            min={1}
            required
            defaultValue={metas.piso_reunioes_dia}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="taxa_agendamento_min">
            Taxa de agendamento mín. (%)
          </label>
          <input
            id="taxa_agendamento_min"
            name="taxa_agendamento_min"
            type="number"
            min={1}
            max={100}
            step="0.1"
            required
            defaultValue={Math.round(Number(metas.taxa_agendamento_min) * 1000) / 10}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="taxa_comparecimento_min">
            Taxa de comparecimento mín. (%)
          </label>
          <input
            id="taxa_comparecimento_min"
            name="taxa_comparecimento_min"
            type="number"
            min={1}
            max={100}
            step="0.1"
            required
            defaultValue={Math.round(Number(metas.taxa_comparecimento_min) * 1000) / 10}
            className={campoClasse}
          />
        </div>
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="taxa_venda_min">
            Taxa de venda mín. (%)
          </label>
          <input
            id="taxa_venda_min"
            name="taxa_venda_min"
            type="number"
            min={1}
            max={100}
            step="0.1"
            required
            defaultValue={Math.round(Number(metas.taxa_venda_min) * 1000) / 10}
            className={campoClasse}
          />
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
