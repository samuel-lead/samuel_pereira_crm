import Link from "next/link";
import { headers } from "next/headers";
import { PageHeader } from "@/components/page-header";
import { NovoIscaForm } from "@/components/novo-isca-form";

export default async function NovaIscaPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const dominio = `${protocolo}://${host}`;

  // Vem da lista de Iscas — o botão "+ Nova isca" já manda tipo=material e
  // "+ Novo forms" já manda tipo=contato, pra abrir direto no tipo certo
  // em vez da pessoa escolher de novo aqui dentro.
  const { tipo } = await searchParams;
  const tipoInicial = tipo === "contato" ? "contato" : "material";

  return (
    <>
      <PageHeader
        titulo={tipoInicial === "material" ? "Nova isca" : "Novo formulário"}
        acao={
          <Link href="/iscas" className="text-sm text-neutral-500 hover:text-neutral-700">
            Cancelar
          </Link>
        }
      />

      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          <NovoIscaForm dominio={dominio} tipoInicial={tipoInicial} />
        </div>
      </main>
    </>
  );
}
