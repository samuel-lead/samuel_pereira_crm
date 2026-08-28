"use client";

import { useAbrirLeadModal } from "@/components/contexto-lead-modal";
import { prefetchLead } from "@/lib/leads/cache-lead";

// Link que abre o pop-up do lead ao clicar normal, mas continua sendo um
// <a> de verdade com href pra /leads/[id] — clique com Ctrl/Cmd (abrir em
// nova aba), botão do meio, ou "Abrir em nova aba" do menu direito
// continuam funcionando igual, indo pra página cheia.
export function LinkLead({
  leadId,
  className,
  title,
  children,
}: {
  leadId: string;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  const abrir = useAbrirLeadModal();

  function aoClicar(e: React.MouseEvent) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    abrir(leadId);
  }

  return (
    <a
      href={`/leads/${leadId}`}
      onClick={aoClicar}
      onMouseEnter={() => prefetchLead(leadId)}
      className={className}
      title={title}
    >
      {children}
    </a>
  );
}
