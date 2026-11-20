"use client";

import { useEffect, type ReactNode } from "react";

// Janela (popup) centralizada por cima da tela — Samuel (20/11/26): o aviso da
// importação ficava pequeno lá embaixo e passava despercebido. Fecha com Esc,
// com o X ou clicando fora. Fica DENTRO do <form>, então um botão type="submit"
// aqui dentro envia o formulário normalmente.
export function JanelaImportacao({
  titulo,
  tom = "azul",
  aoFechar,
  children,
  rodape,
}: {
  titulo: string;
  tom?: "azul" | "verde" | "ambar" | "vermelho";
  aoFechar: () => void;
  children: ReactNode;
  rodape: ReactNode;
}) {
  useEffect(() => {
    function aoApertar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  const corTopo = {
    azul: "border-blue-200 bg-blue-50 text-blue-900",
    verde: "border-green-200 bg-green-50 text-green-900",
    ambar: "border-amber-200 bg-amber-50 text-amber-900",
    vermelho: "border-red-200 bg-red-50 text-red-900",
  }[tom];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={aoFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between gap-3 border-b px-6 py-4 ${corTopo}`}>
          <h3 className="text-lg font-extrabold">{titulo}</h3>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-md px-2 py-1 text-lg font-bold leading-none opacity-70 transition hover:opacity-100"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-6 py-5">{children}</div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          {rodape}
        </div>
      </div>
    </div>
  );
}

// Cartão de número grande (ex.: "73 — Vão entrar").
export function NumeroGrande({
  valor,
  rotulo,
  cor,
}: {
  valor: number;
  rotulo: string;
  cor: "verde" | "ambar" | "vermelho" | "cinza";
}) {
  const classes = {
    verde: "border-green-200 bg-green-50 text-green-800",
    ambar: "border-amber-200 bg-amber-50 text-amber-800",
    vermelho: "border-red-200 bg-red-50 text-red-800",
    cinza: "border-neutral-200 bg-neutral-50 text-neutral-700",
  }[cor];
  return (
    <div className={`rounded-xl border px-3 py-3 text-center ${classes}`}>
      <p className="text-2xl font-extrabold tabular-nums">{valor}</p>
      <p className="mt-0.5 text-xs font-semibold">{rotulo}</p>
    </div>
  );
}

// Bloco com título, explicação do motivo e a lista de nomes.
export function BlocoLista({
  titulo,
  motivo,
  itens,
  cor,
}: {
  titulo: string;
  motivo?: string;
  itens: { nome: string; detalhe?: string }[];
  cor: "ambar" | "vermelho" | "cinza";
}) {
  if (itens.length === 0) return null;
  const classes = {
    ambar: "border-amber-200 bg-amber-50 text-amber-900",
    vermelho: "border-red-200 bg-red-50 text-red-900",
    cinza: "border-neutral-200 bg-neutral-50 text-neutral-800",
  }[cor];
  return (
    <div className={`rounded-xl border p-3 ${classes}`}>
      <p className="text-sm font-bold">
        {titulo} ({itens.length})
      </p>
      {motivo && <p className="mt-0.5 text-xs">{motivo}</p>}
      <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs">
        {itens.map((item, i) => (
          <li key={`${item.nome}-${i}`}>
            <span className="font-semibold">{item.nome}</span>
            {item.detalhe ? <span className="opacity-80"> — {item.detalhe}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
