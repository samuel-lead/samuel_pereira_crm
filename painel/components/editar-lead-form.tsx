"use client";

import { useActionState, useState } from "react";
import { atualizarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { rotuloNivel, type NivelResumo } from "@/lib/niveis";

const NIVEL_REUNIAO_MARCADA = "4";

type Lead = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  criterio_problema: string | null;
  criterio_urgencia: string;
  criterio_capacidade: string;
};

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoFormulario = { erro: null };

export function EditarLeadForm({
  lead,
  niveis,
  numerosVisiveis,
  preSelecionarReuniao = false,
}: {
  lead: Lead;
  niveis: NivelResumo[];
  numerosVisiveis: Record<number, number>;
  preSelecionarReuniao?: boolean;
}) {
  const acaoComId = atualizarLead.bind(null, lead.id);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);
  const [nivelSelecionado, setNivelSelecionado] = useState(
    preSelecionarReuniao ? NIVEL_REUNIAO_MARCADA : String(lead.nivel_ordem)
  );
  const vaiEntrarEmReuniaoMarcada =
    nivelSelecionado === NIVEL_REUNIAO_MARCADA && String(lead.nivel_ordem) !== NIVEL_REUNIAO_MARCADA;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <form action={acaoFormulario} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nome">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={lead.nome}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="telefone">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            defaultValue={lead.telefone_e164 ?? ""}
            className={campoClasse}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse}>Origem</label>
          <OrigemSelect valorInicial={lead.origem ?? ""} />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nivel_ordem">
            Nível
          </label>
          <select
            id="nivel_ordem"
            name="nivel_ordem"
            value={nivelSelecionado}
            onChange={(e) => setNivelSelecionado(e.target.value)}
            className={campoClasse}
          >
            {niveis.map((nivel) => (
              <option key={nivel.ordem} value={nivel.ordem}>
                {rotuloNivel(nivel, numerosVisiveis[nivel.ordem])}
              </option>
            ))}
          </select>

          {vaiEntrarEmReuniaoMarcada && (
            <div className="mt-2 space-y-1 rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <label className="text-sm font-medium text-emerald-800" htmlFor="reuniao_data">
                Data e hora da reunião
              </label>
              <input
                id="reuniao_data"
                name="reuniao_data"
                type="datetime-local"
                required
                className={`${campoClasse} bg-white`}
              />
              <p className="text-xs text-emerald-700">
                A data de agendamento (hoje) é registrada automaticamente.
              </p>
            </div>
          )}
        </div>

        <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Os 3 critérios de qualificação
          </legend>

          <div className="space-y-1">
            <label className={labelClasse} htmlFor="criterio_problema">
              Qual é o problema dele
            </label>
            <textarea
              id="criterio_problema"
              name="criterio_problema"
              rows={2}
              defaultValue={lead.criterio_problema ?? ""}
              className={`${campoClasse} bg-white`}
            />
          </div>

          <div className="space-y-1">
            <label className={labelClasse} htmlFor="criterio_urgencia">
              Tem urgência em resolver
            </label>
            <select
              id="criterio_urgencia"
              name="criterio_urgencia"
              defaultValue={lead.criterio_urgencia}
              className={`${campoClasse} bg-white`}
            >
              <option value="desconhecida">Ainda não sei</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className={labelClasse} htmlFor="criterio_capacidade">
              Consegue pagar a solução
            </label>
            <select
              id="criterio_capacidade"
              name="criterio_capacidade"
              defaultValue={lead.criterio_capacidade}
              className={`${campoClasse} bg-white`}
            >
              <option value="desconhecida">Ainda não sei</option>
              <option value="sim">Sim</option>
              <option value="parcial">Parcial</option>
              <option value="nao">Não</option>
            </select>
          </div>
        </fieldset>

        {estado.erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
        >
          Salvar alterações
        </button>
      </form>
    </div>
  );
}
