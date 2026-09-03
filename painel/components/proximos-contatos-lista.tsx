"use client";

import { linkWhatsApp, abrirWhatsApp } from "@/lib/whatsapp";
import { IconeWhatsapp, IconeTelefone, IconeTag } from "@/components/icons";
import { LinkLead } from "@/components/link-lead";
import { AvatarLead } from "@/components/avatar-lead";

type LeadContato = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  foto_url?: string | null;
  origem: string | null;
  responsavel_id: string | null;
  proximo_follow_em: string | null;
};

type LeadComContato = LeadContato & { proximo_follow_em: string };

function formatarDataHora(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Linha({
  lead,
  nomeResponsavel,
  atrasado,
}: {
  lead: LeadComContato;
  nomeResponsavel: string | undefined;
  atrasado: boolean;
}) {
  function aoClicarWhatsapp(e: React.MouseEvent, telefone: string) {
    e.preventDefault();
    e.stopPropagation();
    abrirWhatsApp(telefone);
  }

  return (
    <LinkLead
      leadId={lead.id}
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AvatarLead
          nome={lead.nome}
          fotoUrl={lead.foto_url}
          tamanho="h-9 w-9 text-xs"
          classeBadge="bg-neutral-200 text-neutral-700"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-neutral-900">{lead.nome}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            {lead.telefone_e164 && (
              <p className="flex items-center gap-1 truncate text-xs text-neutral-500">
                <IconeTelefone className="h-3 w-3 shrink-0" />
                {lead.telefone_e164}
              </p>
            )}
            {lead.origem && (
              <p className="flex items-center gap-1 truncate text-xs text-neutral-500">
                <IconeTag className="h-3 w-3 shrink-0" />
                {lead.origem}
              </p>
            )}
            {nomeResponsavel && (
              <p className="truncate text-[11px] text-neutral-500">
                Responsável: <span className="font-medium text-neutral-600">{nomeResponsavel}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`text-xs font-semibold ${atrasado ? "text-red-600" : "text-teal-600"}`}
        >
          {atrasado ? "Atrasado: " : ""}
          {formatarDataHora(lead.proximo_follow_em)}
        </span>
        {lead.telefone_e164 && (
          <a
            href={linkWhatsApp(lead.telefone_e164)}
            onClick={(e) => aoClicarWhatsapp(e, lead.telefone_e164!)}
            title="Chamar no WhatsApp"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
          >
            <IconeWhatsapp className="h-4 w-4" />
          </a>
        )}
      </div>
    </LinkLead>
  );
}

export function ProximosContatosLista({
  leads,
  usuarios,
}: {
  leads: LeadContato[];
  usuarios: { id: string; nome: string }[];
}) {
  const nomePorUsuario = new Map(usuarios.map((u) => [u.id, u.nome]));
  const agora = Date.now();

  const comData = leads.filter((l): l is LeadComContato => !!l.proximo_follow_em);
  const ordenados = comData.sort(
    (a, b) => new Date(a.proximo_follow_em).getTime() - new Date(b.proximo_follow_em).getTime()
  );

  // "Hoje" inclui atrasado — contato que já devia ter sido feito é
  // prioridade máxima, não vira "futuro" só porque a data passou.
  const fimHoje = new Date();
  fimHoje.setHours(23, 59, 59, 999);
  const contatosHoje = ordenados.filter(
    (l) => new Date(l.proximo_follow_em).getTime() <= fimHoje.getTime()
  );
  const contatosFuturos = ordenados.filter(
    (l) => new Date(l.proximo_follow_em).getTime() > fimHoje.getTime()
  );

  return (
    <div className="space-y-6 overflow-y-auto pb-4">
      <section>
        <h3 className="mb-2 text-sm font-bold text-neutral-900">
          Contatos a fazer hoje ({contatosHoje.length})
        </h3>
        {contatosHoje.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum contato pendente pra hoje.</p>
        ) : (
          <div className="space-y-2">
            {contatosHoje.map((lead) => (
              <Linha
                key={lead.id}
                lead={lead}
                nomeResponsavel={lead.responsavel_id ? nomePorUsuario.get(lead.responsavel_id) : undefined}
                atrasado={new Date(lead.proximo_follow_em).getTime() < agora}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold text-neutral-900">
          Contatos futuros ({contatosFuturos.length})
        </h3>
        {contatosFuturos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum contato futuro marcado.</p>
        ) : (
          <div className="space-y-2">
            {contatosFuturos.map((lead) => (
              <Linha
                key={lead.id}
                lead={lead}
                nomeResponsavel={lead.responsavel_id ? nomePorUsuario.get(lead.responsavel_id) : undefined}
                atrasado={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
