import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { AvatarLead } from "@/components/avatar-lead";
import { IconeMoeda } from "@/components/icons";
import { anoMesBrasil, parseDataBrasil, UM_DIA_MS } from "@/lib/datas";
import { MenuSelect } from "@/components/menu-select";

const NOMES_MES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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
  searchParams: Promise<{ periodo?: string; busca?: string; de?: string; ate?: string }>;
}) {
  const {
    periodo: periodoFiltro,
    busca: buscaFiltro,
    de: deFiltro,
    ate: ateFiltro,
  } = await searchParams;
  const supabase = await createClient();
  await usuarioAutenticado();

  let consulta = supabase
    .from("leads")
    .select("id, nome, telefone_e164, foto_url, origem, produto, valor_venda, receita_venda, vendido_em, responsavel_id")
    .eq("status", "vendido")
    .is("arquivado_em", null)
    .order("vendido_em", { ascending: false });

  // Período personalizado (De/Até) manda mais que o atalho de mês — se a
  // pessoa preencheu uma data customizada, é isso que ela quer ver.
  if (deFiltro || ateFiltro) {
    if (deFiltro) {
      consulta = consulta.gte("vendido_em", parseDataBrasil(deFiltro).toISOString());
    }
    if (ateFiltro) {
      const fim = new Date(parseDataBrasil(ateFiltro).getTime() + UM_DIA_MS);
      consulta = consulta.lt("vendido_em", fim.toISOString());
    }
  } else if (periodoFiltro && /^\d{4}-\d{2}$/.test(periodoFiltro)) {
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
  const filtroAtivo = Boolean(periodoFiltro || buscaFiltro || deFiltro || ateFiltro);

  return (
    <>
      <PageHeader titulo="Clientes" />

      <main className="px-6 py-6">
        <div className="mb-6 flex flex-wrap items-stretch gap-3">
          <form className="flex flex-1 flex-wrap items-stretch divide-x divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
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

            {periodos.length > 0 && (
              <div className="flex min-w-[150px] flex-col justify-center gap-0.5 px-4 py-2">
                <label className="text-[10px] font-medium text-neutral-500" htmlFor="periodo">
                  Mês (atalho)
                </label>
                <MenuSelect
                  id="periodo"
                  name="periodo"
                  defaultValue={periodoFiltro ?? ""}
                  variante="sem-borda"
                  options={[
                    { value: "", label: "Todos os períodos" },
                    ...periodos.map((periodo) => ({
                      value: periodo.valor,
                      label: periodo.nome,
                    })),
                  ]}
                />
              </div>
            )}

            <div className="flex min-w-[220px] flex-col justify-center gap-0.5 px-4 py-2">
              <label className="text-[10px] font-medium text-neutral-500" htmlFor="de">
                Período personalizado
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="de"
                  name="de"
                  type="date"
                  defaultValue={deFiltro ?? ""}
                  className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
                />
                <span className="text-neutral-300">–</span>
                <input
                  id="ate"
                  name="ate"
                  type="date"
                  defaultValue={ateFiltro ?? ""}
                  aria-label="até"
                  className="border-0 bg-transparent p-0 text-sm text-neutral-900 outline-none focus:ring-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2">
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Filtrar
              </button>
              {filtroAtivo && (
                <Link
                  href="/leads/vendas"
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-700"
                >
                  Limpar
                </Link>
              )}
            </div>
          </form>

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
