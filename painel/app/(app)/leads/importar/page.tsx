import { PageHeader } from "@/components/page-header";
import { ImportarLeadsForm } from "@/components/importar-leads-form";

export default function ImportarLeadsPage() {
  return (
    <>
      <PageHeader titulo="Importar leads" />

      <main className="mx-auto max-w-2xl bg-[#f4f5f7] px-6 py-10">
        <ImportarLeadsForm />
      </main>
    </>
  );
}
