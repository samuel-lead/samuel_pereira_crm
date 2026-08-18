"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { corDoNivel, numerarNiveis, type NivelResumo } from "@/lib/niveis";
import { moverLeadNivel } from "@/lib/leads/actions";
import { linkWhatsApp } from "@/lib/whatsapp";
import { IconeWhatsapp } from "@/components/icons";

const NIVEL_REUNIAO_MARCADA = 4;
const UM_DIA_MS = 24 * 60 * 60 * 1000;

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  responsavel_id: string | null;
  ultima_atividade_em?: string;
};

function diasSemAtividade(ultimaAtividadeEm?: string) {
  if (!ultimaAtividadeEm) return 0;
  const passou = Date.now() - new Date(ultimaAtividadeEm).getTime();
  return Math.floor(passou / UM_DIA_MS);
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function KanbanBoard({
  niveis,
  leadsPorNivel,
  souAdmin = true,
  usuarioAtualId = null,
}: {
  niveis: NivelResumo[];
  leadsPorNivel: Record<number, LeadResumo[]>;
  souAdmin?: boolean;
  usuarioAtualId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const numerosVisiveis = numerarNiveis(niveis);
  const [colunaAlvo, setColunaAlvo] = useState<number | null>(null);
  const [, iniciarTransicao] = useTransition();

  function podeArrastar(lead: LeadResumo) {
    return souAdmin || lead.responsavel_id === usuarioAtualId;
  }

  function abrirWhatsapp(e: React.MouseEvent, telefone: string) {
    e.preventDefault();
    e.stopPropagation();
    window.open(
      linkWhatsApp(telefone),
      "whatsapp",
      "width=420,height=680,noopener,noreferrer"
    );
  }

  function rolar(direcao: "esquerda" | "direita") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direcao === "direita" ? 320 : -320,
      behavior: "smooth",
    });
  }

  function aoComecarArrastar(e: React.DragEvent, leadId: string) {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }

  function aoPassarSobreColuna(e: React.DragEvent, ordem: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (colunaAlvo !== ordem) setColunaAlvo(ordem);
  }

  function aoSoltarNaColuna(e: React.DragEvent, ordem: number) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    setColunaAlvo(null);
    if (!leadId) return;

    // "Reunião marcada" precisa da data da reunião — manda pra tela de
    // editar em vez de mover na hora, pra usar o seletor de data de verdade.
    if (ordem === NIVEL_REUNIAO_MARCADA) {
      router.push(`/leads/${leadId}?marcarReuniao=1`);
      return;
    }

    iniciarTransicao(() => {
      moverLeadNivel(leadId, ordem).catch((erro: unknown) => {
        const mensagem = erro instanceof Error ? erro.message : "Não deu pra mover o lead";
        alert(mensagem);
      });
    });
  }

  return (
    <div className="relative">
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
            const destacado = nivel.destacado;
            const recebendoArrasto = colunaAlvo === nivel.ordem;

            return (
              <section
                key={nivel.ordem}
                onDragOver={(e) => aoPassarSobreColuna(e, nivel.ordem)}
                onDragLeave={() => setColunaAlvo((atual) => (atual === nivel.ordem ? null : atual))}
                onDrop={(e) => aoSoltarNaColuna(e, nivel.ordem)}
                className={`flex w-72 shrink-0 flex-col rounded-lg border bg-neutral-50 transition ${
                  recebendoArrasto
                    ? "border-2 border-violet-400 ring-2 ring-violet-200"
                    : destacado
                      ? `border-2 ${cor.borda} shadow-md ring-1 ring-black/10`
                      : `border ${cor.borda}`
                }`}
              >
                <div
                  className={
                    destacado
                      ? `rounded-t-lg ${cor.solido} px-3 py-3`
                      : `rounded-t-lg border-b-2 ${cor.borda} ${cor.header} px-3 py-3`
                  }
                >
                  <div className="mb-2 flex items-center justify-between">
                    {numeroVisivel ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cor.pilula}`}
                      >
                        Nível {numeroVisivel}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className={
                        destacado
                          ? "flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-bold text-white"
                          : `flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${cor.badge}`
                      }
                    >
                      {leadsDoNivel.length}
                    </span>
                  </div>
                  <h2
                    title={nivel.nome}
                    className={
                      destacado
                        ? "truncate text-base font-bold text-white"
                        : "truncate text-sm font-semibold text-neutral-800"
                    }
                  >
                    {nivel.nome}
                  </h2>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3">
                  {leadsDoNivel.length === 0 ? (
                    <p
                      className={`rounded-md border border-dashed px-3 py-6 text-center text-xs ${
                        recebendoArrasto
                          ? "border-violet-300 bg-violet-50 text-violet-500"
                          : "border-neutral-300 bg-white/50 text-neutral-400"
                      }`}
                    >
                      {recebendoArrasto ? "Solta aqui" : "Nenhum lead aqui"}
                    </p>
                  ) : (
                    leadsDoNivel.map((lead) => {
                      const arrastavel = podeArrastar(lead);
                      const diasParado = diasSemAtividade(lead.ultima_atividade_em);
                      const atrasado = diasParado >= 1;
                      return (
                      <div
                        key={lead.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") router.push(`/leads/${lead.id}`);
                        }}
                        draggable={arrastavel}
                        onDragStart={(e) => arrastavel && aoComecarArrastar(e, lead.id)}
                        title={
                          arrastavel
                            ? atrasado
                              ? `${diasParado} dia${diasParado === 1 ? "" : "s"} sem atividade`
                              : undefined
                            : "Você só visualiza — não é seu lead"
                        }
                        className={`group rounded-md border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          atrasado
                            ? "border-red-300 bg-red-50"
                            : "border-neutral-200 bg-white"
                        } ${arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer opacity-70"}`}
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
                            {atrasado && (
                              <p className="mt-0.5 text-[11px] font-medium text-red-600">
                                {diasParado} dia{diasParado === 1 ? "" : "s"} sem atividade
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-1.5">
                              {lead.origem && (
                                <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                  {lead.origem}
                                </span>
                              )}
                              {lead.telefone_e164 && (
                                <a
                                  href={linkWhatsApp(lead.telefone_e164)}
                                  onClick={(e) => abrirWhatsapp(e, lead.telefone_e164!)}
                                  title="Chamar no WhatsApp"
                                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-600"
                                >
                                  <IconeWhatsapp className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      );
                    })
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
