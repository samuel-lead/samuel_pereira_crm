"use client";

import { useState } from "react";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { LinkLead } from "@/components/link-lead";
import type { LeadEnviado } from "@/lib/metricas";

const POR_VEZ = 5;

// Leads que o SDR enviou pro Elton (embaixo de cada SDR no ranking da Inove).
// Mostra de 5 em 5 (Samuel, 06/11/26): "Ver mais 5" abre os próximos.
export function LeadsEnviadosLista({ leads }: { leads: LeadEnviado[] }) {
  const [visiveis, setVisiveis] = useState(POR_VEZ);
  const mostrados = leads.slice(0, visiveis);
  const restantes = leads.length - mostrados.length;

  return (
    <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50">
      <p className="border-b border-neutral-200 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
        Leads enviados para o Elton ({leads.length})
      </p>
      <ul className="divide-y divide-neutral-200">
        {mostrados.map((lead) => (
          <li key={lead.id} className="flex items-center justify-between gap-3 px-3 py-2">
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
      {(restantes > 0 || visiveis > POR_VEZ) && (
        <div className="flex items-center justify-center gap-4 border-t border-neutral-200 px-3 py-2">
          {restantes > 0 && (
            <button
              type="button"
              onClick={() => setVisiveis((atual) => atual + POR_VEZ)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Ver mais {Math.min(POR_VEZ, restantes)} (restam {restantes})
            </button>
          )}
          {visiveis > POR_VEZ && (
            <button
              type="button"
              onClick={() => setVisiveis(POR_VEZ)}
              className="text-xs font-medium text-neutral-500 hover:underline"
            >
              Mostrar só 5
            </button>
          )}
        </div>
      )}
    </div>
  );
}
