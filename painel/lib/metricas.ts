import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Metricas = {
  leadsTrabalhados: number;
  reunioesMarcadas: number;
  reunioesRealizadas: number;
  noShow: number;
  vendas: number;
  receita: number;
  faturamento: number;
  ticketMedio: number | null;
  taxaAgendamento: number | null;
  taxaComparecimento: number | null;
  taxaVenda: number | null;
  diasUteis: number;
};

// Semana sempre domingo a sábado (não segunda a domingo) — combinado com
// o Samuel, senão as contas de "esta semana" batem errado.
export function inicioDaSemana(data: Date) {
  const d = new Date(data);
  const dia = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimDaSemana(inicioSemana: Date) {
  const d = new Date(inicioSemana);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function inicioDoMes(data: Date) {
  const d = new Date(data.getFullYear(), data.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diasUteisEntre(inicio: Date, fim: Date) {
  let contador = 0;
  const cursor = new Date(inicio);
  while (cursor < fim) {
    const diaSemana = cursor.getDay();
    if (diaSemana !== 0 && diaSemana !== 6) contador += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return contador;
}

export async function calcularMetricas(
  supabase: SupabaseServerClient,
  usuarioId: string,
  inicio: Date,
  fim: Date
): Promise<Metricas> {
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [
    { data: leadsDeclarados },
    { data: reunioesDoPeriodo },
    { count: reunioesRealizadas },
    { count: noShow },
    { data: vendasData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id")
      .eq("usuario_id", usuarioId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    // Toda reunião "ativa" no período — marcada dentro dele OU com a call
    // dentro dele (mesmo que tenha sido marcada num período anterior, ex.:
    // marcada em julho, call em agosto). Serve pra duas contas: "reuniões
    // marcadas" do período e "lead trabalhado" do período (mais embaixo) —
    // sem isso, "realizadas + no show" podia passar de "marcadas", porque
    // elas usavam datas diferentes (marcada_em vs agendada_para).
    supabase
      .from("reunioes")
      .select("id, lead_id, leads!inner(arquivado_em)")
      .eq("usuario_id", usuarioId)
      .is("leads.arquivado_em", null)
      .or(
        `and(marcada_em.gte.${inicioISO},marcada_em.lt.${fimISO}),and(agendada_para.gte.${inicioISO},agendada_para.lt.${fimISO})`
      ),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .eq("status", "realizada")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .eq("status", "nao_compareceu")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("leads")
      .select("receita_venda, valor_venda")
      .eq("usuario_id", usuarioId)
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .gte("vendido_em", inicioISO)
      .lt("vendido_em", fimISO),
  ]);

  const vendas = vendasData?.length ?? 0;
  const receita = (vendasData ?? []).reduce(
    (soma, l) => soma + Number(l.receita_venda ?? 0),
    0
  );
  const faturamento = (vendasData ?? []).reduce(
    (soma, l) => soma + Number(l.valor_venda ?? 0),
    0
  );

  const idsTrabalhados = new Set<string>([
    ...(leadsDeclarados ?? []).map((l) => l.id),
    ...(reunioesDoPeriodo ?? []).map((r) => r.lead_id),
  ]);

  const leads = idsTrabalhados.size;
  const marcadas = reunioesDoPeriodo?.length ?? 0;
  const realizadas = reunioesRealizadas ?? 0;

  return {
    leadsTrabalhados: leads,
    reunioesMarcadas: marcadas,
    reunioesRealizadas: realizadas,
    noShow: noShow ?? 0,
    vendas,
    receita,
    faturamento,
    ticketMedio: vendas > 0 ? receita / vendas : null,
    taxaAgendamento: leads > 0 ? marcadas / leads : null,
    taxaComparecimento: marcadas > 0 ? realizadas / marcadas : null,
    taxaVenda: realizadas > 0 ? vendas / realizadas : null,
    diasUteis: diasUteisEntre(inicio, fim < new Date() ? fim : new Date()),
  };
}

export type VendaPorCanal = {
  canal: string;
  quantidade: number;
  faturamento: number;
};

// Quais canais de origem do lead trouxeram mais vendas — soma tudo da org,
// não só do usuário logado (é uma visão de time, não pessoal).
export async function calcularVendasPorCanal(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<VendaPorCanal[]> {
  const { data } = await supabase
    .from("leads")
    .select("origem, valor_venda")
    .eq("org_id", orgId)
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .gte("vendido_em", inicio.toISOString())
    .lt("vendido_em", fim.toISOString());

  const porCanal = new Map<string, VendaPorCanal>();
  for (const lead of data ?? []) {
    const canal = lead.origem?.trim() || "Sem origem";
    const atual = porCanal.get(canal) ?? { canal, quantidade: 0, faturamento: 0 };
    atual.quantidade += 1;
    atual.faturamento += Number(lead.valor_venda ?? 0);
    porCanal.set(canal, atual);
  }

  return Array.from(porCanal.values()).sort((a, b) => b.faturamento - a.faturamento);
}

export type VendaPorProduto = {
  produto: string;
  quantidade: number;
  faturamento: number;
};

// Quais produtos mais venderam no período — soma tudo da org, não só do
// usuário logado (é uma visão de time, não pessoal).
export async function calcularVendasPorProduto(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<VendaPorProduto[]> {
  const { data } = await supabase
    .from("leads")
    .select("produto, valor_venda")
    .eq("org_id", orgId)
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .gte("vendido_em", inicio.toISOString())
    .lt("vendido_em", fim.toISOString());

  const porProduto = new Map<string, VendaPorProduto>();
  for (const lead of data ?? []) {
    const produto = lead.produto?.trim() || "Sem produto";
    const atual = porProduto.get(produto) ?? { produto, quantidade: 0, faturamento: 0 };
    atual.quantidade += 1;
    atual.faturamento += Number(lead.valor_venda ?? 0);
    porProduto.set(produto, atual);
  }

  return Array.from(porProduto.values()).sort((a, b) => b.faturamento - a.faturamento);
}

export type LeadPorOrigem = {
  origem: string;
  quantidade: number;
};

// De onde vieram os leads trabalhados no período (todos, não só quem virou
// venda) — soma tudo da org, é visão de time. Usa a mesma regra de "lead
// trabalhado" das outras métricas: declarado no período OU com reunião
// (marcada ou realizada) dentro dele, mesmo que tenha entrado antes.
export async function calcularLeadsPorOrigem(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<LeadPorOrigem[]> {
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [{ data: declarados }, { data: viaReuniao }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, origem")
      .eq("org_id", orgId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    supabase
      .from("reunioes")
      .select("lead_id, leads!inner(origem, arquivado_em)")
      .eq("org_id", orgId)
      .is("leads.arquivado_em", null)
      .or(
        `and(marcada_em.gte.${inicioISO},marcada_em.lt.${fimISO}),and(agendada_para.gte.${inicioISO},agendada_para.lt.${fimISO})`
      ),
  ]);

  const origemPorLead = new Map<string, string | null>();
  for (const lead of declarados ?? []) {
    origemPorLead.set(lead.id, lead.origem);
  }
  for (const reuniao of viaReuniao ?? []) {
    if (!origemPorLead.has(reuniao.lead_id)) {
      const leadJunto = reuniao.leads as unknown as { origem: string | null };
      origemPorLead.set(reuniao.lead_id, leadJunto?.origem ?? null);
    }
  }

  const porOrigem = new Map<string, number>();
  for (const origemLead of origemPorLead.values()) {
    const origem = origemLead?.trim() || "Sem origem";
    porOrigem.set(origem, (porOrigem.get(origem) ?? 0) + 1);
  }

  return Array.from(porOrigem.entries())
    .map(([origem, quantidade]) => ({ origem, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
}

// Meta de receita do mês (o que entra no caixa, não o valor da venda em
// si) — é uma só, da empresa toda (não por usuário). Todo mundo vê, só
// admin define (garantido pela RLS também, não só aqui).
export async function buscarMetaReceitaMes(
  supabase: SupabaseServerClient,
  orgId: string,
  ano: number,
  mes: number
): Promise<number | null> {
  const { data } = await supabase
    .from("metas_mensais")
    .select("meta_receita")
    .eq("org_id", orgId)
    .eq("ano", ano)
    .eq("mes", mes)
    .maybeSingle();

  if (!data || data.meta_receita === null) return null;
  return Number(data.meta_receita);
}

// Receita da empresa toda no período (soma de todo mundo, não só quem tá
// logado) — usada como progresso da meta, que também é da empresa toda.
export async function calcularReceitaOrg(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<number> {
  const { data } = await supabase
    .from("leads")
    .select("receita_venda")
    .eq("org_id", orgId)
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .gte("vendido_em", inicio.toISOString())
    .lt("vendido_em", fim.toISOString());

  return (data ?? []).reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);
}

export type MetricasUsuario = Metricas & { usuarioId: string; nome: string };

// Performance individual de cada usuário da org no período — pra comparar
// SDRs lado a lado (só admin vê essa visão). Admin sempre entra aqui mesmo
// sem função escolhida — ele acumula todas as funções, não precisa se
// declarar SDR pra contar.
export async function calcularMetricasPorUsuario(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<MetricasUsuario[]> {
  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nome")
    .eq("org_id", orgId)
    .or("funcao.eq.sdr,papel.eq.admin")
    .order("nome");

  const lista = usuarios ?? [];

  return Promise.all(
    lista.map(async (usuario) => {
      const metricas = await calcularMetricas(supabase, usuario.id, inicio, fim);
      return { ...metricas, usuarioId: usuario.id, nome: usuario.nome };
    })
  );
}

export type BonusSdr = MetricasUsuario & {
  noShowPercentual: number | null;
  bonusPorCallRealizada: number;
  bonusFimDeSemana: number;
  bonusPorFaturamento: number;
  totalBonus: number;
};

// Bônus da equipe de pré-vendas — mesma régua da aba "BÔNUS SDRs" da
// planilha do Samuel, três blocos que se somam:
// 1. Volume de calls realizadas no mês: ≥60 → R$300, ≥80 → R$500, ≥100 → R$1.000
// 2. R$20 por call realizada que tinha sido MARCADA num fim de semana
//    (sábado ou domingo — olha a data do agendamento, não da call em si)
// 3. Faturamento das vendas fechadas no mês: ≥R$50mil → R$1.000,
//    ≥R$80mil → R$2.000, ≥R$100mil → R$3.000
export async function calcularBonusPorSdr(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<BonusSdr[]> {
  const metricasPorUsuario = await calcularMetricasPorUsuario(supabase, orgId, inicio, fim);
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  return Promise.all(
    metricasPorUsuario.map(async (m) => {
      const { data: realizadasNoPeriodo } = await supabase
        .from("reunioes")
        .select("marcada_em, leads!inner(arquivado_em)")
        .eq("usuario_id", m.usuarioId)
        .eq("status", "realizada")
        .is("leads.arquivado_em", null)
        .gte("agendada_para", inicioISO)
        .lt("agendada_para", fimISO);

      const callsMarcadasNoFimDeSemana = (realizadasNoPeriodo ?? []).filter((r) => {
        const diaDaSemana = new Date(r.marcada_em).getDay();
        return diaDaSemana === 0 || diaDaSemana === 6;
      }).length;

      const bonusPorCallRealizada =
        m.reunioesRealizadas >= 100
          ? 1000
          : m.reunioesRealizadas >= 80
            ? 500
            : m.reunioesRealizadas >= 60
              ? 300
              : 0;

      const bonusFimDeSemana = callsMarcadasNoFimDeSemana * 20;

      const bonusPorFaturamento =
        m.faturamento >= 100000 ? 3000 : m.faturamento >= 80000 ? 2000 : m.faturamento >= 50000 ? 1000 : 0;

      return {
        ...m,
        noShowPercentual:
          m.reunioesMarcadas > 0 ? 1 - m.reunioesRealizadas / m.reunioesMarcadas : null,
        bonusPorCallRealizada,
        bonusFimDeSemana,
        bonusPorFaturamento,
        totalBonus: bonusPorCallRealizada + bonusFimDeSemana + bonusPorFaturamento,
      };
    })
  );
}

export type ResumoMes = {
  mes: number;
  metaReceita: number | null;
  faturamento: number;
  receita: number;
};

// Visão do ano inteiro, mês a mês — meta, faturamento e receita. Meses que
// já têm lead de verdade no CRM (a partir de quando começou a ser usado)
// são calculados ao vivo, somando os leads vendidos daquele mês. Meses de
// antes disso (só existiam na planilha) usam o resultado real que foi
// registrado à mão em `metas_mensais.faturamento_real`/`receita_real`.
export async function calcularResumoAno(
  supabase: SupabaseServerClient,
  orgId: string,
  ano: number
): Promise<ResumoMes[]> {
  const { data: metas } = await supabase
    .from("metas_mensais")
    .select("mes, meta_receita, faturamento_real, receita_real")
    .eq("org_id", orgId)
    .eq("ano", ano);

  const metaPorMes = new Map<
    number,
    { meta_receita: number | null; faturamento_real: number | null; receita_real: number | null }
  >();
  for (const linha of metas ?? []) {
    metaPorMes.set(linha.mes, linha);
  }

  const resultado: ResumoMes[] = [];

  for (let mes = 1; mes <= 12; mes++) {
    const registro = metaPorMes.get(mes);
    const metaReceita = registro?.meta_receita != null ? Number(registro.meta_receita) : null;

    if (registro && (registro.faturamento_real !== null || registro.receita_real !== null)) {
      resultado.push({
        mes,
        metaReceita,
        faturamento: Number(registro.faturamento_real ?? 0),
        receita: Number(registro.receita_real ?? 0),
      });
      continue;
    }

    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 1);
    const { data: vendas } = await supabase
      .from("leads")
      .select("valor_venda, receita_venda")
      .eq("org_id", orgId)
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .gte("vendido_em", inicio.toISOString())
      .lt("vendido_em", fim.toISOString());

    const faturamento = (vendas ?? []).reduce((soma, l) => soma + Number(l.valor_venda ?? 0), 0);
    const receita = (vendas ?? []).reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);

    resultado.push({ mes, metaReceita, faturamento, receita });
  }

  return resultado;
}
