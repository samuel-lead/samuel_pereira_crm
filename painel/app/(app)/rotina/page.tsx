import { redirect } from "next/navigation";
import { usuarioAutenticado } from "@/lib/supabase/server";
import { buscarRotinaHoje } from "@/lib/rotina/actions";
import { PageHeader } from "@/components/page-header";
import { RotinaDiaria } from "@/components/rotina-diaria";

export default async function RotinaPage() {
  const { usuario } = await usuarioAutenticado();

  // Só SDR do público mentoria (mesma trava de acesso que o middleware já
  // aplica, repetida aqui pra ninguém cair aqui digitando a URL direto).
  if (!usuario || usuario.publico_org === "imobiliario" || usuario.funcao !== "sdr") {
    redirect("/leads");
  }

  const concluidasIniciais = await buscarRotinaHoje();

  return (
    <>
      <PageHeader titulo="Minha rotina" />
      <main className="min-h-full bg-[#f4f5f7]">
        <RotinaDiaria concluidasIniciais={concluidasIniciais} />
      </main>
    </>
  );
}
