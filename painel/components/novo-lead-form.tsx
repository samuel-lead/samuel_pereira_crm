"use client";

import { useActionState } from "react";
import Link from "next/link";
import { criarLead, type EstadoFormulario } from "@/lib/leads/actions";
import { OrigemSelect } from "@/components/origem-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { IconePessoaMais } from "@/components/icons";

const estadoInicial: EstadoFormulario = { erro: null };

export function NovoLeadForm({
  usuarios,
  souAdmin = true,
}: {
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  souAdmin?: boolean;
}) {
  const [estado, acaoFormulario] = useActionState(criarLead, estadoInicial);

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-sky-500 px-6 py-6 text-white">
        <IconePessoaMais className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-white/10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30">
              <IconePessoaMais className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Novo lead</h2>
              <p className="text-xs text-blue-100">
                Cadastre um contato pra começar a trabalhar ele no funil.
              </p>
            </div>
          </div>
          <Link
            href="/leads"
            className="text-xs font-medium text-blue-100 transition hover:text-white"
          >
            Cancelar
          </Link>
        </div>
      </div>

      <form action={acaoFormulario} className="space-y-4 p-6">
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
            placeholder="Nome do lead"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          {souAdmin ? (
            <ResponsavelSelect usuarios={usuarios} funcaoFiltro="sdr" />
          ) : (
            <p className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
              Você
            </p>
          )}
        </div>

        <p className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          <span aria-hidden className="mt-0.5">💡</span>
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
          className="w-full rounded-md bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md hover:brightness-105"
        >
          Salvar lead
        </button>
      </form>
    </div>
  );
}
