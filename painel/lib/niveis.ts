export const CORES_NIVEL: Record<
  number,
  { faixa: string; texto: string; badge: string }
> = {
  1: { faixa: "bg-neutral-400", texto: "text-neutral-700", badge: "bg-neutral-100 text-neutral-700" },
  2: { faixa: "bg-sky-500", texto: "text-sky-700", badge: "bg-sky-100 text-sky-700" },
  3: { faixa: "bg-indigo-500", texto: "text-indigo-700", badge: "bg-indigo-100 text-indigo-700" },
  4: { faixa: "bg-amber-500", texto: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  5: { faixa: "bg-orange-500", texto: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
  6: { faixa: "bg-rose-500", texto: "text-rose-700", badge: "bg-rose-100 text-rose-700" },
};

export function corDoNivel(ordem: number) {
  return CORES_NIVEL[ordem] ?? CORES_NIVEL[1];
}
