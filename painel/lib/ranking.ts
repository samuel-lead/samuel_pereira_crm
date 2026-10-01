// Cor do círculo da posição nos rankings (Performance por SDR/Closer) —
// 1º/2º/3º lugar ganham destaque (ouro/prata/bronze), igual ao print de
// referência do Samuel. Os dois temas (claro/escuro) usam o `dark:` do
// Tailwind — esse projeto já roda com darkMode:"class".
export function corPosicaoRanking(indice: number) {
  if (indice === 0) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  }
  if (indice === 1) {
    return "bg-slate-200 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300";
  }
  if (indice === 2) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300";
  }
  return "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500";
}
