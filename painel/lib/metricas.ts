import type { createClient } from "@/lib/supabase/server";
import { UM_DIA_MS, diaDaSemana, diaBrasil } from "@/lib/datas";

export { inicioDaSemana, inicioDoMes } from "@/lib/datas";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const FUSO_BRASIL_MS = 3 * 60 * 60 * 1000; // UTC-3, sem horário de verão

export type Metricas = {
  leadsTrabalhados: number;
  ligacoes: number;
  reunioesMarcadas: number;
  reunioesReagendadas: number;
  reunioesRealizadas: number;
  reunioesComProposta: number;
  propostas: number;
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

// Fim da semana é só pra mostrar a data (ex.: "16/08 a 22/08") — a query em
// si sempre usa "amanhã" como limite superior, não isso aqui.
export function fimDaSemana(inicioSemana: Date) {
  return new Date(inicioSemana.getTime() + 6 * UM_DIA_MS);
}

// Quantos dias úteis (fuso Brasil) existem entre duas datas — usado pra
// saber quanto já "andou" do piso de leads/reuniões no período.
export function diasUteisEntre(inicio: Date, fim: Date) {
  const inicioLocal = new Date(inicio.getTime() - FUSO_BRASIL_MS);
  const fimLocal = new Date(fim.getTime() - FUSO_BRASIL_MS);
  const diaInicio = Date.UTC(inicioLocal.getUTCFullYear(), inicioLocal.getUTCMonth(), inicioLocal.getUTCDate());
  const diaFim = Date.UTC(fimLocal.getUTCFullYear(), fimLocal.getUTCMonth(), fimLocal.getUTCDate());

  let contador = 0;
  for (let cursor = diaInicio; cursor < diaFim; cursor += UM_DIA_MS) {
    const diaSemana = new Date(cursor).getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) contador += 1;
  }
  return contador;
}

export async function calcularMetricas(
  supabase: SupabaseServerClient,
  usuarioId: string,
  inicio: Date,
  fim: Date,
  // Relatório do DIA (Samuel pediu): "leads trabalhados" conta só quem
  // entrou de verdade no período, sem puxar lead antigo que só teve
  // reunião marcada/acontecendo hoje — isso já é contado no dia em que a
  // reunião foi marcada. Semana/mês continuam com o carry-forward normal
  // (lead que entrou num período mas teve a call depois também conta lá).
  opcoes: { apenasDeclaradosNoPeriodo?: boolean } = {}
): Promise<Metricas> {
  const apenasDeclarados = opcoes.apenasDeclaradosNoPeriodo ?? false;
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [
    { data: leadsDeclarados },
    { count: ligacoes },
    { data: reunioesDoPeriodo },
    { count: reunioesMarcadasNovas },
    { count: reunioesReagendadas },
    { count: reunioesRealizadas },
    { count: reunioesComProposta },
    { count: propostas },
    { count: noShow },
    { data: vendasData },
  ] = await Promise.all([
    // Quem TRABALHA o lead é o responsável atual, não quem digitou ele no
    // sistema (usuario_id é só quem criou o registro — às vezes é um admin
    // cadastrando em nome de um SDR). Todo o resto abaixo segue a mesma
    // lógica: métrica de SDR é sobre quem tem o lead hoje.
    supabase
      .from("leads")
      .select("id")
      .eq("responsavel_id", usuarioId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    // Ligação é diferente: conta pra quem realmente discou, não pra quem é
    // o responsável do lead — por isso continua em usuario_id.
    supabase
      .from("interacoes")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", usuarioId)
      .eq("tipo", "ligacao")
      .is("excluido_em", null)
      .gte("ocorreu_em", inicioISO)
      .lt("ocorreu_em", fimISO),
    // Toda reunião "ativa" no período — marcada dentro dele OU com a call
    // dentro dele (mesmo que tenha sido marcada num período anterior, ex.:
    // marcada em julho, call em agosto). Usada só pra "lead trabalhado" do
    // período (mais embaixo) — NÃO é mais usada pra contar "reuniões
    // marcadas" (ver query logo abaixo).
    supabase
      .from("reunioes")
      .select("id, lead_id, leads!inner(arquivado_em, responsavel_id)")
      .eq("leads.responsavel_id", usuarioId)
      .is("leads.arquivado_em", null)
      .or(
        `and(marcada_em.gte.${inicioISO},marcada_em.lt.${fimISO}),and(agendada_para.gte.${inicioISO},agendada_para.lt.${fimISO})`
      ),
    // "Reuniões marcadas" de verdade: só agendamento NOVO feito dentro do
    // período (marcada_em), não importa quando a call vai acontecer — e sem
    // contar reagendamento (reagendada=true), que não é call nova, é a
    // mesma call mudando de data.
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, responsavel_id)", { count: "exact", head: true })
      .eq("leads.responsavel_id", usuarioId)
      .eq("reagendada", false)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, responsavel_id)", { count: "exact", head: true })
      .eq("leads.responsavel_id", usuarioId)
      .eq("reagendada", true)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, responsavel_id)", { count: "exact", head: true })
      .eq("leads.responsavel_id", usuarioId)
      .eq("status", "realizada")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    // Taxa de venda só pode contar reunião que teve proposta registrada —
    // uma reunião realizada sem proposta não é uma chance de venda de
    // verdade. `proposta_valor` é um campo no lead (não por reunião), então
    // isso conta "o lead dessa reunião tem proposta registrada hoje", não
    // necessariamente feita naquela reunião específica.
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, responsavel_id, proposta_valor)", { count: "exact", head: true })
      .eq("leads.responsavel_id", usuarioId)
      .eq("status", "realizada")
      .is("leads.arquivado_em", null)
      .not("leads.proposta_valor", "is", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    // Propostas de verdade enviadas no período (independe de reunião ou
    // nível — o lead pode até já ter ido pra Base ou Oportunidade futura).
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("responsavel_id", usuarioId)
      .is("arquivado_em", null)
      .not("proposta_enviada_em", "is", null)
      .gte("proposta_enviada_em", inicioISO)
      .lt("proposta_enviada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, responsavel_id)", { count: "exact", head: true })
      .eq("leads.responsavel_id", usuarioId)
      .eq("status", "nao_compareceu")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("leads")
      .select("receita_venda, valor_venda, proposta_valor")
      .eq("responsavel_id", usuarioId)
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .gte("vendido_em", inicioISO)
      .lt("vendido_em", fimISO),
  ]);

  // Receita/faturamento contam TODA venda (é dinheiro real, não pode sumir
  // do relatório por falta de burocracia). A taxa de conversão é outra
  // coisa — mede processo, não caixa — por isso só credita venda cujo lead
  // tem proposta registrada, senão passaria de 100% quando alguém vende
  // sem passar pelo "Registrar proposta".
  const vendas = vendasData?.length ?? 0;
  const vendasComProposta = (vendasData ?? []).filter(
    (l) => l.proposta_valor != null
  ).length;
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
    ...(apenasDeclarados ? [] : (reunioesDoPeriodo ?? []).map((r) => r.lead_id)),
  ]);

  const leads = idsTrabalhados.size;
  const marcadas = reunioesMarcadasNovas ?? 0;
  const realizadas = reunioesRealizadas ?? 0;
  const comProposta = reunioesComProposta ?? 0;

  return {
    leadsTrabalhados: leads,
    ligacoes: ligacoes ?? 0,
    reunioesMarcadas: marcadas,
    reunioesReagendadas: reunioesReagendadas ?? 0,
    reunioesRealizadas: realizadas,
    reunioesComProposta: comProposta,
    propostas: propostas ?? 0,
    noShow: noShow ?? 0,
    vendas,
    receita,
    faturamento,
    ticketMedio: vendas > 0 ? receita / vendas : null,
    taxaAgendamento: leads > 0 ? marcadas / leads : null,
    taxaComparecimento: marcadas > 0 ? realizadas / marcadas : null,
    taxaVenda: comProposta > 0 ? vendasComProposta / comProposta : null,
    diasUteis: diasUteisEntre(inicio, fim < new Date() ? fim : new Date()),
  };
}

// Mesmo cálculo do calcularMetricas, mas da organização inteira, não de uma
// pessoa só. É o que aparece pro admin em "Esta semana"/"Este mês" — antes
// mostrava só a produção pessoal do admin (quase sempre zero, já que quem
// vende de verdade é o time), parecendo que não tinha faturamento nenhum.
export async function calcularMetricasOrg(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date,
  opcoes: { apenasDeclaradosNoPeriodo?: boolean } = {}
): Promise<Metricas> {
  const apenasDeclarados = opcoes.apenasDeclaradosNoPeriodo ?? false;
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [
    { data: leadsDeclarados },
    { count: ligacoes },
    { data: reunioesDoPeriodo },
    { count: reunioesMarcadasNovas },
    { count: reunioesReagendadas },
    { count: reunioesRealizadas },
    { count: reunioesComProposta },
    { count: propostas },
    { count: noShow },
    { data: vendasData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id")
      .eq("org_id", orgId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    supabase
      .from("interacoes")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("tipo", "ligacao")
      .is("excluido_em", null)
      .gte("ocorreu_em", inicioISO)
      .lt("ocorreu_em", fimISO),
    // Usada só pra "lead trabalhado" do período — não conta mais "reuniões
    // marcadas" (ver query logo abaixo).
    supabase
      .from("reunioes")
      .select("id, lead_id, leads!inner(arquivado_em)")
      .eq("org_id", orgId)
      .is("leads.arquivado_em", null)
      .or(
        `and(marcada_em.gte.${inicioISO},marcada_em.lt.${fimISO}),and(agendada_para.gte.${inicioISO},agendada_para.lt.${fimISO})`
      ),
    // "Reuniões marcadas" de verdade: só agendamento NOVO no período
    // (marcada_em), sem contar reagendamento — mesma regra da versão
    // individual em calcularMetricas, só que pra org inteira.
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("reagendada", false)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("reagendada", true)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "realizada")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em, proposta_valor)", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "realizada")
      .is("leads.arquivado_em", null)
      .not("leads.proposta_valor", "is", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    // Propostas de verdade enviadas no período (independe de reunião ou
    // nível — o lead pode até já ter ido pra Base ou Oportunidade futura).
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .is("arquivado_em", null)
      .not("proposta_enviada_em", "is", null)
      .gte("proposta_enviada_em", inicioISO)
      .lt("proposta_enviada_em", fimISO),
    supabase
      .from("reunioes")
      .select("id, leads!inner(arquivado_em)", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "nao_compareceu")
      .is("leads.arquivado_em", null)
      .gte("agendada_para", inicioISO)
      .lt("agendada_para", fimISO),
    supabase
      .from("leads")
      .select("receita_venda, valor_venda, proposta_valor")
      .eq("org_id", orgId)
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .gte("vendido_em", inicioISO)
      .lt("vendido_em", fimISO),
  ]);

  const vendas = vendasData?.length ?? 0;
  const vendasComProposta = (vendasData ?? []).filter(
    (l) => l.proposta_valor != null
  ).length;
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
    ...(apenasDeclarados ? [] : (reunioesDoPeriodo ?? []).map((r) => r.lead_id)),
  ]);

  const leads = idsTrabalhados.size;
  const marcadas = reunioesMarcadasNovas ?? 0;
  const realizadas = reunioesRealizadas ?? 0;
  const comProposta = reunioesComProposta ?? 0;

  return {
    leadsTrabalhados: leads,
    ligacoes: ligacoes ?? 0,
    reunioesMarcadas: marcadas,
    reunioesReagendadas: reunioesReagendadas ?? 0,
    reunioesRealizadas: realizadas,
    reunioesComProposta: comProposta,
    propostas: propostas ?? 0,
    noShow: noShow ?? 0,
    vendas,
    receita,
    faturamento,
    ticketMedio: vendas > 0 ? receita / vendas : null,
    taxaAgendamento: leads > 0 ? marcadas / leads : null,
    taxaComparecimento: marcadas > 0 ? realizadas / marcadas : null,
    taxaVenda: comProposta > 0 ? vendasComProposta / comProposta : null,
    diasUteis: diasUteisEntre(inicio, fim < new Date() ? fim : new Date()),
  };
}

export type VendasHoje = {
  vendas: number;
  faturamento: number;
  receita: number;
};

// Vendas fechadas hoje — soma tudo da org, é visão de time (mesma regra da
// receita do mês, que também é da empresa toda).
export async function calcularVendasHoje(
  supabase: SupabaseServerClient,
  orgId: string,
  inicioHoje: Date,
  amanha: Date
): Promise<VendasHoje> {
  const { data } = await supabase
    .from("leads")
    .select("valor_venda, receita_venda")
    .eq("org_id", orgId)
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .gte("vendido_em", inicioHoje.toISOString())
    .lt("vendido_em", amanha.toISOString());

  const vendas = data?.length ?? 0;
  const faturamento = (data ?? []).reduce(
    (soma, l) => soma + Number(l.valor_venda ?? 0),
    0
  );
  const receita = (data ?? []).reduce(
    (soma, l) => soma + Number(l.receita_venda ?? 0),
    0
  );

  return { vendas, faturamento, receita };
}

// Quando foi a última venda fechada pela org, não importa quem — usado pra
// mostrar "há quanto tempo não vende ninguém".
export async function buscarUltimaVenda(
  supabase: SupabaseServerClient,
  orgId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("leads")
    .select("vendido_em")
    .eq("org_id", orgId)
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .not("vendido_em", "is", null)
    .order("vendido_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.vendido_em ?? null;
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

export type PontoEvolucao = {
  dia: string; // "YYYY-MM-DD", fuso Brasil
  faturamento: number;
  receita: number;
  vendas: number;
  leads: number;
  reunioes: number;
};

// Série dia a dia pro gráfico de "Evolução comercial" — uma query só por
// tabela (não uma por dia, ao contrário de calcularResumoAno) e agrupa em
// memória, igual calcularLeadsPorOrigem/calcularVendasPorCanal fazem.
export async function calcularEvolucaoComercial(
  supabase: SupabaseServerClient,
  orgId: string,
  inicio: Date,
  fim: Date
): Promise<PontoEvolucao[]> {
  const inicioISO = inicio.toISOString();
  const fimISO = fim.toISOString();

  const [{ data: leadsData }, { data: reunioesData }, { data: vendasData }] = await Promise.all([
    supabase
      .from("leads")
      .select("declarado_em")
      .eq("org_id", orgId)
      .is("arquivado_em", null)
      .gte("declarado_em", inicioISO)
      .lt("declarado_em", fimISO),
    supabase
      .from("reunioes")
      .select("marcada_em, leads!inner(arquivado_em)")
      .eq("org_id", orgId)
      .eq("reagendada", false)
      .is("leads.arquivado_em", null)
      .gte("marcada_em", inicioISO)
      .lt("marcada_em", fimISO),
    supabase
      .from("leads")
      .select("vendido_em, valor_venda, receita_venda")
      .eq("org_id", orgId)
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .gte("vendido_em", inicioISO)
      .lt("vendido_em", fimISO),
  ]);

  const porDia = new Map<string, PontoEvolucao>();
  function pegar(dia: string): PontoEvolucao {
    let ponto = porDia.get(dia);
    if (!ponto) {
      ponto = { dia, faturamento: 0, receita: 0, vendas: 0, leads: 0, reunioes: 0 };
      porDia.set(dia, ponto);
    }
    return ponto;
  }

  for (const lead of leadsData ?? []) {
    pegar(diaBrasil(lead.declarado_em)).leads += 1;
  }
  for (const reuniao of reunioesData ?? []) {
    pegar(diaBrasil(reuniao.marcada_em)).reunioes += 1;
  }
  for (const venda of vendasData ?? []) {
    if (!venda.vendido_em) continue;
    const ponto = pegar(diaBrasil(venda.vendido_em));
    ponto.vendas += 1;
    ponto.faturamento += Number(venda.valor_venda ?? 0);
    ponto.receita += Number(venda.receita_venda ?? 0);
  }

  // Preenche todo dia do período, mesmo sem nenhum dado — um dia parado
  // tem que aparecer como zero na linha, não sumir do gráfico.
  const dias: PontoEvolucao[] = [];
  for (let cursor = inicio.getTime(); cursor < fim.getTime(); cursor += UM_DIA_MS) {
    dias.push(pegar(diaBrasil(new Date(cursor).toISOString())));
  }

  return dias.sort((a, b) => a.dia.localeCompare(b.dia));
}

export type NegociacoesAbertas = {
  quantidade: number;
  valor: number;
};

// Propostas em aberto agora, não é uma métrica de período: lead ainda ativo
// (nem vendido, nem perdido) com valor de proposta registrado — é uma foto
// do momento, não muda se a semana já acabou ou não.
export async function calcularNegociacoesAbertas(
  supabase: SupabaseServerClient,
  orgId: string
): Promise<NegociacoesAbertas> {
  const { data } = await supabase
    .from("leads")
    .select("proposta_valor")
    .eq("org_id", orgId)
    .eq("status", "ativo")
    .is("arquivado_em", null)
    .not("proposta_valor", "is", null);

  const quantidade = data?.length ?? 0;
  const valor = (data ?? []).reduce((soma, l) => soma + Number(l.proposta_valor ?? 0), 0);

  return { quantidade, valor };
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
  fim: Date,
  opcoes: { apenasDeclaradosNoPeriodo?: boolean } = {}
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
      const metricas = await calcularMetricas(supabase, usuario.id, inicio, fim, opcoes);
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
        const dia = diaDaSemana(r.marcada_em);
        return dia === 0 || dia === 6;
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
