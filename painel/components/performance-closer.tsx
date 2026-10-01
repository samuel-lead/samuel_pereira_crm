import type { MetricasCloser } from "@/lib/metricas";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { StatCell } from "@/components/stat-cell";
import { Calls, Faturamento } from "@/lib/terminologia";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

// Mesmo ranking da Performance por SDR (ver comentário lá), só que
// ordenado por faturamento — igual a referência que o Samuel mandou
// ("Ranking Vendedor — Top 3 por valor coletado").
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
  const ranking = [...dados].sort((a, b) => b.faturamento - a.faturamento);
  const maiorFaturamento = Math.max(1, ...ranking.map((l) => l.faturamento));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{tituloResolvido}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Ranking por {faturamentoLower(publicoOrg)} · comparação entre todo o time
      </p>

      {ranking.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
          Ninguém pra comparar ainda
        </p>
      ) : (
        <div className="space-y-3">
          {ranking.map((linha, indice) => (
            <div key={linha.usuarioId} className="rounded-xl border border-neutral-200 p-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold text-neutral-500">
                  {indice + 1}
                </span>
                <AvatarUsuario nome={linha.nome} tamanho="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900" title={linha.nome}>
                    {linha.nome}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-green-600"
                      style={{ width: `${Math.max(4, (linha.faturamento / maiorFaturamento) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold text-neutral-900">{formatarMoeda(linha.faturamento)}</p>
                  <p className="text-[10px] text-neutral-400">{faturamentoLower(publicoOrg)}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap divide-x divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50">
                <StatCell label={`${Calls(publicoOrg)} realizadas`} value={linha.reunioesRealizadas} />
                <StatCell label={`${Calls(publicoOrg)} com proposta`} value={linha.reunioesComPitch} />
                <StatCell label="Vendas" value={linha.vendas} />
                <StatCell label="Taxa de vendas" value={formatarPercentual(linha.taxaVenda)} />
                <StatCell label="Receita" value={formatarMoeda(linha.receita)} />
                <StatCell
                  label="Ticket médio"
                  value={linha.ticketMedio !== null ? formatarMoeda(linha.ticketMedio) : "—"}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function faturamentoLower(publicoOrg: string) {
  return Faturamento(publicoOrg).toLowerCase() === "vgv" ? "VGV" : Faturamento(publicoOrg).toLowerCase();
}
