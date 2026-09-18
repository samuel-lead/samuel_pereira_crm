"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { definirMetaReceita, removerMetaReceita, type EstadoMeta } from "@/lib/metas/actions";
import { IconeLapis, IconeX } from "@/components/icons";
import { Faturamento, ehImobiliario } from "@/lib/terminologia";
import { useConfirmacaoTravaTela } from "@/components/confirmacao-modal";

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
  publicoOrg = "mentoria",
}: {
  metaReceita: number | null;
  receitaAtual: number;
  compacta?: boolean;
  podeEditar?: boolean;
  publicoOrg?: string;
}) {
  const [estado, acaoFormulario] = useActionState(definirMetaReceita, estadoInicial);
  const [editando, setEditando] = useState(podeEditar && metaReceita === null);
  const rotuloMeta = `Meta de ${ehImobiliario(publicoOrg) ? Faturamento(publicoOrg) : "receita"} do mês`;
  const rotuloValorAtual = ehImobiliario(publicoOrg) ? Faturamento(publicoOrg) : "Recebido";
  const router = useRouter();
  const [removendo, iniciarRemocao] = useTransition();
  const { perguntar, modal } = useConfirmacaoTravaTela();

  useEffect(() => {
    if (estado !== estadoInicial && !estado.erro) {
      setEditando(false);
    }
  }, [estado]);

  // Samuel pediu explicitamente: poder cancelar a meta a qualquer momento
  // do mês (não só na virada), voltando pro estado "sem meta definida" —
  // igual seria se o mês tivesse acabado de virar.
  function aoRemoverMeta() {
    iniciarRemocao(async () => {
      const confirmou = await perguntar(
        "Remover a meta deste mês? Fica sem meta definida, como se o mês tivesse acabado de virar — dá pra definir outra a qualquer momento."
      );
      if (!confirmou) return;
      await removerMetaReceita();
      router.refresh();
    });
  }

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
        <h2 className="mb-1 text-sm font-semibold text-neutral-800">{rotuloMeta}</h2>
        <p className="text-sm text-neutral-500">Ainda não foi definida pelo administrador.</p>
      </div>
    );
  }

  // Admin cancelou o aviso de "mês novo, defina a meta" — sem isso não
  // tinha como sair dessa tela, o formulário ficava aberto forçando
  // preencher algo. Cancelar deixa exatamente como estava na virada do
  // mês (sem meta definida), com um jeito de abrir o formulário de novo
  // quando quiser.
  if (metaReceita === null && podeEditar && !editando) {
    if (compacta) {
      return (
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="flex shrink-0 items-center rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 shadow-sm transition hover:bg-neutral-50"
        >
          Meta do mês não definida — clique pra definir
        </button>
      );
    }
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">{rotuloMeta}</h2>
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Definir meta
          </button>
        </div>
        <p className="text-sm text-neutral-500">Ainda não foi definida.</p>
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
        <button
          type="button"
          onClick={() => setEditando(false)}
          className={`shrink-0 text-sm text-neutral-500 hover:text-neutral-700 ${
            ehMesNovo ? "text-amber-800" : ""
          }`}
        >
          Cancelar
        </button>
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
            O mês de {nomeDoMesAtual()} virou — defina a meta de{" "}
            {ehImobiliario(publicoOrg) ? Faturamento(publicoOrg) : "receita"} do mês
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
          <span>🎯</span> {rotuloMeta}
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
      <div className="relative shrink-0 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {modal}
        <button
          type="button"
          onClick={() => setEditando(true)}
          title="Clique pra editar a meta do mês"
          className="block w-full text-left transition hover:bg-neutral-50"
        >
          <IconeLapis className="absolute bottom-2 right-2 h-3.5 w-3.5 text-neutral-400" />
          {conteudo}
        </button>
        <button
          type="button"
          onClick={aoRemoverMeta}
          disabled={removendo}
          title="Remover meta do mês"
          className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-neutral-300 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          <IconeX className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      {modal}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-800">{rotuloMeta}</h2>
        {podeEditar && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={aoRemoverMeta}
              disabled={removendo}
              className="text-xs font-medium text-neutral-400 hover:text-red-600 disabled:opacity-50"
            >
              Remover
            </button>
          </div>
        )}
      </div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {rotuloValorAtual}
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
      <div className="relative mt-6 h-3 w-full">
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
