import type { BonusSdr, BonusSdrConfig } from "@/lib/metricas";
import { BONUS_SDR_CONFIG_PADRAO } from "@/lib/metricas";
import { IconeEstrela, IconeCalendario, IconeCheck, IconeAlerta, IconeMoeda } from "@/components/icons";
import { Calls, calls, call } from "@/lib/terminologia";

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
        <p className="relative mt-2 hidden text-sm font-medium text-green-100 sm:block">
          {`${Calls(publicoOrg)} realizadas (≥${config.calls_tier1_qtd}/${config.calls_tier2_qtd}/${config.calls_tier3_qtd} → ${moedaCurta(config.calls_tier1_valor)}/${moedaCurta(config.calls_tier2_valor)}/${moedaCurta(config.calls_tier3_valor)}) + ${moedaCurta(config.valor_call_fim_semana)} por ${call(publicoOrg)} realizada que foi marcada no fim de semana + faturamento do mês (≥${moedaCurta(config.faturamento_tier1_valor)}/${moedaCurta(config.faturamento_tier2_valor)}/${moedaCurta(config.faturamento_tier3_valor)} → ${moedaCurta(config.faturamento_tier1_bonus)}/${moedaCurta(config.faturamento_tier2_bonus)}/${moedaCurta(config.faturamento_tier3_bonus)}).`}
          {periodo && <> Mês de {periodo}.</>}
        </p>
      </div>

      <div className="space-y-4">
        {dados.map((linha) => (
          <div
            key={linha.usuarioId}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-nowrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-base font-bold text-neutral-900">{linha.nome}</h3>
                {periodo && (
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
                    Mês de {periodo}
                  </span>
                )}
              </div>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-green-50 px-3 py-1 text-sm font-bold tabular-nums text-green-700">
                {formatarMoeda(linha.totalBonus)} de bônus
              </span>
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
                titulo="Faturamento"
                valor={formatarMoeda(linha.faturamento)}
                esquema="ceu"
                Icone={IconeMoeda}
              />
            </div>

            <div className="mt-3 divide-y divide-neutral-100 rounded-lg border border-neutral-100 bg-neutral-50/60">
              <LinhaBonus label={`Bônus por ${calls(publicoOrg)} realizadas`} valor={linha.bonusPorCallRealizada} />
              <LinhaBonus
                label={`Bônus por ${call(publicoOrg)} realizada que foi marcada no fim de semana`}
                valor={linha.bonusFimDeSemana}
              />
              <LinhaBonus label="Bônus por faturamento" valor={linha.bonusPorFaturamento} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
