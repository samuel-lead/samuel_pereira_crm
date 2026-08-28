"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { corDoNivel, numerarNiveis, ORDEM_OPORTUNIDADE_FUTURA, type NivelResumo } from "@/lib/niveis";
import { moverLeadNivel } from "@/lib/leads/actions";
import { linkWhatsApp, abrirWhatsApp } from "@/lib/whatsapp";
import { diasUteisDesde } from "@/lib/datas";
import { IconeWhatsapp, IconeAtividade, IconeTelefone, IconeTag, IconeCalendario } from "@/components/icons";
import { Reuniao, reuniao } from "@/lib/terminologia";
import { useConfirmacaoTravaTela } from "@/components/confirmacao-modal";
import { useAbrirLeadModal } from "@/components/contexto-lead-modal";
import { prefetchLead } from "@/lib/leads/cache-lead";

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_FOLLOW_POS_REUNIAO = 7;
const NIVEL_REUNIAO_FEITA = 8;

type LeadResumo = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  origem: string | null;
  nivel_ordem: number;
  responsavel_id: string | null;
  declarado_em?: string;
  ultima_atividade_em?: string;
  valor_venda?: number | null;
  receita_venda?: number | null;
  produto?: string | null;
  proposta_valor?: number | null;
  proximo_follow_em?: string | null;
  reuniao_agendada_para?: string | null;
  // Existe uma reunião anterior ainda "marcada" com a data já passada —
  // ao arrastar esse lead pra "Reunião marcada" de novo, precisa perguntar
  // se a pessoa sumiu ou avisou antes de remarcar (ver sincronizarReuniao).
  temReuniaoAnteriorPendente?: boolean;
};

// Nomes de nível tipo "No Show (Marcou reunião e sumiu)" não cabem
// inteiros na coluna do Kanban — separa o "(...)" pra mostrar bem menor
// embaixo do nome principal, em vez de cortar tudo com "...".
function separarExplicacao(nome: string): { titulo: string; explicacao: string | null } {
  const indice = nome.indexOf(" (");
  if (indice === -1 || !nome.endsWith(")")) {
    return { titulo: nome, explicacao: null };
  }
  return { titulo: nome.slice(0, indice), explicacao: nome.slice(indice + 1) };
}

function formatarDataHora(iso: string) {
  // Sem timeZone explícito, o servidor formata no fuso dele (UTC na
  // Vercel), não no do Brasil — todo mundo aqui é do Brasil, fixa o fuso.
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function diasSemAtividade(ultimaAtividadeEm?: string) {
  if (!ultimaAtividadeEm) return 0;
  return diasUteisDesde(ultimaAtividadeEm);
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
  mostrarParado = true,
  numerosVisiveis: numerosVisiveisExternos,
  publicoOrg = "mentoria",
}: {
  niveis: NivelResumo[];
  leadsPorNivel: Record<number, LeadResumo[]>;
  souAdmin?: boolean;
  usuarioAtualId?: string | null;
  publicoOrg?: string;
  // Nome de cada responsável, pra mostrar "Responsável: Fulano" no card
  // sem precisar buscar de novo — a lista já vem carregada pro filtro.
  usuarios?: { id: string; nome: string }[];
  // Valor só faz sentido em Vendas — em Pré-vendas o lead ainda nem
  // negociou nada, então o quadro de Leads nunca passa isso como true.
  mostrarValor?: boolean;
  // "Parado" é alarme de lead esfriando no funil — não faz sentido em
  // Clientes, onde é normal ficar dias/meses sem mexer depois de vendido.
  mostrarParado?: boolean;
  // Quando o quadro mostra só um pedaço dos níveis (ex.: Vendas, que é a
  // continuação do Pré-vendas), a numeração "Nível X" precisa vir calculada
  // com base em TODOS os níveis, senão recomeça do 1 dentro do recorte.
  numerosVisiveis?: Map<number, number>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const abrirLead = useAbrirLeadModal();
  const numerosVisiveis = numerosVisiveisExternos ?? numerarNiveis(niveis);
  const [colunaAlvo, setColunaAlvo] = useState<number | null>(null);
  const [, iniciarTransicao] = useTransition();
  const nomePorUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));
  const { perguntar, modal: modalConfirmacao } = useConfirmacaoTravaTela();
  const idRoladoRef = useRef<string | null>(null);

  // Busca achou um lead só: rola a tela sozinha até a coluna dele, senão a
  // pessoa acha que sumiu (a coluna pode estar fora da área visível e
  // precisa arrastar pro lado pra ver). Com mais de um resultado, não
  // mexe — não tem como saber qual mostrar primeiro.
  useEffect(() => {
    const todosLeads = Object.values(leadsPorNivel).flat();
    if (todosLeads.length !== 1) {
      idRoladoRef.current = null;
      return;
    }
    const [unico] = todosLeads;
    if (idRoladoRef.current === unico.id) return;
    idRoladoRef.current = unico.id;

    const coluna = scrollRef.current?.querySelector(
      `[data-nivel-ordem="${unico.nivel_ordem}"]`
    );
    // "instant" em vez de "smooth" — a animação suave era interrompida no
    // meio do caminho (provavelmente por outro re-render logo em seguida),
    // deixando a coluna só parcialmente visível.
    coluna?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
  }, [leadsPorNivel]);

  function podeArrastar(lead: LeadResumo) {
    return souAdmin || lead.responsavel_id === usuarioAtualId;
  }

  function aoClicarWhatsapp(e: React.MouseEvent, telefone: string) {
    e.preventDefault();
    e.stopPropagation();
    abrirWhatsApp(telefone);
  }

  function rolar(direcao: "esquerda" | "direita") {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direcao === "direita" ? 320 : -320,
      behavior: "smooth",
    });
  }

  function aoComecarArrastar(e: React.DragEvent, lead: LeadResumo) {
    e.dataTransfer.setData("text/plain", lead.id);
    e.dataTransfer.setData("application/x-nivel-origem", String(lead.nivel_ordem));
    e.dataTransfer.setData(
      "application/x-reuniao-pendente",
      lead.temReuniaoAnteriorPendente ? "1" : "0"
    );
    e.dataTransfer.effectAllowed = "move";
  }

  function aoPassarSobreColuna(e: React.DragEvent, ordem: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (colunaAlvo !== ordem) setColunaAlvo(ordem);
  }

  async function aoSoltarNaColuna(e: React.DragEvent, ordem: number) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("text/plain");
    const nivelOrigem = Number(e.dataTransfer.getData("application/x-nivel-origem"));
    const temReuniaoPendente = e.dataTransfer.getData("application/x-reuniao-pendente") === "1";
    setColunaAlvo(null);
    if (!leadId) return;

    // "Reunião marcada" precisa da data da reunião — manda pra tela de
    // editar em vez de mover na hora, pra usar o seletor de data de verdade.
    // Se esse lead tem uma reunião anterior esquecida (ainda "marcada",
    // data já passada), pergunta na hora — um aviso que trava a tela, igual
    // "Excluir lead" — em vez de deixar a pergunta escondida dentro do
    // formulário. A resposta vai junto na URL, pra tela nem perguntar de novo.
    if (ordem === NIVEL_REUNIAO_MARCADA) {
      if (temReuniaoPendente) {
        const sumiu = await perguntar(
          `Esse lead tem uma ${reuniao(publicoOrg)} anterior marcada que já passou da data. O que aconteceu?`,
          "Sumiu, não avisou nada",
          "Avisou antes"
        );
        abrirLead({ leadId, marcarReuniao: true, reuniaoAnteriorSumiu: sumiu ? "sim" : "nao" });
        return;
      }
      abrirLead({ leadId, marcarReuniao: true });
      return;
    }

    // Saindo de "Reunião marcada" pra "Follow após reunião" ou
    // "Oportunidades": só faz sentido se a reunião realmente aconteceu.
    // Pergunta na hora com um aviso que trava a tela (igual "Excluir
    // lead") — "Não" cancela o movimento inteiro (o lead continua em
    // "Reunião marcada", nada é salvo); só "Sim" deixa o card avançar.
    if (
      nivelOrigem === NIVEL_REUNIAO_MARCADA &&
      (ordem === NIVEL_FOLLOW_POS_REUNIAO ||
        ordem === NIVEL_REUNIAO_FEITA ||
        ordem === ORDEM_OPORTUNIDADE_FUTURA)
    ) {
      const aconteceu = await perguntar(`Essa ${reuniao(publicoOrg)} realmente aconteceu?`);
      if (!aconteceu) return;
      iniciarTransicao(() => {
        moverLeadNivel(leadId, ordem, undefined, true).catch((erro: unknown) => {
          const mensagem = erro instanceof Error ? erro.message : "Não deu pra mover o lead";
          alert(mensagem);
        });
      });
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
                data-nivel-ordem={nivel.ordem}
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
                  {(() => {
                    const { titulo, explicacao } = separarExplicacao(nivel.nome);
                    return (
                      <h2
                        title={nivel.nome}
                        className="truncate text-sm font-semibold text-neutral-900"
                      >
                        {numeroVisivel ? `N${numeroVisivel} - ` : ""}
                        {titulo}
                        {explicacao && (
                          <>
                            {" "}
                            <span className="text-[10px] font-normal text-neutral-400">
                              {explicacao}
                            </span>
                          </>
                        )}
                      </h2>
                    );
                  })()}
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
                      const temProximoContato = !!lead.proximo_follow_em;
                      const contatoAtrasado =
                        temProximoContato && new Date(lead.proximo_follow_em!).getTime() < Date.now();
                      // Lead com próximo contato marcado (e ainda não vencido)
                      // não é "parado" — já tem plano. Só volta a contar
                      // depois que a data passar sem ninguém ter mexido nele.
                      const proximoContatoPendente = temProximoContato && !contatoAtrasado;
                      const atrasado = mostrarParado && diasParado >= 1 && !proximoContatoPendente;
                      return (
                      <div
                        key={lead.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => abrirLead(lead.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") abrirLead(lead.id);
                        }}
                        onMouseEnter={() => prefetchLead(lead.id)}
                        draggable={arrastavel}
                        onDragStart={(e) => arrastavel && aoComecarArrastar(e, lead)}
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
                          {lead.declarado_em && (
                            <p className="flex items-center gap-1.5 truncate text-xs text-neutral-500">
                              <IconeCalendario className="h-3 w-3 shrink-0" />
                              Entrou: {formatarDataHora(lead.declarado_em)}
                            </p>
                          )}
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
                          {lead.reuniao_agendada_para && (
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
                              <IconeCalendario className="h-3 w-3 shrink-0" />
                              {Reuniao(publicoOrg)}: {formatarDataHora(lead.reuniao_agendada_para)}
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
                                Venda: {formatarMoeda(lead.valor_venda)}
                              </span>
                            )}
                            {mostrarValor && lead.receita_venda != null && (
                              <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                                Receita: {formatarMoeda(lead.receita_venda)}
                              </span>
                            )}
                            {mostrarValor && lead.produto && (
                              <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                                {lead.produto}
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
                              onClick={(e) => aoClicarWhatsapp(e, lead.telefone_e164!)}
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
      {modalConfirmacao}
    </div>
  );
}
