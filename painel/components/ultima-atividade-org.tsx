import { diasDesde } from "@/lib/datas";

// Mostra há quanto tempo essa empresa teve alguma atividade no CRM (lead
// criado, nível mudou, ou interação registrada) — é como Samuel sabe se o
// cliente está realmente usando o sistema.
export function UltimaAtividadeOrg({ ultimaAtividadeEm }: { ultimaAtividadeEm: string | null }) {
  if (!ultimaAtividadeEm) {
    return <span className="text-xs text-neutral-400">Nenhuma atividade ainda</span>;
  }

  const dias = diasDesde(ultimaAtividadeEm);
  const texto =
    dias === 0
      ? "Ativo hoje"
      : dias === 1
        ? "Última atividade: ontem"
        : `Última atividade: há ${dias} dias`;

  return (
    <span className={`text-xs ${dias >= 14 ? "font-medium text-red-600" : "text-neutral-400"}`}>
      {texto}
    </span>
  );
}
