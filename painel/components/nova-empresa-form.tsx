"use client";

import { useActionState } from "react";
import { criarCliente, type EstadoFormulario } from "@/lib/plataforma/actions";

const estadoInicial: EstadoFormulario = { erro: null };
const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export function NovaEmpresaForm() {
  const [estado, acaoFormulario] = useActionState(criarCliente, estadoInicial);

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="nome_empresa">
          Nome da empresa *
        </label>
        <input
          id="nome_empresa"
          name="nome_empresa"
          required
          placeholder="Ex.: Imobiliária Horizonte"
          className={campoClasse}
        />
      </div>

      <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Público desta empresa
        </legend>
        <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
          <input type="radio" name="publico" value="mentoria" defaultChecked required />
          Serviço / Mentoria / Consultoria
        </label>
        <label className="flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700">
          <input type="radio" name="publico" value="imobiliario" required />
          Imobiliário (corretor, imobiliária)
        </label>
      </fieldset>

      <fieldset className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Primeiro usuário (admin da empresa)
        </legend>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="nome_admin">
            Nome *
          </label>
          <input
            id="nome_admin"
            name="nome_admin"
            required
            className={`${campoClasse} bg-white`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="email">
            E-mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={`${campoClasse} bg-white`}
          />
        </div>

        <div className="space-y-1">
          <label className={labelClasse} htmlFor="senha">
            Senha temporária *
          </label>
          <input
            id="senha"
            name="senha"
            type="text"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className={`${campoClasse} bg-white`}
          />
          <p className="text-xs text-neutral-400">
            Combine com o cliente por fora. Ele consegue trocar depois de entrar.
          </p>
        </div>
      </fieldset>

      <p className="text-xs text-neutral-400">
        A empresa já entra com o funil padrão (os 9 níveis de sempre) e as
        metas/taxas padrão configuradas — dá pra ajustar depois em
        Configurações.
      </p>

      {estado.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Cadastrar empresa
      </button>
    </form>
  );
}
