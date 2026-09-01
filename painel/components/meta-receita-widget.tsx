"use client";

import { useActionState, useEffect, useState } from "react";
import { definirMetaReceita, type EstadoMeta } from "@/lib/metas/actions";
import { IconeLapis } from "@/components/icons";

const estadoInicial: EstadoMeta = { erro: null };

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function nomeDoMesAtual() {
  const nome = new Date().toLocaleDateString("pt-BR", { month: "long" });
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function MetaReceitaWidget({
  metaReceita,
  receitaAtual,
  compacta = false,
  podeEditar = false,
}: {
  metaReceita: number | null;
  receitaAtual: number;
  compacta?: boolean;
  podeEditar?: boolean;
}) {
  const [estado, acaoFormulario] = useActionState(definirMetaReceita, estadoInicial);
  const [editando, setEditando] = useState(podeEditar && metaReceita === null);

  useEffect(() => {
    if (estado !== estadoInicial && !estado.erro) {
      setEditando(false);
    }
  }, [estado]);

  if (metaReceita === null && !podeEditar) {
    if (compacta) {
      return (
        <span className="flex shrink-0 items-center rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 shadow-sm">
          Meta do mês ainda não definida pelo admin
        </span>
      );
    }
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-neutral-800">Meta de receita do mês</h2>
        <p className="text-sm text-neutral-500">Ainda não foi definida pelo administrador.</p>
      </div>
    );
  }

  if (editando && podeEditar) {
    const ehMesNovo = metaReceita === null;

    const formulario = (
      <form action={acaoFormulario} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          name="meta_receita"
          required
          placeholder="Ex: 60000 ou 60.000,00"
          defaultValue={metaReceita ?? ""}
          className={`rounded-md border px-3 py-2 text-sm text-neutral-900 outline-none focus:ring-1 ${
            ehMesNovo
              ? "border-amber-300 bg-white focus:border-amber-500 focus:ring-amber-500"
              : "border-neutral-300 focus:border-blue-500 focus:ring-blue-500"
          } ${compacta ? "w-56" : "w-64"}`}
        />
        <button
          type="submit"
          className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition ${
            ehMesNovo ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"
          }`}
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

    if (!ehMesNovo) {
      return <div className={compacta ? "" : "space-y-2"}>{formulario}</div>;
    }

    if (compacta) {
      return (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 shadow-sm">
          <span className="text-sm">🔔</span>
          <span className="text-xs font-semibold text-amber-800">
            {nomeDoMesAtual()} começou — defina a meta:
          </span>
          {formulario}
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-amber-400 bg-amber-50 p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-lg">🔔</span>
          <h2 className="text-sm font-bold text-amber-900">
            O mês de {nomeDoMesAtual()} virou — defina a meta de receita
          </h2>
        </div>
        <p className="mb-3 text-sm text-amber-800">
          Sem a meta definida, ninguém da equipe vê o progresso do mês.
        </p>
        {formulario}
      </div>
    );
  }

  const meta = metaReceita as number;
  const falta = Math.max(0, meta - receitaAtual);
  const bateu = falta === 0;
  const pct = meta > 0 ? Math.min(100, Math.round((receitaAtual / meta) * 100)) : 0;

  if (compacta) {
    const conteudo = (
      <div className="min-w-[128px] px-3 py-2 pr-6 text-left">
        <p className="flex items-center gap-1 text-[10px] leading-tight text-neutral-500">
          <span>🎯</span> Meta de receita do mês
        </p>
        <p className="mt-0.5 text-base font-bold leading-tight text-neutral-900">{formatarMoeda(meta)}</p>
        <p className={`mt-0.5 text-[10px] font-medium leading-tight ${bateu ? "text-green-600" : "text-green-700"}`}>
          {bateu ? "Meta batida! 🎉" : `Falta ${formatarMoeda(falta)}`}
        </p>
      </div>
    );

    if (!podeEditar) {
      return (
        <div className="shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          {conteudo}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        title="Clique pra editar a meta do mês"
        className="relative shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white text-left shadow-sm transition hover:bg-neutral-50"
      >
        <IconeLapis className="absolute bottom-2 right-2 h-3.5 w-3.5 text-neutral-400" />
        {conteudo}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">Meta de receita do mês</h2>
        {podeEditar && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Editar
          </button>
        )}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Recebido
          </p>
          <p className="text-4xl font-black tracking-tight text-neutral-900 tabular-nums">
            {formatarMoeda(receitaAtual)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Meta
          </p>
          <p className="text-lg font-bold text-neutral-500 tabular-nums">
            {formatarMoeda(meta)}
          </p>
        </div>
      </div>
      <div className="relative h-3 w-full">
        <div className="h-full w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full transition-all ${
              bateu
                ? "bg-gradient-to-r from-green-500 to-green-400"
                : "bg-gradient-to-r from-blue-600 to-blue-400"
            }`}
            style={{ width: `${Math.max(pct, 3)}%` }}
          />
        </div>
        <span
          className="absolute -top-5 -translate-x-1/2 text-[11px] font-bold text-neutral-500"
          style={{ left: `${Math.min(Math.max(pct, 4), 96)}%` }}
        >
          {pct}%
        </span>
      </div>
      <p className="mt-2 text-sm">
        {bateu ? (
          <span className="font-semibold text-green-600">Meta batida! 🎉</span>
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
