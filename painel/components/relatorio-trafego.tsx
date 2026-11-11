import Link from "next/link";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import type { ChavePeriodo } from "@/lib/periodo";
import { MOTIVOS_BASE } from "@/lib/niveis";
import { Reunioes, Reuniao } from "@/lib/terminologia";

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
export type DadosTrafego = {
  origem: string;
  resumo: Resumo;
  meses: Mes[];
  responsaveis: Responsavel[];
  etapas: Etapa[];
  motivosBase: Motivo[];
  origens: OrigemItem[];
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NOME_MOTIVO = new Map<string, string>(MOTIVOS_BASE.map((m) => [m.valor, m.nome]));
const NOME_URGENCIA: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa", desconhecida: "—" };
const NOME_CAPACIDADE: Record<string, string> = { sim: "Sim", parcial: "Parcial", nao: "Não", desconhecida: "—" };

// Grupo especial do imobiliário (Ketlyn): origem "Trafego" + todos os formulários.
function nomeOrigem(o: string) {
  return o === "__trafego__" ? "Formulários (tráfego)" : o;
}

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

// Período escolhido no filtro (null = todo o histórico).
export type PeriodoTrafego = {
  chave: ChavePeriodo;
  titulo: string;
  subtitulo?: string;
  mesAno?: string;
  de?: string;
  ate?: string;
} | null;

export function RelatorioTrafego({
  d,
  publicoOrg,
  periodo,
}: {
  d: DadosTrafego;
  publicoOrg: string;
  periodo: PeriodoTrafego;
}) {
  const r = d.resumo;
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
        <div className="mb-3 flex flex-wrap items-stretch gap-2">
          <Link
            href={`/dashboard/trafego?${new URLSearchParams({ origem: d.origem }).toString()}`}
            scroll={false}
            className={`inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium shadow-sm ${
              periodo === null
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            Todo o período
          </Link>
          <FiltroPeriodo
            baseHref="/dashboard/trafego"
            periodoAtual={periodo?.chave ?? null}
            mesAnoAtual={periodo?.mesAno}
            deAtual={periodo?.de}
            ateAtual={periodo?.ate}
            outrosParams={{ origem: d.origem }}
            publicoOrg={publicoOrg}
          />
        </div>
        <p className="mb-3 text-sm text-neutral-600">
          Período: <strong>{periodo ? `${periodo.titulo}${periodo.subtitulo ? ` (${periodo.subtitulo})` : ""}` : "todo o histórico"}</strong>
          {" "}— conta os leads que <strong>chegaram</strong> nesse período e o que aconteceu com eles até hoje. {d.origem === "__trafego__" ? "Clique num formulário abaixo para ver só ele." : "Escolha abaixo qual origem conta como tráfego."}
          {r.chegaram > 0 && <> Primeiro lead em {dia(r.primeiroLead)}, último em {dia(r.ultimoLead)}.</>}
        </p>
        {/* Ketlyn (11/11/26): lead de tráfego = lead de formulário. Os botões
            mostram o geral (todos os formulários juntos) e cada formulário
            separado; as outras origens não entram aqui. */}
        <div className="flex flex-wrap gap-2">
          {d.origens
            .filter((o) => !d.origens.some((x) => x.origem === "__trafego__") || o.origem === "__trafego__" || o.origem.startsWith("Formulário:"))
            .map((o) => (
            <Link
              key={o.origem}
              href={`/dashboard/trafego?${new URLSearchParams({
                origem: o.origem,
                ...(periodo?.de && periodo?.ate ? { de: periodo.de, ate: periodo.ate } : {}),
                ...(periodo?.mesAno ? { mesAno: periodo.mesAno } : {}),
                ...(periodo && !periodo.mesAno && !(periodo.de && periodo.ate) ? { periodo: periodo.chave } : {}),
              }).toString()}`}
              className={`rounded-full border px-3 py-1 text-sm font-medium ${
                o.origem === d.origem
                  ? "border-[#2563eb] bg-[#2563eb] text-white"
                  : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
              }`}
            >
              {nomeOrigem(o.origem)} <span className="opacity-70">({num(o.leads)})</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <Titulo sub={`Do lead que chegou por "${nomeOrigem(d.origem)}" até a venda. A % ao lado é sobre o total que chegou.`}>
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
        <Titulo sub={`O que os ${num(r.comPerfil)} leads com perfil registrado disseram sobre urgência e capacidade de pagar.`}>
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
    </main>
  );
}

// "reunião" no singular, no vocabulário da empresa.
function reuniao1(publicoOrg: string) {
  return Reuniao(publicoOrg).toLowerCase();
}
