"use client";

import Link from "next/link";
import { useRef } from "react";
import { corDoNivel } from "@/lib/niveis";

type NivelResumo = {
  ordem: number;
  nome: string;
  numerado: boolean;
};

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
};

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function KanbanBoard({
  niveis,
  leadsPorNivel,
}: {
  niveis: NivelResumo[];
  leadsPorNivel: Record<number, LeadResumo[]>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  let contador = 0;
  const numerosVisiveis = new Map<number, number>();
  for (const nivel of niveis) {
    if (nivel.numerado) {
      contador += 1;
      numerosVisiveis.set(nivel.ordem, contador);
    }
  }

  function rolar(direcao: "esquerda" | "direita") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direcao === "direita" ? 320 : -320,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <p className="mb-3 flex items-center gap-1 text-sm text-neutral-500">
        Os {niveis.length} níveis do funil — arraste ou use as setas para ver
        todos
        <span aria-hidden>→</span>
      </p>

      <div className="relative">
        <button
          type="button"
          onClick={() => rolar("esquerda")}
          aria-label="Ver níveis anteriores"
          className="absolute -left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-md transition hover:bg-neutral-50"
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-kanban flex gap-4 overflow-x-auto pb-6 pl-1 pr-1"
        >
          {niveis.map((nivel) => {
            const leadsDoNivel = leadsPorNivel[nivel.ordem] ?? [];
            const cor = corDoNivel(nivel.ordem);
            const numeroVisivel = numerosVisiveis.get(nivel.ordem);
            const destacado = !nivel.numerado;

            return (
              <section
                key={nivel.ordem}
                className={`flex w-72 shrink-0 flex-col rounded-lg border bg-neutral-50 ${
                  destacado
                    ? `border-2 ${cor.borda} shadow-md ring-1 ring-emerald-200`
                    : `border ${cor.borda}`
                }`}
              >
                <div className={`rounded-t-lg border-b-2 ${cor.borda} ${cor.header} px-3 py-3`}>
                  <div className="mb-2 flex items-center justify-between">
                    {numeroVisivel ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cor.pilula}`}
                      >
                        Nível {numeroVisivel}
                      </span>
                    ) : (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cor.pilula}`}
                      >
                        ★ destaque
                      </span>
                    )}
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${cor.badge}`}
                    >
                      {leadsDoNivel.length}
                    </span>
                  </div>
                  <h2
                    className={
                      destacado
                        ? "text-base font-bold text-emerald-800"
                        : "text-sm font-semibold text-neutral-800"
                    }
                  >
                    {nivel.nome}
                  </h2>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {leadsDoNivel.length === 0 ? (
                    <p className="rounded-md border border-dashed border-neutral-300 bg-white/50 px-3 py-6 text-center text-xs text-neutral-400">
                      Nenhum lead aqui
                    </p>
                  ) : (
                    leadsDoNivel.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="group rounded-md border border-neutral-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${cor.badge}`}
                          >
                            {iniciais(lead.nome)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                              {lead.nome}
                            </p>
                            {lead.telefone_e164 && (
                              <p className="truncate text-xs text-neutral-500">
                                {lead.telefone_e164}
                              </p>
                            )}
                            {lead.origem && (
                              <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                {lead.origem}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[#f4f5f7] to-transparent" />

        <button
          type="button"
          onClick={() => rolar("direita")}
          aria-label="Ver próximos níveis"
          className="absolute -right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-md transition hover:bg-neutral-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}
