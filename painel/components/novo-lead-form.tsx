"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";

const estadoInicial: EstadoFormulario = { erro: null };

export function NovoLeadForm({
  usuarios,
}: {
  usuarios: { id: string; nome: string }[];
}) {
  const [estado, acaoFormulario] = useActionState(criarLead, estadoInicial);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/leads"
          className="text-sm text-neutral-500 hover:text-neutral-700"
        >
          Cancelar
        </Link>
      </div>

      <form action={acaoFormulario} className="space-y-4">
        <div className="space-y-1">
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor="nome"
          >
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="space-y-1">
          <label
            className="text-sm font-medium text-neutral-700"
            htmlFor="telefone"
          >
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            placeholder="+55 62 99999-9999"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700">
            Origem
          </label>
          <OrigemSelect />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="responsavel_id">
            Responsável
          </label>
          <ResponsavelSelect usuarios={usuarios} />
        </div>

        <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          O lead entra em &quot;Leads&quot; (ainda não abordado). Assim que
          mandar a primeira mensagem, mova ele pro Nível 1. Os 3
          critérios de qualificação você preenche depois, editando o
          lead.
        </p>

        {estado.erro && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
        >
          Salvar lead
        </button>
      </form>
    </div>
  );
}
