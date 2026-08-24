import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { ImovelForm, type ImovelExistente } from "@/components/imovel-form";
import { ArquivarImovelButton } from "@/components/arquivar-imovel-button";
import { atualizarImovel } from "@/lib/imoveis/actions";

export default async function ImovelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: imovel } = await supabase
    .from("imoveis")
    .select(
      "titulo, tipo, finalidade, valor_venda, valor_aluguel, endereco, bairro, cidade, estado, cep, quartos, banheiros, vagas_garagem, area_m2, descricao, status, proprietario_nome, proprietario_telefone"
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
      <PageHeader titulo={imovel.titulo} />

      <main className="mx-auto max-w-lg space-y-4 bg-[#f4f5f7] px-6 py-10">
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
