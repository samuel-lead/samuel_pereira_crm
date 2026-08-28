"use client";

import { createContext, useContext } from "react";

export type ParametrosAbrirLead = {
  leadId: string;
  marcarReuniao?: boolean;
  reuniaoAnteriorSumiu?: "sim" | "nao";
};

// Função que qualquer tela (Kanban, Lista de leads, Atividades, Reuniões,
// sino de notificações...) chama pra abrir o pop-up de um lead, em vez de
// navegar pra uma página nova. Fica disponível via ProvedorLeadModal, que
// mora uma vez só no layout raiz do app.
export const ContextoAbrirLeadModal = createContext<
  ((parametros: ParametrosAbrirLead | string) => void) | null
>(null);

export function useAbrirLeadModal() {
  const abrir = useContext(ContextoAbrirLeadModal);
  return (parametros: ParametrosAbrirLead | string) => abrir?.(parametros);
}

export type EstadoLeadModalAtivo = {
  // Busca os dados de novo depois de uma ação (salvar, registrar nota
  // etc.) — o pop-up não é uma rota, então nada disso acontece sozinho
  // como aconteceria numa página normal.
  recarregar: () => void;
  fechar: () => void;
};

// Só existe um valor aqui DENTRO do pop-up — os formulários (editar lead,
// registrar nota, excluir lead...) usam isso pra saber se estão rodando
// dentro do pop-up (chamam recarregar/fechar) ou na página cheia de
// sempre (fica null, e nada muda pra eles).
export const ContextoLeadModalAtivo = createContext<EstadoLeadModalAtivo | null>(null);

export function useLeadModalAtivo() {
  return useContext(ContextoLeadModalAtivo);
}
