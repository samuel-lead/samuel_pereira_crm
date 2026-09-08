import { LinkLead } from "@/components/link-lead";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeCalendario } from "@/components/icons";
import { Reunioes, reuniao, Sdr, sdr } from "@/lib/terminologia";

function formatarData(iso: string) {
  const data = new Date(iso);
  const dataCurta = data.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
  });
  const hora = data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dataCurta}, ${hora}`;
}

export type StatusReuniaoAtrasada = "marcada" | "nao_compareceu" | "cancelada";

export type ReuniaoAtrasada = {
  id: string;
  agendadaPara: string;
  status: StatusReuniaoAtrasada;
  lead: { id: string; nome: string; foto_url: string | null };
  nomeSdr: string | null;
  nomeCloser: string | null;
};

const ROTULO_STATUS: Record<StatusReuniaoAtrasada, { texto: string; classe: string }> = {
  marcada: { texto: "Atrasada", classe: "bg-[#fee2e2] text-[#b91c1c]" },
  nao_compareceu: { texto: "No-show", classe: "bg-[#e5e5e5] text-[#404040]" },
  cancelada: { texto: "Precisa reagendar", classe: "bg-[#fef3c7] text-[#b45309]" },
};

export function ReunioesAtrasadas({
  reunioes,
  publicoOrg,
}: {
  reunioes: ReuniaoAtrasada[];
  publicoOrg: string;
}) {
  return (
    <section className="rounded-xl border border-red-800 bg-red-900 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-white">
        {reunioes.length === 1
          ? `1 ${reuniao(publicoOrg)} que não aconteceu`
          : `${reunioes.length} ${Reunioes(publicoOrg).toLowerCase()} que não aconteceram`}
      </h2>
      <p className="mb-4 text-xs text-red-200">
        Atrasadas, no-show e que precisam reagendar, mais antigas primeiro.
      </p>

      {reunioes.length === 0 ? (
        <p className="rounded-md border border-dashed border-red-700 px-3 py-6 text-center text-xs text-red-200">
          Nenhuma {reuniao(publicoOrg)} atrasada agora.
        </p>
      ) : (
        <div className="max-h-[336px] space-y-2 overflow-y-auto pr-1">
          {reunioes.map((item) => {
            const rotulo = ROTULO_STATUS[item.status];
            return (
              <LinkLead
                key={item.id}
                leadId={item.lead.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e5e5] bg-[#ffffff] px-3 py-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AvatarLead
                    nome={item.lead.nome}
                    fotoUrl={item.lead.foto_url}
                    tamanho="h-9 w-9 text-xs"
                    classeBadge="bg-[#e5e5e5] text-[#404040]"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#171717]">{item.lead.nome}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                      <p className="truncate text-[11px] text-[#737373]">
                        {item.nomeSdr ? (
                          <>
                            {Sdr(publicoOrg)}: <span className="font-medium text-[#404040]">{item.nomeSdr}</span>
                          </>
                        ) : (
                          `sem ${sdr(publicoOrg)}`
                        )}
                      </p>
                      {item.nomeCloser && (
                        <p className="truncate text-[11px] text-[#737373]">
                          Closer: <span className="font-medium text-[#404040]">{item.nomeCloser}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${rotulo.classe}`}>
                    {rotulo.texto}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-[#737373]">
                    <IconeCalendario className="h-3 w-3 shrink-0" />
                    {formatarData(item.agendadaPara)}
                  </span>
                </div>
              </LinkLead>
            );
          })}
        </div>
      )}
    </section>
  );
}
