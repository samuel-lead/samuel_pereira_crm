"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { corDoNivel, numerarNiveis, type NivelResumo } from "@/lib/niveis";
import { moverLeadNivel } from "@/lib/leads/actions";
import { linkWhatsApp } from "@/lib/whatsapp";
import { IconeWhatsapp, IconeAtividade, IconeTelefone, IconeTag } from "@/components/icons";

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
  valor_venda?: number | null;
  proposta_valor?: number | null;
  proximo_follow_em?: string | null;
};

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diasSemAtividade(ultimaAtividadeEm?: string) {
  if (!ultimaAtividadeEm) return 0;
  const passou = Date.now() - new Date(ultimaAtividadeEm).getTime();
  return Math.floor(passou / UM_DIA_MS);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
  usuarios = [],
  mostrarValor = false,
  numerosVisiveis: numerosVisiveisExternos,
}: {
  niveis: NivelResumo[];
  leadsPorNivel: Record<number, LeadResumo[]>;
  souAdmin?: boolean;
  usuarioAtualId?: string | null;
  // Nome de cada responsável, pra mostrar "Responsável: Fulano" no card
  // sem precisar buscar de novo — a lista já vem carregada pro filtro.
  usuarios?: { id: string; nome: string }[];
  // Valor só faz sentido em Vendas — em Pré-vendas o lead ainda nem
  // negociou nada, então o quadro de Leads nunca passa isso como true.
  mostrarValor?: boolean;
  // Quando o quadro mostra só um pedaço dos níveis (ex.: Vendas, que é a
  // continuação do Pré-vendas), a numeração "Nível X" precisa vir calculada
  // com base em TODOS os níveis, senão recomeça do 1 dentro do recorte.
  numerosVisiveis?: Map<number, number>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const numerosVisiveis = numerosVisiveisExternos ?? numerarNiveis(niveis);
  const [colunaAlvo, setColunaAlvo] = useState<number | null>(null);
  const [, iniciarTransicao] = useTransition();
  const nomePorUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));

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
    <div className="relative h-full min-h-0 flex-1">
      <div className="relative h-full">
        <button
          type="button"
          onClick={() => rolar("esquerda")}
          aria-label="Ver níveis anteriores"
          className="absolute -left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-lg transition hover:scale-105 hover:bg-neutral-50"
        >
          ‹
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-kanban flex h-full gap-5 overflow-x-auto pb-2 pl-1 pr-1"
        >
          {niveis.map((nivel) => {
            const leadsDoNivel = leadsPorNivel[nivel.ordem] ?? [];
            const cor = corDoNivel(nivel.ordem);
            const numeroVisivel = numerosVisiveis.get(nivel.ordem);
            const recebendoArrasto = colunaAlvo === nivel.ordem;

            return (
              <section
                key={nivel.ordem}
                onDragOver={(e) => aoPassarSobreColuna(e, nivel.ordem)}
                onDragLeave={() => setColunaAlvo((atual) => (atual === nivel.ordem ? null : atual))}
                onDrop={(e) => aoSoltarNaColuna(e, nivel.ordem)}
                className={`kanban-column flex h-full w-72 shrink-0 flex-col rounded-xl border bg-neutral-50 shadow-sm transition ${
                  recebendoArrasto
                    ? "border-2 border-blue-400 ring-2 ring-blue-200"
                    : "border-neutral-300"
                }`}
              >
                <div className="shrink-0 rounded-t-xl border-b border-neutral-100 bg-white px-4 py-3">
                  <div className={`mb-1.5 h-[3px] w-6 rounded-full ${cor.faixa}`} />
                  <h2
                    title={nivel.nome}
                    className="truncate text-sm font-semibold text-neutral-900"
                  >
                    {numeroVisivel ? `${numeroVisivel}. ` : ""}
                    {nivel.nome}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-neutral-400">
                    {mostrarValor &&
                      leadsDoNivel.length > 0 &&
                      `${formatarMoeda(
                        leadsDoNivel.reduce((soma, l) => soma + (l.valor_venda ?? 0), 0)
                      )} · `}
                    {leadsDoNivel.length} lead{leadsDoNivel.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
                  {leadsDoNivel.length === 0 ? (
                    <p
                      className={`rounded-lg border border-dashed px-3 py-6 text-center text-xs ${
                        recebendoArrasto
                          ? "border-blue-300 bg-blue-50 text-blue-500"
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
                      const temProximoContato = !!lead.proximo_follow_em;
                      const contatoAtrasado =
                        temProximoContato && new Date(lead.proximo_follow_em!).getTime() < Date.now();
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
                        className={`kanban-card group rounded-xl border-x border-b border-t-[3px] bg-white p-3.5 shadow-sm transition duration-150 hover:-translate-y-1 hover:shadow-lg ${
                          atrasado ? "border-t-red-400" : "border-t-neutral-200"
                        } border-neutral-200 ${
                          arrastavel ? "cursor-grab active:cursor-grabbing" : "cursor-pointer opacity-70"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-neutral-700">
                              {iniciais(lead.nome)}
                            </span>
                            <p className="truncate text-[15px] font-bold text-neutral-900 group-hover:underline">
                              {lead.nome}
                            </p>
                          </div>
                          {atrasado && (
                            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                              {diasParado}d parado
                            </span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {lead.telefone_e164 && (
                            <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500">
                              <IconeTelefone className="h-3 w-3 shrink-0" />
                              {lead.telefone_e164}
                            </p>
                          )}
                          {lead.origem && (
                            <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500">
                              <IconeTag className="h-3 w-3 shrink-0" />
                              {lead.origem}
                            </p>
                          )}
                          {lead.responsavel_id && nomePorUsuario.get(lead.responsavel_id) && (
                            <p className="truncate text-[11px] text-neutral-500">
                              Responsável:{" "}
                              <span className="font-medium text-neutral-600">
                                {nomePorUsuario.get(lead.responsavel_id)}
                              </span>
                            </p>
                          )}
                          {temProximoContato && (
                            <p
                              className={`text-[11px] font-medium ${
                                contatoAtrasado ? "text-red-600" : "text-teal-600"
                              }`}
                            >
                              {contatoAtrasado ? "Contato atrasado: " : "Próximo contato: "}
                              {formatarDataHora(lead.proximo_follow_em!)}
                            </p>
                          )}
                        </div>

                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-neutral-100 pt-2.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`flex items-center gap-1 text-[11px] font-medium ${
                                atrasado ? "text-red-600" : "text-neutral-400"
                              }`}
                            >
                              <IconeAtividade className="h-3 w-3 shrink-0" />
                              {diasParado === 0 ? "Hoje" : `${diasParado}d`}
                            </span>
                            {mostrarValor && lead.valor_venda != null && (
                              <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
                                {formatarMoeda(lead.valor_venda)}
                              </span>
                            )}
                            {lead.proposta_valor != null && (
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                Proposta: {formatarMoeda(lead.proposta_valor)}
                              </span>
                            )}
                          </div>
                          {lead.telefone_e164 && (
                            <a
                              href={linkWhatsApp(lead.telefone_e164)}
                              onClick={(e) => abrirWhatsapp(e, lead.telefone_e164!)}
                              title="Chamar no WhatsApp"
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
                            >
                              <IconeWhatsapp className="h-3 w-3" />
                            </a>
                          )}
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
          className="absolute -right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 shadow-lg transition hover:scale-105 hover:bg-neutral-50"
        >
          ›
        </button>
      </div>
    </div>
  );
}
