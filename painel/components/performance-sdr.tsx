import type { MetricasUsuario } from "@/lib/metricas";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import { AvatarUsuario } from "@/components/avatar-usuario";
import { StatCell } from "@/components/stat-cell";
import { Calls, Sdr, Faturamento } from "@/lib/terminologia";

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

// Virou um ranking (Samuel mandou print de referência: nome + barra
// proporcional + número grande em destaque, em vez de tabela densa) —
// ordenado por quem vendeu mais. O resto das métricas continua tudo
// visível, só que embaixo, em cartões pequenos (StatCell), igual o
// padrão "premium" já usado em Pré-vendas/Vendas (nunca badge colorido
// solto).
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
  const ranking = [...dados].sort((a, b) => b.vendas - a.vendas);
  const maiorVendas = Math.max(1, ...ranking.map((l) => l.vendas));

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-neutral-800">{tituloResolvido}</h2>
      <p className="mb-4 text-xs text-neutral-500">
        Ranking por vendas · comparação entre todo o time · {periodo}
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
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${Math.max(4, (linha.vendas / maiorVendas) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold text-neutral-900">{linha.vendas}</p>
                  <p className="text-[10px] text-neutral-400">vendas</p>
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

              <div className="mt-3 flex flex-wrap divide-x divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-100 bg-neutral-50">
                <StatCell label="Leads novos" value={linha.leadsTrabalhados} />
                <StatCell label="Ligações" value={linha.ligacoes} />
                <StatCell label={`${Calls(publicoOrg)} marcadas`} value={linha.reunioesMarcadas} />
                <StatCell label={`${Calls(publicoOrg)} realizadas`} value={linha.reunioesRealizadas} />
                <StatCell
                  label="No-show"
                  value={formatarPercentual(
                    linha.reunioesDevidas > 0 ? linha.noShow / linha.reunioesDevidas : null
                  )}
                />
                <StatCell label="Taxa de venda" value={formatarPercentual(linha.taxaVenda)} />
                <StatCell label={Faturamento(publicoOrg)} value={formatarMoeda(linha.faturamento)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
