import type { BonusSdr, BonusSdrConfig } from "@/lib/metricas";
import { BONUS_SDR_CONFIG_PADRAO } from "@/lib/metricas";
import { IconeEstrela, IconeCalendario, IconeCheck, IconeAlerta, IconeMoeda } from "@/components/icons";
import { Calls, calls, call, Call, Sdr } from "@/lib/terminologia";

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
  travaNoShow = false,
}: {
  dados: BonusSdr[];
  periodo?: string;
  publicoOrg?: string;
  config?: BonusSdrConfig;
  // No-show acima do limite derruba todos os bônus (empresas de serviço com
  // Closer); no modelo por call a trava já é parte do modelo.
  travaNoShow?: boolean;
}) {
  const totalEquipe = dados.reduce((soma, d) => soma + d.totalBonus, 0);
  // Empresa sem a regra de fim de semana (valores iguais aos de semana) e/ou
  // sem bônus de receita (faixas zeradas), ex.: a Veend. Some da tela tudo o
  // que não existe pra ela (Samuel, 20/10/26).
  const porCall = config.modelo === "por_call";
  const semFimDeSemana =
    porCall &&
    config.valor_call_fim_semana === config.valor_por_call &&
    config.valor_por_call_venda_fim_semana === config.valor_por_call_venda;
  const semReceita =
    porCall &&
    config.faturamento_tier1_bonus === 0 &&
    config.faturamento_tier2_bonus === 0 &&
    config.faturamento_tier3_bonus === 0;
  const numeroReceita = semFimDeSemana ? 3 : 4;
  const qtdCartoes = 2 + (semFimDeSemana ? 0 : 1) + (semReceita ? 0 : 1);
  const colunasCartoes =
    qtdCartoes === 4 ? "lg:grid-cols-4" : qtdCartoes === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <div className="space-y-6">
      {/* No modelo por call o fundo é um verde escuro só (sem o clareado
          branco do lado direito) — Samuel disse que atrapalhava a leitura. */}
      <div
        className={`relative overflow-hidden rounded-2xl p-7 text-white shadow-2xl shadow-green-950/50 ring-1 ring-white/10 ${
          config.modelo === "por_call"
            ? "bg-gradient-to-br from-green-950 via-green-900 to-green-900"
            : "bg-gradient-to-br from-green-950 via-green-700 to-green-500"
        }`}
      >
        {config.modelo !== "por_call" && (
          <>
            <IconeEstrela className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />
          </>
        )}

        {/* No modelo por call (empresa do Samuel) a barra mostra só a
            explicação dos bônus — ele pediu pra tirar o título "Bônus
            total da equipe", o valor e o período. */}
        {config.modelo !== "por_call" && (
          <>
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
          </>
        )}

        {/* Era uma frase só, cheia de parênteses e barras — o SDR tava
            com dificuldade de entender como o bônus era calculado.
            Virou 3 linhas curtas, cada uma numa linha só (Samuel pediu:
            didático e sem quebrar), formato "bateu isso → ganha aquilo". */}
        {config.modelo === "por_call" ? (
          <div className="relative space-y-3">
            <div className={`grid grid-cols-2 gap-2.5 ${colunasCartoes}`}>
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
                <p className="mt-1 text-[11px] text-green-200">Paga no mês em que a call acontece</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  2 · Venda de {call(publicoOrg)}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">
                  {moedaCurta(config.valor_por_call_venda)}
                </p>
                {!semFimDeSemana && (
                  <p className="mt-0.5 text-xs text-green-100">Marcada de segunda a sexta</p>
                )}
                <p className="mt-1 text-[11px] text-green-200">
                  Quando a venda fecha, recebe a diferença:{" "}
                  <b className="text-white">+{moedaCurta(Math.max(0, config.valor_por_call_venda - config.valor_por_call))}</b>
                </p>
              </div>
              {!semFimDeSemana && (
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  3 · Venda de {call(publicoOrg)}
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums text-white">
                  {moedaCurta(config.valor_por_call_venda_fim_semana)}
                </p>
                <p className="mt-0.5 text-xs text-green-100">Marcada no sábado ou domingo</p>
                <p className="mt-1 text-[11px] text-green-200">
                  Quando a venda fecha, recebe a diferença:{" "}
                  <b className="text-white">
                    +{moedaCurta(Math.max(0, config.valor_por_call_venda_fim_semana - config.valor_call_fim_semana))}
                  </b>
                </p>
              </div>
              )}
              {!semReceita && (
              <div className="rounded-xl bg-white/10 p-3.5 ring-1 ring-white/15 backdrop-blur-sm">
                <p className="text-[11px] font-bold uppercase tracking-wider text-green-200">
                  {numeroReceita} · Receita do mês
                </p>
                <ul className="mt-1.5 space-y-1 text-xs text-green-100">
                  {[
                    [config.faturamento_tier1_valor, config.faturamento_tier1_bonus],
                    [config.faturamento_tier2_valor, config.faturamento_tier2_bonus],
                    [config.faturamento_tier3_valor, config.faturamento_tier3_bonus],
                  ].map(([meta, bonus]) => (
                    <li key={meta} className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="text-base font-extrabold tabular-nums text-white">{moedaCurta(meta)}</span>
                      <span className="font-bold tabular-nums text-white">
                        <span className="font-normal text-green-200">ganha </span>
                        {moedaCurta(bonus)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-[11px] text-green-200">Maior faixa que bateu, não soma</p>
              </div>
              )}
            </div>

            <div className={`grid gap-2.5 ${semReceita ? "" : "sm:grid-cols-2"}`}>
              <div className="rounded-xl bg-black/15 p-3.5 text-xs leading-relaxed text-green-50 ring-1 ring-white/10">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-green-200">
                  Como a venda entra: só a diferença
                </p>
                {`A ${call(publicoOrg)} paga ${moedaCurta(config.valor_por_call)}${semFimDeSemana ? "" : ` (${moedaCurta(config.valor_call_fim_semana)} no fim de semana)`} no mês em que acontece, mesmo sem venda. Quando a venda dessa ${call(publicoOrg)} fecha, o ${Sdr(publicoOrg)} recebe só a diferença até ${moedaCurta(config.valor_por_call_venda)}${semFimDeSemana ? "" : ` (${moedaCurta(config.valor_por_call_venda_fim_semana)} no fim de semana)`}, no mês em que a venda fechar, mesmo que a ${call(publicoOrg)} tenha sido em outro mês. Ex.: ${call(publicoOrg)} em setembro paga ${moedaCurta(config.valor_por_call)} em setembro; a venda fecha em outubro e paga +${moedaCurta(Math.max(0, config.valor_por_call_venda - config.valor_por_call))} em outubro. Nunca soma o valor da venda inteiro por cima do da ${call(publicoOrg)}.`}
              </div>
              {!semReceita && (
              <div className="rounded-xl bg-black/15 p-3.5 text-xs leading-relaxed text-green-50 ring-1 ring-white/10">
                <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-green-200">
                  Bônus de venda e receita não somam
                </p>
                {`O bônus de cada ${call(publicoOrg)} (1) sempre vale. Já a diferença das vendas (2 e 3) e o bônus de receita (4) não somam: no mês recebe só o maior dos dois. Ex.: receita ${moedaCurta(config.faturamento_tier1_bonus)} e diferenças de vendas somando R$ 300 = ganha só os ${moedaCurta(config.faturamento_tier1_bonus)} da receita (além do bônus de cada ${call(publicoOrg)}).`}
              </div>
              )}
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

      {(config.modelo === "por_call" || travaNoShow) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          Observação: se o no-show do mês passar de {Math.round(config.no_show_maximo * 100)}%,{" "}
          {config.modelo === "por_call"
            ? `o SDR perde todos os bônus, inclusive o das ${calls(publicoOrg)} realizadas qualificadas.`
            : `o ${Sdr(publicoOrg)} perde todos os bônus do mês.`}
        </p>
      )}

      {config.modelo === "por_call" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-neutral-500">
            <IconeEstrela className="h-3.5 w-3.5 text-green-600" />
            Bônus total da equipe
          </p>
          <p className="mt-1 text-4xl font-black tracking-tight tabular-nums text-green-700">
            {formatarMoeda(totalEquipe)}
          </p>
          {periodo && <p className="mt-0.5 text-xs font-medium text-neutral-500">{periodo}</p>}
        </div>
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

            <div
              className={`grid grid-cols-2 gap-3 ${config.modelo === "por_call" ? "sm:grid-cols-5" : "sm:grid-cols-4"}`}
            >
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
              {config.modelo === "por_call" && (
                <MiniCard titulo="Vendas" valor={linha.vendas} esquema="ceu" Icone={IconeEstrela} />
              )}
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
                  porCall
                    ? semFimDeSemana
                      ? `Bônus por ${call(publicoOrg)} realizada e qualificada (${linha.callsQualificadasSemana + linha.callsQualificadasFimDeSemana})`
                      : `Bônus por ${call(publicoOrg)} realizada e qualificada, marcada de segunda a sexta (${linha.callsQualificadasSemana})`
                    : `Bônus por ${calls(publicoOrg)} realizadas`
                }
                valor={semFimDeSemana ? linha.bonusPorCallRealizada + linha.bonusFimDeSemana : linha.bonusPorCallRealizada}
              />
              {!semFimDeSemana && (
                <LinhaBonus
                  label={
                    porCall
                      ? `Bônus por ${call(publicoOrg)} realizada e qualificada, marcada no sábado ou domingo (${linha.callsQualificadasFimDeSemana})`
                      : `Bônus por ${call(publicoOrg)} realizada que foi marcada no fim de semana`
                  }
                  valor={linha.bonusFimDeSemana}
                />
              )}
              {porCall && semFimDeSemana && (
                <LinhaBonus
                  label={`Venda fechada no mês: diferença de ${moedaCurta(Math.max(0, config.valor_por_call_venda - config.valor_por_call))} por venda (${linha.vendasSemana + linha.vendasFimDeSemana})`}
                  valor={linha.bonusPorVendaSemana + linha.bonusPorVendaFimDeSemana}
                />
              )}
              {porCall && !semFimDeSemana && (
                <>
                  <LinhaBonus
                    label={`Venda fechada no mês, ${call(publicoOrg)} de segunda a sexta: diferença de ${moedaCurta(Math.max(0, config.valor_por_call_venda - config.valor_por_call))} por venda (${linha.vendasSemana})`}
                    valor={linha.bonusPorVendaSemana}
                  />
                  <LinhaBonus
                    label={`Venda fechada no mês, ${call(publicoOrg)} de sábado ou domingo: diferença de ${moedaCurta(Math.max(0, config.valor_por_call_venda_fim_semana - config.valor_call_fim_semana))} por venda (${linha.vendasFimDeSemana})`}
                    valor={linha.bonusPorVendaFimDeSemana}
                  />
                </>
              )}
              {!semReceita && (
                <LinhaBonus
                  label={porCall ? "Bônus por receita" : "Bônus por faturamento"}
                  valor={linha.bonusPorFaturamento}
                />
              )}
            </div>
            {(config.modelo === "por_call" || travaNoShow) && linha.travadoPorNoShow && (
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
