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
  6: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
    solido: "bg-gradient-to-br from-slate-500 to-slate-600",
  },
  7: {
    faixa: "bg-green-600",
    texto: "text-green-700",
    badge: "bg-green-200 text-green-700",
    header: "bg-green-50",
    borda: "border-green-300",
    pilula: "bg-green-700 text-white",
    solido: "bg-gradient-to-br from-green-600 to-green-700",
  },
  8: {
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
// levou No-show (volta pra ser remarcado). Assim que o lead vira "Reunião
// marcada" ele sai do Pré-vendas e só aparece em Vendas dali em diante.
export const NIVEIS_PRE_VENDAS = [0, 1, 2, 3, 5];
export const NIVEIS_VENDAS = [4, 6, 7];

// Coluna sintética (não existe na tabela `niveis`): divisão visual dentro
// do nível 7 (Oportunidades), pro lead que já fez a reunião (ICP
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
  nome: "Oportunidades futuras",
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

export function rotuloNivel(nivel: NivelResumo, numeroVisivel: number | undefined) {
  return numeroVisivel ? `Nível ${numeroVisivel}. ${nivel.nome}` : nivel.nome;
}

export function rotuloNivelCurto(nivel: NivelResumo, numeroVisivel: number | undefined) {
  return numeroVisivel ? `Nível ${numeroVisivel}` : nivel.nome;
}
