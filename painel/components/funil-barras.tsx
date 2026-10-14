import type { Metricas } from "@/lib/metricas";
import type { MetasConfig } from "@/components/dashboard-ui";
import { Calls } from "@/lib/terminologia";

// Funil em barras da Visão geral: cada etapa mostra o resultado do período e,
// do lado, quanto cresceu (ou caiu) em relação ao período anterior; entre as
// etapas, a taxa de conversão. Embaixo, três medidores (agendamento, no-show
// e venda). Referência pedida pelo Samuel (print de um funil de outra
// empresa). Funciona no modo claro e no escuro.

function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return (atual - anterior) / anterior;
}

function formatarPct(valor: number | null, casas = 1) {
  if (valor === null) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function SeloCrescimento({ atual, anterior }: { atual: number; anterior: number | undefined }) {
  if (anterior === undefined) return null;
  const v = variacao(atual, anterior);
  if (v === null) {
    return (
      <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        {atual > 0 ? "novo" : "—"}
      </span>
    );
  }
  const subiu = v > 0;
  const desceu = v < 0;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
        subiu
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
          : desceu
            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {subiu ? "↑ +" : desceu ? "↓ −" : "= "}
      {Math.abs(v * 100).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  );
}

type Etapa = {
  rotulo: string;
  valor: number;
  anterior?: number;
  nota?: string;
  // Conversão desde a etapa de cima (null = sem dado).
  conversao?: { nome: string; valor: number | null; minimo?: number };
};

function Medidor({
  valor,
  rotulo,
  legenda,
  bom,
}: {
  valor: number | null;
  rotulo: string;
  legenda: string;
  bom: boolean | null;
}) {
  const raio = 30;
  const meio = Math.PI * raio;
  const pct = valor === null ? 0 : Math.max(0, Math.min(1, valor));
  const cor = bom === null ? "#a3a3a3" : bom ? "#22c55e" : "#f59e0b";
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-[46px] w-[84px]">
        <svg viewBox="0 0 80 44" className="h-full w-full">
          <path
            d="M 10 40 A 30 30 0 0 1 70 40"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className="stroke-neutral-200 dark:stroke-neutral-800"
          />
          <path
            d="M 10 40 A 30 30 0 0 1 70 40"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            stroke={cor}
            strokeDasharray={`${pct * meio} ${meio}`}
          />
        </svg>
        <span className="absolute inset-x-0 bottom-0 text-center text-base font-extrabold tabular-nums text-neutral-900 dark:text-white">
          {valor === null ? "—" : formatarPct(valor)}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-neutral-700 dark:text-neutral-300">
        {rotulo}
      </p>
      <p className="text-[10px] text-neutral-400">{legenda}</p>
    </div>
  );
}

export function FunilBarras({
  metricas,
  metricasAnteriores,
  metas,
  leadsNovos,
  taxaAgendamentoLeadsNovos,
  noShowPct,
  pisoLeads,
  pisoReunioes,
  publicoOrg = "mentoria",
}: {
  metricas: Metricas;
  metricasAnteriores?: Metricas;
  metas: MetasConfig;
  leadsNovos: number;
  // Marcadas de lead que entrou no período ÷ leads novos (a outra leitura da
  // taxa de agendamento, que ignora lead antigo).
  taxaAgendamentoLeadsNovos: number | null;
  noShowPct: number;
  pisoLeads: number;
  pisoReunioes: number;
  publicoOrg?: string;
}) {
  const ant = metricasAnteriores;
  const taxaPitch =
    metricas.reunioesRealizadas > 0 ? metricas.reunioesComPitch / metricas.reunioesRealizadas : null;

  const etapas: Etapa[] = [
    {
      rotulo: "Leads trabalhados",
      valor: metricas.leadsTrabalhados,
      anterior: ant?.leadsTrabalhados,
      nota: `${leadsNovos} leads novos · piso ${pisoLeads}`,
    },
    {
      rotulo: `${Calls(publicoOrg)} marcadas`,
      valor: metricas.reunioesMarcadas,
      anterior: ant?.reunioesMarcadas,
      nota: `piso ${pisoReunioes}`,
      conversao: { nome: "agendamento", valor: metricas.taxaAgendamento, minimo: metas.taxa_agendamento_min },
    },
    {
      rotulo: `${Calls(publicoOrg)} realizadas`,
      valor: metricas.reunioesRealizadas,
      anterior: ant?.reunioesRealizadas,
      conversao: { nome: "comparecimento", valor: metricas.taxaComparecimento, minimo: metas.taxa_comparecimento_min },
    },
    {
      rotulo: `${Calls(publicoOrg)} com pitch`,
      valor: metricas.reunioesComPitch,
      anterior: ant?.reunioesComPitch,
      conversao: { nome: "pitch", valor: taxaPitch },
    },
    {
      rotulo: "Vendas",
      valor: metricas.vendas,
      anterior: ant?.vendas,
      conversao: { nome: "venda", valor: metricas.taxaVenda, minimo: metas.taxa_venda_min },
    },
  ];

  // Gargalo = a transição que mais ficou abaixo da própria meta.
  let indiceGargalo = -1;
  let piorRazao = Infinity;
  etapas.forEach((e, i) => {
    const c = e.conversao;
    if (c && c.valor !== null && c.minimo && c.valor < c.minimo) {
      const razao = c.valor / c.minimo;
      if (razao < piorRazao) {
        piorRazao = razao;
        indiceGargalo = i;
      }
    }
  });

  const maximo = Math.max(1, etapas[0].valor, ...etapas.map((e) => e.valor));
  const noShowMax = 1 - metas.taxa_comparecimento_min;
  const conversaoTotal =
    metricas.leadsTrabalhados > 0 ? metricas.vendas / metricas.leadsTrabalhados : null;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xl font-black tabular-nums text-neutral-900 dark:text-white">
            {formatarPct(conversaoTotal, 2)}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Conversão total</p>
        </div>
        {ant && (
          <p className="text-right text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
            Porcentagem comparada
            <br />
            com o período anterior
          </p>
        )}
      </div>

      <div className="space-y-1">
        {etapas.map((etapa, i) => {
          const largura = Math.max(3, Math.round((etapa.valor / maximo) * 100));
          return (
            <div key={etapa.rotulo}>
              {etapa.conversao && (
                <div className="flex items-center gap-2 py-1.5 pl-[7.5rem] text-[11px] sm:pl-36">
                  <span className="text-neutral-400">↓</span>
                  <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                    {etapa.conversao.nome}{" "}
                    <span className="tabular-nums">{formatarPct(etapa.conversao.valor)}</span>
                  </span>
                  {etapa.conversao.minimo !== undefined && (
                    <span className="text-neutral-400">/ mín. {Math.round(etapa.conversao.minimo * 100)}%</span>
                  )}
                  {i === indiceGargalo && (
                    <span className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400">
                      ▼ Gargalo · maior perda
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-[6.5rem] shrink-0 text-right sm:w-32">
                  <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-neutral-600 dark:text-neutral-300">
                    {etapa.rotulo}
                  </p>
                </div>
                <div className="relative h-9 flex-1 overflow-hidden rounded-md bg-neutral-100 dark:bg-neutral-900">
                  <div
                    className="h-full rounded-md bg-gradient-to-r from-green-500 to-lime-400 transition-all"
                    style={{ width: `${largura}%` }}
                  />
                </div>
                <div className="flex w-24 shrink-0 items-center justify-end gap-2 sm:w-28">
                  <span className="text-base font-extrabold tabular-nums text-neutral-900 dark:text-white">
                    {etapa.valor}
                  </span>
                  <SeloCrescimento atual={etapa.valor} anterior={etapa.anterior} />
                </div>
              </div>
              {etapa.nota && (
                <p className="pl-[7.5rem] text-[10px] text-neutral-400 sm:pl-36">{etapa.nota}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-5 border-t border-neutral-100 pt-5 sm:grid-cols-5 dark:border-neutral-800">
        <Medidor
          valor={taxaAgendamentoLeadsNovos}
          rotulo="Agendamento · leads novos"
          legenda={`meta ${Math.round(metas.taxa_agendamento_min * 100)}% · ${metricas.reunioesMarcadasLeadNovo} de ${leadsNovos}`}
          bom={
            taxaAgendamentoLeadsNovos === null ? null : taxaAgendamentoLeadsNovos >= metas.taxa_agendamento_min
          }
        />
        <Medidor
          valor={metricas.taxaAgendamento}
          rotulo="Agendamento · novos e antigos"
          legenda={`meta ${Math.round(metas.taxa_agendamento_min * 100)}% · ${metricas.reunioesMarcadas} de ${metricas.leadsTrabalhados}`}
          bom={metricas.taxaAgendamento === null ? null : metricas.taxaAgendamento >= metas.taxa_agendamento_min}
        />
        <Medidor
          valor={metricas.taxaComparecimento}
          rotulo="Comparecimento"
          legenda={`meta ${Math.round(metas.taxa_comparecimento_min * 100)}%`}
          bom={
            metricas.taxaComparecimento === null ? null : metricas.taxaComparecimento >= metas.taxa_comparecimento_min
          }
        />
        <Medidor
          valor={noShowPct / 100}
          rotulo="No-show"
          legenda={`máx. ${Math.round(noShowMax * 100)}%`}
          bom={noShowPct / 100 <= noShowMax}
        />
        <Medidor
          valor={metricas.taxaVenda}
          rotulo="Venda"
          legenda={`meta ${Math.round(metas.taxa_venda_min * 100)}%`}
          bom={metricas.taxaVenda === null ? null : metricas.taxaVenda >= metas.taxa_venda_min}
        />
      </div>
    </div>
  );
}
