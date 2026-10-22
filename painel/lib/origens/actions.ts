"use server";

import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Quando alguém digita uma origem nova em "Outro..." no cadastro/edição do
// lead, ela precisa ficar salva pra próxima pessoa já ver ela na lista —
// sem isso, cada um digitaria o mesmo nome de um jeito diferente.
// Valor que NÃO é nome de origem: data, hora, só número (CNPJ, telefone), ou
// texto comprido demais. Acontece quando uma coluna errada de uma planilha cai
// no campo de origem — já virou 600 "origens" lixo na Inove Gôndolas e 40 na
// Ketlyn (22/10/26). Regra de segurança pra TODOS os CRMs: nunca cria origem
// com esse formato.
export function pareceOrigemInvalida(nome: string): boolean {
  const t = nome.trim();
  return (
    t.length === 0 ||
    t.length > 60 ||
    /^[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}$/.test(t) ||
    /^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$/.test(t) ||
    /^[0-9.,\-/\s]+$/.test(t)
  );
}

export async function garantirOrigem(
  supabase: SupabaseServerClient,
  orgId: string,
  nome: string | null
) {
  if (!nome || pareceOrigemInvalida(nome)) return;
  await supabase
    .from("origens")
    .upsert({ org_id: orgId, nome }, { onConflict: "org_id,nome", ignoreDuplicates: true });
}
