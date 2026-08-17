import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  calcularMetricas,
  inicioDaSemana,
  inicioDoMes,
  type Metricas,
} from "@/lib/metricas";

type MetasConfig = {
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

function CardNumero({
  titulo,
  valor,
  meta,
  amostraInsuficiente,
}: {
  titulo: string;
  valor: number;
  meta?: number;
  amostraInsuficiente?: boolean;
}) {
  const bateuMeta = meta !== undefined ? valor >= meta : null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {titulo}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{valor}</p>
      {meta !== undefined && (
        <p
          className={`mt-1 text-xs font-medium ${
            bateuMeta ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {bateuMeta ? "✓" : "⚠"} piso: {meta}
        </p>
      )}
      {amostraInsuficiente && (
        <p className="mt-1 text-xs text-neutral-400">amostra pequena</p>
      )}
    </div>
  );
}

function LinhaTaxa({
  nome,
  valor,
  minimo,
}: {
  nome: string;
  valor: number | null;
  minimo: number;
}) {
  const bateu = valor !== null ? valor >= minimo : null;
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-2 last:border-0">
      <span className="text-sm text-neutral-600">{nome}</span>
      <span className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            bateu === null
              ? "text-neutral-400"
              : bateu
                ? "text-emerald-600"
                : "text-red-600"
          }`}
        >
          {formatarPercentual(valor)}
        </span>
        <span className="text-xs text-neutral-400">
          mín. {Math.round(minimo * 100)}%
        </span>
      </span>
    </div>
  );
}

function SecaoPeriodo({
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
      <h2 className="mb-3 text-base font-semibold text-neutral-900">{titulo}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <CardNumero
          titulo="Leads trabalhados"
          valor={metricas.leadsTrabalhados}
          meta={pisoLeads}
          amostraInsuficiente={metricas.leadsTrabalhados < 20}
        />
        <CardNumero
          titulo="Reuniões marcadas"
          valor={metricas.reunioesMarcadas}
          meta={pisoReunioes}
        />
        <CardNumero titulo="Reuniões realizadas" valor={metricas.reunioesRealizadas} />
        <CardNumero titulo="No Show" valor={metricas.noShow} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Vendas e receita
          </p>
          <p className="mt-1 text-2xl font-bold text-neutral-900">
            {metricas.vendas} venda{metricas.vendas === 1 ? "" : "s"}
          </p>
          <p className="text-sm text-emerald-700">{formatarMoeda(metricas.receita)}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Taxas
          </p>
          <LinhaTaxa
            nome="Agendamento"
            valor={metricas.taxaAgendamento}
            minimo={metas.taxa_agendamento_min}
          />
          <LinhaTaxa
            nome="Comparecimento"
            valor={metricas.taxaComparecimento}
            minimo={metas.taxa_comparecimento_min}
          />
          <LinhaTaxa
            nome="Venda"
            valor={metricas.taxaVenda}
            minimo={metas.taxa_venda_min}
          />
        </div>
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, org_id")
    .eq("id", user!.id)
    .single();

  const { data: metasData } = await supabase
    .from("metas_config")
    .select(
      "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
    )
    .eq("org_id", usuario!.org_id)
    .single();

  const metas = metasData as MetasConfig;
  const agora = new Date();
  const amanha = new Date(agora);
  amanha.setDate(amanha.getDate() + 1);
  amanha.setHours(0, 0, 0, 0);

  const [metricasSemana, metricasMes] = await Promise.all([
    calcularMetricas(supabase, usuario!.id, inicioDaSemana(agora), amanha),
    calcularMetricas(supabase, usuario!.id, inicioDoMes(agora), amanha),
  ]);

  return (
    <>
      <PageHeader titulo="Métricas" />

      <main className="space-y-8 px-6 py-6">
        <SecaoPeriodo titulo="Esta semana" metricas={metricasSemana} metas={metas} />
        <SecaoPeriodo titulo="Este mês" metricas={metricasMes} metas={metas} />

        <p className="text-xs text-neutral-400">
          Taxas e piso são constantes do sistema — nunca baixam por
          performance. Calculado direto no banco, sem estimativa.
        </p>
      </main>
    </>
  );
}
