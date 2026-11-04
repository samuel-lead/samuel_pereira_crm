import Link from "next/link";
import { MOTIVOS_BASE } from "@/lib/niveis";
import { Reunioes, reunioes, Reuniao } from "@/lib/terminologia";

// Relatório "Leads de tráfego": de onde vieram, o que chegou, o que queriam,
// quem qualificou e até virar reunião e venda. Os números vêm prontos da
// função do banco relatorio_trafego (SQL) — aqui só desenha.

type Resumo = {
  chegaram: number;
  arquivados: number;
  primeiroLead: string | null;
  ultimoLead: string | null;
  emConversa: number;
  comPerfil: number;
  qualificados: number;
  comReuniao: number;
  realizadas: number;
  noShow: number;
  vendas: number;
  valorVendas: number;
  medianaDiasAteMarcar: number | null;
  mediaDiasAteVenda: number | null;
  urgencia: { alta: number; media: number; baixa: number; desconhecida: number };
  capacidade: { sim: number; parcial: number; nao: number; desconhecida: number };
};
type Mes = {
  mes: string;
  chegaram: number;
  em_conversa: number;
  qualificados: number;
  com_reuniao: number;
  realizadas: number;
  vendas: number;
  valor: number;
};
type Responsavel = {
  resp: string;
  leads: number;
  em_conversa: number;
  qualificados: number;
  com_reuniao: number;
  realizadas: number;
  vendas: number;
  valor: number;
};
type Etapa = { nivel_ordem: number; etapa: string; leads: number };
type Motivo = { motivo: string; leads: number };
type OrigemItem = { origem: string; leads: number };
export type LeadTrafego = {
  id: string;
  nome: string;
  chegou: string;
  responsavel: string | null;
  etapa: string | null;
  arquivado: boolean;
  motivoBase: string | null;
  urgencia: string;
  capacidade: string;
  problema: string | null;
  emConversa: boolean;
  qualificado: boolean;
  reunioes: { data: string; status: string }[];
  vendido: boolean;
  valorVenda: number | null;
  vendidoEm: string | null;
};
export type DadosTrafego = {
  origem: string;
  resumo: Resumo;
  meses: Mes[];
  responsaveis: Responsavel[];
  etapas: Etapa[];
  motivosBase: Motivo[];
  origens: OrigemItem[];
  leads: LeadTrafego[];
};

export const FILTROS_LEADS = [
  { chave: "todos", rotulo: "Todos" },
  { chave: "conversa", rotulo: "Entraram em conversa" },
  { chave: "qualificados", rotulo: "Qualificados" },
  { chave: "reuniao", rotulo: "Com reunião" },
  { chave: "vendas", rotulo: "Vendas" },
  { chave: "base", rotulo: "Na Base" },
  { chave: "semconversa", rotulo: "Nunca engataram" },
] as const;
export type ChaveFiltro = (typeof FILTROS_LEADS)[number]["chave"];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NOME_MOTIVO = new Map<string, string>(MOTIVOS_BASE.map((m) => [m.valor, m.nome]));
const STATUS_REUNIAO: Record<string, string> = {
  marcada: "marcada",
  realizada: "feita",
  nao_compareceu: "não veio",
  cancelada: "cancelada",
};
const NOME_URGENCIA: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa", desconhecida: "—" };
const NOME_CAPACIDADE: Record<string, string> = { sim: "Sim", parcial: "Parcial", nao: "Não", desconhecida: "—" };

function brl(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function num(v: number | null | undefined, casas = 0) {
  if (v === null || v === undefined) return "—";
  return v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
function pct(parte: number, todo: number) {
  if (!todo) return "—";
  return `${((parte / todo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
function dia(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });
}
function mesRotulo(aaaamm: string) {
  const [a, m] = aaaamm.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}
function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border-l-4 border-[#2563eb] bg-[#0f172a] px-4 py-3 shadow-md dark:bg-[#16213a]">
      <h2 className="text-lg font-extrabold tracking-tight text-white">{children}</h2>
      {sub && <p className="mt-1 text-sm text-slate-300 dark:text-slate-400">{sub}</p>}
    </div>
  );
}
function Barra({ fracao }: { fracao: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%` }} />
    </div>
  );
}
function Kpi({ rotulo, valor, detalhe }: { rotulo: string; valor: React.ReactNode; detalhe?: React.ReactNode }) {
  return (
    <Cartao>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">{valor}</p>
      {detalhe && <div className="mt-1 text-xs text-neutral-500">{detalhe}</div>}
    </Cartao>
  );
}

export function filtrarLeads(leads: LeadTrafego[], filtro: ChaveFiltro) {
  switch (filtro) {
    case "conversa":
      return leads.filter((l) => l.emConversa);
    case "qualificados":
      return leads.filter((l) => l.qualificado);
    case "reuniao":
      return leads.filter((l) => l.reunioes.length > 0);
    case "vendas":
      return leads.filter((l) => l.vendido);
    case "base":
      return leads.filter((l) => l.etapa === "Base" && !l.arquivado);
    case "semconversa":
      return leads.filter((l) => !l.emConversa);
    default:
      return leads;
  }
}

export function RelatorioTrafego({
  d,
  filtro,
  publicoOrg,
}: {
  d: DadosTrafego;
  filtro: ChaveFiltro;
  publicoOrg: string;
}) {
  const r = d.resumo;
  const base = `/dashboard/trafego?origem=${encodeURIComponent(d.origem)}`;
  const lista = filtrarLeads(d.leads, filtro);
  const reuniaoPl = reunioes(publicoOrg);
  const ReuniaoPl = Reunioes(publicoOrg);

  const etapasFunil = [
    { rotulo: "Leads que chegaram", valor: r.chegaram, nota: `${num(r.arquivados)} foram arquivados depois` },
    { rotulo: "Entraram em conversa", valor: r.emConversa, nota: "chegaram a Em qualificação ou além" },
    { rotulo: "Qualificados (3 critérios)", valor: r.qualificados, nota: "perfil, urgência e capacidade preenchidos" },
    { rotulo: `${Reuniao(publicoOrg)} marcada`, valor: r.comReuniao, nota: `${num(r.noShow)} não vieram` },
    { rotulo: `${Reuniao(publicoOrg)} realizada`, valor: r.realizadas, nota: "pelo menos uma feita" },
    { rotulo: "Venda", valor: r.vendas, nota: `${brl(r.valorVendas)} vendidos` },
  ];
  const maior = Math.max(1, r.chegaram);
  const totalUrg = r.urgencia.alta + r.urgencia.media + r.urgencia.baixa;
  const totalCap = r.capacidade.sim + r.capacidade.parcial + r.capacidade.nao;

  return (
    <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
      <section>
        <p className="mb-3 text-sm text-neutral-600">
          Escolha qual origem conta como tráfego. O relatório mostra tudo que chegou por ela, de{" "}
          {dia(r.primeiroLead)} até {dia(r.ultimoLead)}.
        </p>
        <div className="flex flex-wrap gap-2">
          {d.origens.map((o) => (
            <Link
              key={o.origem}
              href={`/dashboard/trafego?origem=${encodeURIComponent(o.origem)}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                o.origem === d.origem
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {o.origem} <span className="opacity-70">({num(o.leads)})</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Titulo sub={`Do lead que chegou por "${d.origem}" até a venda. A % ao lado é sobre o total que chegou.`}>
          1. Do lead até a venda
        </Titulo>
        <Cartao>
          <div className="space-y-3">
            {etapasFunil.map((e, i) => {
              const anterior = i > 0 ? etapasFunil[i - 1].valor : null;
              return (
                <div key={e.rotulo}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-neutral-800">{e.rotulo}</span>
                    <span className="tabular-nums text-neutral-900">
                      <strong>{num(e.valor)}</strong> <span className="text-neutral-500">({pct(e.valor, r.chegaram)})</span>
                      {anterior !== null && (
                        <span className="ml-2 text-xs text-neutral-500">{pct(e.valor, anterior)} da etapa de cima</span>
                      )}
                    </span>
                  </div>
                  <Barra fracao={e.valor / maior} />
                  <p className="mt-0.5 text-xs text-neutral-500">{e.nota}</p>
                </div>
              );
            })}
          </div>
        </Cartao>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi rotulo="Vendido" valor={brl(r.valorVendas)} detalhe={`${num(r.vendas)} venda${r.vendas === 1 ? "" : "s"} · ticket médio ${brl(r.vendas ? r.valorVendas / r.vendas : null)}`} />
          <Kpi rotulo={`Tempo até marcar ${reuniao1(publicoOrg)}`} valor={r.medianaDiasAteMarcar !== null ? `${num(r.medianaDiasAteMarcar, 1)} dia(s)` : "—"} detalhe="mediana: metade marcou em menos que isso" />
          <Kpi rotulo="Tempo até a venda" valor={r.mediaDiasAteVenda !== null ? `${num(r.mediaDiasAteVenda, 1)} dias` : "—"} detalhe="média, do dia que o lead chegou" />
          <Kpi rotulo="Venda por lead que chegou" valor={pct(r.vendas, r.chegaram)} detalhe={`${pct(r.vendas, r.comReuniao)} de quem marcou ${reuniao1(publicoOrg)}`} />
        </div>
      </section>

      <section>
        <Titulo sub="Mês em que o lead chegou. Os meses mais novos ainda estão andando, então tendem a crescer.">
          2. Mês a mês
        </Titulo>
        <Cartao className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3">Chegaram em</th>
                <th className="py-2 pr-3 text-right">Leads</th>
                <th className="py-2 pr-3 text-right">Em conversa</th>
                <th className="py-2 pr-3 text-right">Qualificados</th>
                <th className="py-2 pr-3 text-right">{ReuniaoPl} marcadas</th>
                <th className="py-2 pr-3 text-right">Realizadas</th>
                <th className="py-2 pr-3 text-right">Vendas</th>
                <th className="py-2 text-right">Vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {d.meses.map((m) => (
                <tr key={m.mes}>
                  <td className="py-2 pr-3 font-semibold text-neutral-800">{mesRotulo(m.mes)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.chegaram)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.em_conversa)} <span className="text-xs text-neutral-400">({pct(m.em_conversa, m.chegaram)})</span></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.qualificados)} <span className="text-xs text-neutral-400">({pct(m.qualificados, m.chegaram)})</span></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.com_reuniao)} <span className="text-xs text-neutral-400">({pct(m.com_reuniao, m.chegaram)})</span></td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.realizadas)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(m.vendas)}</td>
                  <td className="py-2 text-right tabular-nums">{brl(m.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Cartao>
      </section>

      <section>
        <Titulo sub={`O que os ${num(r.comPerfil)} leads com perfil registrado disseram sobre urgência e capacidade de pagar. O texto do que cada um queria está na lista no final.`}>
          3. O que queriam e se dava pra qualificar
        </Titulo>
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao>
            <h3 className="mb-3 text-sm font-semibold text-neutral-800">Urgência em resolver</h3>
            {(["alta", "media", "baixa"] as const).map((k) => (
              <div key={k} className="mb-2">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-700">{NOME_URGENCIA[k]}</span>
                  <span className="tabular-nums">{num(r.urgencia[k])} <span className="text-xs text-neutral-400">({pct(r.urgencia[k], totalUrg)})</span></span>
                </div>
                <Barra fracao={totalUrg ? r.urgencia[k] / totalUrg : 0} />
              </div>
            ))}
            <p className="mt-2 text-xs text-neutral-500">{num(r.urgencia.desconhecida)} leads sem essa informação (a maioria nunca chegou a conversar).</p>
          </Cartao>
          <Cartao>
            <h3 className="mb-3 text-sm font-semibold text-neutral-800">Consegue pagar</h3>
            {(["sim", "parcial", "nao"] as const).map((k) => (
              <div key={k} className="mb-2">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-700">{NOME_CAPACIDADE[k]}</span>
                  <span className="tabular-nums">{num(r.capacidade[k])} <span className="text-xs text-neutral-400">({pct(r.capacidade[k], totalCap)})</span></span>
                </div>
                <Barra fracao={totalCap ? r.capacidade[k] / totalCap : 0} />
              </div>
            ))}
            <p className="mt-2 text-xs text-neutral-500">{num(r.capacidade.desconhecida)} leads sem essa informação.</p>
          </Cartao>
        </div>
      </section>

      <section>
        <Titulo sub="Quem cuidou de cada lead de tráfego e o que cada um levou até a venda.">4. Por responsável</Titulo>
        <Cartao className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3">Responsável</th>
                <th className="py-2 pr-3 text-right">Leads</th>
                <th className="py-2 pr-3 text-right">Em conversa</th>
                <th className="py-2 pr-3 text-right">Qualificados</th>
                <th className="py-2 pr-3 text-right">{ReuniaoPl}</th>
                <th className="py-2 pr-3 text-right">Realizadas</th>
                <th className="py-2 pr-3 text-right">Vendas</th>
                <th className="py-2 text-right">Vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {d.responsaveis.map((x) => (
                <tr key={x.resp}>
                  <td className="py-2 pr-3 font-medium text-neutral-800">{x.resp}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.leads)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.em_conversa)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.qualificados)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.com_reuniao)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.realizadas)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{num(x.vendas)}</td>
                  <td className="py-2 text-right tabular-nums">{brl(x.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutral-500">
            Depois que o lead vira {reuniao1(publicoOrg)}/venda ele passa para o closer, por isso as vendas ficam no nome dele.
          </p>
        </Cartao>
      </section>

      <section>
        <Titulo sub="Onde cada lead está agora (sem contar os arquivados) e por que foram pra Base.">5. Onde estão hoje</Titulo>
        <div className="grid gap-4 lg:grid-cols-2">
          <Cartao>
            <h3 className="mb-3 text-sm font-semibold text-neutral-800">Etapa atual</h3>
            {d.etapas.map((e) => (
              <div key={e.nivel_ordem} className="mb-2">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-700">{e.etapa}</span>
                  <span className="tabular-nums">{num(e.leads)}</span>
                </div>
                <Barra fracao={e.leads / Math.max(1, ...d.etapas.map((x) => x.leads))} />
              </div>
            ))}
          </Cartao>
          <Cartao>
            <h3 className="mb-3 text-sm font-semibold text-neutral-800">Por que foram pra Base</h3>
            {d.motivosBase.length === 0 && <p className="text-sm text-neutral-500">Nenhum lead na Base.</p>}
            {d.motivosBase.map((m) => (
              <div key={m.motivo} className="mb-2">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-neutral-700">{NOME_MOTIVO.get(m.motivo) ?? "Sem motivo registrado"}</span>
                  <span className="tabular-nums">{num(m.leads)}</span>
                </div>
                <Barra fracao={m.leads / Math.max(1, ...d.motivosBase.map((x) => x.leads))} />
              </div>
            ))}
          </Cartao>
        </div>
      </section>

      <section>
        <Titulo sub="Um por linha: quando chegou, quem cuidou, onde está, o que queria e o que aconteceu. Do mais novo pro mais antigo.">
          6. Lead por lead
        </Titulo>
        <div className="mb-3 flex flex-wrap gap-2">
          {FILTROS_LEADS.map((f) => (
            <Link
              key={f.chave}
              href={`${base}&filtro=${f.chave}#lead-por-lead`}
              scroll={false}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                f.chave === filtro
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {f.rotulo}
              <span className="ml-1 opacity-70">({num(filtrarLeads(d.leads, f.chave).length)})</span>
            </Link>
          ))}
        </div>
        <Cartao className="overflow-x-auto" >
          <div id="lead-por-lead" />
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-2 pr-3">Chegou</th>
                <th className="py-2 pr-3">Lead</th>
                <th className="py-2 pr-3">Responsável</th>
                <th className="py-2 pr-3">Etapa hoje</th>
                <th className="py-2 pr-3">Urgência</th>
                <th className="py-2 pr-3">Paga?</th>
                <th className="w-[30%] py-2 pr-3">O que queria</th>
                <th className="py-2 pr-3">{ReuniaoPl}</th>
                <th className="py-2 text-right">Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 align-top">
              {lista.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 pr-3 text-xs tabular-nums text-neutral-600">{dia(l.chegou)}</td>
                  <td className="py-2 pr-3 font-medium text-neutral-800">
                    <Link href={`/leads/${l.id}`} className="hover:text-[#2563eb] hover:underline">{l.nome}</Link>
                    {l.arquivado && <span className="ml-1 rounded bg-neutral-100 px-1 text-[10px] text-neutral-500">arquivado</span>}
                  </td>
                  <td className="py-2 pr-3 text-neutral-700">{l.responsavel?.split(" ")[0] ?? "—"}</td>
                  <td className="py-2 pr-3 text-neutral-700">
                    {l.etapa ?? "—"}
                    {l.motivoBase && (
                      <span className="block text-xs text-neutral-400">{NOME_MOTIVO.get(l.motivoBase) ?? l.motivoBase}</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-neutral-700">{NOME_URGENCIA[l.urgencia] ?? "—"}</td>
                  <td className="py-2 pr-3 text-neutral-700">{NOME_CAPACIDADE[l.capacidade] ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs text-neutral-700">{l.problema ?? <span className="text-neutral-300">—</span>}</td>
                  <td className="py-2 pr-3 text-xs text-neutral-700">
                    {l.reunioes.length === 0
                      ? <span className="text-neutral-300">—</span>
                      : l.reunioes.map((x, i) => (
                          <span key={i} className="block whitespace-nowrap">
                            {dia(x.data)} · {STATUS_REUNIAO[x.status] ?? x.status}
                          </span>
                        ))}
                  </td>
                  <td className="py-2 text-right font-semibold tabular-nums text-green-700">
                    {l.vendido ? brl(l.valorVenda) : ""}
                  </td>
                </tr>
              ))}
              {lista.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-sm text-neutral-400">Nenhum lead nesse filtro.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Cartao>
      </section>

      <section>
        <Titulo>Como esses números foram feitos</Titulo>
        <Cartao>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            <li>Lead de tráfego = todo lead cadastrado com a origem escolhida lá em cima. Se outra origem também for tráfego, é só trocar e comparar.</li>
            <li>Em conversa = o lead chegou a &quot;Em qualificação&quot; ou além, ou teve {reuniao1(publicoOrg)}, ou virou venda. Ficar em &quot;Sem conversa iniciada&quot; e ir pra Base não conta.</li>
            <li>Qualificado = perfil escrito, urgência e capacidade de pagar preenchidos (os 3 critérios).</li>
            <li>{ReuniaoPl} e vendas vêm direto do cadastro de {reuniaoPl} e das vendas do CRM. Um lead com mais de uma {reuniao1(publicoOrg)} conta uma vez só.</li>
            <li>Tempo até marcar = da chegada do lead até a primeira {reuniao1(publicoOrg)} marcada (mediana, ignora os que já vinham com {reuniao1(publicoOrg)} de antes).</li>
          </ul>
        </Cartao>
      </section>
    </main>
  );
}

// "reunião" no singular, no vocabulário da empresa.
function reuniao1(publicoOrg: string) {
  return Reuniao(publicoOrg).toLowerCase();
}
