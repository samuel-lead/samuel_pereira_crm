"use client";

import { useActionState, useState } from "react";
import { criarIsca, type EstadoFormulario } from "@/lib/iscas/actions";
import { slugificar } from "@/lib/texto";

const estadoInicial: EstadoFormulario = { erro: null };
const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";

export function NovoIscaForm({ dominio }: { dominio: string }) {
  const [estado, acaoFormulario] = useActionState(criarIsca, estadoInicial);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);

  function aoMudarNome(valor: string) {
    setNome(valor);
    if (!slugTocado) setSlug(slugificar(valor));
  }

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="nome">
          Nome da isca *
        </label>
        <input
          id="nome"
          name="nome"
          required
          value={nome}
          onChange={(e) => aoMudarNome(e.target.value)}
          placeholder="Ex.: Aula grátis — Como vender mais imóveis"
          className={campoClasse}
        />
      </div>

      <div className="space-y-1">
        <label className={labelClasse} htmlFor="slug">
          Link público *
        </label>
        <div className="flex items-center overflow-hidden rounded-md border border-neutral-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <span className="shrink-0 truncate bg-neutral-50 px-3 py-2 text-sm text-neutral-500">
            {dominio}/
          </span>
          <input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTocado(true);
              setSlug(slugificar(e.target.value));
            }}
            className="w-full min-w-0 border-0 px-2 py-2 text-sm text-neutral-900 outline-none focus:ring-0"
          />
        </div>
        <p className="text-xs text-neutral-400">
          Esse é o link que você vai divulgar. Depois de criado, não dá pra trocar.
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
          placeholder="Link do PDF, da aula, do que for"
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">
          Pode ser um PDF, um vídeo, uma aula gravada — qualquer link.
        </p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Criar isca
      </button>
    </form>
  );
}
