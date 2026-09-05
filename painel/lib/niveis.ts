export const CORES_NIVEL: Record<
  number,
  {
    faixa: string;
    texto: string;
    badge: string;
    header: string;
    borda: string;
    pilula: string;
    solido: string;
  }
> = {
  0: {
    faixa: "bg-neutral-800",
    texto: "text-neutral-700",
    badge: "bg-neutral-300 text-neutral-800",
    header: "bg-neutral-100",
    borda: "border-neutral-400",
    pilula: "bg-neutral-800 text-white",
    solido: "bg-gradient-to-br from-neutral-800 to-black",
  },
  1: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
    solido: "bg-gradient-to-br from-slate-500 to-slate-600",
  },
  2: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
    solido: "bg-gradient-to-br from-slate-500 to-slate-600",
  },
  3: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
    solido: "bg-gradient-to-br from-slate-500 to-slate-600",
  },
  4: {
    faixa: "bg-green-600",
    texto: "text-green-700",
    badge: "bg-green-200 text-green-700",
    header: "bg-green-50",
    borda: "border-green-300",
    pilula: "bg-green-700 text-white",
    solido: "bg-gradient-to-br from-green-600 to-green-700",
  },
  5: {
    faixa: "bg-red-500",
    texto: "text-red-700",
    badge: "bg-red-200 text-red-700",
    header: "bg-red-50",
    borda: "border-red-200",
    pilula: "bg-red-600 text-white",
    solido: "bg-gradient-to-br from-red-500 to-red-600",
  },
  // "Reagendamento" — lead que tinha reunião marcada e avisou antes que
  // ia precisar remarcar. Âmbar por ser "precisa de atenção, mas não é
  // tão grave quanto No Show" — mesma linguagem de cor já usada em outras
  // partes do painel pra esse tipo de estado.
  6: {
    faixa: "bg-amber-500",
    texto: "text-amber-700",
    badge: "bg-amber-200 text-amber-700",
    header: "bg-amber-50",
    borda: "border-amber-200",
    pilula: "bg-amber-600 text-white",
    solido: "bg-gradient-to-br from-amber-500 to-amber-600",
  },
  7: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
    solido: "bg-gradient-to-br from-slate-500 to-slate-600",
  },
  8: {
    faixa: "bg-green-600",
    texto: "text-green-700",
    badge: "bg-green-200 text-green-700",
    header: "bg-green-50",
    borda: "border-green-300",
    pilula: "bg-green-700 text-white",
    solido: "bg-gradient-to-br from-green-600 to-green-700",
  },
  9: {
    faixa: "bg-stone-500",
    texto: "text-stone-700",
    badge: "bg-stone-200 text-stone-700",
    header: "bg-stone-50",
    borda: "border-stone-200",
    pilula: "bg-stone-600 text-white",
    solido: "bg-gradient-to-br from-stone-500 to-stone-600",
  },
  // Coluna sintética "Oportunidades futuras" (ver ORDEM_OPORTUNIDADE_FUTURA
  // mais abaixo) — não é um nível de verdade, por isso a chave não segue
  // a sequência normal de ordem.
  1006: {
    faixa: "bg-green-600",
    texto: "text-green-700",
    badge: "bg-green-200 text-green-700",
    header: "bg-green-50",
    borda: "border-green-300",
    pilula: "bg-green-700 text-white",
    solido: "bg-gradient-to-br from-green-600 to-green-700",
  },
};

export function corDoNivel(ordem: number) {
  return CORES_NIVEL[ordem] ?? CORES_NIVEL[1];
}

// O funil virou dois quadros. Pré-vendas: antes da reunião marcada, + quem
// levou No-show ou precisou reagendar (voltam pra ser remarcados). Assim
// que o lead vira "Reunião marcada" ele sai do Pré-vendas e só aparece em
// Vendas dali em diante — por isso "Reunião marcada" NÃO entra aqui: essa
// lista é o que filtra quais leads aparecem no quadro.
export const NIVEIS_PRE_VENDAS = [0, 1, 2, 3, 5, 6];
export const NIVEIS_VENDAS = [4, 7, 8];

// Diferente de NIVEIS_PRE_VENDAS: essa é a lista de COLUNAS mostradas no
// quadro de Pré-vendas. "Reunião marcada" (ordem 4) NÃO entra mais aqui —
// ela ficava sempre vazia (o lead sai do Pré-vendas assim que entra nela) e
// Samuel achou sem sentido manter uma coluna que nunca tem lead nenhum. O
// jeito de marcar a reunião agora é o botão "Marcar {call}" no rodapé do
// card (ver permitirMarcarReuniaoRapido em kanban-board.tsx), não mais
// arrastar pra uma coluna.
export const COLUNAS_PRE_VENDAS = [0, 1, 2, 3, 5, 6];

// Níveis pra onde dá pra reativar um lead direto do card na Base, sem
// passar por mais nada — os que não exigem reunião nenhuma registrada
// ainda. "Reunião marcada" pra frente fica de fora de propósito: precisa
// de data/closer, e isso o botão rápido do card não tem como perguntar.
export const NIVEIS_REATIVACAO = [0, 1, 2, 3];

// Coluna sintética (não existe na tabela `niveis`): divisão visual dentro
// do nível 8 (Oportunidades), pro lead que já fez a reunião (ICP
// qualificado) mas avisou que só fecha depois. Usada só no quadro Vendas —
// nunca é gravada como nivel_ordem no banco, só serve pra identificar a
// coluna no Kanban e no drag-and-drop.
export const ORDEM_OPORTUNIDADE_FUTURA = 1006;

export type NivelResumo = {
  ordem: number;
  nome: string;
  numerado: boolean;
  destacado: boolean;
};

export const NIVEL_OPORTUNIDADE_FUTURA: NivelResumo = {
  ordem: ORDEM_OPORTUNIDADE_FUTURA,
  nome: "Repescagem futura de ICP",
  numerado: false,
  destacado: true,
};

export function numerarNiveis(niveis: NivelResumo[]) {
  const numeros = new Map<number, number>();
  let contador = 0;
  for (const nivel of niveis) {
    if (nivel.numerado) {
      contador += 1;
      numeros.set(nivel.ordem, contador);
    }
  }
  return numeros;
}

export function rotuloNivel(nivel: { nome: string }, numeroVisivel: number | undefined) {
  return numeroVisivel ? `Nível ${numeroVisivel}. ${nivel.nome}` : nivel.nome;
}

export function rotuloNivelCurto(nivel: NivelResumo, numeroVisivel: number | undefined) {
  return numeroVisivel ? `Nível ${numeroVisivel}` : nivel.nome;
}

// Única fonte de verdade pra "esse nível deve aparecer na lista pra
// escolher" — usada tanto no menu Nível dentro do card (editar-lead-form)
// quanto no "Mover para..." do celular (kanban-board), pra nunca mais os
// dois ficarem diferentes um do outro (foi exatamente isso que deu
// confusão: o celular tinha uma trava a mais que o desktop não tem).
// Não cobre a opção sintética "Repescagem futura de ICP" — essa sempre
// aparece à parte, sem exigir reunião nenhuma (ver ORDEM_OPORTUNIDADE_FUTURA).
export function nivelDeveApareceNoMenu(
  nivelAtual: number,
  jaTeveReuniao: boolean,
  ordemDestino: number
): boolean {
  if (ordemDestino === nivelAtual) return true;

  // Novos Leads → Sem conversa → Em qualificação → Topou reunião é uma
  // progressão de mão única: se o lead já está em qualquer um desses
  // níveis, não existe voltar pra um de antes — não tem lógica nenhuma
  // (ex.: quem já "Topou reunião" claramente já teve conversa, não faz
  // sentido rebaixar pra "Sem conversa iniciada"). Vale independente de
  // já ter tido reunião ou não — Samuel foi enfático que isso é sempre,
  // não só depois da reunião.
  if (ordemDestino <= 3 && ordemDestino < nivelAtual) return false;

  // No-show/Reagendamento só fazem sentido saindo de "Reunião marcada".
  if ((ordemDestino === 5 || ordemDestino === 6) && nivelAtual !== 4) {
    return false;
  }

  // Follow após reunião e Oportunidades (a normal, não a futura) só
  // existem pra quem já teve reunião de verdade em algum momento.
  if ((ordemDestino === 7 || ordemDestino === 8) && !jaTeveReuniao) {
    return false;
  }

  return true;
}
