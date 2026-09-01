"use client";

import { useActionState } from "react";
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
        <label className={labelClasse} htmlFor="material_url">
          Link do material *
        </label>
        <input
          id="material_url"
          name="material_url"
          type="url"
          required
          defaultValue={isca.material_url}
          className={campoClasse}
        />
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
