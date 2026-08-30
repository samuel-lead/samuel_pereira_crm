import type { VendaPorCanal } from "@/lib/metricas";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function VendasPorCanal({ dados }: { dados: VendaPorCanal[] }) {
  const total = dados.reduce((soma, d) => soma + d.faturamento, 0);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">
        Canais que venderam no mês
      </h2>
      <p className="mb-4 text-xs text-neutral-500">
        Todo canal (origem do lead) que teve venda, com quantas vezes
        aconteceu e quanto faturou.
      </p>

      {dados.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
          Nenhuma venda no mês ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {dados.map((linha) => {
            const pct = total > 0 ? Math.round((linha.faturamento / total) * 100) : 0;
            return (
              <div key={linha.canal}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">{linha.canal}</span>
                  <span className="text-neutral-500">
                    {linha.quantidade} venda{linha.quantidade === 1 ? "" : "s"} ·{" "}
                    <span className="font-semibold text-neutral-900">
                      {formatarMoeda(linha.faturamento)}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
