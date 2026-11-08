import type { MetricasUsuario } from "@/lib/metricas";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import { Calls, Sdr, funilConsorcio, funilGondolas } from "@/lib/terminologia";
import { corPosicaoRanking } from "@/lib/ranking";
import { LeadsEnviadosLista } from "@/components/leads-enviados-lista";
import { BaixarPdfLeadsEnviados } from "@/components/baixar-pdf-leads-enviados";

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
// Inove Gôndolas: diz, em palavras, por que cada SDR está nessa posição.
function explicacaoPosicao(indice: number, enviados: number, enviadosDoPrimeiro: number) {
  const leads = (n: number) => `${n} lead${n === 1 ? "" : "s"}`;
  if (indice === 0) {
    return enviados === 0
      ? "Ninguém enviou leads para o Elton ainda"
      : `1º lugar: enviou ${leads(enviados)} para o Elton`;
  }
  const diferenca = enviadosDoPrimeiro - enviados;
  if (diferenca === 0) return `${indice + 1}º lugar: empatado com o 1º (${leads(enviados)} enviados)`;
  return `${indice + 1}º lugar: enviou ${leads(enviados)}, ${diferenca} a menos que o 1º`;
}

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
  const tituloResolvido = titulo ?? `Ranking ${Sdr(publicoOrg)}`;
  // Funil de consórcio (Banker): sem reunião, o ranking é por propostas
  // iniciadas no período.
  const consorcio = funilConsorcio(publicoOrg);
  // Inove Gôndolas: sem reunião, o ranking é por leads enviados pro Elton.
  const gondolas = funilGondolas(publicoOrg);
  const valorPrincipal = (l: MetricasUsuario) =>
    consorcio ? (l.propostasIniciadas ?? 0) : gondolas ? (l.enviadosAoCloser ?? 0) : l.reunioesRealizadas;
  const ranking = [...dados].sort((a, b) => valorPrincipal(b) - valorPrincipal(a));
  const maiorRealizadas = Math.max(1, ...ranking.map(valorPrincipal));

  return (
    <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-neutral-300 px-4 py-3 dark:border-neutral-700">
        <div>
        <h2 className="text-lg font-extrabold tracking-tight text-neutral-900">{tituloResolvido}</h2>
        <p className="mt-0.5 text-xs text-neutral-500">
          {consorcio
            ? `Top ${Sdr(publicoOrg)} por propostas iniciadas · ${periodo}`
            : gondolas
              ? `Top ${Sdr(publicoOrg)} por leads enviados para o Elton · ${periodo}`
            : `Top ${Sdr(publicoOrg)} por ${Calls(publicoOrg).toLowerCase()} marcadas que foram realizadas · ${periodo}`}
        </p>
        </div>
        {gondolas && ranking.some((l) => (l.leadsEnviados?.length ?? 0) > 0) && (
          <BaixarPdfLeadsEnviados
            destaque
            rotulo="Baixar PDF de todos os SDRs"
            nomeArquivo="leads-enviados-todos-os-sdrs"
            periodo={periodo}
            sdrs={ranking.map((l) => ({ nome: l.nome, leads: l.leadsEnviados ?? [] }))}
          />
        )}
      </div>

      {ranking.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-400">Ninguém pra comparar ainda</p>
      ) : (
        <div className="divide-y-2 divide-neutral-200 px-4 dark:divide-neutral-800">
          {ranking.map((linha, indice) => {
            const noShowPct = formatarPercentual(
              linha.reunioesDevidas > 0 ? linha.noShow / linha.reunioesDevidas : null
            );
            return (
              <div key={linha.usuarioId} className="flex items-center gap-3 py-3.5">
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
                      {valorPrincipal(linha)}{" "}
                      <span className="text-xs font-medium text-neutral-400">
                        {consorcio ? "propostas iniciadas" : gondolas ? "enviados para o Elton" : "realizadas"}
                      </span>
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400">
                    {consorcio ? (
                      <>
                        {linha.leadsTrabalhados} leads novos · {linha.ligacoes} ligações · {linha.ligacoesAtendidas} atendidas
                      </>
                    ) : gondolas ? (
                      <>
                        {linha.leadsTrabalhados} leads novos · {linha.ligacoes} ligações
                      </>
                    ) : (
                      <>
                        {linha.reunioesMarcadas} marcadas · {linha.leadsTrabalhados} leads novos · {linha.ligacoes} ligações
                        {noShowPct !== null && ` · ${noShowPct}% no-show`}
                      </>
                    )}
                    {` · ${linha.vendas} venda${linha.vendas === 1 ? "" : "s"}`}
                  </p>
                  {gondolas && (
                    <p
                      className={`mt-1.5 inline-block rounded-md px-2 py-1 text-xs font-bold ${
                        indice === 0
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {explicacaoPosicao(indice, valorPrincipal(linha), valorPrincipal(ranking[0]))}
                    </p>
                  )}
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-green-600"
                      style={{ width: `${Math.max(4, (valorPrincipal(linha) / maiorRealizadas) * 100)}%` }}
                    />
                  </div>
                  {gondolas && (linha.leadsEnviados?.length ?? 0) > 0 && (
                    <LeadsEnviadosLista leads={linha.leadsEnviados!} sdrNome={linha.nome} periodo={periodo} />
                  )}
                </div>
                {linha.podeCopiarRelatorio && (
                  <CopiarRelatorioButton
                    periodoLabel={periodo}
                    callsMarcadas={linha.reunioesMarcadas}
                    callsReagendadas={linha.reunioesReagendadas}
                    ligacoesFeitas={linha.ligacoes}
                    ligacoesAtendidas={linha.ligacoesAtendidas}
                    propostasIniciadas={linha.propostasIniciadas}
                    enviadosAoCloser={linha.enviadosAoCloser}
                    leadsNovos={linha.leadsTrabalhados}
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
