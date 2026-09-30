import { calcularStatusCobranca } from "@/lib/cobranca";

const CORES: Record<string, string> = {
  verde: "bg-green-100 text-green-700",
  ambar: "bg-amber-100 text-amber-700",
  vermelho: "bg-red-100 text-red-700",
  neutro: "bg-neutral-100 text-neutral-500",
};

export function StatusCobrancaBadge({
  diaVencimento,
  ultimoPagamentoEm,
}: {
  diaVencimento: number | null;
  ultimoPagamentoEm: string | null;
}) {
  const status = calcularStatusCobranca(diaVencimento, ultimoPagamentoEm);
  if (!status) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${CORES[status.cor]}`}>
      {status.rotulo}
    </span>
  );
}
