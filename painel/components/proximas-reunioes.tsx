import { LinkLead } from "@/components/link-lead";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeCalendario } from "@/components/icons";
import { Reuniao, Reunioes, reuniao } from "@/lib/terminologia";

function formatarHorario(iso: string) {
  const data = new Date(iso);
  const hoje = new Date();
  const amanha = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);
  const mesmodia = (a: Date, b: Date) =>
    a.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) ===
    b.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const hora = data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (mesmodia(data, hoje)) return `Hoje, ${hora}`;
  if (mesmodia(data, amanha)) return `Amanhã, ${hora}`;

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

export type ReuniaoProxima = {
  id: string;
  agendadaPara: string;
  reagendada: boolean;
  lead: { id: string; nome: string; foto_url: string | null };
  nomeSdr: string | null;
  nomeCloser: string | null;
};

export function ProximasReunioes({
  reunioes,
  publicoOrg,
  total,
}: {
  reunioes: ReuniaoProxima[];
  publicoOrg: string;
  total: number;
}) {
  return (
    <section className="rounded-xl border border-green-800 bg-green-900 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-white">
        {total === 1
          ? `1 próxima ${reuniao(publicoOrg)}`
          : `${total} próximas ${Reunioes(publicoOrg).toLowerCase()}`}
      </h2>
      <p className="mb-4 text-xs text-green-200">
        {total === 1
          ? `${Reuniao(publicoOrg)} já marcada que ainda vai acontecer.`
          : `${Reunioes(publicoOrg)} já marcadas que ainda vão acontecer.`}
      </p>

      {reunioes.length === 0 ? (
        <p className="rounded-md border border-dashed border-green-700 px-3 py-6 text-center text-xs text-green-200">
          Nenhuma {reuniao(publicoOrg)} marcada.
        </p>
      ) : (
        <div className="max-h-[336px] space-y-2 overflow-y-auto pr-1">
          {reunioes.map((item) => (
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
                    {item.nomeSdr && (
                      <p className="truncate text-[11px] text-[#737373]">
                        SDR: <span className="font-medium text-[#404040]">{item.nomeSdr}</span>
                      </p>
                    )}
                    {item.nomeCloser && (
                      <p className="truncate text-[11px] text-[#737373]">
                        Closer: <span className="font-medium text-[#404040]">{item.nomeCloser}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-semibold text-[#15803d]">
                  <IconeCalendario className="h-3.5 w-3.5 shrink-0" />
                  {formatarHorario(item.agendadaPara)}
                </span>
                {item.reagendada && (
                  <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">
                    Reagendada
                  </span>
                )}
              </div>
            </LinkLead>
          ))}
        </div>
      )}
    </section>
  );
}
