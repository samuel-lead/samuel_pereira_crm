import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ImovelForm } from "@/components/imovel-form";
import { criarImovel } from "@/lib/imoveis/actions";

export default function NovoImovelPage() {
  return (
    <>
      <PageHeader
        titulo="Novo imóvel"
        acao={
          <Link
            href="/imoveis"
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
          >
            ← Voltar pra Imóveis
          </Link>
        }
      />

      <main className="mx-auto max-w-lg bg-[#f4f5f7] px-6 py-10">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-md">
          <ImovelForm acao={criarImovel} textoBotao="Salvar imóvel" cancelarHref="/imoveis" />
        </div>
      </main>
    </>
  );
}
