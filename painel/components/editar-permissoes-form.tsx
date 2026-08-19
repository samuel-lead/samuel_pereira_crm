"use client";

import { useActionState, useState } from "react";
import { atualizarPermissoes, type EstadoFormulario } from "@/lib/usuarios/actions";
import { PAGINAS_CONFIGURAVEIS } from "@/lib/paginas-permitidas";

const estadoInicial: EstadoFormulario = { erro: null };

export function EditarPermissoesForm({
  usuarioId,
  papelAtual,
  funcaoAtual,
  paginasAtuais,
}: {
  usuarioId: string;
  papelAtual: string;
  funcaoAtual: string | null;
  paginasAtuais: string[];
}) {
  const acaoComId = atualizarPermissoes.bind(null, usuarioId);
  const [estado, acaoFormulario] = useActionState(acaoComId, estadoInicial);
  const [papel, setPapel] = useState<"admin" | "membro">(
    papelAtual === "admin" ? "admin" : "membro"
  );

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="funcao">
          Função
        </label>
        <select
          id="funcao"
          name="funcao"
          defaultValue={funcaoAtual ?? ""}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">— Não definida —</option>
          <option value="sdr">SDR</option>
          <option value="closer">Closer</option>
        </select>
      </div>

      <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Tipo de acesso
        </legend>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name="papel"
            value="admin"
            checked={papel === "admin"}
            onChange={() => setPapel("admin")}
          />
          Administrador — acessa tudo, inclusive Usuários e Configurações
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name="papel"
            value="membro"
            checked={papel === "membro"}
            onChange={() => setPapel("membro")}
          />
          Membro — só acessa as páginas escolhidas abaixo
        </label>
      </fieldset>

      {papel === "membro" && (
        <fieldset className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Páginas permitidas
          </legend>

          {PAGINAS_CONFIGURAVEIS.map((pagina) => (
            <label
              key={pagina.chave}
              className="flex items-center gap-2 text-sm text-neutral-700"
            >
              <input
                type="checkbox"
                name="paginas_permitidas"
                value={pagina.chave}
                defaultChecked={paginasAtuais.includes(pagina.chave)}
              />
              {pagina.label}
            </label>
          ))}
        </fieldset>
      )}

      {estado.erro && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {estado.erro}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Salvar permissões
      </button>
    </form>
  );
}
