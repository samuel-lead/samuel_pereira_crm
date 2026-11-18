// Painel "Ligações" da Visão geral (Samuel, 18/11/26): ligações realizadas,
// atendidas e taxa de atendimento do período, mais a tabela por SDR com a meta
// de ligações por dia útil (50, a mesma da tela "Minha rotina").

export const META_LIGACOES_POR_DIA = 50;

type LinhaSdr = { nome: string; realizadas: number; atendidas: number };

function numero(n: number, casas = 0) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

// Variação contra o período anterior: "—" quando não tem como comparar.
function Variacao({ atual, anterior }: { atual: number; anterior: number | null | undefined }) {
  if (!anterior || anterior <= 0) {
    return (
      <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-xs font-semibold text-neutral-400">—</span>
    );
  }
  const pct = ((atual - anterior) / anterior) * 100;
  const subiu = pct >= 0;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-xs font-semibold ${
        subiu ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
      title="Comparado ao período anterior"
    >
      {subiu ? "▲" : "▼"} {numero(Math.abs(pct))}%
    </span>
  );
}

export function PainelLigacoes({
  titulo,
  realizadas,
  atendidas,
  realizadasAnterior,
  atendidasAnterior,
  diasUteis,
  leadsDiferentes,
  sdrs,
}: {
  titulo: string;
  realizadas: number;
  atendidas: number;
  realizadasAnterior: number | null | undefined;
  atendidasAnterior: number | null | undefined;
  diasUteis: number;
  leadsDiferentes: number;
  sdrs: LinhaSdr[];
}) {
  const naoAtendidas = Math.max(0, realizadas - atendidas);
  const taxa = realizadas > 0 ? (atendidas / realizadas) * 100 : null;
  const taxaAnterior =
    realizadasAnterior && realizadasAnterior > 0 ? ((atendidasAnterior ?? 0) / realizadasAnterior) * 100 : null;
  const porDia = diasUteis > 0 ? realizadas / diasUteis : realizadas;
  const maximo = Math.max(1, ...sdrs.map((s) => s.realizadas));
  const lista = [...sdrs].sort((a, b) => b.realizadas - a.realizadas);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-neutral-900">{titulo}</h2>
      <p className="mt-0.5 text-sm text-neutral-500">
        Registradas pelos SDRs no card do lead (Pré-vendas, Pipeline, Base e Instagram Radar)
      </p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ligações realizadas</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-black tabular-nums text-neutral-900">
            {numero(realizadas)}
            <Variacao atual={realizadas} anterior={realizadasAnterior} />
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {numero(porDia, 1)} por dia útil · {numero(leadsDiferentes)} lead{leadsDiferentes === 1 ? "" : "s"} diferente
            {leadsDiferentes === 1 ? "" : "s"}
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Ligações atendidas</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-black tabular-nums text-green-600">
            {numero(atendidas)}
            <Variacao atual={atendidas} anterior={atendidasAnterior} />
          </p>
          <p className="mt-1 text-sm text-neutral-500">{numero(naoAtendidas)} não atendidas</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Taxa de atendimento</p>
          <p className="mt-1 text-3xl font-black tabular-nums text-neutral-900">
            {taxa === null ? "—" : `${numero(taxa, 1)}%`}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {taxaAnterior === null ? "sem registro no período anterior" : `período anterior: ${numero(taxaAnterior, 1)}%`}
          </p>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <th className="px-1 py-2 font-semibold">SDR</th>
              <th className="px-3 py-2 font-semibold">Realizadas</th>
              <th className="px-3 py-2 font-semibold">Atendidas</th>
              <th className="px-3 py-2 font-semibold">Atendimento</th>
              <th className="px-3 py-2 font-semibold">Por dia útil</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-1 py-6 text-center text-sm text-neutral-400">
                  Nenhuma ligação registrada nesse período
                </td>
              </tr>
            ) : (
              lista.map((s) => {
                const larguraTotal = (s.realizadas / maximo) * 100;
                const larguraAtendidas = s.realizadas > 0 ? (s.atendidas / s.realizadas) * 100 : 0;
                const dia = diasUteis > 0 ? s.realizadas / diasUteis : s.realizadas;
                const bateu = dia >= META_LIGACOES_POR_DIA;
                return (
                  <tr key={s.nome} className="border-t border-neutral-100">
                    <td className="w-[38%] px-1 py-3">
                      <p className="font-semibold text-neutral-900">{s.nome}</p>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                        <div className="flex h-full rounded-full bg-purple-300" style={{ width: `${Math.max(larguraTotal, s.realizadas > 0 ? 2 : 0)}%` }}>
                          <div className="h-full rounded-full bg-green-500" style={{ width: `${larguraAtendidas}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-bold tabular-nums text-neutral-900">{numero(s.realizadas)}</td>
                    <td className="px-3 py-3 font-bold tabular-nums text-green-600">{numero(s.atendidas)}</td>
                    <td className="px-3 py-3 tabular-nums text-neutral-700">
                      {s.realizadas > 0 ? `${numero((s.atendidas / s.realizadas) * 100, 1)}%` : "0%"}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      <span className={`font-bold ${bateu ? "text-green-600" : "text-amber-600"}`}>{numero(dia, 1)}</span>
                      <span className="text-neutral-400"> / {META_LIGACOES_POR_DIA}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
