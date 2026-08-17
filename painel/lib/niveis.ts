export const CORES_NIVEL: Record<
  number,
  {
    faixa: string;
    texto: string;
    badge: string;
    header: string;
    borda: string;
    pilula: string;
  }
> = {
  1: {
    faixa: "bg-slate-500",
    texto: "text-slate-700",
    badge: "bg-slate-200 text-slate-700",
    header: "bg-slate-50",
    borda: "border-slate-200",
    pilula: "bg-slate-600 text-white",
  },
  2: {
    faixa: "bg-sky-500",
    texto: "text-sky-700",
    badge: "bg-sky-200 text-sky-700",
    header: "bg-sky-50",
    borda: "border-sky-200",
    pilula: "bg-sky-600 text-white",
  },
  3: {
    faixa: "bg-violet-500",
    texto: "text-violet-700",
    badge: "bg-violet-200 text-violet-700",
    header: "bg-violet-50",
    borda: "border-violet-200",
    pilula: "bg-violet-600 text-white",
  },
  4: {
    faixa: "bg-amber-500",
    texto: "text-amber-700",
    badge: "bg-amber-200 text-amber-700",
    header: "bg-amber-50",
    borda: "border-amber-200",
    pilula: "bg-amber-600 text-white",
  },
  5: {
    faixa: "bg-orange-500",
    texto: "text-orange-700",
    badge: "bg-orange-200 text-orange-700",
    header: "bg-orange-50",
    borda: "border-orange-200",
    pilula: "bg-orange-600 text-white",
  },
  6: {
    faixa: "bg-rose-500",
    texto: "text-rose-700",
    badge: "bg-rose-200 text-rose-700",
    header: "bg-rose-50",
    borda: "border-rose-200",
    pilula: "bg-rose-600 text-white",
  },
};

export function corDoNivel(ordem: number) {
  return CORES_NIVEL[ordem] ?? CORES_NIVEL[1];
}
