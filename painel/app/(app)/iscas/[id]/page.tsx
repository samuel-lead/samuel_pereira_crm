import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EditarIscaForm } from "@/components/editar-isca-form";

export default async function EditarIscaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const dominio = `${protocolo}://${host}`;

  const { data: isca } = await supabase
    .from("iscas")
    .select("id, nome, slug, material_url, whatsapp_contato_e164, whatsapp_mensagem, ativo")
    .eq("id", id)
    .single();

  if (!isca) {
    notFound();
  }

  return (
    <>
      <PageHeader
        titulo="Editar isca"
        acao={
          <Link href="/iscas" className="text-sm text-neutral-500 hover:text-neutral-700">
            Voltar
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <EditarIscaForm isca={isca} dominio={dominio} />
        </div>
      </main>
    </>
  );
}
