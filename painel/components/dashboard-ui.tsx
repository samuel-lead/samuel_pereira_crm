import {
  IconeAlvo,
  IconeCalendario,
  IconeCheck,
  IconeAlerta,
} from "@/components/icons";
import type { Metricas } from "@/lib/metricas";

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
    fundo: "bg-emerald-50",
    borda: "border-emerald-200",
    icone: "bg-emerald-600 text-white",
    texto: "text-emerald-700",
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
              bateuMeta ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
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
    bateu === null ? "bg-neutral-300" : bateu ? "bg-emerald-500" : "bg-red-500";

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700">{nome}</span>
        <span className={`font-bold ${bateu ? "text-emerald-600" : bateu === false ? "text-red-600" : "text-neutral-400"}`}>
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
  metricas,
  metas,
}: {
  titulo: string;
  metricas: Metricas;
  metas: MetasConfig;
}) {
  const pisoLeads = metas.piso_leads_dia * metricas.diasUteis;
  const pisoReunioes = metas.piso_reunioes_dia * metricas.diasUteis;

  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-neutral-900">{titulo}</h2>

      <div className="mb-4 overflow-hidden rounded-xl bg-gradient-to-br from-violet-600 via-violet-600 to-sky-500 p-6 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-100">
          Receita
        </p>
        <p className="mt-1 text-4xl font-extrabold">{formatarMoeda(metricas.receita)}</p>
        <p className="mt-1 text-sm text-violet-100">
          {metricas.vendas} venda{metricas.vendas === 1 ? "" : "s"} fechada
          {metricas.vendas === 1 ? "" : "s"}
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
          titulo="Reuniões marcadas"
          valor={metricas.reunioesMarcadas}
          meta={pisoReunioes}
          esquema="ceu"
          Icone={IconeCalendario}
        />
        <CardNumero
          titulo="Reuniões realizadas"
          valor={metricas.reunioesRealizadas}
          esquema="esmeralda"
          Icone={IconeCheck}
        />
        <CardNumero
          titulo="No Show"
          valor={metricas.noShow}
          esquema="rosa"
          Icone={IconeAlerta}
        />
      </div>

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
