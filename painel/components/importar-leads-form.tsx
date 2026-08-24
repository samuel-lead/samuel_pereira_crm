"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importarLeads, type ResultadoImportacao } from "@/lib/leads/actions";

const estadoInicial: ResultadoImportacao = {
  erro: null,
  criados: 0,
  duplicados: 0,
  invalidos: 0,
  total: 0,
};

export function ImportarLeadsForm() {
  const [estado, acaoFormulario, pendente] = useActionState(importarLeads, estadoInicial);
  const jaImportou = estado.total > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
      <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <h2 className="text-base font-semibold text-neutral-900">Importar leads</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Cole uma lista (copiada de planilha ou digitada), um lead por linha.
          Cada um entra direto na coluna &quot;Leads&quot;, sem responsável,
          pronto pro SDR pegar e começar a abordar.
        </p>
      </div>

      <form action={acaoFormulario} className="space-y-4 p-6">
        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="lista">
            Lista (um lead por linha)
          </label>
          <textarea
            id="lista"
            name="lista"
            required
            rows={12}
            placeholder={"Nome da empresa, telefone\nOutra empresa, telefone"}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="text-xs text-neutral-400">
            Formato: nome e telefone separados por vírgula (ou cole direto de
            uma planilha — funciona igual). Telefone é opcional, mas sem ele
            o SDR não consegue ligar.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-neutral-700" htmlFor="origem">
            Origem (pra todos os leads dessa lista)
          </label>
          <input
            id="origem"
            name="origem"
            defaultValue="Prospecção fria"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {jaImportou && (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <p className="font-medium">
              {estado.criados} lead{estado.criados === 1 ? "" : "s"} importado
              {estado.criados === 1 ? "" : "s"} com sucesso.
            </p>
            {estado.duplicados > 0 && (
              <p className="mt-1 text-amber-700">
                {estado.duplicados} ignorado{estado.duplicados === 1 ? "" : "s"} por
                telefone já cadastrado.
              </p>
            )}
            {estado.invalidos > 0 && (
              <p className="mt-1 text-red-700">
                {estado.invalidos} linha{estado.invalidos === 1 ? "" : "s"} ignorada
                {estado.invalidos === 1 ? "" : "s"} (sem nome ou com erro).
              </p>
            )}
            <Link
              href="/leads"
              className="mt-2 inline-block text-sm font-medium text-blue-600 underline hover:text-blue-700"
            >
              Ver na coluna &quot;Leads&quot; em Pré-vendas →
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pendente ? "Importando..." : "Importar lista"}
        </button>
      </form>
    </div>
  );
}
