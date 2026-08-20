import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; safe to ignore when
            // middleware handles session refresh
          }
        },
      },
    }
  );
}

export type UsuarioAtual = {
  id: string;
  org_id: string;
  nome: string;
  papel: string;
  funcao: string | null;
  paginas_permitidas: string[];
  foto_url: string | null;
  super_admin: boolean;
};

// auth.getUser() e a busca em "usuarios" rodavam de novo em CADA página E no
// layout — várias idas na rede pra pegar a mesma coisa numa só requisição.
// React.cache() garante que só executa uma vez por requisição, mesmo
// chamado de vários Server Components diferentes.
export const usuarioAutenticado = cache(async (): Promise<{
  user: User | null;
  usuario: UsuarioAtual | null;
}> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, usuario: null };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, org_id, nome, papel, funcao, paginas_permitidas, foto_url, super_admin")
    .eq("id", user.id)
    .single();

  return { user, usuario: usuario as UsuarioAtual | null };
});
