import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ImportarUnidadesForm } from "@/components/importar-unidades-form";
import { AcoesUnidade } from "@/components/acoes-unidade";

type Unidade = {
  id: string;
  numero: string;
  andar: number | null;
  area_m2: number | null;
  quartos: number | null;
  vagas: string | null;
  tipologia: string | null;
  posicao: string | null;
  status: string;
  valor: number | null;
  parcela_entrada: number | null;
  parcela_mensal: number | null;
  parcela_semestral: number | null;
  parcela_chaves: number | null;
};

function moeda(v: number | null) {
  return v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

const ROTULO_STATUS: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
};

export default async function UnidadesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: imovel } = await supabase
    .from("imoveis")
    .select("titulo")
    .eq("id", id)
    .is("arquivado_em", null)
    .single();
  if (!imovel) notFound();

  const { data } = await supabase
    .from("unidades_imovel")
    .select(
      "id, numero, andar, area_m2, quartos, vagas, tipologia, posicao, status, valor, parcela_entrada, parcela_mensal, parcela_semestral, parcela_chaves"
    )
    .eq("imovel_id", id)
    .is("arquivado_em", null)
    .order("andar", { ascending: true, nullsFirst: false })
    .order("numero", { ascending: true });

  const unidades = (data ?? []) as Unidade[];
  const contagem = (s: string) => unidades.filter((u) => u.status === s).length;

  return (
    <>
      <PageHeader titulo={`Unidades — ${imovel.titulo}`} />

      <main className="space-y-5 bg-[#f4f5f7] px-6 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/imoveis/${id}`}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            ← Voltar ao empreendimento
          </Link>
          <div className="flex gap-3 text-sm">
            <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 shadow-sm">
              <b>{unidades.length}</b> unidades
            </span>
            <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 shadow-sm">
              <b className="text-green-700">{contagem("disponivel")}</b> disponíveis
            </span>
            <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 shadow-sm">
              <b className="text-amber-700">{contagem("reservada")}</b> reservadas
            </span>
            <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 shadow-sm">
              <b className="text-neutral-700">{contagem("vendida")}</b> vendidas
            </span>
          </div>
        </div>

        <div className="mx-auto max-w-3xl">
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Importar da planilha</h2>
          <ImportarUnidadesForm imovelId={id} />
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs uppercase text-neutral-500">
              <tr>
                {["Unidade", "Andar", "Área", "Tipologia", "Posição", "Vagas", "Preço", "Entrada", "Mensal", "Semestral", "Chaves", "Situação"].map(
                  (t) => (
                    <th key={t} className="px-3 py-3 font-medium">
                      {t}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {unidades.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-sm text-neutral-400">
                    Nenhuma unidade ainda. Importe a planilha acima.
                  </td>
                </tr>
              ) : (
                unidades.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2.5 font-semibold text-neutral-900">{u.numero}</td>
                    <td className="px-3 py-2.5">{u.andar ?? "—"}</td>
                    <td className="px-3 py-2.5">{u.area_m2 !== null ? `${u.area_m2} m²` : "—"}</td>
                    <td className="px-3 py-2.5">{u.tipologia ?? "—"}</td>
                    <td className="px-3 py-2.5">{u.posicao ?? "—"}</td>
                    <td className="px-3 py-2.5">{u.vagas ?? "—"}</td>
                    <td className="px-3 py-2.5 font-medium text-green-700">{moeda(u.valor)}</td>
                    <td className="px-3 py-2.5">{moeda(u.parcela_entrada)}</td>
                    <td className="px-3 py-2.5">{moeda(u.parcela_mensal)}</td>
                    <td className="px-3 py-2.5">{moeda(u.parcela_semestral)}</td>
                    <td className="px-3 py-2.5">{moeda(u.parcela_chaves)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-neutral-500">{ROTULO_STATUS[u.status] ?? u.status}</span>
                        <AcoesUnidade imovelId={id} unidadeId={u.id} status={u.status} />
                      </div>
                    </td>
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
