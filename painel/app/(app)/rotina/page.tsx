import { redirect } from "next/navigation";
import { usuarioAutenticado } from "@/lib/supabase/server";
import { buscarRotinaHoje, buscarRotinaEquipe } from "@/lib/rotina/actions";
import { PageHeader } from "@/components/page-header";
import { RotinaDiaria } from "@/components/rotina-diaria";
import { RotinaEquipeAdmin } from "@/components/rotina-equipe";

export default async function RotinaPage() {
  const { usuario } = await usuarioAutenticado();

  // Só existe pro público mentoria (o imobiliário não separa SDR de
  // Closer, não tem essa rotina) — mesma trava de acesso que o middleware
  // já aplica, repetida aqui pra ninguém cair aqui digitando a URL direto.
  if (!usuario || usuario.publico_org === "imobiliario") {
    redirect("/leads");
  }

  const [concluidasIniciais, equipe] = await Promise.all([buscarRotinaHoje(), buscarRotinaEquipe()]);

  return (
    <>
      <PageHeader titulo="Minha rotina" />
      <main className="min-h-full bg-[#f4f5f7]">
        <RotinaDiaria concluidasIniciais={concluidasIniciais} />
        {equipe && <RotinaEquipeAdmin equipe={equipe} />}
      </main>
    </>
  );
}
