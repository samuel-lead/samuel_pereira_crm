import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

// Histórico de pedidos fechados que veio da planilha da empresa (Inove
// Gôndolas: jan/2018 a out/2026). Todos os números saem prontos do banco
// (função historico_vendas_resumo) — aqui só desenha. Só admin vê.

type Mes = {
  mes: string;
  pedidos: number;
  receita: number;
  ticket: number | null;
  novos: number;
  receitaMesAnterior: number | null;
  receitaAnoAnterior: number | null;
  pedidosAnoAnterior: number | null;
};
type Ano = {
  ano: number;
  pedidos: number;
  receita: number;
  ticketMedio: number;
  ticketMediano: number;
  meses: number;
  novos: number;
  clientesAtivos: number;
  receitaAnoAnterior: number | null;
};
type Canal = { canal: string; pedidos: number; receita: number; ticketMedio: number; ticketMediano: number };
type Faixa = {
  faixa: number;
  pedidos: number;
  receita: number;
  entregaMedia: number | null;
  entregaMediana: number | null;
  entregaPedidos: number;
};
type Cliente = {
  conta: string;
  canal: string;
  pedidos: number;
  receita: number;
  primeiro: string;
  ultimo: string;
  meses: number;
};
type Vendedor = { vendedor: string; pedidos: number; receita: number; ticketMedio: number };
type Resumo = {
  inicio: string | null;
  fim: string | null;
  receitaTotal: number | null;
  pedidosTotal: number;
  zerados: number;
  ytdAno: number | null;
  ytdMes: number | null;
  receitaYtd: number | null;
  receitaYtdAnterior: number | null;
  pedidosYtd: number | null;
  pedidosYtdAnterior: number | null;
  novosYtd: number;
  novosYtdAnterior: number;
  contas: number;
  ltvMedio: number | null;
  ltvMediano: number | null;
  pedidosPorConta: number | null;
  pctRecompra: number | null;
  pctReceitaRecorrentes: number | null;
  ltvRecorrente: number | null;
  pedidosRecorrente: number | null;
  vidaRecorrente: number | null;
  pctTop10: number | null;
  entregaMedia: number | null;
  entregaMediana: number | null;
};
type Historico = {
  mensal: Mes[];
  anual: Ano[];
  canais: Canal[];
  faixas: Faixa[];
  clientes: Cliente[];
  vendedores: Vendedor[];
  resumo: Resumo;
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const FAIXAS = ["Até R$ 1 mil", "R$ 1 a 5 mil", "R$ 5 a 20 mil", "R$ 20 a 100 mil", "Acima de R$ 100 mil"];

function brl(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

// R$ 30,8 mi / R$ 850 mil — pra caber em gráfico e cartão.
function brlCurto(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000)
    return `R$ ${(valor / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `R$ ${Math.round(valor / 1_000).toLocaleString("pt-BR")} mil`;
  return brl(valor);
}

function num(valor: number | null | undefined, casas = 0) {
  if (valor === null || valor === undefined) return "—";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

function pct(valor: number | null | undefined, casas = 0) {
  if (valor === null || valor === undefined) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}%`;
}

function variacao(atual: number | null | undefined, anterior: number | null | undefined) {
  if (atual === null || atual === undefined || !anterior) return null;
  return atual / anterior - 1;
}

function Variacao({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-neutral-400">—</span>;
  const sobe = valor >= 0;
  return (
    <span className={`font-semibold tabular-nums ${sobe ? "text-green-700" : "text-red-600"}`}>
      {sobe ? "▲" : "▼"} {Math.abs(valor * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
    </span>
  );
}

function Titulo({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-neutral-900">
        <span className="h-6 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
        {children}
      </h2>
      {sub && <p className="mt-1 pl-4 text-sm text-neutral-500">{sub}</p>}
    </div>
  );
}

function Cartao({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
  );
}

function Kpi({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
}) {
  return (
    <Cartao>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums text-neutral-900">{valor}</p>
      {detalhe && <div className="mt-1 text-xs text-neutral-500">{detalhe}</div>}
    </Cartao>
  );
}

function Barra({ fracao, cor = "bg-[#2563eb]" }: { fracao: number; cor?: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
      <div className={`h-full rounded-full ${cor}`} style={{ width: `${Math.max(0, Math.min(1, fracao)) * 100}%` }} />
    </div>
  );
}

// ---------- LTV detalhado (função historico_ltv_detalhe) ----------

type LtvResumo = {
  contas: number;
  recorrentes: number;
  ltvMedio: number | null;
  ltvMediano: number | null;
  ltvUmaVez: number | null;
  ltvRecorrente: number | null;
  ltvRecorrenteMediano: number | null;
  pedidosMedio: number | null;
  pedidosRecorrente: number | null;
  pedidosRecorrenteMediano: number | null;
  ticketUmaVez: number | null;
  ticketRecorrente: number | null;
  vidaRecorrente: number | null;
  vidaRecorrenteMediana: number | null;
  intervaloMedio: number | null;
  intervaloMediano: number | null;
  ateSegundaMedia: number | null;
  ateSegundaMediana: number | null;
  voltou3: number | null;
  voltou6: number | null;
  voltou12: number | null;
  recorrentesAtivos: number;
  recorrentesParados: number;
};
type LtvFrequencia = {
  faixa: number;
  contas: number;
  receita: number;
  ltv: number;
  pedidos: number;
  vida: number;
  intervalo: number | null;
};
type LtvFaixa = { faixa: number; contas: number; ltv: number };
type LtvCoorte = { ano: number; contas: number; ltv: number; recompra: number; pedidos: number; ativos: number };
type LtvCliente = {
  conta: string;
  canal: string;
  pedidos: number;
  mesesCompra: number;
  receita: number;
  primeiro: string;
  ultimo: string;
  vida: number;
  intervalo: number | null;
  mesesSemComprar: number;
};
type LtvDetalhe = {
  resumo: LtvResumo;
  frequencia: LtvFrequencia[];
  vida: LtvFaixa[];
  intervalos: LtvFaixa[];
  coortes: LtvCoorte[];
  clientes: LtvCliente[];
};

const FAIXAS_FREQUENCIA = ["1 vez", "2 vezes", "3 a 5 vezes", "6 a 10 vezes", "11 vezes ou mais"];
const FAIXAS_VIDA = ["Até 6 meses", "7 a 12 meses", "1 a 2 anos", "2 a 4 anos", "Mais de 4 anos"];
const FAIXAS_INTERVALO = ["Todo mês", "A cada 2–3 meses", "A cada 4–6 meses", "A cada 7–12 meses", "Mais de 1 ano"];

// 1 mês / 3,5 meses / 2 anos e 3 meses
function meses(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "—";
  if (valor >= 24) {
    const anos = Math.floor(valor / 12);
    const resto = Math.round(valor - anos * 12);
    return resto ? `${anos} anos e ${resto} ${resto === 1 ? "mês" : "meses"}` : `${anos} anos`;
  }
  const texto = valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${texto} ${valor === 1 ? "mês" : "meses"}`;
}

function mesAno(aaaamm: string | null | undefined) {
  if (!aaaamm) return "—";
  return `${aaaamm.slice(5, 7)}/${aaaamm.slice(0, 4)}`;
}

function LinhaBarra({
  rotulo,
  fracao,
  valor,
  detalhe,
  cor,
}: {
  rotulo: string;
  fracao: number;
  valor: React.ReactNode;
  detalhe?: React.ReactNode;
  cor?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-sm">
        <span className="font-medium text-neutral-700">{rotulo}</span>
        <span className="text-right tabular-nums text-neutral-900">{valor}</span>
      </div>
      <Barra fracao={fracao} cor={cor} />
      {detalhe && <p className="mt-1 text-xs text-neutral-500">{detalhe}</p>}
    </div>
  );
}

function LtvDetalhado({ l }: { l: LtvDetalhe }) {
  const r = l.resumo;
  const umaVez = l.frequencia.find((f) => f.faixa === 1);
  const pctUmaVez = umaVez ? umaVez.contas / (r.contas || 1) : null;
  const totalFreq = l.frequencia.reduce((s, f) => s + f.receita, 0) || 1;
  const maiorVida = Math.max(1, ...l.vida.map((v) => v.contas));
  const maiorIntervalo = Math.max(1, ...l.intervalos.map((v) => v.contas));
  const totalIntervalos = l.intervalos.reduce((s, f) => s + f.contas, 0) || 1;
  const maiorCoorte = Math.max(1, ...l.coortes.map((c) => c.ltv));

  return (
    <div className="space-y-4">
      {/* As 4 perguntas: quanto vale, quantas vezes compra, quanto demora pra voltar, por quanto tempo fica. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          rotulo="Quanto um cliente vale (LTV)"
          valor={brl(r.ltvMedio)}
          detalhe={`Média de ${num(r.contas)} clientes. Metade fica abaixo de ${brl(r.ltvMediano)}.`}
        />
        <Kpi
          rotulo="Quantas vezes compra"
          valor={`${num(r.pedidosMedio, 2)} pedidos`}
          detalhe={`${pct(pctUmaVez)} compraram uma vez só. Quem volta faz ${num(r.pedidosRecorrente, 1)} pedidos, em média.`}
        />
        <Kpi
          rotulo="Quanto demora pra voltar"
          valor={meses(r.ateSegundaMediana)}
          detalhe={`Da 1ª pra 2ª compra (metade volta até aí; média de ${meses(r.ateSegundaMedia)}). Depois, compra a cada ${meses(r.intervaloMediano)}.`}
        />
        <Kpi
          rotulo="Por quanto tempo compra"
          valor={meses(r.vidaRecorrente)}
          detalhe={`Média de quem comprou 2+ vezes, da 1ª à última compra. Metade fica até ${meses(r.vidaRecorrenteMediana)}.`}
        />
      </div>

      {/* Lado a lado: quem compra uma vez x quem volta. */}
      <Cartao className="overflow-x-auto">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800">Cliente de uma compra x cliente que volta</h3>
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3"></th>
              <th className="py-2 pr-3 text-right">Clientes</th>
              <th className="py-2 pr-3 text-right">LTV médio</th>
              <th className="py-2 pr-3 text-right">Pedidos</th>
              <th className="py-2 pr-3 text-right">Ticket médio</th>
              <th className="py-2 text-right">Tempo comprando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            <tr>
              <td className="py-2 pr-3 font-medium text-neutral-800">Comprou 1 vez</td>
              <td className="py-2 pr-3 text-right tabular-nums">{num(umaVez?.contas)}</td>
              <td className="py-2 pr-3 text-right font-semibold tabular-nums">{brl(r.ltvUmaVez)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">1</td>
              <td className="py-2 pr-3 text-right tabular-nums">{brl(r.ticketUmaVez)}</td>
              <td className="py-2 text-right text-neutral-500">uma compra só</td>
            </tr>
            <tr>
              <td className="py-2 pr-3 font-medium text-neutral-800">Comprou 2+ vezes</td>
              <td className="py-2 pr-3 text-right tabular-nums">{num(r.recorrentes)}</td>
              <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                {brl(r.ltvRecorrente)}
                {r.ltvRecorrente && r.ltvUmaVez ? (
                  <span className="ml-1 text-xs font-normal text-green-700">
                    ({num(r.ltvRecorrente / r.ltvUmaVez, 1)}x)
                  </span>
                ) : null}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums">{num(r.pedidosRecorrente, 1)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{brl(r.ticketRecorrente)}</td>
              <td className="py-2 text-right tabular-nums">{meses(r.vidaRecorrente)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">
          Dos {num(r.recorrentes)} clientes que voltaram, {num(r.recorrentesAtivos)} compraram nos últimos 12 meses e{" "}
          <span className="font-medium text-red-600">{num(r.recorrentesParados)} estão parados há mais de 1 ano</span>{" "}
          — boa lista pra reativar.
        </p>
      </Cartao>

      {/* Quantas vezes compra: distribuição. */}
      <Cartao className="overflow-x-auto">
        <h3 className="mb-3 text-sm font-semibold text-neutral-800">Quantas vezes cada cliente comprou</h3>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">Comprou</th>
              <th className="py-2 pr-3 text-right">Clientes</th>
              <th className="w-[26%] py-2 pr-3">% das vendas</th>
              <th className="py-2 pr-3 text-right">LTV médio</th>
              <th className="py-2 pr-3 text-right">Tempo comprando</th>
              <th className="py-2 text-right">Compra a cada</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {l.frequencia.map((f) => (
              <tr key={f.faixa}>
                <td className="py-2 pr-3 font-medium text-neutral-800">{FAIXAS_FREQUENCIA[f.faixa - 1]}</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {num(f.contas)} <span className="text-xs text-neutral-500">({pct(f.contas / (r.contas || 1))})</span>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Barra fracao={f.receita / totalFreq} />
                    </div>
                    <span className="w-10 text-right text-xs tabular-nums">{pct(f.receita / totalFreq)}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right font-semibold tabular-nums">{brl(f.ltv)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{f.faixa === 1 ? "—" : meses(f.vida)}</td>
                <td className="py-2 text-right tabular-nums">{meses(f.intervalo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Cartao>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Quanto demora pra voltar */}
        <Cartao>
          <h3 className="mb-1 text-sm font-semibold text-neutral-800">Quanto tempo o cliente demora pra voltar</h3>
          <p className="mb-3 text-xs text-neutral-500">
            De cada 100 clientes novos, quantos fizeram a 2ª compra dentro do prazo.
          </p>
          <div className="space-y-3">
            <LinhaBarra rotulo="Voltou em até 3 meses" fracao={r.voltou3 ?? 0} valor={pct(r.voltou3, 1)} />
            <LinhaBarra rotulo="Voltou em até 6 meses" fracao={r.voltou6 ?? 0} valor={pct(r.voltou6, 1)} />
            <LinhaBarra rotulo="Voltou em até 1 ano" fracao={r.voltou12 ?? 0} valor={pct(r.voltou12, 1)} />
          </div>
          <h4 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            De quanto em quanto tempo quem volta compra
          </h4>
          <div className="space-y-3">
            {l.intervalos.map((f) => (
              <LinhaBarra
                key={f.faixa}
                rotulo={FAIXAS_INTERVALO[f.faixa - 1]}
                fracao={f.contas / maiorIntervalo}
                valor={
                  <>
                    {num(f.contas)} clientes{" "}
                    <span className="text-neutral-500">({pct(f.contas / totalIntervalos)})</span>
                  </>
                }
                detalhe={`LTV médio ${brl(f.ltv)}`}
                cor="bg-[#0ea5e9]"
              />
            ))}
          </div>
        </Cartao>

        {/* Por quanto tempo continua comprando */}
        <Cartao>
          <h3 className="mb-1 text-sm font-semibold text-neutral-800">Por quanto tempo o cliente continua comprando</h3>
          <p className="mb-3 text-xs text-neutral-500">
            Clientes que compraram 2+ vezes, pelo tempo entre a 1ª e a última compra.
          </p>
          <div className="space-y-3">
            {l.vida.map((f) => (
              <LinhaBarra
                key={f.faixa}
                rotulo={FAIXAS_VIDA[f.faixa - 1]}
                fracao={f.contas / maiorVida}
                valor={
                  <>
                    {num(f.contas)} clientes{" "}
                    <span className="text-neutral-500">({pct(f.contas / (r.recorrentes || 1))})</span>
                  </>
                }
                detalhe={`LTV médio ${brl(f.ltv)}`}
                cor="bg-[#16a34a]"
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Quanto mais tempo o cliente fica, mais ele vale: quem compra há mais de 4 anos vale{" "}
            {brl(l.vida.find((v) => v.faixa === 5)?.ltv)} em média.
          </p>
        </Cartao>
      </div>

      {/* Coortes: clientes agrupados pelo ano da 1ª compra. */}
      <Cartao className="overflow-x-auto">
        <h3 className="mb-1 text-sm font-semibold text-neutral-800">LTV por ano em que o cliente entrou</h3>
        <p className="mb-3 text-xs text-neutral-500">
          Clientes agrupados pelo ano da 1ª compra. Os mais recentes tiveram menos tempo pra voltar, então o LTV deles
          ainda vai crescer.
        </p>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-2 pr-3">Entrou em</th>
              <th className="py-2 pr-3 text-right">Clientes</th>
              <th className="w-[30%] py-2 pr-3">LTV médio até hoje</th>
              <th className="py-2 pr-3 text-right">Voltaram a comprar</th>
              <th className="py-2 pr-3 text-right">Pedidos por cliente</th>
              <th className="py-2 text-right">Ainda compram</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {l.coortes.map((c) => (
              <tr key={c.ano}>
                <td className="py-2 pr-3 font-semibold text-neutral-800">{c.ano}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(c.contas)}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Barra fracao={c.ltv / maiorCoorte} />
                    </div>
                    <span className="w-20 text-right tabular-nums">{brlCurto(c.ltv)}</span>
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{pct(c.recompra)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{num(c.pedidos, 1)}</td>
                <td className="py-2 text-right tabular-nums">
                  {num(c.ativos)} <span className="text-xs text-neutral-500">({pct(c.ativos / (c.contas || 1))})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-neutral-500">&quot;Ainda compram&quot; = fez pedido nos últimos 12 meses.</p>
      </Cartao>
    </div>
  );
}

export default async function HistoricoVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const { usuario } = await usuarioAutenticado();
  if (!usuario || (usuario.papel !== "admin" && !usuario.super_admin)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data, error }, { data: dadosLtv, error: erroLtv }] = await Promise.all([
    supabase.rpc("historico_vendas_resumo"),
    supabase.rpc("historico_ltv_detalhe"),
  ]);
  const h = data as Historico | null;
  const ltv = dadosLtv as LtvDetalhe | null;

  if (error || erroLtv || !h || !ltv || h.resumo.pedidosTotal === 0) {
    return (
      <>
        <PageHeader titulo="Histórico de vendas" />
        <main className="bg-[#f4f5f7] px-6 py-6">
          <Cartao>
            <p className="text-sm text-neutral-600">
              {error || erroLtv
                ? "Não foi possível carregar o histórico agora. Tente de novo em alguns minutos."
                : "Essa empresa ainda não tem histórico de pedidos importado."}
            </p>
          </Cartao>
        </main>
      </>
    );
  }

  const r = h.resumo;
  const anos = h.anual.map((a) => a.ano);
  const ultimoAno = anos[anos.length - 1];
  const anoSel = anos.includes(Number(anoParam)) ? Number(anoParam) : ultimoAno;
  const mesesAno = h.mensal.filter((m) => m.mes.startsWith(`${anoSel}-`));
  const maiorMes = Math.max(
    1,
    ...mesesAno.map((m) => Math.max(m.receita, m.receitaAnoAnterior ?? 0))
  );
  const maiorAno = Math.max(1, ...h.anual.map((a) => a.receita));
  const totalCanais = h.canais.reduce((s, c) => s + c.receita, 0) || 1;
  const totalFaixas = h.faixas.reduce((s, f) => s + f.receita, 0) || 1;
  const pedidosFaixas = h.faixas.reduce((s, f) => s + f.pedidos, 0) || 1;
  const totalVend = h.vendedores.reduce((s, v) => s + v.receita, 0) || 1;
  const mesYtd = r.ytdMes ? MESES_LONGOS[r.ytdMes - 1] : "";
  const periodoTexto = `${r.inicio?.slice(5)}/${r.inicio?.slice(0, 4)} a ${r.fim?.slice(5)}/${r.fim?.slice(0, 4)}`;

  return (
    <>
      <PageHeader titulo="Histórico de vendas" />

      <main className="space-y-8 bg-[#f4f5f7] px-6 py-6">
        <p className="text-sm text-neutral-600">
          Pedidos fechados da planilha comercial, de {periodoTexto}. &quot;Vendas&quot; aqui é o valor dos
          pedidos fechados no mês (coluna RECEITA da planilha), não o dinheiro que entrou no caixa.
        </p>

        {/* Ano corrente até o último mês com pedido, contra os mesmos meses do ano anterior. */}
        <section>
          <Titulo sub={`Janeiro a ${mesYtd} de ${r.ytdAno}, comparado com o mesmo período de ${(r.ytdAno ?? 0) - 1}.`}>
            {r.ytdAno} até agora
          </Titulo>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              rotulo="Vendas fechadas"
              valor={brlCurto(r.receitaYtd)}
              detalhe={
                <>
                  <Variacao valor={variacao(r.receitaYtd, r.receitaYtdAnterior)} /> vs {brlCurto(r.receitaYtdAnterior)}
                </>
              }
            />
            <Kpi
              rotulo="Pedidos"
              valor={num(r.pedidosYtd)}
              detalhe={
                <>
                  <Variacao valor={variacao(r.pedidosYtd, r.pedidosYtdAnterior)} /> vs {num(r.pedidosYtdAnterior)}
                </>
              }
            />
            <Kpi
              rotulo="Ticket médio"
              valor={brl(r.pedidosYtd ? (r.receitaYtd ?? 0) / r.pedidosYtd : null)}
              detalhe={
                <>
                  <Variacao
                    valor={variacao(
                      r.pedidosYtd ? (r.receitaYtd ?? 0) / r.pedidosYtd : null,
                      r.pedidosYtdAnterior ? (r.receitaYtdAnterior ?? 0) / r.pedidosYtdAnterior : null
                    )}
                  />{" "}
                  vs {brl(r.pedidosYtdAnterior ? (r.receitaYtdAnterior ?? 0) / r.pedidosYtdAnterior : null)}
                </>
              }
            />
            <Kpi
              rotulo="Clientes novos"
              valor={num(r.novosYtd)}
              detalhe={
                <>
                  <Variacao valor={variacao(r.novosYtd, r.novosYtdAnterior)} /> vs {num(r.novosYtdAnterior)}
                </>
              }
            />
          </div>
        </section>

        {/* Total do ano + média por mês lado a lado: o total (ex.: R$ 30 mi) é a soma dos 12 meses. */}
        <section>
          <Titulo sub="Total do ano é a soma de todos os meses. A média por mês ajuda a comparar com o faturamento mensal.">
            Vendas por ano
          </Titulo>
          <Cartao className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">Ano</th>
                  <th className="w-[38%] py-2 pr-3">Total no ano</th>
                  <th className="py-2 pr-3 text-right">Média por mês</th>
                  <th className="py-2 pr-3 text-right">vs ano anterior</th>
                  <th className="py-2 pr-3 text-right">Pedidos</th>
                  <th className="py-2 text-right">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {h.anual.map((a) => {
                  const parcial = a.meses < 12;
                  return (
                    <tr key={a.ano}>
                      <td className="py-2 pr-3 font-semibold text-neutral-800">
                        {a.ano}
                        {parcial && (
                          <span className="ml-1 text-xs font-normal text-neutral-500">
                            ({a.meses} meses)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Barra fracao={a.receita / maiorAno} cor={parcial ? "bg-[#93b4f5]" : "bg-[#2563eb]"} />
                          </div>
                          <span className="w-24 text-right font-semibold tabular-nums text-neutral-900">
                            {brlCurto(a.receita)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brlCurto(a.receita / a.meses)}</td>
                      <td className="py-2 pr-3 text-right">
                        {parcial ? (
                          <span className="text-xs text-neutral-400">ano incompleto</span>
                        ) : (
                          <Variacao valor={variacao(a.receita, a.receitaAnoAnterior)} />
                        )}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(a.pedidos)}</td>
                      <td className="py-2 text-right tabular-nums">{brl(a.ticketMedio)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Cartao>
        </section>

        {/* Mês a mês do ano escolhido, contra o mesmo mês do ano anterior. */}
        <section>
          <Titulo sub="Cada mês comparado com o mesmo mês do ano anterior (barra cinza) e com o mês anterior.">
            Crescimento e queda mês a mês
          </Titulo>
          <div className="mb-3 flex flex-wrap gap-2">
            {anos.map((a) => (
              <Link
                key={a}
                href={`/dashboard/historico?ano=${a}`}
                scroll={false}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  a === anoSel
                    ? "border-[#2563eb] bg-[#2563eb] text-white"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                }`}
              >
                {a}
              </Link>
            ))}
          </div>
          <Cartao className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">Mês</th>
                  <th className="w-[34%] py-2 pr-3">Vendas fechadas</th>
                  <th className="py-2 pr-3 text-right">vs {anoSel - 1}</th>
                  <th className="py-2 pr-3 text-right">vs mês anterior</th>
                  <th className="py-2 pr-3 text-right">Pedidos</th>
                  <th className="py-2 pr-3 text-right">Ticket médio</th>
                  <th className="py-2 text-right">Clientes novos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {mesesAno.map((m) => {
                  const i = Number(m.mes.slice(5)) - 1;
                  return (
                    <tr key={m.mes}>
                      <td className="py-2 pr-3 font-semibold text-neutral-800">{MESES[i]}</td>
                      <td className="py-2 pr-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <Barra fracao={m.receita / maiorMes} />
                            </div>
                            <span className="w-24 text-right font-semibold tabular-nums text-neutral-900">
                              {brlCurto(m.receita)}
                            </span>
                          </div>
                          {m.receitaAnoAnterior !== null && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Barra fracao={m.receitaAnoAnterior / maiorMes} cor="bg-neutral-300" />
                              </div>
                              <span className="w-24 text-right text-xs tabular-nums text-neutral-500">
                                {brlCurto(m.receitaAnoAnterior)}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Variacao valor={variacao(m.receita, m.receitaAnoAnterior)} />
                      </td>
                      <td className="py-2 pr-3 text-right">
                        <Variacao valor={variacao(m.receita, m.receitaMesAnterior)} />
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{num(m.pedidos)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{brl(m.ticket)}</td>
                      <td className="py-2 text-right tabular-nums">{num(m.novos)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Cartao>
        </section>

        {/* Clientes e LTV — só clientes diretos (sem Big Lar, Hiper e Forte, que são rede/revenda). */}
        <section>
          <Titulo sub="Clientes diretos (fora Big Lar, Hiper Gôndolas e Forte, que são rede ou revenda), período todo.">
            Clientes e LTV
          </Titulo>
          <LtvDetalhado l={ltv} />

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Cartao>
              <h3 className="mb-3 text-sm font-semibold text-neutral-800">Vendas por canal</h3>
              <div className="space-y-3">
                {h.canais.map((c) => (
                  <div key={c.canal}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-neutral-700">{c.canal}</span>
                      <span className="tabular-nums text-neutral-900">
                        {brlCurto(c.receita)}{" "}
                        <span className="text-neutral-500">({pct(c.receita / totalCanais)})</span>
                      </span>
                    </div>
                    <Barra fracao={c.receita / totalCanais} />
                    <p className="mt-1 text-xs text-neutral-500">
                      {num(c.pedidos)} pedidos · ticket médio {brl(c.ticketMedio)} · mediana {brl(c.ticketMediano)}
                    </p>
                  </div>
                ))}
              </div>
            </Cartao>

            <Cartao>
              <h3 className="mb-3 text-sm font-semibold text-neutral-800">Tamanho do pedido e prazo de entrega</h3>
              <div className="space-y-3">
                {h.faixas.map((f) => (
                  <div key={f.faixa}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-neutral-700">{FAIXAS[f.faixa - 1]}</span>
                      <span className="tabular-nums text-neutral-900">
                        {pct(f.pedidos / pedidosFaixas)} dos pedidos ·{" "}
                        <span className="text-neutral-500">{pct(f.receita / totalFaixas)} das vendas</span>
                      </span>
                    </div>
                    <Barra fracao={f.receita / totalFaixas} />
                    <p className="mt-1 text-xs text-neutral-500">
                      Entrega em {num(f.entregaMediana)} dias (mediana) · média {num(f.entregaMedia, 0)} dias
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-neutral-500">
                Prazo geral do fechamento à entrega: {num(r.entregaMediana)} dias (mediana), {num(r.entregaMedia, 0)} em
                média. Só conta pedido com as duas datas na planilha.
              </p>
            </Cartao>
          </div>

          <Cartao className="mt-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-neutral-800">Maiores clientes (período todo)</h3>
            <p className="mb-3 text-xs text-neutral-500">
              &quot;Compra a cada&quot; é o tempo médio entre um mês com pedido e o próximo. &quot;Parado há&quot; conta até{" "}
              {mesAno(r.fim)}, o último mês da planilha.
            </p>
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Cliente</th>
                  <th className="py-2 pr-3 text-right">Vendas (LTV)</th>
                  <th className="py-2 pr-3 text-right">Pedidos</th>
                  <th className="py-2 pr-3 text-right">Meses com compra</th>
                  <th className="py-2 pr-3 text-right">Compra a cada</th>
                  <th className="py-2 pr-3 text-right">Ticket médio</th>
                  <th className="py-2 pr-3 text-right">Período</th>
                  <th className="py-2 text-right">Parado há</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {ltv.clientes.map((c, i) => (
                  <tr key={c.conta}>
                    <td className="py-2 pr-3 tabular-nums text-neutral-400">{i + 1}</td>
                    <td className="py-2 pr-3 font-medium text-neutral-800">
                      {c.conta}
                      {c.canal !== "Demais clientes" && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700">
                          rede/revenda
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{brl(c.receita)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(c.pedidos)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(c.mesesCompra)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{meses(c.intervalo)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{brl(c.receita / c.pedidos)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-neutral-600">
                      {mesAno(c.primeiro)} a {mesAno(c.ultimo)}
                      <span className="block text-xs text-neutral-400">{meses(c.vida)}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {c.mesesSemComprar === 0 ? (
                        <span className="text-green-700">comprou no mês</span>
                      ) : (
                        <span className={c.mesesSemComprar >= 12 ? "text-red-600" : "text-neutral-600"}>
                          {meses(c.mesesSemComprar)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>
        </section>

        <section>
          <Titulo sub={`Desde janeiro de ${ultimoAno - 2}, pelo nome do vendedor anotado na planilha.`}>
            Vendedores
          </Titulo>
          <Cartao className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-3">Vendedor</th>
                  <th className="w-[40%] py-2 pr-3">Vendas</th>
                  <th className="py-2 pr-3 text-right">Pedidos</th>
                  <th className="py-2 text-right">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {h.vendedores.map((v) => (
                  <tr key={v.vendedor}>
                    <td className="py-2 pr-3 font-medium text-neutral-800">{v.vendedor}</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Barra fracao={v.receita / (h.vendedores[0]?.receita || 1)} />
                        </div>
                        <span className="w-28 text-right tabular-nums">
                          {brlCurto(v.receita)}{" "}
                          <span className="text-xs text-neutral-500">({pct(v.receita / totalVend)})</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">{num(v.pedidos)}</td>
                    <td className="py-2 text-right tabular-nums">{brl(v.ticketMedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Cartao>
        </section>

        <Cartao>
          <h3 className="mb-2 text-sm font-semibold text-neutral-800">Como esses números foram feitos</h3>
          <ul className="list-disc space-y-1 pl-5 text-xs text-neutral-600">
            <li>
              Fonte: planilha de pedidos comerciais fechados. {num(r.pedidosTotal)} pedidos com valor, somando{" "}
              {brl(r.receitaTotal)}. {num(r.zerados)} pedidos sem valor (troca, bonificação, cancelado) ficam de fora.
            </li>
            <li>
              Cada pedido conta no mês do fechamento. Pedido parcelado conta inteiro nesse mês — por isso pode ser
              diferente do que entrou no caixa.
            </li>
            <li>
              Todas as filiais da Big Lar contam como um cliente só. Pedidos da Hiper Gôndolas e da Forte (inclusive
              os anotados com esses vendedores) contam como canal de revenda.
            </li>
            <li>
              Tempo entre compras e tempo comprando são medidos em meses (mês do pedido), porque a planilha não tem a
              data de fechamento em 2024 e 2025. Dois pedidos no mesmo mês contam como 2 pedidos, mas como um mês de
              compra.
            </li>
            <li>
              LTV é o total que um cliente já comprou no período. CAC não aparece porque não temos o gasto com
              marketing e com o time comercial.
            </li>
          </ul>
        </Cartao>
      </main>
    </>
  );
}
