import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AbasClientes } from "@/components/abas-clientes";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { AvatarLead } from "@/components/avatar-lead";
import { RegistrarContatoPosVenda } from "@/components/registrar-contato-pos-venda";
import { aplicarBuscaLead } from "@/lib/busca-leads";
import { buscarTodas } from "@/lib/supabase/paginar";

type ClientePosVenda = {
  id: string;
  nome: string;
  telefone_e164: string | null;
  foto_url: string | null;
  vendido_em: string | null;
  responsavel_id: string | null;
  pos_venda_proximo_em: string | null;
  pos_venda_ultimo_contato_em: string | null;
};

type Visao = "proximo" | "sem-novo";

// Pós-venda (Samuel, 18/11/26) — só duas visões:
//  * próximo contato: o cliente tem um dia marcado (hoje, atrasado ou futuro);
//  * sem novo contato: não tem nenhum dia marcado.
function situacao(c: ClientePosVenda): Visao {
  return c.pos_venda_proximo_em ? "proximo" : "sem-novo";
}

function formatarDia(dia: string | null) {
  if (!dia) return "—";
  const [a, m, d] = dia.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

function formatarInstante(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function PosVendaPage({
  searchParams,
}: {
  searchParams: Promise<{ vis?: string; busca?: string }>;
}) {
  const { vis, busca } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  const montar = (de: number, ate: number) => {
    let consulta = supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, foto_url, vendido_em, responsavel_id, pos_venda_proximo_em, pos_venda_ultimo_contato_em"
      )
      .eq("status", "vendido")
      .is("arquivado_em", null);
    if (busca) consulta = aplicarBuscaLead(consulta, busca);
    return consulta.order("vendido_em", { ascending: true }).order("id").range(de, ate);
  };

  const [{ data: clientesData }, { data: usuariosData }] = await Promise.all([
    buscarTodas(montar),
    supabase.from("usuarios").select("id, nome").order("nome"),
  ]);

  const clientes = (clientesData ?? []) as ClientePosVenda[];
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const contagem = { proximo: 0, "sem-novo": 0 };
  for (const c of clientes) contagem[situacao(c)]++;

  // Sem escolha na tela: abre em "Próximo contato"; se ninguém tem data marcada
  // ainda, abre em "Sem novo contato" pra lista não aparecer vazia.
  const visao: Visao =
    vis === "proximo" || vis === "sem-novo" ? vis : contagem.proximo > 0 ? "proximo" : "sem-novo";

  const lista = clientes
    .filter((c) => situacao(c) === visao)
    .sort((a, b) => {
      // Mais urgente primeiro: quem tem data mais antiga; sem data, pela venda mais antiga.
      const ka = a.pos_venda_proximo_em ?? (a.vendido_em ?? "").slice(0, 10);
      const kb = b.pos_venda_proximo_em ?? (b.vendido_em ?? "").slice(0, 10);
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });

  const chips: { chave: Visao; rotulo: string }[] = [
    { chave: "proximo", rotulo: "Próximo contato" },
    { chave: "sem-novo", rotulo: "Sem novo contato" },
  ];

  return (
    <>
      <PageHeader titulo="Clientes" />
      <main className="px-6 py-6">
        <AbasClientes ativa="pos-venda" />

        <div className="mb-4 flex flex-wrap items-stretch gap-3">
          <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {chips.map((chip) => (
              <Link
                key={chip.chave}
                href={`/leads/vendas/pos-venda?vis=${chip.chave}${busca ? `&busca=${encodeURIComponent(busca)}` : ""}`}
                className={`flex flex-col justify-center px-5 py-2 text-sm font-semibold transition ${
                  visao === chip.chave ? "bg-blue-600 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <span className="text-lg font-black tabular-nums leading-none">{contagem[chip.chave]}</span>
                <span className="text-[11px] font-medium opacity-90">{chip.rotulo}</span>
              </Link>
            ))}
          </div>

          <form className="flex items-stretch overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <input type="hidden" name="vis" value={visao} />
            <div className="flex min-w-[160px] flex-col justify-center gap-0.5 px-4 py-2">
              <label className="text-[10px] font-medium text-neutral-500" htmlFor="busca">
                Buscar por nome
              </label>
              <input
                id="busca"
                name="busca"
                defaultValue={busca ?? ""}
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
        </div>

        <p className="mb-3 text-xs text-neutral-500">
          Próximo contato = clientes com um dia marcado (hoje e atrasados aparecem em destaque). Sem novo contato =
          clientes sem dia marcado. O que for conversado fica salvo como nota no histórico do cliente.
        </p>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Vendido em</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
                <th className="px-4 py-3 font-medium">Próximo contato</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhum cliente nessa visão
                  </td>
                </tr>
              ) : (
                lista.map((c) => {
                  const atrasado = c.pos_venda_proximo_em != null && c.pos_venda_proximo_em < hoje;
                  const ehHoje = c.pos_venda_proximo_em === hoje;
                  const podeRegistrar = usuario?.papel === "admin" || c.responsavel_id === usuario?.id;
                  return (
                    <tr key={c.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <LinkLead leadId={c.id} className="flex items-center gap-2.5 hover:underline">
                          <AvatarLead
                            nome={c.nome}
                            fotoUrl={c.foto_url}
                            tamanho="h-8 w-8 text-xs"
                            classeBadge="bg-green-100 text-green-700"
                          />
                          <span className="font-medium text-neutral-900">{c.nome}</span>
                        </LinkLead>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.telefone_e164 ? (
                          <span className="flex items-center gap-1.5 whitespace-nowrap">
                            {c.telefone_e164}
                            <BotaoWhatsapp telefone={c.telefone_e164} />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{formatarInstante(c.vendido_em)}</td>
                      <td className="px-4 py-3 text-neutral-600">{formatarInstante(c.pos_venda_ultimo_contato_em)}</td>
                      <td className="px-4 py-3">
                        {c.pos_venda_proximo_em ? (
                          <span
                            className={`whitespace-nowrap font-medium ${
                              atrasado ? "text-red-600" : ehHoje ? "text-amber-600" : "text-neutral-700"
                            }`}
                          >
                            {formatarDia(c.pos_venda_proximo_em)}
                            {atrasado ? " · atrasado" : ehHoje ? " · hoje" : ""}
                          </span>
                        ) : (
                          <span className="text-neutral-400">Sem novo contato</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.responsavel_id ? nomePorUsuario.get(c.responsavel_id) ?? "—" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {podeRegistrar && <RegistrarContatoPosVenda leadId={c.id} nome={c.nome} />}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
