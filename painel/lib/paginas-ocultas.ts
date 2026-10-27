import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";

// Páginas que a empresa NÃO usa (ex.: Banker - Consorcio não usa Bônus SDR
// nem Captura de leads) — lista em orgs.paginas_ocultas, vazia = vê tudo.
export async function paginasOcultasDaOrg(
  supabase: SupabaseClient,
  orgId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("orgs")
    .select("paginas_ocultas")
    .eq("id", orgId)
    .maybeSingle();
  return (data?.paginas_ocultas as string[] | null) ?? [];
}

// Chamada no começo de uma página: se a empresa escondeu ela, volta pra
// tela de Leads (cobre quem digita o endereço na mão).
export async function bloquearSeOculta(
  supabase: SupabaseClient,
  orgId: string,
  href: string
) {
  if ((await paginasOcultasDaOrg(supabase, orgId)).includes(href)) {
    redirect("/leads");
  }
}

// "Captura de leads" no menu sempre existiu nas empresas de mentoria; nas
// IMOBILIÁRIAS só aparece quando a empresa foi liberada (orgs.captura_leads).
export async function capturaLeadsLiberada(
  supabase: SupabaseClient,
  orgId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("orgs")
    .select("captura_leads")
    .eq("id", orgId)
    .maybeSingle();
  return data?.captura_leads === true;
}
