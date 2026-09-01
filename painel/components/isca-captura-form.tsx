"use client";

import { useActionState } from "react";
import { registrarLeadIsca, type EstadoCaptura } from "@/lib/iscas/actions";

const estadoInicial: EstadoCaptura = { erro: null, sucesso: false, materialUrl: null };

export function IscaCapturaForm({ slug }: { slug: string }) {
  const acaoComSlug = registrarLeadIsca.bind(null, slug);
  const [estado, acaoFormulario] = useActionState(acaoComSlug, estadoInicial);

  if (estado.sucesso && estado.materialUrl) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-2xl">🎉</p>
        <p className="text-lg font-semibold text-neutral-900">Prontinho!</p>
        <p className="text-sm text-neutral-500">Seu material já está liberado.</p>
        <a
          href={estado.materialUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Clique aqui para acessar seu material
        </a>
      </div>
    );
  }

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="nome">
          Seu nome
        </label>
        <input
          id="nome"
          name="nome"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="telefone">
          Seu WhatsApp
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          required
          placeholder="(11) 99999-9999"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
      >
        Quero acessar
      </button>
    </form>
  );
}
