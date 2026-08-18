"use client";

import { useActionState, useEffect, useState } from "react";
import { definirMetaReceita, type EstadoMeta } from "@/lib/metas/actions";

const estadoInicial: EstadoMeta = { erro: null };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function MetaReceitaWidget({
  metaReceita,
  receitaAtual,
  compacta = false,
}: {
  metaReceita: number | null;
  receitaAtual: number;
  compacta?: boolean;
}) {
  const [estado, acaoFormulario] = useActionState(definirMetaReceita, estadoInicial);
  const [editando, setEditando] = useState(metaReceita === null);

  useEffect(() => {
    if (estado !== estadoInicial && !estado.erro) {
      setEditando(false);
    }
  }, [estado]);

  if (editando) {
    return (
      <form
        action={acaoFormulario}
        className={compacta ? "flex flex-wrap items-center gap-2" : "space-y-2"}
      >
        <input
          type="number"
          name="meta_receita"
          step="0.01"
          min="0"
          required
          placeholder="Meta de receita do mês (R$)"
          defaultValue={metaReceita ?? ""}
          className={`rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 ${
            compacta ? "w-56" : "w-full"
          }`}
        />
        <button
          type="submit"
          className="shrink-0 rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
        >
          Salvar meta
        </button>
        {metaReceita !== null && (
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="shrink-0 text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancelar
          </button>
        )}
        {estado.erro && <p className="w-full text-xs text-red-600">{estado.erro}</p>}
      </form>
    );
  }

  const meta = metaReceita as number;
  const falta = Math.max(0, meta - receitaAtual);
  const bateu = falta === 0;
  const pct = meta > 0 ? Math.min(100, Math.round((receitaAtual / meta) * 100)) : 0;

  if (compacta) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        title="Clique pra editar a meta do mês"
        className="flex shrink-0 items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-sm transition hover:bg-neutral-50"
      >
        <span className="font-medium text-neutral-700">
          Meta do mês: {formatarMoeda(meta)}
        </span>
        <span className="text-neutral-300">·</span>
        <span className={`font-semibold ${bateu ? "text-emerald-600" : "text-amber-600"}`}>
          {bateu ? "Meta batida! 🎉" : `Falta ${formatarMoeda(falta)}`}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Meta de receita do mês</h2>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-xs font-medium text-violet-600 hover:text-violet-700"
        >
          Editar
        </button>
      </div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-neutral-600">
          Recebido{" "}
          <span className="font-bold text-neutral-900">{formatarMoeda(receitaAtual)}</span>
        </span>
        <span className="text-neutral-600">
          Meta <span className="font-bold text-neutral-900">{formatarMoeda(meta)}</span>
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all ${bateu ? "bg-emerald-500" : "bg-violet-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm">
        {bateu ? (
          <span className="font-semibold text-emerald-600">Meta batida! 🎉</span>
        ) : (
          <>
            Falta <span className="font-bold text-amber-600">{formatarMoeda(falta)}</span>{" "}
            pra bater a meta.
          </>
        )}
      </p>
    </div>
  );
}
