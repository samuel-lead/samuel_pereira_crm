import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { LinkLead } from "@/components/link-lead";
import type { LeadEnviado } from "@/lib/metricas";
import { BaixarPdfLeadsEnviados } from "@/components/baixar-pdf-leads-enviados";

// Leads que o SDR enviou pro Elton (embaixo de cada SDR no ranking da Inove).
// Samuel (06/11/26): a caixa mostra 5 leads de cada vez e o resto aparece
// ROLANDO a lista pra baixo — sem botão de "ver mais". Cada linha tem 49px
// (8px de folga em cima e embaixo + botão de 32px + 1px da divisória), então
// 5 linhas = 245px.
export function LeadsEnviadosLista({
  leads,
  sdrNome,
  periodo,
}: {
  leads: LeadEnviado[];
  sdrNome: string;
  periodo: string;
}) {
  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-3 py-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          Leads enviados para o Elton ({leads.length})
        </p>
        <BaixarPdfLeadsEnviados
          sdrs={[{ nome: sdrNome, leads }]}
          periodo={periodo}
          nomeArquivo={`leads-enviados-${sdrNome}`}
        />
      </div>
      <ul className="max-h-[245px] divide-y divide-neutral-200 overflow-y-auto overscroll-contain">
        {leads.map((lead) => (
          <li key={lead.id} className="flex h-[49px] items-center justify-between gap-3 px-3">
            <LinkLead
              leadId={lead.id}
              className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 hover:underline"
              title={lead.nome}
            >
              {lead.nome}
            </LinkLead>
            {lead.telefone_e164 ? (
              <BotaoWhatsapp telefone={lead.telefone_e164} />
            ) : (
              <span className="shrink-0 text-xs text-neutral-400">sem telefone</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
