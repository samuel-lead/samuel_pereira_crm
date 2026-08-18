import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type Metricas = {
  leadsTrabalhados: number;
  reunioesMarcadas: number;
  reunioesRealizadas: number;
  noShow: number;
  vendas: number;
  receita: number;
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
    { count: leadsTrabalhados },
    { count: reunioesMarcadas },
    { count: reunioesRealizadas },
    { count: noShow },
    { data: vendasData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
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
      .select("receita_venda")
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

  const leads = leadsTrabalhados ?? 0;
  const marcadas = reunioesMarcadas ?? 0;
  const realizadas = reunioesRealizadas ?? 0;

  return {
    leadsTrabalhados: leads,
    reunioesMarcadas: marcadas,
    reunioesRealizadas: realizadas,
    noShow: noShow ?? 0,
    vendas,
    receita,
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

export type LeadPorOrigem = {
  origem: string;
  quantidade: number;
};

// De onde vieram os leads no período (todos, não só quem virou venda) —
// soma tudo da org, é visão de time.
export async function calcularLeadsPorOrigem(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<LeadPorOrigem[]> {
  const { data } = await supabase
    .from("leads")
    .select("origem")
    .eq("org_id", orgId)
    .is("arquivado_em", null)
    .gte("declarado_em", inicio.toISOString())
    .lt("declarado_em", fim.toISOString());

  const porOrigem = new Map<string, number>();
  for (const lead of data ?? []) {
    const origem = lead.origem?.trim() || "Sem origem";
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
// SDRs lado a lado (só admin vê essa visão).
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
    .order("nome");

  const lista = usuarios ?? [];

  return Promise.all(
    lista.map(async (usuario) => {
      const metricas = await calcularMetricas(supabase, usuario.id, inicio, fim);
      return { ...metricas, usuarioId: usuario.id, nome: usuario.nome };
    })
  );
}
