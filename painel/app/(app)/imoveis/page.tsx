import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";

type ImovelLinha = {
  id: string;
  titulo: string;
  tipo: string;
  finalidade: string;
  valor_venda: number | null;
  valor_aluguel: number | null;
  bairro: string | null;
  cidade: string | null;
  status: string;
};

const ROTULO_TIPO: Record<string, string> = {
  apartamento: "Apartamento",
  casa: "Casa",
  terreno: "Terreno",
  sala_comercial: "Sala comercial",
  galpao: "Galpão",
  outro: "Outro",
};

const ROTULO_STATUS: Record<string, { texto: string; classe: string }> = {
  disponivel: { texto: "Disponível", classe: "bg-green-100 text-green-700" },
  reservado: { texto: "Reservado", classe: "bg-amber-100 text-amber-700" },
  vendido: { texto: "Vendido", classe: "bg-blue-100 text-blue-700" },
  alugado: { texto: "Alugado", classe: "bg-violet-100 text-violet-700" },
  inativo: { texto: "Inativo", classe: "bg-neutral-200 text-neutral-600" },
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function ImoveisPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("imoveis")
    .select("id, titulo, tipo, finalidade, valor_venda, valor_aluguel, bairro, cidade, status")
    .is("arquivado_em", null)
    .order("created_at", { ascending: false });

  const imoveis = (data ?? []) as ImovelLinha[];

  return (
    <>
      <PageHeader
        titulo="Imóveis"
        acao={
          <Link
            href="/imoveis/novo"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Novo imóvel
          </Link>
        }
      />

      <main className="max-w-4xl px-6 py-6">
        <p className="mb-4 text-sm text-neutral-500">
          {imoveis.length} {imoveis.length === 1 ? "imóvel" : "imóveis"} cadastrado
          {imoveis.length === 1 ? "" : "s"}
        </p>

        {imoveis.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
            Nenhum imóvel cadastrado ainda
          </p>
        ) : (
          <div className="space-y-3">
            {imoveis.map((imovel) => {
              const statusInfo = ROTULO_STATUS[imovel.status] ?? ROTULO_STATUS.disponivel;
              return (
                <Link
                  key={imovel.id}
                  href={`/imoveis/${imovel.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-neutral-900">{imovel.titulo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusInfo.classe}`}>
                        {statusInfo.texto}
                      </span>
                    </div>
                    <p className="truncate text-sm text-neutral-500">
                      {ROTULO_TIPO[imovel.tipo] ?? imovel.tipo}
                      {imovel.bairro ? ` · ${imovel.bairro}` : ""}
                      {imovel.cidade ? `, ${imovel.cidade}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm font-medium text-neutral-700">
                    {imovel.valor_venda != null && <p>{formatarMoeda(imovel.valor_venda)}</p>}
                    {imovel.valor_aluguel != null && (
                      <p className="text-neutral-500">{formatarMoeda(imovel.valor_aluguel)}/mês</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
