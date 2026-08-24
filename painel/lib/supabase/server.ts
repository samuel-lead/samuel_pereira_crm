import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
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

// Mesmo cuidado do middleware.ts: auth.getUser() tenta renovar o login
// sozinho quando o token expirou, e o Supabase troca o refresh token nessa
// hora — se duas requisições disputarem essa renovação ao mesmo tempo, uma
// recebe um erro (AuthApiError) em vez do usuário. Toda Server Action que
// precisa saber quem tá logado deve usar isso, nunca chamar
// supabase.auth.getUser() direto — senão o erro sobe sem tratamento e a
// Server Action quebra com uma mensagem genérica (Next.js apaga o texto de
// erro de verdade em produção).
export async function usuarioDoToken(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
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
  // "mentoria" (público de sempre) ou "imobiliario" (corretores/imobiliária
  // — features futuras exclusivas, tipo cartas contempladas, ficam atrás
  // desse campo).
  publico_org: string;
};

// auth.getUser() e a busca em "usuarios" rodavam de novo em CADA página E no
// layout, além do middleware já ter feito as duas antes — cada navegação
// batia no Supabase 4 vezes só pra saber quem tá logado. O middleware
// (lib/supabase/middleware.ts) já busca isso e manda via header; aqui só
// lê o header. React.cache() garante que roda uma vez por requisição, não
// importa quantos componentes chamem. Só volta a consultar o Supabase se,
// por algum motivo, a requisição não passou pelo middleware.
export const usuarioAutenticado = cache(async (): Promise<{
  user: User | null;
  usuario: UsuarioAtual | null;
}> => {
  const headerList = await headers();
  const idViaHeader = headerList.get("x-user-id");

  if (idViaHeader) {
    const usuario: UsuarioAtual = {
      id: idViaHeader,
      org_id: headerList.get("x-user-org-id") ?? "",
      nome: decodeURIComponent(headerList.get("x-user-nome") ?? ""),
      papel: headerList.get("x-user-papel") ?? "",
      funcao: headerList.get("x-user-funcao") || null,
      paginas_permitidas: JSON.parse(
        decodeURIComponent(headerList.get("x-user-paginas-permitidas") ?? "%5B%5D")
      ),
      foto_url: decodeURIComponent(headerList.get("x-user-foto-url") ?? "") || null,
      super_admin: headerList.get("x-user-super-admin") === "1",
      publico_org: headerList.get("x-user-org-publico") || "mentoria",
    };

    const user = {
      id: idViaHeader,
      email: decodeURIComponent(headerList.get("x-user-email") ?? "") || undefined,
    } as User;

    return { user, usuario };
  }

  const supabase = await createClient();
  // Mesmo cuidado do middleware.ts: o refresh token pode já ter sido
  // trocado por outra requisição concorrente — trata como "não logado" em
  // vez de deixar o erro quebrar a página inteira.
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  if (!user) {
    return { user: null, usuario: null };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, org_id, nome, papel, funcao, paginas_permitidas, foto_url, super_admin, orgs(publico)")
    .eq("id", user.id)
    .single();

  if (!usuario) {
    return { user, usuario: null };
  }

  const orgInfo = usuario.orgs as { publico?: string } | { publico?: string }[] | null;
  const publicoOrg = Array.isArray(orgInfo) ? orgInfo[0]?.publico : orgInfo?.publico;

  return {
    user,
    usuario: { ...usuario, publico_org: publicoOrg ?? "mentoria" } as UsuarioAtual,
  };
});
