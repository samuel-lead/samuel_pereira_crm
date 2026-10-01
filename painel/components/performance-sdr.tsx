import type { MetricasUsuario } from "@/lib/metricas";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import { Calls, Sdr } from "@/lib/terminologia";
import { corPosicaoRanking } from "@/lib/ranking";

function formatarPercentual(valor: number | null) {
  if (valor === null) return null;
  return Math.round(valor * 100);
}

// Ranking igual ao print de referência do Samuel: posição grandona,
// nome + valor principal na mesma linha, uma linha pequena de
// contexto embaixo do nome, e a barra proporcional por baixo de tudo —
// sem foto, sem cartão de métricas quebrando embaixo (isso é o que ele
// pediu pra tirar). Ordenado por calls REALIZADAS (não por venda —
// Samuel foi explícito: o ranking de venda é o do Closer).
export function PerformanceSdr({
  titulo,
  dados,
  periodo,
  publicoOrg = "mentoria",
}: {
  titulo?: string;
  dados: MetricasUsuario[];
  periodo: string;
  publicoOrg?: string;
}) {
  const tituloResolvido = titulo ?? `Performance da semana por ${Sdr(publicoOrg)}`;
  const ranking = [...dados].sort((a, b) => b.reunioesRealizadas - a.reunioesRealizadas);
  const maiorRealizadas = Math.max(1, ...ranking.map((l) => l.reunioesRealizadas));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-base font-extrabold tracking-tight text-blue-700 dark:text-blue-400">
        <span className="h-5 w-1.5 shrink-0 rounded-full bg-blue-600" />
        {tituloResolvido}
      </h2>
      <p className="mb-4 text-xs text-neutral-500">
        Top {Sdr(publicoOrg)} por {Calls(publicoOrg).toLowerCase()} marcadas que foram realizadas · {periodo}
      </p>

      {ranking.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Ninguém pra comparar ainda
        </p>
      ) : (
        <div className="space-y-4">
          {ranking.map((linha, indice) => {
            const noShowPct = formatarPercentual(
              linha.reunioesDevidas > 0 ? linha.noShow / linha.reunioesDevidas : null
            );
            const taxaVendaPct = formatarPercentual(linha.taxaVenda);
            return (
              <div key={linha.usuarioId} className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${corPosicaoRanking(indice)}`}
                >
                  {indice + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-bold text-neutral-900" title={linha.nome}>
                      {linha.nome}
                    </p>
                    <p className="shrink-0 text-base font-extrabold text-neutral-900">
                      {linha.reunioesRealizadas}{" "}
                      <span className="text-xs font-medium text-neutral-400">realizadas</span>
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {linha.leadsTrabalhados} leads novos · {linha.ligacoes} ligações · {linha.reunioesMarcadas} marcadas
                    {noShowPct !== null && ` · ${noShowPct}% no-show`}
                    {taxaVendaPct !== null && ` · ${taxaVendaPct}% venda`}
                    {` · ${linha.vendas} venda${linha.vendas === 1 ? "" : "s"}`}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.max(4, (linha.reunioesRealizadas / maiorRealizadas) * 100)}%` }}
                    />
                  </div>
                </div>
                {linha.podeCopiarRelatorio && (
                  <CopiarRelatorioButton
                    periodoLabel={periodo}
                    callsMarcadas={linha.reunioesMarcadas}
                    callsReagendadas={linha.reunioesReagendadas}
                    ligacoesFeitas={linha.ligacoes}
                    publicoOrg={publicoOrg}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
