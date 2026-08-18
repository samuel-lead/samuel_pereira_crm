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
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .eq("status", "realizada")
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .eq("status", "nao_compareceu")
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("leads")
      .select("valor_venda")
      .eq("usuario_id", usuarioId)
      .eq("status", "vendido")
      .gte("vendido_em", inicioISO)
      .lt("vendido_em", fimISO),
  ]);

  const vendas = vendasData?.length ?? 0;
  const receita = (vendasData ?? []).reduce(
    (soma, l) => soma + Number(l.valor_venda ?? 0),
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
