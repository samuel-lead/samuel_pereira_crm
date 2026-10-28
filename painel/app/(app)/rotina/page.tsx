import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { atividadesDaRotina, metaDiariaDaRotina, metaMensalDaRotina } from "@/lib/rotina/atividades";
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

  const [concluidasIniciais, equipe, { data: orgRotina }] = await Promise.all([
    buscarRotinaHoje(),
    buscarRotinaEquipe(),
    (await createClient()).from("orgs").select("rotina_modelo").eq("id", usuario.org_id).maybeSingle(),
  ]);
  // Cada empresa tem a sua rotina (orgs.rotina_modelo) — ex.: a Banker.
  const atividades = atividadesDaRotina(orgRotina?.rotina_modelo);

  return (
    <>
      <PageHeader titulo="Minha rotina" />
      <main className="min-h-full bg-[#f4f5f7]">
        <RotinaDiaria
          concluidasIniciais={concluidasIniciais}
          atividades={atividades}
          metaDiaria={metaDiariaDaRotina(orgRotina?.rotina_modelo)}
          metaMensal={metaMensalDaRotina(orgRotina?.rotina_modelo, usuario.publico_org)}
          publicoOrg={usuario.publico_org}
        />
        {equipe && <RotinaEquipeAdmin equipe={equipe} atividades={atividades} publicoOrg={usuario.publico_org} />}
      </main>
    </>
  );
}
