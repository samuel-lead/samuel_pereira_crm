import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NovaEmpresaForm } from "@/components/nova-empresa-form";

export default function NovaEmpresaPage() {
  return (
    <>
      <PageHeader
        titulo="Nova empresa"
        acao={
          <Link
            href="/empresas"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            Cancelar
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <NovaEmpresaForm />
        </div>
      </main>
    </>
  );
}
