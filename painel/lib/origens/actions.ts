"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Quando alguém digita uma origem nova em "Outro..." no cadastro/edição do
// lead, ela precisa ficar salva pra próxima pessoa já ver ela na lista —
// sem isso, cada um digitaria o mesmo nome de um jeito diferente.
export async function garantirOrigem(
  supabase: SupabaseServerClient,
  orgId: string,
  nome: string | null
) {
  if (!nome) return;
  await supabase
    .from("origens")
    .upsert({ org_id: orgId, nome }, { onConflict: "org_id,nome", ignoreDuplicates: true });
}
