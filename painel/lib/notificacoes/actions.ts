"use server";

import { createClient, usuarioDoToken } from "@/lib/supabase/server";

export type EstadoPush = { erro: string | null };

// Guarda a "inscrição" que o navegador gerou (endpoint + chaves) — é
// isso que a Edge Function usa depois pra mandar a notificação de
// verdade pra esse aparelho específico. Se a pessoa já tinha essa mesma
// inscrição salva, só atualiza (upsert) — evita duplicar quando ela
// clica em "Ativar" de novo sem precisar.
export async function salvarInscricaoPush(
  inscricao: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
): Promise<EstadoPush> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);
  if (!user) return { erro: "Não autenticado" };

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("org_id")
    .eq("id", user.id)
    .single();

  if (!usuario) return { erro: "Usuário não encontrado" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      org_id: usuario.org_id,
      usuario_id: user.id,
      endpoint: inscricao.endpoint,
      p256dh: inscricao.keys.p256dh,
      auth: inscricao.keys.auth,
    },
    { onConflict: "usuario_id,endpoint" }
  );

  if (error) return { erro: error.message };
  return { erro: null };
}

export async function removerInscricaoPush(endpoint: string): Promise<EstadoPush> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);
  if (!user) return { erro: "Não autenticado" };

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("usuario_id", user.id)
    .eq("endpoint", endpoint);

  if (error) return { erro: error.message };
  return { erro: null };
}

export async function temInscricaoPush(): Promise<boolean> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);
  if (!user) return false;

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", user.id);

  return (count ?? 0) > 0;
}

// Chama a Edge Function que manda uma notificação de teste pra todos os
// aparelhos inscritos da pessoa — usa o token de quem está logado, a
// função descobre sozinha pra quem mandar.
export async function enviarPushTeste(): Promise<EstadoPush> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return { erro: "Não autenticado" };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/enviar-push`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ teste: true }),
  });

  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => "");
    return { erro: `Não deu pra mandar o teste (${resposta.status}). ${texto}`.trim() };
  }

  return { erro: null };
}
