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

// Cor só entra como acento pontual (ícone pequeno, texto do rótulo) — o
// cartão em si é sempre branco/neutro, nunca um fundo pastel espalhado
// (padrão "premium" pedido pelo Samuel, ver stat-cell.tsx).
const ESQUEMAS = {
  violeta: { icone: "bg-violet-600 text-white", texto: "text-violet-700" },
  ceu: { icone: "bg-sky-600 text-white", texto: "text-sky-700" },
  esmeralda: { icone: "bg-green-600 text-white", texto: "text-green-700" },
  rosa: { icone: "bg-rose-600 text-white", texto: "text-rose-700" },
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
    <div className="min-w-[140px] flex-1 px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${cor.icone}`}>
          <Icone className="h-3.5 w-3.5" />
        </span>
        {meta !== undefined && (
          <span className={`text-[10px] font-bold ${bateuMeta ? "text-green-600" : "text-amber-600"}`}>
            {bateuMeta ? "✓ piso" : `piso ${meta}`}
          </span>
        )}
      </div>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${cor.texto}`}>
        {titulo}
      </p>
      <p className="mt-0.5 text-2xl font-extrabold text-neutral-900">{valor}</p>
      {amostraInsuficiente && (
        <p className="mt-0.5 text-[10px] text-neutral-400">amostra pequena</p>
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
  destaque = false,
}: {
  titulo: string;
  valorFormatado: string;
  variacaoPct: number | null;
  esquema: keyof typeof ESQUEMAS_COMPARATIVO;
  Icone: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  // A Receita é a métrica que mais importa — fica sozinha na linha
  // inteira (não divide espaço com as outras) pra chamar mais atenção e,
  // de quebra, garante que sempre sobra um risquinho embaixo de Vendas
  // igual nas outras linhas, sem depender de quantas métricas cabem.
  destaque?: boolean;
}) {
  const subiu = variacaoPct !== null && variacaoPct > 0;
  const desceu = variacaoPct !== null && variacaoPct < 0;

  return (
    <div className={`shrink-0 px-4 py-3 ${destaque ? "w-full lg:w-1/5" : "w-1/2 sm:w-1/3 lg:w-1/5"}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span
          className={`flex items-center justify-center rounded-lg ${ESQUEMAS_COMPARATIVO[esquema]} ${
            destaque ? "h-8 w-8" : "h-6 w-6"
          }`}
        >
          <Icone className={destaque ? "h-4 w-4" : "h-3 w-3"} />
        </span>
        {variacaoPct !== null && (
          <span
            className={`text-[10px] font-bold ${
              subiu ? "text-green-400" : desceu ? "text-red-400" : "text-neutral-500"
            }`}
          >
            {subiu ? "▲" : desceu ? "▼" : "—"} {Math.abs(Math.round(variacaoPct * 100))}%
          </span>
        )}
      </div>
      <p className={`font-extrabold text-white ${destaque ? "text-3xl" : "text-xl"}`}>{valorFormatado}</p>
      <p className="mt-0.5 text-[11px] font-medium text-neutral-400">{titulo}</p>
    </div>
  );
}

function BarraTaxa({
  nome,
  valor,
  minimo,
  detalhe,
}: {
  nome: string;
  valor: number | null;
  minimo: number;
  // Texto pequeno embaixo da barra mostrando a conta (numerador ÷
  // denominador) — só a Taxa de Agendamento usa isso, pra dar pra
  // conferir de onde vem o %, já que o denominador (leads trabalhados)
  // não aparece em nenhum outro lugar visível da tela.
  detalhe?: string;
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
      {detalhe && <p className="mt-1 text-[11px] text-neutral-400">{detalhe}</p>}
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
  leadsNovos,
}: {
  titulo: string;
  subtitulo?: string;
  metricas: Metricas;
  metricasAnteriores?: Metricas;
  metas: MetasConfig;
  acao?: React.ReactNode;
  publicoOrg?: string;
  // "Leads novos" tem que ser só quem entrou de verdade no período (sem
  // carry-forward de mês anterior) — diferente de leadsTrabalhados, que
  // é usado em outro lugar (Taxa de Agendamento) e continua incluindo
  // lead de período passado que teve reunião agora. Se não vier, cai de
  // volta pro leadsTrabalhados normal.
  leadsNovos?: number;
}) {
  const pisoLeads = metas.piso_leads_dia * metricas.diasUteis;
  const pisoReunioes = metas.piso_reunioes_dia * metricas.diasUteis;
  const leadsNovosValor = leadsNovos ?? metricas.leadsTrabalhados;
  // Segunda leitura da mesma taxa, olhando só reunião de lead que TAMBÉM
  // entrou nesse período (não é toda reunião marcada — isso incluiria
  // reunião de lead antigo em cima do denominador de lead novo, o que
  // não faz sentido).
  const taxaAgendamentoLeadsNovos =
    leadsNovosValor > 0 ? metricas.reunioesMarcadasLeadNovo / leadsNovosValor : null;

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

      <div className="flex flex-wrap divide-x divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <CardNumero
          titulo="Leads novos"
          valor={leadsNovosValor}
          meta={pisoLeads}
          amostraInsuficiente={leadsNovosValor < 20}
          esquema="violeta"
          Icone={IconeAlvo}
        />
        <CardNumero
          titulo="Leads trabalhados"
          valor={metricas.leadsTrabalhados}
          esquema="violeta"
          Icone={IconeCarta}
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
          <div className="flex flex-wrap divide-x divide-y divide-neutral-800 overflow-hidden rounded-xl bg-neutral-900 shadow-sm">
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
              destaque
            />
          </div>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Taxas
        </p>
        <BarraTaxa
          nome="Agendamento (só leads novos)"
          valor={taxaAgendamentoLeadsNovos}
          minimo={metas.taxa_agendamento_min}
          detalhe={`${metricas.reunioesMarcadasLeadNovo} de ${leadsNovosValor} leads novos, este mês.`}
        />
        <BarraTaxa
          nome="Agendamento (leads novos e antigos)"
          valor={metricas.taxaAgendamento}
          minimo={metas.taxa_agendamento_min}
          detalhe={`${metricas.reunioesMarcadas} de ${metricas.leadsTrabalhados} trabalhados este mês, incluindo lead do período anterior e que chegou nesse mês.`}
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
