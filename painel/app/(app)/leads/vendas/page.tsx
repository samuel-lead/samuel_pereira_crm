import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { IconeMoeda } from "@/components/icons";
import { anoMesBrasil, parseDataBrasil } from "@/lib/datas";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type LeadVendido = {
  id: string;
  nome: string;
  telefone_e164: string | null;
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

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export default async function VendasPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; busca?: string }>;
}) {
  const { periodo: periodoFiltro, busca: buscaFiltro } = await searchParams;
  const supabase = await createClient();
  await usuarioAutenticado();

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, origem, produto, valor_venda, receita_venda, vendido_em, responsavel_id")
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .order("vendido_em", { ascending: false });

  if (periodoFiltro && /^\d{4}-\d{2}$/.test(periodoFiltro)) {
    const [ano, mes] = periodoFiltro.split("-").map(Number);
    const inicio = parseDataBrasil(`${ano}-${String(mes).padStart(2, "0")}-01`);
    const proximoMes = mes === 12 ? 1 : mes + 1;
    const anoProximoMes = mes === 12 ? ano + 1 : ano;
    const fim = parseDataBrasil(`${anoProximoMes}-${String(proximoMes).padStart(2, "0")}-01`);
    consulta = consulta.gte("vendido_em", inicio.toISOString()).lt("vendido_em", fim.toISOString());
  }
  if (buscaFiltro) {
    consulta = consulta.ilike("nome", `%${buscaFiltro}%`);
  }

  const [{ data: leadsData }, { data: todasVendasData }, { data: usuariosData }] = await Promise.all([
    consulta,
    supabase
      .from("leads")
      .select("vendido_em")
      .eq("status", "vendido")
      .is("arquivado_em", null)
      .not("vendido_em", "is", null),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);

  const chavesPeriodo = new Set(
    (todasVendasData ?? []).map((v) => anoMesBrasil(v.vendido_em as string))
  );
  const periodos = Array.from(chavesPeriodo)
    .sort((a, b) => (a < b ? 1 : -1))
    .map((chave) => {
      const [ano, mes] = chave.split("-").map(Number);
      return { valor: chave, nome: `${NOMES_MES[mes - 1]} de ${ano}` };
    });

  const leads = (leadsData ?? []) as LeadVendido[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));
  const totalReceita = leads.reduce((soma, l) => soma + Number(l.receita_venda ?? 0), 0);
  const filtroAtivo = Boolean(periodoFiltro || buscaFiltro);

  return (
    <>
      <PageHeader titulo="Clientes" />

      <main className="px-6 py-6">
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
        </div>

        <form className="mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500" htmlFor="busca">
              Buscar por nome
            </label>
            <input
              id="busca"
              name="busca"
              defaultValue={buscaFiltro ?? ""}
              placeholder="Ex.: Marcos"
              className="w-48 rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {periodos.length > 0 && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500" htmlFor="periodo">
                Período
              </label>
              <select
                id="periodo"
                name="periodo"
                defaultValue={periodoFiltro ?? ""}
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos os períodos</option>
                {periodos.map((periodo) => (
                  <option key={periodo.valor} value={periodo.valor}>
                    {periodo.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Filtrar
          </button>

          {filtroAtivo && (
            <Link
              href="/leads/vendas"
              className="text-sm text-neutral-500 hover:text-neutral-700"
            >
              Limpar filtro
            </Link>
          )}

          <span className="ml-auto text-sm text-neutral-500">
            {leads.length} cliente{leads.length === 1 ? "" : "s"}
          </span>
        </form>

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
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                          {iniciais(lead.nome)}
                        </span>
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
