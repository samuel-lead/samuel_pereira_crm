import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { IndicacaoPegaToggle } from "@/components/indicacao-pega-toggle";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeMoeda } from "@/components/icons";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { EditarDataVendaInline } from "@/components/editar-data-venda-inline";
import { resolverPeriodo } from "@/lib/periodo";
import { aplicarBuscaLead } from "@/lib/busca-leads";
import { buscarTodas } from "@/lib/supabase/paginar";
import { Sdr, Faturamento, Receita, ehImobiliario, semCloser } from "@/lib/terminologia";

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  foto_url: string | null;
  origem: string | null;
  produto: string | null;
  valor_venda: number | null;
  receita_venda: number | null;
  declarado_em: string;
  vendido_em: string | null;
  responsavel_id: string | null;
  indicacao_pega_em: string | null;
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; mesAno?: string; busca?: string; de?: string; ate?: string }>;
}) {
  const {
    periodo: periodoFiltro,
    mesAno: mesAnoFiltro,
    busca: buscaFiltro,
    de: deFiltro,
    ate: ateFiltro,
  } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();
  const publicoOrg = usuario?.publico_org ?? "mentoria";
  // "Indicação pega" é do Samuel (dono da plataforma) — só ele vê a coluna.
  const mostrarIndicacaoPega = usuario?.super_admin === true;

  const agora = new Date();
  // Sem nenhum filtro escolhido, cai no mês atual — não faz sentido abrir
  // a tela de Clientes e ver a lista inteira desde o começo dos tempos.
  const periodoResolvido =
    resolverPeriodo({ periodo: periodoFiltro, mesAno: mesAnoFiltro, de: deFiltro, ate: ateFiltro }, agora) ??
    resolverPeriodo({ periodo: "mes" }, agora)!;

  // Em pedaços de 1000 (o Supabase corta em 1000 linhas por consulta, calado).
  const montarConsulta = (de: number, ate: number) => {
    let consulta = supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, foto_url, origem, produto, valor_venda, receita_venda, declarado_em, vendido_em, responsavel_id, indicacao_pega_em"
      )
      .eq("status", "vendido")
      .is("arquivado_em", null);

    if (periodoResolvido) {
      consulta = consulta
        .gte("vendido_em", periodoResolvido.inicio.toISOString())
        .lt("vendido_em", periodoResolvido.fim.toISOString());
    }
    if (buscaFiltro) {
      consulta = aplicarBuscaLead(consulta, buscaFiltro);
    }

    return consulta.order("vendido_em", { ascending: false }).order("id").range(de, ate);
  };

  const [{ data: leadsData }, { data: usuariosData }] = await Promise.all([
    buscarTodas(montarConsulta),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);

  const leads = (leadsData ?? []) as LeadVendido[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));
  // Mesma conta de sempre: faturamento ÷ vendas (cartao-vendas.tsx,
  // lib/metricas.ts) — não é receita ÷ vendas.

  // Coluna SDR. Nos CRMs de serviço/mentoria com Closer (orgs.sdr_original)
  // vale o SDR ORIGINAL do lead: quem marcou a PRIMEIRA reunião dele — mesma
  // regra do Bônus SDR. Se a Julia marcou, o lead pediu pra remarcar e o
  // Samuel marcou a nova, o SDR continua sendo a Julia. Nas demais continua
  // como sempre: quem marcou a reunião realizada mais recente.
  const leadIds = leads.map((l) => l.id);
  const { data: flagsOrg } = await supabase
    .from("orgs")
    .select("sdr_original")
    .eq("id", usuario?.org_id ?? "")
    .maybeSingle();
  const sdrOriginal = flagsOrg?.sdr_original === true;

  const { data: reunioesData } = leadIds.length
    ? await (sdrOriginal
        ? supabase
            .from("reunioes")
            .select("lead_id, usuario_id")
            .in("lead_id", leadIds)
            .order("marcada_em", { ascending: true })
        : supabase
            .from("reunioes")
            .select("lead_id, usuario_id")
            .in("lead_id", leadIds)
            .eq("status", "realizada")
            .order("agendada_para", { ascending: false }))
    : { data: [] as { lead_id: string; usuario_id: string }[] };

  const sdrPorLead = new Map<string, string>();
  for (const reuniao of reunioesData ?? []) {
    if (!sdrPorLead.has(reuniao.lead_id)) {
      sdrPorLead.set(reuniao.lead_id, reuniao.usuario_id);
    }
  }
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);
  const totalFaturamento = leads.reduce((soma, l) => soma + Number(l.valor_venda ?? 0), 0);
  const ticketMedio = leads.length > 0 ? totalFaturamento / leads.length : 0;
  const filtroAtivo = Boolean(periodoFiltro || mesAnoFiltro || deFiltro || ateFiltro || buscaFiltro);

  return (
    <>
      <PageHeader titulo="Clientes" />

      <main className="px-6 py-6">
        {/* Fica preso no topo ao rolar, igual à Visão geral (Samuel pediu). */}
        <div className="sticky top-0 z-10 -mx-6 mb-4 flex flex-wrap items-stretch gap-3 bg-[#f4f5f7] px-6 py-2 md:top-[var(--page-header-altura,64px)]">
          <FiltroPeriodo
            baseHref="/leads/vendas"
            periodoAtual={periodoResolvido?.chave ?? null}
            mesAnoAtual={mesAnoFiltro}
            deAtual={deFiltro}
            ateAtual={ateFiltro}
            outrosParams={{ busca: buscaFiltro }}
            publicoOrg={publicoOrg}
          />

          <form className="flex items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex min-w-[160px] flex-col justify-center gap-0.5 px-4 py-2">
              <label className="text-[10px] font-medium text-neutral-500" htmlFor="busca">
                Buscar por nome
              </label>
              <input
                id="busca"
                name="busca"
                defaultValue={buscaFiltro ?? ""}
                placeholder="Ex.: Marcos"
                className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-0"
              />
            </div>
            <div className="flex items-center px-3">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Buscar
              </button>
            </div>
          </form>

          {filtroAtivo && (
            <Link
              href="/leads/vendas"
              className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm hover:text-neutral-700"
            >
              Limpar filtros
            </Link>
          )}

          <div className="flex shrink-0 items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm">
            {leads.length} cliente{leads.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-700 to-green-500 p-7 text-white shadow-2xl shadow-green-950/50 ring-1 ring-white/10">
          <IconeMoeda className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-white/[0.07]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/10" />

          <p className="relative flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-green-200">
            <IconeMoeda className="h-3.5 w-3.5" />
            {Receita(publicoOrg)} total em vendas
          </p>
          <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {formatarMoeda(totalReceita)}
          </p>
          <p className="relative mt-2 text-sm font-medium text-green-100">
            {leads.length} venda{leads.length === 1 ? "" : "s"} fechada
            {leads.length === 1 ? "" : "s"}
            {leads.length > 0 && ` · ticket médio ${formatarMoeda(ticketMedio)}`}
          </p>
          <p className="relative mt-1 text-xs text-green-200/80">
            {Faturamento(publicoOrg)}: {formatarMoeda(totalFaturamento)}
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Valor da venda</th>
                {!ehImobiliario(publicoOrg) && (
                  <th className="px-4 py-3 font-medium">{Receita(publicoOrg)}</th>
                )}
                <th className="px-4 py-3 font-medium">{Sdr(publicoOrg)}</th>
                {!semCloser(publicoOrg) && (
                  <th className="px-4 py-3 font-medium">Closer</th>
                )}
                <th className="px-4 py-3 font-medium">Entrou em</th>
                <th className="px-4 py-3 font-medium">Vendido em</th>
                {mostrarIndicacaoPega && (
                  <th className="px-4 py-3 font-medium">Indicação pega</th>
                )}
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={(ehImobiliario(publicoOrg) ? 8 : semCloser(publicoOrg) ? 9 : 10) + (mostrarIndicacaoPega ? 1 : 0)} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhum cliente encontrado
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <LinkLead leadId={lead.id} className="flex items-center gap-2.5 hover:underline">
                        <AvatarLead
                          nome={lead.nome}
                          fotoUrl={lead.foto_url}
                          tamanho="h-8 w-8 text-xs"
                          classeBadge="bg-green-100 text-green-700"
                        />
                        <span className="font-medium text-neutral-900">{lead.nome}</span>
                      </LinkLead>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {lead.telefone_e164 ? (
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          {lead.telefone_e164}
                          <BotaoWhatsapp telefone={lead.telefone_e164} />
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{lead.origem ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-600">{lead.produto ?? "—"}</td>
                    <td className="px-4 py-3 font-medium text-green-700">
                      {lead.valor_venda != null ? formatarMoeda(lead.valor_venda) : "—"}
                    </td>
                    {!ehImobiliario(publicoOrg) && (
                      <td className="px-4 py-3 text-emerald-700">
                        {lead.receita_venda != null ? formatarMoeda(lead.receita_venda) : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-neutral-600">
                      {sdrPorLead.has(lead.id) ? nomePorUsuario.get(sdrPorLead.get(lead.id)!) ?? "—" : "—"}
                    </td>
                    {!semCloser(publicoOrg) && (
                      <td className="px-4 py-3 text-neutral-600">
                        {lead.responsavel_id ? nomePorUsuario.get(lead.responsavel_id) ?? "—" : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-neutral-600">{formatarData(lead.declarado_em)}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      <EditarDataVendaInline
                        leadId={lead.id}
                        vendidoEm={lead.vendido_em}
                        valorVenda={lead.valor_venda}
                        receitaVenda={lead.receita_venda}
                        produto={lead.produto}
                      />
                    </td>
                    {mostrarIndicacaoPega && (
                      <td className="px-4 py-3">
                        <IndicacaoPegaToggle leadId={lead.id} jaPegou={!!lead.indicacao_pega_em} />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
