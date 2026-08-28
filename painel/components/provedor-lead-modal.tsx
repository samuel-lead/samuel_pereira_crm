"use client";

import { useCallback, useState } from "react";
import {
  ContextoAbrirLeadModal,
  type ParametrosAbrirLead,
} from "@/components/contexto-lead-modal";
import { ModalLead } from "@/components/modal-lead";

// Mora uma vez só no layout raiz do app (ver app/(app)/layout.tsx) — daí
// qualquer tela consegue abrir o pop-up de um lead (useAbrirLeadModal),
// sem precisar de estado próprio nem de rota nova.
export function ProvedorLeadModal({ children }: { children: React.ReactNode }) {
  const [aberto, setAberto] = useState<ParametrosAbrirLead | null>(null);

  const abrir = useCallback((parametros: ParametrosAbrirLead | string) => {
    setAberto(typeof parametros === "string" ? { leadId: parametros } : parametros);
  }, []);

  return (
    <ContextoAbrirLeadModal.Provider value={abrir}>
      {children}
      {aberto && (
        <ModalLead
          key={aberto.leadId}
          leadId={aberto.leadId}
          marcarReuniao={aberto.marcarReuniao}
          reuniaoAnteriorSumiu={aberto.reuniaoAnteriorSumiu}
          aoFechar={() => setAberto(null)}
        />
      )}
    </ContextoAbrirLeadModal.Provider>
  );
}
