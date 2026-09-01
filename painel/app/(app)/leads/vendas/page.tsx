import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeMoeda } from "@/components/icons";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { resolverPeriodo } from "@/lib/periodo";
import { removerAcento } from "@/lib/texto";

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  foto_url: string | null;
  origem: string | null;
  produto: string | null;
  valor_venda: number | null;
  receita_venda: number | null;
  vendido_em: string | null;
  responsavel_id: string | null;
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
  await usuarioAutenticado();

  const periodoResolvido = resolverPeriodo(
    { periodo: periodoFiltro, mesAno: mesAnoFiltro, de: deFiltro, ate: ateFiltro },
    new Date()
  );

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, foto_url, origem, produto, valor_venda, receita_venda, vendido_em, responsavel_id")
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .order("vendido_em", { ascending: false });

  if (periodoResolvido) {
    consulta = consulta
      .gte("vendido_em", periodoResolvido.inicio.toISOString())
      .lt("vendido_em", periodoResolvido.fim.toISOString());
  }
  if (buscaFiltro) {
    consulta = consulta.ilike("nome_busca", `%${removerAcento(buscaFiltro)}%`);
  }

  const [{ data: leadsData }, { data: usuariosData }] = await Promise.all([
    consulta,
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);

  const leads = (leadsData ?? []) as LeadVendido[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);
  const totalFaturamento = leads.reduce((soma, l) => soma + Number(l.valor_venda ?? 0), 0);
  const filtroAtivo = Boolean(periodoResolvido || buscaFiltro);

  return (
    <>
      <PageHeader titulo="Clientes" />

      <main className="px-6 py-6">
        <div className="mb-6 flex flex-wrap items-stretch gap-3">
          <FiltroPeriodo
            baseHref="/leads/vendas"
            periodoAtual={periodoResolvido?.chave ?? null}
            mesAnoAtual={mesAnoFiltro}
            deAtual={deFiltro}
            ateAtual={ateFiltro}
            outrosParams={{ busca: buscaFiltro }}
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
            Receita total em vendas
          </p>
          <p className="relative mt-1 text-5xl font-black tracking-tight tabular-nums [text-shadow:0_2px_12px_rgba(0,0,0,0.25)]">
            {formatarMoeda(totalReceita)}
          </p>
          <p className="relative mt-2 text-sm font-medium text-green-100">
            {leads.length} venda{leads.length === 1 ? "" : "s"} fechada
            {leads.length === 1 ? "" : "s"}
          </p>
          <p className="relative mt-1 text-xs text-green-200/80">
            Faturamento: {formatarMoeda(totalFaturamento)}
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
                <th className="px-4 py-3 font-medium">Receita</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium">Vendido em</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-400">
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
                    <td className="px-4 py-3 text-emerald-700">
                      {lead.receita_venda != null ? formatarMoeda(lead.receita_venda) : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {lead.responsavel_id ? nomePorUsuario.get(lead.responsavel_id) ?? "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{formatarData(lead.vendido_em)}</td>
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
