import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import {
  RelatorioHistorico,
  Cartao,
  type Historico,
  type LtvDetalhe,
  type Acoes,
} from "@/components/historico-relatorio";

// Histórico de pedidos fechados que veio da planilha da empresa (Inove
// Gôndolas: jan/2018 a out/2026). Todos os números saem prontos do banco;
// o desenho fica em components/historico-relatorio.tsx. Só admin vê.

export default async function HistoricoVendasPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { ano: anoParam } = await searchParams;
  const { usuario } = await usuarioAutenticado();
  if (!usuario || (usuario.papel !== "admin" && !usuario.super_admin)) redirect("/dashboard");

  const supabase = await createClient();
  const [{ data, error }, { data: dadosLtv, error: erroLtv }, { data: dadosAcoes }] = await Promise.all([
    supabase.rpc("historico_vendas_resumo"),
    supabase.rpc("historico_ltv_detalhe"),
    supabase.rpc("historico_acoes"),
  ]);
  const h = data as Historico | null;
  const ltv = dadosLtv as LtvDetalhe | null;
  const acoes = dadosAcoes as Acoes | null;

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

  const anos = h.anual.map((a) => a.ano);
  const ultimoAno = anos[anos.length - 1];
  const anoSel = anos.includes(Number(anoParam)) ? Number(anoParam) : ultimoAno;

  return (
    <>
      <PageHeader titulo="Histórico de vendas" />
      <RelatorioHistorico h={h} ltv={ltv} acoes={acoes} anoSel={anoSel} />
    </>
  );
}
