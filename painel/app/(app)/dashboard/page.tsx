import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { SecaoPeriodo, type MetasConfig } from "@/components/dashboard-ui";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { GraficoEvolucaoMensal } from "@/components/grafico-evolucao-mensal";
import { VendasPorCanal } from "@/components/vendas-por-canal";
import { VendasPorProduto } from "@/components/vendas-por-produto";
import { PerformanceSdr } from "@/components/performance-sdr";
import { GraficoEnviadosPorMes } from "@/components/grafico-enviados-por-mes";
import { PerformanceCloser } from "@/components/performance-closer";
import { PerformanceCorretor } from "@/components/performance-corretor";
import { RelatorioTrafego, type DadosTrafego } from "@/components/relatorio-trafego";
import { relatorioTrafegoLiberado } from "@/lib/paginas-ocultas";
import { LeadsPorOrigem } from "@/components/leads-por-origem";
import { LeadsRecentes, type LeadRecente } from "@/components/leads-recentes";
import { ProximasReunioes, type ReuniaoProxima } from "@/components/proximas-reunioes";
import { ReunioesAtrasadas, type ReuniaoAtrasada } from "@/components/reunioes-atrasadas";
import { MetaReceitaWidget } from "@/components/meta-receita-widget";
import { CopiarResultadoSemanaButton } from "@/components/copiar-resultado-semana-button";
import { CopiarRelatorioButton } from "@/components/copiar-relatorio-button";
import {
  calcularMetricas,
  calcularMetricasOrg,
  calcularVendasPorCanal,
  calcularVendasPorProduto,
  calcularMetricasPorUsuario,
  contarPropostasIniciadasPorUsuario,
  contarEnviadosAoCloserPorUsuario,
  calcularMetricasPorCloser,
  calcularLeadsPorOrigem,
  calcularResumoAno,
  calcularEnviadosPorMes,
  calcularReceitaOrg,
  calcularFaturamentoOrg,
  calcularNegociacoesAbertas,
  calcularSafraVendas,
  buscarMetaReceitaMes,
  inicioDoMes,
  diasUteisEntre,
  type Metricas,
  type NegociacoesAbertas,
} from "@/lib/metricas";
import { inicioDoDia, UM_DIA_MS, periodoAnteriorSemana, periodoAnteriorMes, periodoAnterior } from "@/lib/datas";
import { resolverPeriodo, formatarDataCurta, type ChavePeriodo } from "@/lib/periodo";
import { numerarNiveis, ordenarNiveisDoFunil } from "@/lib/niveis";

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;
const NIVEL_REAGENDAMENTO = 6;
import { call, calls, reunioes, Reunioes, Sdr, ehImobiliario, semCloser, dashboardEmBarras, relatorioSemCalls, funilConsorcio, funilGondolas, semReuniaoNoFunil } from "@/lib/terminologia";

// Semana e mês comparam com o pedaço de calendário anterior de verdade
// (periodoAnteriorSemana/Mes, já existentes); os demais atalhos usam o
// deslocamento genérico pela mesma duração.
function resolverPeriodoAnterior(chave: ChavePeriodo, inicio: Date, fim: Date, agora: Date) {
  if (chave === "semana") return periodoAnteriorSemana(inicio, agora);
  if (chave === "mes") return periodoAnteriorMes(inicio, agora);
  return periodoAnterior(inicio, fim);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mesAno?: string; de?: string; ate?: string; anoEvolucao?: string; origemTrafego?: string }>;
}) {
  const { periodo, mesAno, de, ate, anoEvolucao, origemTrafego } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const agora = new Date();
  const inicioHoje = inicioDoDia(agora);
  const amanha = new Date(inicioHoje.getTime() + UM_DIA_MS);
  const inicioMesAtual = inicioDoMes(agora);
  const anoAtualNumero = inicioHoje.getUTCFullYear();
  const anoEvolucaoNumero = anoEvolucao ? Number(anoEvolucao) : anoAtualNumero;
  const anoEvolucaoResolvido =
    Number.isFinite(anoEvolucaoNumero) && anoEvolucaoNumero > 0 ? anoEvolucaoNumero : anoAtualNumero;

  const souAdmin = usuario!.papel === "admin";

  const periodoResolvido =
    resolverPeriodo({ periodo, mesAno, de, ate }, agora) ?? resolverPeriodo({ periodo: "mes" }, agora)!;
  const anteriorResolvido = resolverPeriodoAnterior(
    periodoResolvido.chave,
    periodoResolvido.inicio,
    periodoResolvido.fim,
    agora
  );

  // O que a tela desta empresa realmente mostra — não vale a pena buscar no
  // banco o que fica escondido (Inove Gôndolas não tem o painel principal nem
  // ranking de Closer; empresa sem reunião não tem "Próximas reuniões").
  const publicoCedo = usuario!.publico_org;
  const ehGondolasCedo = funilGondolas(publicoCedo);
  const mostraReunioes = !semReuniaoNoFunil(publicoCedo);
  const mostraRankingCloser = !ehImobiliario(publicoCedo) && !semCloser(publicoCedo) && !ehGondolasCedo;

  // Contagens extras e conversão por safra não dependem do resto: saem já,
  // junto com tudo, em vez de esperar o bloco grande terminar (antes eram
  // mais 1 ou 2 esperas em fila depois dele).
  const contagemConsorcioP = funilConsorcio(publicoCedo)
    ? Promise.all([
        souAdmin
          ? Promise.resolve({ porUsuario: new Map<string, number>(), total: 0 })
          : contarPropostasIniciadasPorUsuario(supabase, usuario!.org_id, inicioHoje, amanha),
        contarPropostasIniciadasPorUsuario(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
        contarPropostasIniciadasPorUsuario(supabase, usuario!.org_id, anteriorResolvido.inicio, anteriorResolvido.fim),
      ])
    : null;
  const contagemGondolasP = ehGondolasCedo
    ? Promise.all([
        souAdmin
          ? Promise.resolve({ porUsuario: new Map<string, number>(), total: 0 })
          : contarEnviadosAoCloserPorUsuario(supabase, usuario!.org_id, inicioHoje, amanha),
        contarEnviadosAoCloserPorUsuario(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
        contarEnviadosAoCloserPorUsuario(supabase, usuario!.org_id, anteriorResolvido.inicio, anteriorResolvido.fim),
      ])
    : null;
  // Ketlyn (11/11/26): "Leads de tráfego" (formulários) dentro da Visão geral,
  // entre "Canais que venderam" e a evolução. Só admin de imobiliária
  // liberada; mostra todo o histórico (não segue o filtro de período).
  const trafegoP: Promise<DadosTrafego | null> =
    souAdmin && ehImobiliario(publicoCedo)
      ? (async () => {
          if (!(await relatorioTrafegoLiberado(supabase, usuario!.org_id))) return null;
          const { data } = await supabase.rpc("relatorio_trafego", {
            p_origem: origemTrafego ?? "__trafego__",
            p_inicio: null,
            p_fim: null,
          });
          return (data as DadosTrafego | null) ?? null;
        })()
      : Promise.resolve(null);
  const safraP =
    dashboardEmBarras(publicoCedo) && !ehGondolasCedo
      ? calcularSafraVendas(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim)
      : Promise.resolve(undefined);

  const [
    metricasHoje,
    metricasPeriodo,
    metricasAnterioresPeriodo,
    vendasPorCanal,
    vendasPorProduto,
    performancePeriodoSdr,
    performancePeriodoCloser,
    leadsPorOrigem,
    resumoAnoEvolucao,
    receitaOrgMes,
    metaReceita,
    negociacoesAbertas,
    { data: metasData },
    { data: niveisData },
    { data: leadsRecentesData },
    { count: leadsUltimaHora },
    { data: reunioesProximasData },
    { data: leadsAtrasadosData },
    { data: usuariosData },
  ] = await Promise.all([
    // Só o SDR usa isso — o admin já vê todo mundo na tabela "Performance
    // por SDR" (com o mesmo botão de copiar). Isso é sempre HOJE,
    // independente do filtro do painel (é um check-in diário).
    souAdmin
      ? Promise.resolve(null)
      : calcularMetricas(supabase, usuario!.id, inicioHoje, amanha, {
          apenasDeclaradosNoPeriodo: true,
        }),
    // "Leads novos" (cartão e tabela) usa metricas.leadsTrabalhadosDeclarados
    // — que já vem dessa mesma chamada, sem carry-forward — em vez de
    // chamar a função de novo só com uma opção diferente (isso disparava
    // as mesmas 12 consultas duas vezes a cada carregamento da página).
    // Inove Gôndolas não mostra o painel principal: pula essas 24 consultas.
    ehGondolasCedo
      ? Promise.resolve(null as unknown as Metricas)
      : calcularMetricasOrg(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    ehGondolasCedo
      ? Promise.resolve(null as unknown as Metricas)
      : calcularMetricasOrg(supabase, usuario!.org_id, anteriorResolvido.inicio, anteriorResolvido.fim),
    ehGondolasCedo
      ? Promise.resolve([] as Awaited<ReturnType<typeof calcularVendasPorCanal>>)
      : calcularVendasPorCanal(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    ehGondolasCedo
      ? Promise.resolve([] as Awaited<ReturnType<typeof calcularVendasPorProduto>>)
      : calcularVendasPorProduto(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim),
    // "Leads Novos" da tabela também precisa ser estrito, mesmo motivo do
    // card acima — sem isso, a coluna mostrava o número largo (com
    // carry-forward) embaixo de um título que promete "novos".
    calcularMetricasPorUsuario(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim, {
      apenasDeclaradosNoPeriodo: true,
    }),
    mostraRankingCloser
      ? calcularMetricasPorCloser(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim)
      : Promise.resolve([] as Awaited<ReturnType<typeof calcularMetricasPorCloser>>),
    calcularLeadsPorOrigem(supabase, usuario!.org_id, periodoResolvido.inicio, periodoResolvido.fim, {
      apenasDeclaradosNoPeriodo: true,
    }),
    // Inove Gôndolas: a evolução é de leads enviados pro Elton (ver mais abaixo).
    ehGondolasCedo
      ? Promise.resolve([] as Awaited<ReturnType<typeof calcularResumoAno>>)
      : calcularResumoAno(supabase, usuario!.org_id, anoEvolucaoResolvido),
    // Meta de receita é sempre do mês civil corrente — não depende do
    // filtro. Imobiliário acompanha VGV (valor_venda), não receita
    // (dinheiro recebido) — Samuel pediu essa troca.
    ehImobiliario(usuario!.publico_org)
      ? calcularFaturamentoOrg(supabase, usuario!.org_id, inicioMesAtual, amanha)
      : calcularReceitaOrg(supabase, usuario!.org_id, inicioMesAtual, amanha),
    buscarMetaReceitaMes(supabase, usuario!.org_id, inicioMesAtual.getUTCFullYear(), inicioMesAtual.getUTCMonth() + 1),
    ehGondolasCedo
      ? Promise.resolve({ quantidade: 0, valor: 0 } as NegociacoesAbertas)
      : calcularNegociacoesAbertas(supabase, usuario!.org_id),
    supabase
      .from("metas_config")
      .select(
        "piso_leads_dia, piso_reunioes_dia, taxa_agendamento_min, taxa_comparecimento_min, taxa_venda_min"
      )
      .eq("org_id", usuario!.org_id)
      .single(),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    // "Leads recentes" — os últimos que chegaram, sempre os mais novos,
    // independente do filtro de período escolhido lá em cima.
    supabase
      .from("leads")
      .select(
        "id, nome, foto_url, origem, nivel_ordem, declarado_em, responsavel_id, isca_respostas(nivel_qualificacao)"
      )
      .eq("org_id", usuario!.org_id)
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .order("declarado_em", { ascending: false })
      .limit(5),
    // Quantos leads chegaram na última hora — número em destaque em cima
    // da lista de "Leads recentes".
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("org_id", usuario!.org_id)
      .is("arquivado_em", null)
      .neq("status", "vendido")
      .gte("declarado_em", new Date(agora.getTime() - 60 * 60 * 1000).toISOString()),
    // "Próximas reuniões" — só as que ainda vão acontecer, mais próxima
    // primeiro, igual já é feito na coluna "Reunião marcada" do Kanban.
    // Sem limite — mostra todas, a lista rola dentro do card (Samuel
    // pediu: só umas 5 visíveis de cada vez, o resto no scroll).
    mostraReunioes
      ? supabase
          .from("reunioes")
          .select("id, lead_id, agendada_para, reagendada, closer_id, usuario_id")
          .eq("org_id", usuario!.org_id)
          .eq("status", "marcada")
          .gte("agendada_para", agora.toISOString())
          .order("agendada_para", { ascending: true })
      : Promise.resolve({
          data: [] as {
            id: string;
            lead_id: string;
            agendada_para: string;
            reagendada: boolean;
            closer_id: string | null;
            usuario_id: string;
          }[],
        }),
    // "Reuniões que não aconteceram" — conta pelo nível ATUAL do lead, não
    // pelo histórico da reunião: só entra quem está agora mesmo em "Reunião
    // marcada" (e já passou da data), "No-show" ou "Precisa reagendar".
    // Samuel foi explícito: se o lead já foi ajustado e saiu de lá, some
    // da lista na hora, mesmo que a reunião antiga ainda exista no banco.
    mostraReunioes
      ? supabase
          .from("leads")
          .select("id, nome, foto_url, nivel_ordem, entrou_nivel_em, responsavel_id")
          .eq("org_id", usuario!.org_id)
          .is("arquivado_em", null)
          .neq("status", "vendido")
          .in("nivel_ordem", [NIVEL_REUNIAO_MARCADA, NIVEL_NO_SHOW, NIVEL_REAGENDAMENTO])
      : Promise.resolve({
          data: [] as {
            id: string;
            nome: string;
            foto_url: string | null;
            nivel_ordem: number;
            entrou_nivel_em: string;
            responsavel_id: string | null;
          }[],
        }),
    supabase.from("usuarios").select("id, nome"),
  ]);

  const idsLeadsAtrasados = (leadsAtrasadosData ?? []).map((l) => l.id);
  // idsLeadsReunioes não depende do resultado da consulta de reuniões dos
  // atrasados abaixo (só de idsLeadsAtrasados, já conhecido) — as duas
  // saem juntas no mesmo Promise.all em vez de uma esperar a outra
  // terminar (eram sequenciais sem motivo, uma ida-e-volta a mais por
  // navegação nessa página).
  const idsLeadsProximasReunioes = (reunioesProximasData ?? []).map((r) => r.lead_id);
  const idsLeadsReunioes = Array.from(new Set([...idsLeadsProximasReunioes, ...idsLeadsAtrasados]));

  const [{ data: reunioesDosAtrasadosData }, { data: leadsDasReunioesData }] = await Promise.all([
    // Pega a reunião mais recente de cada lead atrasado — é ela que tem a
    // data, o SDR e o Closer pra mostrar no card.
    idsLeadsAtrasados.length
      ? supabase
          .from("reunioes")
          .select("lead_id, agendada_para, status, closer_id, usuario_id, marcada_em")
          .in("lead_id", idsLeadsAtrasados)
          .order("marcada_em", { ascending: false })
      : Promise.resolve({ data: [] as { lead_id: string; agendada_para: string; status: string; closer_id: string | null; usuario_id: string; marcada_em: string }[] }),
    idsLeadsReunioes.length
      ? supabase
          .from("leads")
          .select("id, nome, foto_url")
          .in("id", idsLeadsReunioes)
          .is("arquivado_em", null)
      : Promise.resolve({ data: [] as { id: string; nome: string; foto_url: string | null }[] }),
  ]);

  const ultimaReuniaoPorLead = new Map<
    string,
    { agendada_para: string; status: string; closer_id: string | null; usuario_id: string }
  >();
  for (const r of reunioesDosAtrasadosData ?? []) {
    if (!ultimaReuniaoPorLead.has(r.lead_id)) ultimaReuniaoPorLead.set(r.lead_id, r);
  }

  const metas = metasData as MetasConfig | null;
  const publicoOrg = usuario!.publico_org;

  // Funil de consórcio (Banker): "propostas iniciadas" = leads que entraram
  // em "Proposta iniciada" no período. Substitui as reuniões marcadas nos
  // cartões, no ranking e no relatório copiável do vendedor.
  let propostasIniciadasHoje = 0;
  let performanceSdr = performancePeriodoSdr;
  let metricas = metricasPeriodo;
  let metricasAnteriores = metricasAnterioresPeriodo;
  if (contagemConsorcioP) {
    const [hoje, periodoAtual, periodoAnterior] = await contagemConsorcioP;
    propostasIniciadasHoje = hoje.porUsuario.get(usuario!.id) ?? 0;
    performanceSdr = performancePeriodoSdr.map((linha) => ({
      ...linha,
      propostasIniciadas: periodoAtual.porUsuario.get(linha.usuarioId) ?? 0,
    }));
    metricas = { ...metricasPeriodo, propostasIniciadas: periodoAtual.total };
    metricasAnteriores = { ...metricasAnterioresPeriodo, propostasIniciadas: periodoAnterior.total };
  }
  // Inove Gôndolas (sem reunião): "enviados pro Elton" = leads que entraram no
  // nível 3 no período. Faz o papel das reuniões marcadas nos cartões, no
  // ranking e no relatório copiável do SDR.
  let enviadosHoje = 0;
  if (contagemGondolasP) {
    const [hoje, periodoAtual, periodoAnterior] = await contagemGondolasP;
    enviadosHoje = hoje.porUsuario.get(usuario!.id) ?? 0;
    // Samuel (06/11/26): o ranking da Inove é só dos SDRs — Elton (closer) e
    // Lorrany (admin) ficam de fora.
    performanceSdr = performancePeriodoSdr
      .filter((linha) => linha.funcao === "sdr")
      .map((linha) => ({
        ...linha,
        enviadosAoCloser: periodoAtual.porUsuario.get(linha.usuarioId) ?? 0,
        leadsEnviados: periodoAtual.leadsPorUsuario.get(linha.usuarioId) ?? [],
      }));
    metricas = { ...metricasPeriodo, enviadosAoCloser: periodoAtual.total };
    metricasAnteriores = { ...metricasAnterioresPeriodo, enviadosAoCloser: periodoAnterior.total };
  }
  // Conversão do funil em barras: vendas fechadas dentro do período.
  const safraVenda = await safraP;
  const enviadosPorMes = ehGondolasCedo
    ? await calcularEnviadosPorMes(supabase, usuario!.org_id, anoEvolucaoResolvido)
    : [];
  // Dias úteis do período (mesma conta de calcularMetricasOrg) — usado no
  // gráfico de origens, mesmo quando o painel principal não é montado.
  const diasUteisPeriodo = diasUteisEntre(
    periodoResolvido.inicio,
    periodoResolvido.fim < new Date() ? periodoResolvido.fim : new Date()
  );

  const todosNiveis = ordenarNiveisDoFunil((niveisData ?? []) as { ordem: number; nome: string; numerado: boolean; destacado: boolean }[]);
  const nomePorNivel = new Map(todosNiveis.map((n) => [n.ordem, n.nome]));
  const numerosVisiveis = numerarNiveis(todosNiveis);
  const nomePorUsuarioId = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const leadsRecentes: LeadRecente[] = (leadsRecentesData ?? []).map((lead) => {
    const numero = numerosVisiveis.get(lead.nivel_ordem);
    const nomeNivel = nomePorNivel.get(lead.nivel_ordem) ?? "—";
    return {
      id: lead.id,
      nome: lead.nome,
      foto_url: lead.foto_url,
      origem: lead.origem,
      declarado_em: lead.declarado_em,
      etapa: numero ? `N${numero} - ${nomeNivel}` : nomeNivel,
      nomeResponsavel: lead.responsavel_id ? (nomePorUsuarioId.get(lead.responsavel_id) ?? null) : null,
      nivelQualificacao:
        (lead.isca_respostas?.[0]?.nivel_qualificacao as LeadRecente["nivelQualificacao"]) ?? null,
    };
  });

  const leadPorId = new Map((leadsDasReunioesData ?? []).map((l) => [l.id, l]));
  const proximasReunioes: ReuniaoProxima[] = (reunioesProximasData ?? [])
    .map((r) => {
      const lead = leadPorId.get(r.lead_id);
      if (!lead) return null;
      return {
        id: r.id,
        agendadaPara: r.agendada_para,
        reagendada: r.reagendada,
        lead,
        nomeSdr: nomePorUsuarioId.get(r.usuario_id) ?? null,
        nomeCloser: r.closer_id ? (nomePorUsuarioId.get(r.closer_id) ?? null) : null,
      };
    })
    .filter((item): item is ReuniaoProxima => item !== null);

  const STATUS_POR_NIVEL: Record<number, ReuniaoAtrasada["status"]> = {
    [NIVEL_REUNIAO_MARCADA]: "marcada",
    [NIVEL_NO_SHOW]: "nao_compareceu",
    [NIVEL_REAGENDAMENTO]: "cancelada",
  };

  const reunioesAtrasadas: ReuniaoAtrasada[] = (leadsAtrasadosData ?? [])
    .map((leadAtrasado) => {
      const lead = leadPorId.get(leadAtrasado.id);
      const ultimaReuniao = ultimaReuniaoPorLead.get(leadAtrasado.id);
      if (!lead || !ultimaReuniao) return null;
      // Em "Reunião marcada", só conta como atrasada se a data já passou —
      // se ainda está por vir, é uma reunião futura normal (já aparece em
      // "Próximas reuniões"), não uma que "deveria ter acontecido".
      if (
        leadAtrasado.nivel_ordem === NIVEL_REUNIAO_MARCADA &&
        new Date(ultimaReuniao.agendada_para) >= agora
      ) {
        return null;
      }
      return {
        id: leadAtrasado.id,
        agendadaPara: ultimaReuniao.agendada_para,
        status: STATUS_POR_NIVEL[leadAtrasado.nivel_ordem],
        lead,
        nomeSdr: nomePorUsuarioId.get(ultimaReuniao.usuario_id) ?? null,
        nomeCloser: ultimaReuniao.closer_id ? (nomePorUsuarioId.get(ultimaReuniao.closer_id) ?? null) : null,
      };
    })
    .filter((item): item is ReuniaoAtrasada => item !== null)
    .sort((a, b) => new Date(a.agendadaPara).getTime() - new Date(b.agendadaPara).getTime());

  const dadosTrafego = await trafegoP;
  const paramsDash = { periodo, mesAno, de, ate, anoEvolucao };
  const hrefOrigemTrafego = (origem: string) =>
    `/dashboard?${new URLSearchParams({
      ...Object.fromEntries(Object.entries(paramsDash).filter(([, v]) => v)) as Record<string, string>,
      origemTrafego: origem,
    }).toString()}#leads-trafego`;

  return (
    <>
      <PageHeader titulo="Visão geral" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
        {!souAdmin && metricasHoje && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">Meu relatório de hoje</h2>
              {relatorioSemCalls(publicoOrg) ? (
                <p className="text-xs text-neutral-500">
                  {metricasHoje.leadsTrabalhados} lead{metricasHoje.leadsTrabalhados === 1 ? "" : "s"} novo
                  {metricasHoje.leadsTrabalhados === 1 ? "" : "s"} · {metricasHoje.ligacoes} ligaç
                  {metricasHoje.ligacoes === 1 ? "ão feita" : "ões feitas"} · {metricasHoje.ligacoesAtendidas}{" "}
                  atendida{metricasHoje.ligacoesAtendidas === 1 ? "" : "s"} · {propostasIniciadasHoje} proposta
                  {propostasIniciadasHoje === 1 ? "" : "s"} iniciada{propostasIniciadasHoje === 1 ? "" : "s"},{" "}
                  {formatarDataCurta(agora)}.
                </p>
              ) : funilGondolas(publicoOrg) ? (
                <p className="text-xs text-neutral-500">
                  {enviadosHoje} oportunidade{enviadosHoje === 1 ? "" : "s"} enviada{enviadosHoje === 1 ? "" : "s"} para o Elton ·{" "}
                  {metricasHoje.ligacoes} ligaç{metricasHoje.ligacoes === 1 ? "ão" : "ões"},{" "}
                  {formatarDataCurta(agora)}.
                </p>
              ) : (
                <p className="text-xs text-neutral-500">
                  {metricasHoje.reunioesMarcadas}{" "}
                  {metricasHoje.reunioesMarcadas === 1 ? call(publicoOrg) : calls(publicoOrg)} marcada
                  {metricasHoje.reunioesMarcadas === 1 ? "" : "s"} · {metricasHoje.ligacoes} ligaç
                  {metricasHoje.ligacoes === 1 ? "ão" : "ões"}, {formatarDataCurta(agora)}.
                </p>
              )}
            </div>
            <CopiarRelatorioButton
              periodoLabel={formatarDataCurta(agora)}
              callsMarcadas={metricasHoje.reunioesMarcadas}
              callsReagendadas={metricasHoje.reunioesReagendadas}
              ligacoesFeitas={metricasHoje.ligacoes}
              ligacoesAtendidas={metricasHoje.ligacoesAtendidas}
              propostasIniciadas={propostasIniciadasHoje}
              enviadosAoCloser={enviadosHoje}
              leadsNovos={metricasHoje.leadsTrabalhados}
              publicoOrg={publicoOrg}
            />
          </section>
        )}

        {/* Inove Gôndolas (Samuel, 06/11/26): sem meta de receita. */}
        {!funilGondolas(publicoOrg) && (
          <MetaReceitaWidget
            metaReceita={metaReceita}
            receitaAtual={receitaOrgMes}
            podeEditar={souAdmin}
            publicoOrg={publicoOrg}
          />
        )}

        <div className="sticky top-0 z-10 -mx-6 bg-[#f4f5f7] px-6 py-2 md:top-[var(--page-header-altura,64px)]">
          <FiltroPeriodo
            baseHref="/dashboard"
            periodoAtual={periodoResolvido.chave}
            mesAnoAtual={mesAno}
            deAtual={de}
            ateAtual={ate}
            publicoOrg={publicoOrg}
          />
        </div>

        {/* Inove Gôndolas (Samuel, 04/11/26): sem o painel principal (receita e
            funil) na Visão geral — fica só o ranking do SDR e a parte de baixo. */}
        {funilGondolas(publicoOrg) ? null : metas ? (
          <SecaoPeriodo
            titulo={periodoResolvido.titulo}
            subtitulo={periodoResolvido.subtitulo}
            metricas={metricas}
            metricasAnteriores={metricasAnteriores}
            metas={metas}
            publicoOrg={publicoOrg}
            leadsNovos={metricas.leadsTrabalhadosDeclarados}
            safraVenda={safraVenda}
            acao={
              souAdmin ? (
                <CopiarResultadoSemanaButton
                  periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
                  metricas={metricas}
                  negociacoes={negociacoesAbertas}
                  publicoOrg={publicoOrg}
                />
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {souAdmin ? (
              <>
                Ainda não tem metas configuradas pra essa organização.{" "}
                <Link href="/configuracoes" className="font-medium underline">
                  Defina o piso de leads/{reunioes(publicoOrg)} e as taxas em Configurações
                </Link>{" "}
                pra ver o progresso aqui.
              </>
            ) : (
              "Ainda não tem metas configuradas pra essa organização. Peça pra um admin configurar em Configurações."
            )}
          </div>
        )}

        {/* Imobiliário não separa SDR de Closer — é tudo "Corretor", um
            papel só (ver Sdr() em lib/terminologia.ts). Lá não tem ranking
            nem Closer: só a tabela de performance do corretor, com todas as
            métricas (Samuel pediu de volta). Mentoria segue com os dois
            rankings lado a lado. */}
        {ehImobiliario(publicoOrg) ? (
          <PerformanceCorretor
            titulo={`Performance por ${Sdr(publicoOrg)} — ${periodoResolvido.titulo.toLowerCase()}`}
            dados={performanceSdr}
            periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
            publicoOrg={publicoOrg}
          />
        ) : semCloser(publicoOrg) || funilGondolas(publicoOrg) ? (
          // Empresa sem Closer (ex.: Banker - Consorcio) e Inove Gôndolas: só
          // o ranking do SDR/Vendedor, sem o ranking de Closer.
          <PerformanceSdr
            dados={performanceSdr}
            periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
            publicoOrg={publicoOrg}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <PerformanceSdr
              dados={performanceSdr}
              periodo={periodoResolvido.subtitulo ?? periodoResolvido.titulo}
              publicoOrg={publicoOrg}
            />

            <PerformanceCloser dados={performancePeriodoCloser} publicoOrg={publicoOrg} />
          </div>
        )}

        {!semReuniaoNoFunil(publicoOrg) && (
          <div className="grid gap-4 lg:grid-cols-2">
            <ReunioesAtrasadas reunioes={reunioesAtrasadas} publicoOrg={publicoOrg} />
            <ProximasReunioes
              reunioes={proximasReunioes}
              publicoOrg={publicoOrg}
              total={proximasReunioes.length}
            />
          </div>
        )}

        <section>
          <h2 className="mb-3 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-neutral-900">
            <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
            Visão geral da equipe
          </h2>
          <div className="space-y-4">
            {/* Inove Gôndolas (Samuel, 06/11/26): sem "Leads recentes" na Visão geral. */}
            {!funilGondolas(publicoOrg) && (
              <LeadsRecentes leads={leadsRecentes} leadsUltimaHora={leadsUltimaHora ?? 0} publicoOrg={publicoOrg} />
            )}
            <LeadsPorOrigem
              titulo={`Origens dos leads — ${periodoResolvido.titulo.toLowerCase()}`}
              dados={leadsPorOrigem}
              diasUteis={diasUteisPeriodo}
            />
            {/* Inove Gôndolas (Samuel, 06/11/26): sem "Canais que venderam" nem
                "Produtos mais vendidos" na Visão geral. */}
            {!funilGondolas(publicoOrg) && (
              <div className="grid gap-4 lg:grid-cols-2">
                <VendasPorCanal dados={vendasPorCanal} periodo={periodoResolvido.titulo} />
                <VendasPorProduto dados={vendasPorProduto} periodo={periodoResolvido.titulo} />
              </div>
            )}
            {dadosTrafego && (
              <div id="leads-trafego" className="scroll-mt-4">
                <RelatorioTrafego
                  d={dadosTrafego}
                  publicoOrg={publicoOrg}
                  periodo={null}
                  embutido
                  hrefOrigem={hrefOrigemTrafego}
                />
              </div>
            )}
            {funilGondolas(publicoOrg) ? (
              <GraficoEnviadosPorMes
                dados={enviadosPorMes}
                ano={anoEvolucaoResolvido}
                anoAtual={anoAtualNumero}
                mesAtual={anoEvolucaoResolvido === anoAtualNumero ? inicioHoje.getUTCMonth() + 1 : 0}
              />
            ) : (
              <GraficoEvolucaoMensal
              dados={resumoAnoEvolucao}
              ano={anoEvolucaoResolvido}
              anoAtual={anoAtualNumero}
              mesAtual={anoEvolucaoResolvido === anoAtualNumero ? inicioHoje.getUTCMonth() + 1 : 0}
              publicoOrg={publicoOrg}
            />
            )}
          </div>
        </section>

      </main>
    </>
  );
}
