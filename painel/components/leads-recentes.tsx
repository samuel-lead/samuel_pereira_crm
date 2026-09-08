import Link from "next/link";
import { LinkLead } from "@/components/link-lead";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeTag } from "@/components/icons";

function formatarEntrada(iso: string) {
  const data = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(hoje.getTime() - 24 * 60 * 60 * 1000);
  const mesmodia = (a: Date, b: Date) =>
    a.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) ===
    b.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const hora = data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (mesmodia(data, hoje)) return `Hoje, ${hora}`;
  if (mesmodia(data, ontem)) return `Ontem, ${hora}`;

  const diaSemana = data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  });
  const diaSemanaCapitalizado = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  const dataCurta = data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
  return `${diaSemanaCapitalizado}, ${dataCurta}, ${hora}`;
}

export type NivelQualificacao = "super_qualificado" | "qualificado" | "desqualificado";

export type LeadRecente = {
  id: string;
  nome: string;
  foto_url: string | null;
  origem: string | null;
  declarado_em: string;
  etapa: string;
  nomeResponsavel: string | null;
  nivelQualificacao: NivelQualificacao | null;
};

const SELO_QUALIFICACAO: Record<NivelQualificacao, { texto: string; classe: string }> = {
  super_qualificado: { texto: "Super qualificado", classe: "bg-violet-100 text-violet-700" },
  qualificado: { texto: "Qualificado", classe: "bg-green-100 text-green-700" },
  desqualificado: { texto: "Desqualificado", classe: "bg-neutral-100 text-neutral-500" },
};

export function LeadsRecentes({
  leads,
  leadsUltimaHora,
}: {
  leads: LeadRecente[];
  leadsUltimaHora: number;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-neutral-800">Leads recentes</h2>
        <Link
          href="/leads"
          className="shrink-0 text-xs font-semibold text-green-600 hover:text-green-700 hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        {leadsUltimaHora === 1
          ? "1 lead chegou na última hora."
          : `${leadsUltimaHora} leads chegaram na última hora.`}
      </p>

      {leads.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
          Nenhum lead chegou ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => {
            const selo = lead.nivelQualificacao ? SELO_QUALIFICACAO[lead.nivelQualificacao] : null;
            return (
              <LinkLead
                key={lead.id}
                leadId={lead.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-neutral-100 px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-neutral-200 hover:bg-neutral-50 hover:shadow-sm"
              >
                <div className="flex shrink-0 items-center gap-2.5">
                  <AvatarLead
                    nome={lead.nome}
                    fotoUrl={lead.foto_url}
                    tamanho="h-8 w-8 text-xs"
                    classeBadge="bg-neutral-200 text-neutral-700"
                  />
                  <p className="whitespace-nowrap text-sm font-semibold text-neutral-900">{lead.nome}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-neutral-500">
                  <IconeTag className="h-3 w-3 shrink-0" />
                  {lead.origem ?? "Origem não informada"}
                </span>
                <span className="shrink-0 text-[11px] text-neutral-500">
                  {lead.nomeResponsavel ? (
                    <>
                      SDR: <span className="font-medium text-neutral-700">{lead.nomeResponsavel}</span>
                    </>
                  ) : (
                    "sem SDR"
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                  {lead.etapa}
                </span>
                {selo && (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${selo.classe}`}>
                    {selo.texto}
                  </span>
                )}
                <span className="ml-auto shrink-0 text-[11px] text-neutral-500">
                  Lead chegou, {formatarEntrada(lead.declarado_em)}
                </span>
              </LinkLead>
            );
          })}
        </div>
      )}
    </section>
  );
}
