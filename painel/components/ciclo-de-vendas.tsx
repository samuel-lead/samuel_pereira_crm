import type { CicloDeVendas } from "@/lib/metricas";

function formatarDias(valor: number | null) {
  if (valor === null) return "—";
  const arredondado = Math.round(valor);
  return `${arredondado} dia${arredondado === 1 ? "" : "s"}`;
}

export function CicloDeVendasCard({ dados, periodo }: { dados: CicloDeVendas; periodo: string }) {
  const maiorFaixa = Math.max(1, ...dados.faixas.map((f) => f.quantidade));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-lg font-extrabold tracking-tight text-neutral-900">
        Ciclo de vendas — {periodo.toLowerCase()}
      </h2>
      <p className="mb-4 text-xs text-neutral-500">
        Quantos dias o lead leva desde o dia em que entrou até a compra, nas vendas fechadas no período.
      </p>

      {dados.vendas === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-xs text-neutral-400">
          Nenhuma venda nesse período ainda.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-neutral-200 sm:grid-cols-4">
            {[
              { rotulo: "Tempo médio", valor: formatarDias(dados.mediaDias), destaque: true },
              { rotulo: "Mediana", valor: formatarDias(dados.medianaDias) },
              { rotulo: "Venda mais rápida", valor: formatarDias(dados.maisRapidaDias) },
              { rotulo: "Venda mais lenta", valor: formatarDias(dados.maisLentaDias) },
            ].map((c, i) => (
              <div
                key={c.rotulo}
                className={`px-3 py-2 ${i > 0 ? "sm:border-l" : ""} ${i % 2 === 1 ? "border-l sm:border-l" : ""} border-neutral-200`}
              >
                <p className="whitespace-nowrap text-[10px] font-medium text-neutral-500">{c.rotulo}</p>
                <p className={`text-lg font-bold tabular-nums ${c.destaque ? "text-blue-600" : "text-neutral-900"}`}>
                  {c.valor}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {dados.faixas.map((f) => (
              <div key={f.rotulo}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700">{f.rotulo}</span>
                  <span className="text-neutral-500">
                    <span className="font-semibold text-neutral-900">{f.quantidade}</span> venda
                    {f.quantidade === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{ width: `${Math.round((f.quantidade / maiorFaixa) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
