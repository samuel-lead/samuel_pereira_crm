"use client";

import { useActionState, useState } from "react";
import { atualizarIsca, type EstadoFormulario } from "@/lib/iscas/actions";

const estadoInicial: EstadoFormulario = { erro: null };
const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export function EditarIscaForm({
  isca,
  dominio,
}: {
  isca: { id: string; nome: string; slug: string; material_url: string; ativo: boolean };
  dominio: string;
}) {
  const atualizarComId = atualizarIsca.bind(null, isca.id);
  const [estado, acaoFormulario] = useActionState(atualizarComId, estadoInicial);
  const [aba, setAba] = useState<"link" | "arquivo">("link");

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="nome">
          Nome da isca *
        </label>
        <input id="nome" name="nome" required defaultValue={isca.nome} className={campoClasse} />
      </div>

      <div className="space-y-1">
        <label className={labelClasse}>Link público</label>
        <p className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {dominio}/{isca.slug}
        </p>
        <p className="text-xs text-neutral-400">
          O link não muda depois de criado — se precisar de outro, crie uma isca nova.
        </p>
      </div>

      <div className="space-y-1">
        <label className={labelClasse}>Material atual</label>
        <p className="truncate rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
          {isca.material_url}
        </p>

        <div className="mt-2 flex overflow-hidden rounded-md border border-neutral-200">
          <button
            type="button"
            onClick={() => setAba("link")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium transition ${
              aba === "link" ? "bg-blue-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Trocar por link
          </button>
          <button
            type="button"
            onClick={() => setAba("arquivo")}
            className={`flex-1 px-3 py-1.5 text-sm font-medium transition ${
              aba === "arquivo" ? "bg-blue-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            Trocar por arquivo
          </button>
        </div>

        {aba === "link" ? (
          <input
            id="material_url"
            name="material_url"
            type="url"
            placeholder="Cola o novo link aqui pra trocar"
            className={`${campoClasse} mt-2`}
          />
        ) : (
          <input
            id="material_arquivo"
            name="material_arquivo"
            type="file"
            accept=".pdf,application/pdf"
            className={`${campoClasse} mt-2 file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700`}
          />
        )}
        <p className="text-xs text-neutral-400">Deixa em branco pra manter o material atual.</p>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input type="checkbox" name="ativo" defaultChecked={isca.ativo} className="h-4 w-4" />
        Isca ativa (link funcionando)
      </label>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Salvar alterações
      </button>
    </form>
  );
}
