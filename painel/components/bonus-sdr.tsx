import type { BonusSdr, BonusSdrConfig } from "@/lib/metricas";
import { BONUS_SDR_CONFIG_PADRAO } from "@/lib/metricas";
import { IconeEstrela, IconeCalendario, IconeCheck, IconeAlerta, IconeMoeda } from "@/components/icons";
import { Calls, calls, call, Call } from "@/lib/terminologia";

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function moedaCurta(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function formatarPercentual(valor: number | null) {
  if (valor === null) return "—";
  return `${Math.round(valor * 100)}%`;
}

const ESQUEMAS = {
  violeta: {
    fundo: "bg-violet-50",
    borda: "border-violet-200",
    icone: "bg-violet-600 text-white",
    texto: "text-violet-700",
  },
  ceu: {
    fundo: "bg-sky-50",
    borda: "border-sky-200",
    icone: "bg-sky-600 text-white",
    texto: "text-sky-700",
  },
  esmeralda: {
    fundo: "bg-green-50",
    borda: "border-green-200",
    icone: "bg-green-600 text-white",
    texto: "text-green-700",
  },
  rosa: {
    fundo: "bg-rose-50",
    borda: "border-rose-200",
    icone: "bg-rose-600 text-white",
    texto: "text-rose-700",
  },
} as const;

function MiniCard({
  titulo,
  valor,
  esquema,
  Icone,
}: {
  titulo: string;
  valor: React.ReactNode;
  esquema: keyof typeof ESQUEMAS;
  Icone: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const cor = ESQUEMAS[esquema];
  return (
    <div className={`rounded-xl border ${cor.borda} ${cor.fundo} p-3`}>
      <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${cor.icone}`}>
        <Icone className="h-4 w-4" />
      </span>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${cor.texto}`}>{titulo}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-neutral-900">{valor}</p>
    </div>
  );
}

function LinhaBonus({ label, valor }: { label: string; valor: number }) {
  const bateu = valor > 0;
  return (
    <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-bold tabular-nums ${bateu ? "text-green-600" : "text-neutral-400"}`}>
        {formatarMoeda(valor)}
      </span>
    </div>
  );
}

export function BonusSdrTabela({
  dados,
  periodo,
  publicoOrg = "mentoria",
  config = BONUS_SDR_CONFIG_PADRAO,
}: {
  dados: BonusSdr[];
  periodo?: string;
  publicoOrg?: string;
  config?: BonusSdrConfig;
}) {
  const totalEquipe = dados.reduce((soma, d) => soma + d.totalBonus, 0);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-700 to-green-500 p-7 text-white shadow-2xl shadow-green-950/50 ring-1 ring-white/10">
        <IconeEstrela className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

        <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-200">
          <IconeEstrela className="h-3.5 w-3.5" />
          Bônus total da equipe
        </p>
        <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
          {formatarMoeda(totalEquipe)}
        </p>
        {periodo && (
          <p className="relative mt-1 text-xs font-medium text-green-200">{periodo}</p>
        )}

        {/* Era uma frase só, cheia de parênteses e barras — o SDR tava
            com dificuldade de entender como o bônus era calculado.
            Virou 3 linhas curtas, cada uma numa linha só (Samuel pediu:
            didático e sem quebrar), formato "bateu isso → ganha aquilo". */}
        {config.modelo === "por_call" ? (
          <div className="relative mt-5 space-y-3">
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  1 · {Call(publicoOrg)} realizada e qualificada
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">
                  {moedaCurta(config.valor_por_call)}
                </p>
                {config.valor_call_fim_semana !== config.valor_por_call && (
                  <p className="mt-0.5 text-xs text-green-100">
                    Marcada no sábado ou domingo:{" "}
                    <b className="text-white">{moedaCurta(config.valor_call_fim_semana)}</b>
                  </p>
                )}
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  2 · Venda de {call(publicoOrg)}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">
                  {moedaCurta(config.valor_por_call_venda)}
                </p>
                <p className="mt-0.5 text-xs text-green-100">Marcada de segunda a sexta</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  3 · Venda de {call(publicoOrg)}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">
                  {moedaCurta(config.valor_por_call_venda_fim_semana)}
                </p>
                <p className="mt-0.5 text-xs text-green-100">Marcada no sábado ou domingo</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  4 · Receita do mês
                </p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-green-100">
                  {[
                    [config.faturamento_tier1_valor, config.faturamento_tier1_bonus],
                    [config.faturamento_tier2_valor, config.faturamento_tier2_bonus],
                    [config.faturamento_tier3_valor, config.faturamento_tier3_bonus],
                  ].map(([meta, bonus]) => (
                    <li key={meta} className="flex items-center justify-between gap-2">
                      <span className="tabular-nums">{moedaCurta(meta)}</span>
                      <span className="font-bold tabular-nums text-white">{moedaCurta(bonus)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-green-200">Maior faixa que bateu, não soma</p>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-xl bg-black/15 p-3.5 text-xs leading-relaxed text-green-50 ring-1 ring-white/10">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-green-200">
                  Bônus de {Call(publicoOrg)} e venda não somam
                </p>
                {`A ${call(publicoOrg)} que virou venda paga o valor da venda (2 ou 3) no lugar de ${moedaCurta(config.valor_por_call)}${config.valor_call_fim_semana !== config.valor_por_call ? ` ou ${moedaCurta(config.valor_call_fim_semana)}` : ""}. Vale só o maior.`}
              </div>
              <div className="rounded-xl bg-black/15 p-3.5 text-xs leading-relaxed text-green-50 ring-1 ring-white/10">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-green-200">
                  Bônus de venda e receita não somam
                </p>
                {`O bônus das ${calls(publicoOrg)} sem venda (1) sempre vale. Já o bônus por venda (2 e 3) e o de receita (4) não somam: recebe só o maior dos dois. Ex.: receita ${moedaCurta(config.faturamento_tier1_bonus)} e vendas R$ 700 = ganha só ${moedaCurta(config.faturamento_tier1_bonus)}.`}
              </div>
            </div>
          </div>
        ) : (
        <ul className="relative mt-4 hidden space-y-1.5 text-xs text-green-50 sm:block">
          <li className="whitespace-nowrap">
            <span className="font-bold text-white">1.</span>{` ${Calls(publicoOrg)} realizadas: `}
            {config.calls_tier1_qtd} ganha <b className="text-white">{moedaCurta(config.calls_tier1_valor)}</b>
            {" · "}
            {config.calls_tier2_qtd} ganha <b className="text-white">{moedaCurta(config.calls_tier2_valor)}</b>
            {" · "}
            {config.calls_tier3_qtd} ganha <b className="text-white">{moedaCurta(config.calls_tier3_valor)}</b>
            {" (maior faixa que bateu, não soma)"}
          </li>
          <li className="whitespace-nowrap">
            <span className="font-bold text-white">2.</span>
            {` ${Call(publicoOrg)} realizada marcada no sábado ou domingo: `}
            <b className="text-white">+{moedaCurta(config.valor_call_fim_semana)}</b> {"cada uma"}
          </li>
          <li className="whitespace-nowrap">
            <span className="font-bold text-white">3.</span>
            {` Faturamento do mês que veio das suas ${calls(publicoOrg)} realizadas: `}
            {moedaCurta(config.faturamento_tier1_valor)} ganha{" "}
            <b className="text-white">{moedaCurta(config.faturamento_tier1_bonus)}</b>
            {" · "}
            {moedaCurta(config.faturamento_tier2_valor)} ganha{" "}
            <b className="text-white">{moedaCurta(config.faturamento_tier2_bonus)}</b>
            {" · "}
            {moedaCurta(config.faturamento_tier3_valor)} ganha{" "}
            <b className="text-white">{moedaCurta(config.faturamento_tier3_bonus)}</b>
            {" (maior faixa que bateu, não soma)"}
          </li>
        </ul>
        )}
      </div>

      {config.bonus_inicio && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          O bônus começa a contar em{" "}
          {new Date(`${config.bonus_inicio}T12:00:00-03:00`).toLocaleDateString("pt-BR")}. Antes dessa data,
          fica zerado.
        </p>
      )}

      {config.modelo === "por_call" && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Observação: se o no-show do mês passar de {Math.round(config.no_show_maximo * 100)}%, o SDR perde todos
          os bônus, inclusive o das {calls(publicoOrg)} realizadas qualificadas.
        </p>
      )}

      <div className="space-y-4">
        {dados.map((linha) => (
          <div
            key={linha.usuarioId}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 space-y-1.5">
              <h3 className="text-base font-bold text-neutral-900">{linha.nome}</h3>
              <div className="flex flex-nowrap items-center gap-2">
                {periodo && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    {periodo}
                  </span>
                )}
                <span className="shrink-0 whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-sm font-bold tabular-nums text-green-700">
                  {formatarMoeda(linha.totalBonus)} de bônus
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MiniCard
                titulo={`${Calls(publicoOrg)} marcadas`}
                valor={linha.reunioesMarcadas}
                esquema="violeta"
                Icone={IconeCalendario}
              />
              <MiniCard
                titulo={`${Calls(publicoOrg)} realizadas`}
                valor={linha.reunioesRealizadas}
                esquema="esmeralda"
                Icone={IconeCheck}
              />
              <MiniCard
                titulo="No-show"
                valor={formatarPercentual(linha.noShowPercentual)}
                esquema="rosa"
                Icone={IconeAlerta}
              />
              <MiniCard
                titulo={config.modelo === "por_call" ? "Receita" : "Faturamento"}
                valor={formatarMoeda(config.modelo === "por_call" ? linha.receita : linha.faturamento)}
                esquema="ceu"
                Icone={IconeMoeda}
              />
            </div>

            <div className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-neutral-50/60">
              <LinhaBonus
                label={
                  config.modelo === "por_call"
                    ? `Bônus por ${calls(publicoOrg)} realizadas qualificadas (${linha.callsQualificadas})`
                    : `Bônus por ${calls(publicoOrg)} realizadas`
                }
                valor={linha.bonusPorCallRealizada}
              />
              <LinhaBonus
                label={
                  config.modelo === "por_call"
                    ? `Bônus por ${call(publicoOrg)} sem venda marcada no sábado ou domingo`
                    : `Bônus por ${call(publicoOrg)} realizada que foi marcada no fim de semana`
                }
                valor={linha.bonusFimDeSemana}
              />
              {config.modelo === "por_call" && (
                <LinhaBonus
                  label={`Bônus por venda (${linha.callsDeVenda} ${linha.callsDeVenda === 1 ? "venda" : "vendas"})`}
                  valor={linha.bonusPorVenda}
                />
              )}
              <LinhaBonus
                label={config.modelo === "por_call" ? "Bônus por receita" : "Bônus por faturamento"}
                valor={linha.bonusPorFaturamento}
              />
            </div>
            {config.modelo === "por_call" && linha.travadoPorNoShow && (
              <p className="mt-2 text-xs font-medium text-red-600">
                No-show de {formatarPercentual(linha.noShowPercentual)}, acima do limite de{" "}
                {Math.round(config.no_show_maximo * 100)}%: o bônus por {call(publicoOrg)} não vale neste mês.
              </p>
            )}
            {config.modelo === "por_call" && linha.callsNaoQualificadas > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                {linha.callsNaoQualificadas} {linha.callsNaoQualificadas === 1 ? call(publicoOrg) : calls(publicoOrg)} realizada
                {linha.callsNaoQualificadas === 1 ? "" : "s"} como não qualificada
                {linha.callsNaoQualificadas === 1 ? "" : "s"} (não entra no bônus).
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
