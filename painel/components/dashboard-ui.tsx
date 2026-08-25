import {
  IconeAlvo,
  IconeCalendario,
  IconeCheck,
  IconeAlerta,
  IconeMoeda,
  IconeCarta,
  IconeEstrela,
} from "@/components/icons";
import type { Metricas } from "@/lib/metricas";
import { Reunioes, Calls } from "@/lib/terminologia";

export type MetasConfig = {
  piso_leads_dia: number;
  piso_reunioes_dia: number;
  taxa_agendamento_min: number;
  taxa_comparecimento_min: number;
  taxa_venda_min: number;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function CardNumero({
  titulo,
  valor,
  meta,
  amostraInsuficiente,
  esquema,
  Icone,
}: {
  titulo: string;
  valor: number;
  meta?: number;
  amostraInsuficiente?: boolean;
  esquema: keyof typeof ESQUEMAS;
  Icone: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const cor = ESQUEMAS[esquema];
  const bateuMeta = meta !== undefined ? valor >= meta : null;
  return (
    <div className={`rounded-xl border ${cor.borda} ${cor.fundo} p-4 shadow-sm`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${cor.icone}`}>
          <Icone className="h-4.5 w-4.5" />
        </span>
        {meta !== undefined && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              bateuMeta ? "bg-green-600 text-white" : "bg-amber-500 text-white"
            }`}
          >
            {bateuMeta ? "✓ piso" : `piso ${meta}`}
          </span>
        )}
      </div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${cor.texto}`}>
        {titulo}
      </p>
      <p className="mt-0.5 text-3xl font-extrabold text-neutral-900">{valor}</p>
      {amostraInsuficiente && (
        <p className="mt-1 text-[11px] text-neutral-400">amostra pequena</p>
      )}
    </div>
  );
}

// Quanto o valor atual mudou em relação ao mesmo pedaço do período
// anterior. Sem base pra comparar (era 0 antes), não dá pra calcular %
// de aumento — nesse caso o card não mostra selo nenhum.
function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

const ESQUEMAS_COMPARATIVO = {
  azul: "bg-sky-500/20 text-sky-400",
  verde: "bg-green-500/20 text-green-400",
  ambar: "bg-amber-500/20 text-amber-400",
  roxo: "bg-violet-500/20 text-violet-400",
  esmeralda: "bg-emerald-500/20 text-emerald-400",
} as const;

function CardComparativo({
  titulo,
  valorFormatado,
  variacaoPct,
  esquema,
  Icone,
}: {
  titulo: string;
  valorFormatado: string;
  variacaoPct: number | null;
  esquema: keyof typeof ESQUEMAS_COMPARATIVO;
  Icone: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}) {
  const subiu = variacaoPct !== null && variacaoPct > 0;
  const desceu = variacaoPct !== null && variacaoPct < 0;

  return (
    <div className="rounded-xl bg-neutral-900 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${ESQUEMAS_COMPARATIVO[esquema]}`}>
          <Icone className="h-4 w-4" />
        </span>
        {variacaoPct !== null && (
          <span
            className={`text-xs font-bold ${
              subiu ? "text-green-400" : desceu ? "text-red-400" : "text-neutral-400"
            }`}
          >
            {subiu ? "▲" : desceu ? "▼" : "—"} {Math.abs(Math.round(variacaoPct * 100))}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-white">{valorFormatado}</p>
      <p className="mt-0.5 text-xs font-medium text-neutral-400">{titulo}</p>
    </div>
  );
}

function BarraTaxa({
  nome,
  valor,
  minimo,
}: {
  nome: string;
  valor: number | null;
  minimo: number;
}) {
  const bateu = valor !== null ? valor >= minimo : null;
  const larguraPct = valor !== null ? Math.min(100, Math.round(valor * 100)) : 0;
  const corBarra =
    bateu === null ? "bg-neutral-300" : bateu ? "bg-green-500" : "bg-red-500";

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">{nome}</span>
        <span className={`font-bold ${bateu ? "text-green-600" : bateu === false ? "text-red-600" : "text-neutral-400"}`}>
          {formatarPercentual(valor)}{" "}
          <span className="font-normal text-neutral-400">/ mín. {Math.round(minimo * 100)}%</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full ${corBarra} transition-all`}
          style={{ width: `${larguraPct}%` }}
        />
      </div>
    </div>
  );
}

export function SecaoPeriodo({
  titulo,
  subtitulo,
  metricas,
  metricasAnteriores,
  metas,
  acao,
  publicoOrg = "mentoria",
}: {
  titulo: string;
  subtitulo?: string;
  metricas: Metricas;
  metricasAnteriores?: Metricas;
  metas: MetasConfig;
  acao?: React.ReactNode;
  publicoOrg?: string;
}) {
  const pisoLeads = metas.piso_leads_dia * metricas.diasUteis;
  const pisoReunioes = metas.piso_reunioes_dia * metricas.diasUteis;

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-lg font-bold text-neutral-900">{titulo}</h2>
        {subtitulo && <span className="text-xs text-neutral-400">{subtitulo}</span>}
        {acao}
      </div>

      <div className="relative mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-700 to-green-500 p-7 text-white shadow-2xl shadow-green-950/50 ring-1 ring-white/10">
        <IconeMoeda className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

        <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-200">
          <IconeMoeda className="h-3.5 w-3.5" />
          Receita
        </p>
        <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
          {formatarMoeda(metricas.receita)}
        </p>
        <p className="relative mt-2 text-sm font-medium text-green-100">
          {metricas.vendas} venda{metricas.vendas === 1 ? "" : "s"} fechada
          {metricas.vendas === 1 ? "" : "s"}
          {metricas.ticketMedio !== null &&
            ` · ticket médio ${formatarMoeda(metricas.ticketMedio)}`}
        </p>
        <p className="relative mt-1 text-xs text-green-200/80">
          Faturamento: {formatarMoeda(metricas.faturamento)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CardNumero
          titulo="Leads trabalhados"
          valor={metricas.leadsTrabalhados}
          meta={pisoLeads}
          amostraInsuficiente={metricas.leadsTrabalhados < 20}
          esquema="violeta"
          Icone={IconeAlvo}
        />
        <CardNumero
          titulo={`${Reunioes(publicoOrg)} marcadas`}
          valor={metricas.reunioesMarcadas}
          meta={pisoReunioes}
          esquema="ceu"
          Icone={IconeCalendario}
        />
        <CardNumero
          titulo={`${Reunioes(publicoOrg)} realizadas`}
          valor={metricas.reunioesRealizadas}
          esquema="esmeralda"
          Icone={IconeCheck}
        />
        <CardNumero
          titulo="No-show"
          valor={metricas.noShow}
          esquema="rosa"
          Icone={IconeAlerta}
        />
      </div>

      {metricasAnteriores && (
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Comparado com o período anterior
          </p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <CardComparativo
              titulo={`${Calls(publicoOrg)} agendadas`}
              valorFormatado={String(metricas.reunioesMarcadas)}
              variacaoPct={variacao(metricas.reunioesMarcadas, metricasAnteriores.reunioesMarcadas)}
              esquema="azul"
              Icone={IconeCalendario}
            />
            <CardComparativo
              titulo={`${Calls(publicoOrg)} realizadas`}
              valorFormatado={String(metricas.reunioesRealizadas)}
              variacaoPct={variacao(metricas.reunioesRealizadas, metricasAnteriores.reunioesRealizadas)}
              esquema="verde"
              Icone={IconeCheck}
            />
            <CardComparativo
              titulo="Propostas"
              valorFormatado={String(metricas.propostas)}
              variacaoPct={variacao(metricas.propostas, metricasAnteriores.propostas)}
              esquema="ambar"
              Icone={IconeCarta}
            />
            <CardComparativo
              titulo="Vendas"
              valorFormatado={String(metricas.vendas)}
              variacaoPct={variacao(metricas.vendas, metricasAnteriores.vendas)}
              esquema="roxo"
              Icone={IconeEstrela}
            />
            <CardComparativo
              titulo="Receita"
              valorFormatado={formatarMoeda(metricas.receita)}
              variacaoPct={variacao(metricas.receita, metricasAnteriores.receita)}
              esquema="esmeralda"
              Icone={IconeMoeda}
            />
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Taxas
        </p>
        <BarraTaxa
          nome="Agendamento"
          valor={metricas.taxaAgendamento}
          minimo={metas.taxa_agendamento_min}
        />
        <BarraTaxa
          nome="Comparecimento"
          valor={metricas.taxaComparecimento}
          minimo={metas.taxa_comparecimento_min}
        />
        <BarraTaxa
          nome="Venda"
          valor={metricas.taxaVenda}
          minimo={metas.taxa_venda_min}
        />
      </div>
    </section>
  );
}
