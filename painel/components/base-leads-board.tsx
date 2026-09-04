"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconeWhatsapp, IconeInstagram } from "@/components/icons";
import { AvatarLead } from "@/components/avatar-lead";
import { MenuSelect } from "@/components/menu-select";
import { ResponsavelSelect } from "@/components/responsavel-select";
import { linkWhatsApp, abrirWhatsApp } from "@/lib/whatsapp";
import { diasDesde } from "@/lib/datas";
import { formatarTelefone, handleInstagram, linkInstagram } from "@/lib/texto";
import { useAbrirLeadModal } from "@/components/contexto-lead-modal";
import { prefetchLead } from "@/lib/leads/cache-lead";
import { reativarLead } from "@/lib/leads/actions";

// Botão de rodapé pra tirar o lead da Base sem abrir o card inteiro.
// Clicar em "Reativar" abre um miniformulário com o nível de Pré-vendas
// (só os "limpos", sem reunião pendente pra resolver primeiro) e, pra
// admin, também quem vai ser o responsável.
function BotaoReativar({
  leadId,
  niveisReativacao,
  usuarios,
  souAdmin,
}: {
  leadId: string;
  niveisReativacao: { ordem: number; nome: string }[];
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  souAdmin: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoConfirmar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const novoNivel = String(formData.get("nivel_ordem") ?? "");
    const novoResponsavelId = String(formData.get("responsavel_id") ?? "");

    if (!novoNivel) {
      setErro("Escolha pra qual nível reativar.");
      return;
    }
    setErro(null);
    iniciarTransicao(() => {
      reativarLead(leadId, Number(novoNivel), souAdmin ? novoResponsavelId : undefined).then(
        (erro) => {
          setErro(erro);
          if (!erro) setAberto(false);
        }
      );
    });
  }

  if (niveisReativacao.length === 0) return null;

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAberto(true);
        }}
        className="mt-2.5 w-full border-t border-neutral-100 pt-2 text-center text-xs font-medium text-neutral-500 transition hover:text-neutral-700"
      >
        ↩ Reativar
      </button>
    );
  }

  return (
    <form
      onClick={(e) => e.stopPropagation()}
      onSubmit={aoConfirmar}
      className="mt-2.5 space-y-2 border-t border-neutral-100 pt-2"
    >
      <MenuSelect
        name="nivel_ordem"
        titulo="Reativar pra qual nível"
        placeholder="Nível de Pré-vendas..."
        disabled={pendente}
        options={niveisReativacao.map((n) => ({ value: String(n.ordem), label: n.nome }))}
      />
      {souAdmin && (
        <ResponsavelSelect
          usuarios={usuarios}
          funcaoFiltro="sdr"
          permiteVazio
          placeholder="Quem vai ser o responsável..."
        />
      )}
      {erro && <p className="text-[11px] text-red-600">{erro}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={pendente}
          className="flex-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
        >
          Confirmar
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

export type LeadBase = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  instagram?: string | null;
  foto_url: string | null;
  origem: string | null;
  responsavel_id: string | null;
  entrou_nivel_em: string;
  proposta_valor: number | null;
  motivo_base_detalhe?: string | null;
};

export type MotivoBase =
  | "desqualificado"
  | "nao_reagendados"
  | "proposta_nao_comprou"
  | "nao_iniciou_conversa"
  | "qualificou_sumiu"
  | "iniciou_sem_interesse";

const COLUNAS: { chave: MotivoBase; nome: string; cor: { header: string; borda: string; badge: string } }[] = [
  {
    chave: "desqualificado",
    nome: "Desqualificado",
    cor: { header: "bg-rose-50", borda: "border-rose-200", badge: "bg-rose-200 text-rose-700" },
  },
  {
    chave: "nao_iniciou_conversa",
    nome: "Não consegui iniciar conversa",
    cor: { header: "bg-stone-50", borda: "border-stone-200", badge: "bg-stone-200 text-stone-700" },
  },
  {
    chave: "qualificou_sumiu",
    nome: "Iniciei conversa, qualifiquei e sumiu",
    cor: { header: "bg-slate-50", borda: "border-slate-200", badge: "bg-slate-200 text-slate-700" },
  },
  {
    chave: "iniciou_sem_interesse",
    nome: "Iniciei conversa e não teve interesse",
    cor: { header: "bg-sky-50", borda: "border-sky-200", badge: "bg-sky-200 text-sky-700" },
  },
  {
    chave: "nao_reagendados",
    nome: "Não reagendados",
    cor: { header: "bg-amber-50", borda: "border-amber-200", badge: "bg-amber-200 text-amber-700" },
  },
  {
    chave: "proposta_nao_comprou",
    nome: "Fiz proposta e não comprou",
    cor: { header: "bg-red-50", borda: "border-red-200", badge: "bg-red-200 text-red-700" },
  },
];

function diasNaBase(entrouNivelEm: string) {
  return diasDesde(entrouNivelEm);
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function BaseLeadsBoard({
  leadsPorMotivo,
  nomePorUsuario,
  fotoPorUsuario,
  niveisReativacao,
  usuarios,
  souAdmin,
}: {
  leadsPorMotivo: Record<MotivoBase, LeadBase[]>;
  nomePorUsuario: Map<string, string>;
  fotoPorUsuario?: Map<string, string | null>;
  niveisReativacao: { ordem: number; nome: string }[];
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  souAdmin: boolean;
}) {
  const abrirLead = useAbrirLeadModal();
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRoladoRef = useRef<string | null>(null);

  // Busca achou um lead só: rola a tela sozinha até a coluna dele, mesmo
  // jeito do Kanban de Pré-vendas — senão a pessoa acha que sumiu quando a
  // coluna está fora da área visível.
  useEffect(() => {
    const todosLeads = Object.values(leadsPorMotivo).flat();
    if (todosLeads.length !== 1) {
      idRoladoRef.current = null;
      return;
    }
    const [unico] = todosLeads;
    if (idRoladoRef.current === unico.id) return;
    idRoladoRef.current = unico.id;

    const motivoDoUnico = (Object.keys(leadsPorMotivo) as MotivoBase[]).find((motivo) =>
      leadsPorMotivo[motivo]?.some((l) => l.id === unico.id)
    );
    const coluna = scrollRef.current?.querySelector(`[data-motivo="${motivoDoUnico}"]`);
    coluna?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
  }, [leadsPorMotivo]);

  return (
    <div className="relative h-full min-h-0 flex-1">
      <div ref={scrollRef} className="scrollbar-kanban flex h-full gap-5 overflow-x-auto pb-2 pl-1 pr-1">
      {COLUNAS.map((coluna) => {
        const leads = leadsPorMotivo[coluna.chave] ?? [];
        return (
          <section
            key={coluna.chave}
            data-motivo={coluna.chave}
            className={`kanban-column flex h-full w-72 shrink-0 flex-col rounded-xl border bg-neutral-50 shadow-sm ${coluna.cor.borda}`}
          >
            <div className={`shrink-0 rounded-t-[10px] border-b-2 ${coluna.cor.borda} ${coluna.cor.header} px-4 py-3.5`}>
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold ${coluna.cor.badge}`}
                >
                  {leads.length}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-neutral-800">{coluna.nome}</h2>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto p-3">
              {leads.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-300 bg-white/50 px-3 py-6 text-center text-xs text-neutral-400">
                  Nenhum lead aqui
                </p>
              ) : (
                leads.map((lead) => (
                  <div
                    key={lead.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirLead(lead.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") abrirLead(lead.id);
                    }}
                    onMouseEnter={() => prefetchLead(lead.id)}
                    className="kanban-card group block cursor-pointer rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition duration-150 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-2.5">
                      <AvatarLead
                        nome={lead.nome}
                        fotoUrl={lead.foto_url}
                        tamanho="h-9 w-9 text-xs"
                        classeBadge={coluna.cor.badge}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900 group-hover:underline">
                          {lead.nome}
                        </p>
                        {lead.telefone_e164 && (
                          <p className="truncate text-[13px] text-neutral-500">
                            {formatarTelefone(lead.telefone_e164)}
                          </p>
                        )}
                        {lead.responsavel_id && nomePorUsuario.get(lead.responsavel_id) && (
                          <p className="flex items-center gap-1 truncate text-xs text-neutral-500">
                            Responsável:{" "}
                            <AvatarLead
                              nome={nomePorUsuario.get(lead.responsavel_id)!}
                              fotoUrl={fotoPorUsuario?.get(lead.responsavel_id)}
                              tamanho="h-4 w-4 text-[8px]"
                            />
                            <span className="truncate font-medium text-neutral-600">
                              {nomePorUsuario.get(lead.responsavel_id)}
                            </span>
                          </p>
                        )}
                        <p className="mt-0.5 text-[11px] font-medium text-neutral-400">
                          Na base há {diasNaBase(lead.entrou_nivel_em)} dia
                          {diasNaBase(lead.entrou_nivel_em) === 1 ? "" : "s"}
                        </p>
                        {lead.motivo_base_detalhe && (
                          <p className="mt-1 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">
                            {lead.motivo_base_detalhe}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {lead.origem && (
                            <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                              {lead.origem}
                            </span>
                          )}
                          {lead.proposta_valor != null && (
                            <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                              Proposta: {formatarMoeda(lead.proposta_valor)}
                            </span>
                          )}
                          {lead.telefone_e164 && (
                            <a
                              href={linkWhatsApp(lead.telefone_e164)}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                abrirWhatsApp(lead.telefone_e164!);
                              }}
                              title="Chamar no WhatsApp"
                              className="flex shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-3 py-1.5 text-white shadow-[0_3px_8px_rgba(37,211,102,0.4)] transition hover:bg-[#20bd5a]"
                            >
                              <IconeWhatsapp className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">WhatsApp</span>
                            </a>
                          )}
                          {lead.instagram && (
                            <a
                              href={linkInstagram(lead.instagram)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title={`@${handleInstagram(lead.instagram)} no Instagram`}
                              style={{
                                background:
                                  "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
                              }}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-[0_3px_8px_rgba(204,35,102,0.35)] transition hover:opacity-90"
                            >
                              <IconeInstagram className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <BotaoReativar
                          leadId={lead.id}
                          niveisReativacao={niveisReativacao}
                          usuarios={usuarios}
                          souAdmin={souAdmin}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
      </div>
    </div>
  );
}
