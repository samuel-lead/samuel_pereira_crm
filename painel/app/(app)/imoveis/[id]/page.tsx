import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ImovelForm, type ImovelExistente } from "@/components/imovel-form";
import { ArquivarImovelButton } from "@/components/arquivar-imovel-button";
import { FotoImovelForm } from "@/components/foto-imovel-form";
import { atualizarImovel } from "@/lib/imoveis/actions";

export default async function ImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: imovel } = await supabase
    .from("imoveis")
    .select(
      "titulo, codigo, tipo, finalidade, valor_venda, valor_aluguel, endereco, bairro, cidade, estado, cep, quartos, banheiros, vagas_garagem, area_m2, descricao, status, proprietario_nome, proprietario_telefone, foto_url"
    )
    .eq("id", id)
    .is("arquivado_em", null)
    .single();

  if (!imovel) {
    notFound();
  }

  const acaoComId = atualizarImovel.bind(null, id);

  return (
    <>
      <PageHeader
        titulo={imovel.titulo}
        acao={
          <Link
            href="/imoveis"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
          >
            ← Voltar pra Imóveis
          </Link>
        }
      />

      <main className="mx-auto max-w-lg space-y-4 bg-[#f4f5f7] px-6 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
          <FotoImovelForm imovelId={id} fotoUrl={imovel.foto_url} />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
          <ImovelForm
            acao={acaoComId}
            imovel={imovel as ImovelExistente}
            textoBotao="Salvar alterações"
            cancelarHref="/imoveis"
          />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
          <ArquivarImovelButton imovelId={id} />
        </div>
      </main>
    </>
  );
}
