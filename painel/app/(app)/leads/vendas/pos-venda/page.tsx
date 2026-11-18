import Link from "next/link";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { AbasClientes } from "@/components/abas-clientes";
import { LinkLead } from "@/components/link-lead";
import { BotaoWhatsapp } from "@/components/botao-whatsapp";
import { AvatarLead } from "@/components/avatar-lead";
import { IndicacaoPegaToggle } from "@/components/indicacao-pega-toggle";
import { RegistrarContatoPosVenda } from "@/components/registrar-contato-pos-venda";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { resolverPeriodo } from "@/lib/periodo";
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
  pos_venda_motivo: string | null;
  indicacao_pega_em: string | null;
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
  searchParams: Promise<{ vis?: string; busca?: string; periodo?: string; mesAno?: string; de?: string; ate?: string }>;
}) {
  const { vis, busca, periodo: periodoFiltro, mesAno: mesAnoFiltro, de: deFiltro, ate: ateFiltro } = await searchParams;
  const supabase = await createClient();
  const { usuario } = await usuarioAutenticado();

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const publicoOrg = usuario?.publico_org ?? "mentoria";
  // Coluna "Pegou indicação?" (Sim/Não) — mesmo marcador do card do lead; por enquanto
  // só o dono da plataforma vê, como no card.
  const podeIndicacao = usuario?.super_admin === true;

  // Filtro de período (hoje, semana, mês, ano/mês, personalizado), igual ao da aba
  // Clientes. Sem nenhum escolhido, mostra todos. O período vale pra DATA DO PRÓXIMO
  // CONTATO (em "Próximo contato") e pra DATA DA VENDA (em "Sem novo contato", que
  // não tem data de contato).
  // Sem escolha na tela abre em "Todos" (Samuel, 18/11/26) — mostra todos os clientes;
  // escolher um período filtra. "Todos" também pode ser clicado (periodo=todos).
  const semEscolha = !periodoFiltro && !mesAnoFiltro && !(deFiltro && ateFiltro);
  const todos = semEscolha || periodoFiltro === "todos";
  const periodo = todos
    ? null
    : resolverPeriodo({ periodo: periodoFiltro, mesAno: mesAnoFiltro, de: deFiltro, ate: ateFiltro }, new Date());
  const diaSp = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const noPeriodo = (c: ClientePosVenda) => {
    if (!periodo) return true;
    if (c.pos_venda_proximo_em) {
      return c.pos_venda_proximo_em >= diaSp(periodo.inicio) && c.pos_venda_proximo_em < diaSp(periodo.fim);
    }
    if (!c.vendido_em) return false;
    const t = new Date(c.vendido_em).getTime();
    return t >= periodo.inicio.getTime() && t < periodo.fim.getTime();
  };
  const visEscolhida = vis === "proximo" || vis === "sem-novo" ? vis : undefined;
  const hrefPara = (extra: { vis?: string }) => {
    const q = new URLSearchParams();
    if (extra.vis) q.set("vis", extra.vis);
    if (busca) q.set("busca", busca);
    if (periodoFiltro) q.set("periodo", periodoFiltro);
    if (mesAnoFiltro) q.set("mesAno", mesAnoFiltro);
    if (deFiltro) q.set("de", deFiltro);
    if (ateFiltro) q.set("ate", ateFiltro);
    const qs = q.toString();
    return qs ? `/leads/vendas/pos-venda?${qs}` : "/leads/vendas/pos-venda";
  };

  const montar = (de: number, ate: number) => {
    let consulta = supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, foto_url, vendido_em, responsavel_id, pos_venda_proximo_em, pos_venda_ultimo_contato_em, pos_venda_motivo, indicacao_pega_em"
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

  const clientes = ((clientesData ?? []) as ClientePosVenda[]).filter(noPeriodo);
  const nomePorUsuario = new Map((usuariosData ?? []).map((u) => [u.id, u.nome]));

  const contagem = { proximo: 0, "sem-novo": 0 };
  for (const c of clientes) contagem[situacao(c)]++;

  // Sem escolha na tela: abre em "Próximo contato"; se ninguém tem data marcada
  // ainda, abre em "Sem novo contato" pra lista não aparecer vazia.
  const visao: Visao =
    visEscolhida ?? (contagem.proximo > 0 ? "proximo" : "sem-novo");

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
      <main className="px-6 pb-6 pt-3">
        <AbasClientes ativa="pos-venda" />

        {/* Filtros presos no topo ao rolar a lista (Samuel, 18/11/26), igual à aba Clientes. */}
        <div className="sticky top-0 z-10 -mx-6 mb-4 bg-[#f4f5f7] px-6 pb-2 pt-2 md:top-[var(--page-header-altura,64px)]">
        <div className="mb-4">
          <FiltroPeriodo
            baseHref="/leads/vendas/pos-venda"
            periodoAtual={periodo?.chave ?? null}
            mesAnoAtual={mesAnoFiltro}
            deAtual={deFiltro}
            ateAtual={ateFiltro}
            outrosParams={{ busca, vis: visEscolhida }}
            publicoOrg={publicoOrg}
            compacto
            opcaoTodos={{ ativo: todos }}
            atalhos={["hoje", "semana", "mes"]}
          />
        </div>

        <div className="flex flex-wrap items-stretch gap-3">
          <div className="flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            {chips.map((chip) => (
              <Link
                key={chip.chave}
                href={hrefPara({ vis: chip.chave })}
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
            {periodoFiltro && <input type="hidden" name="periodo" value={periodoFiltro} />}
            {mesAnoFiltro && <input type="hidden" name="mesAno" value={mesAnoFiltro} />}
            {deFiltro && <input type="hidden" name="de" value={deFiltro} />}
            {ateFiltro && <input type="hidden" name="ate" value={ateFiltro} />}
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

          {(!todos || busca) && (
            <Link
              href="/leads/vendas/pos-venda"
              className="inline-flex items-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-500 shadow-sm hover:text-neutral-700"
            >
              Limpar filtros
            </Link>
          )}
        </div>
        </div>

        <p className="mb-3 text-xs text-neutral-500">
          Próximo contato = clientes com um dia marcado (hoje e atrasados aparecem em destaque). Sem novo contato =
          clientes sem dia marcado.
          {periodo
            ? " O período filtra pela data do próximo contato (em Próximo contato) e pela data da venda (em Sem novo contato)."
            : " Mostrando todos os clientes."}{" "}
          O que for conversado fica salvo como nota no histórico do cliente.
        </p>

        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Vendido em</th>
                <th className="px-4 py-3 font-medium">Último contato</th>
                <th className="px-4 py-3 font-medium">Próximo contato</th>
                <th className="px-4 py-3 font-medium">Motivo do contato</th>
                <th className="px-4 py-3 font-medium">Responsável</th>
                {podeIndicacao && <th className="px-4 py-3 font-medium">Pegou indicação?</th>}
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={podeIndicacao ? 9 : 8} className="px-4 py-10 text-center text-sm text-neutral-400">
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
                      <td className="max-w-[260px] px-4 py-3 text-neutral-700" title={c.pos_venda_motivo ?? undefined}>
                        {c.pos_venda_motivo ?? <span className="text-neutral-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.responsavel_id ? nomePorUsuario.get(c.responsavel_id) ?? "—" : "—"}
                      </td>
                      {podeIndicacao && (
                        <td className="px-4 py-3">
                          <IndicacaoPegaToggle leadId={c.id} jaPegou={!!c.indicacao_pega_em} />
                        </td>
                      )}
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
