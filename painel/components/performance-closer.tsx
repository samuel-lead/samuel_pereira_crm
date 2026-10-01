import type { MetricasCloser } from "@/lib/metricas";
import { Faturamento } from "@/lib/terminologia";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return null;
  return Math.round(valor * 100);
}

// Mesmo formato de ranking da Performance por SDR (ver comentário lá) —
// posição grandona, nome + valor principal na mesma linha, linha pequena
// de contexto embaixo, barra proporcional. Ordenado por RECEITA (não
// faturamento — Samuel foi explícito), igual o "Top 3 por valor
// coletado" do print de referência.
export function PerformanceCloser({
  titulo,
  dados,
  publicoOrg = "mentoria",
}: {
  titulo?: string;
  dados: MetricasCloser[];
  publicoOrg?: string;
}) {
  const tituloResolvido = titulo ?? "Performance por Closer";
  const ranking = [...dados].sort((a, b) => b.receita - a.receita);
  const maiorReceita = Math.max(1, ...ranking.map((l) => l.receita));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{tituloResolvido}</h2>
      <p className="mb-4 text-xs text-neutral-500">Top Closer por receita coletada</p>

      {ranking.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Ninguém pra comparar ainda
        </p>
      ) : (
        <div className="space-y-4">
          {ranking.map((linha, indice) => {
            const taxaVendaPct = formatarPercentual(linha.taxaVenda);
            return (
            <div key={linha.usuarioId} className="flex items-center gap-3">
              <span className="w-8 shrink-0 text-center text-2xl font-black text-neutral-200">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-bold text-neutral-900" title={linha.nome}>
                    {linha.nome}
                  </p>
                  <p className="shrink-0 text-base font-extrabold text-neutral-900">
                    {formatarMoeda(linha.receita)}
                  </p>
                </div>
                <p className="text-xs text-neutral-400">
                  {linha.vendas} venda{linha.vendas === 1 ? "" : "s"}
                  {taxaVendaPct !== null && ` · ${taxaVendaPct}% taxa de venda`}
                  {linha.ticketMedio !== null && ` · Ticket médio ${formatarMoeda(linha.ticketMedio)}`}
                  {` · ${Faturamento(publicoOrg)} ${formatarMoeda(linha.faturamento)}`}
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{ width: `${Math.max(4, (linha.receita / maiorReceita) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
