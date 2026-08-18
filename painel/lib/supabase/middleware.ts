import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROTA_DA_PAGINA: Record<string, string> = {
  funil: "/leads",
  lista: "/leads/lista",
  atividades: "/atividades",
  metricas: "/dashboard",
};

function paginaDaRota(pathname: string): string | null {
  if (pathname === "/leads/lista" || pathname.startsWith("/leads/lista/")) return "lista";
  if (pathname === "/leads" || pathname.startsWith("/leads/")) return "funil";
  if (pathname === "/atividades" || pathname.startsWith("/atividades/")) return "atividades";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "metricas";
  if (pathname === "/usuarios" || pathname.startsWith("/usuarios/")) return "admin";
  if (pathname === "/configuracoes" || pathname.startsWith("/configuracoes/")) return "admin";
  if (pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/")) return "admin";
  if (pathname === "/ano" || pathname.startsWith("/ano/")) return "admin";
  return null;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/leads";
    return NextResponse.redirect(url);
  }

  if (user && !isLoginPage && pathname !== "/sem-acesso") {
    const pagina = paginaDaRota(pathname);

    if (pagina) {
      const { data: usuario } = await supabase
        .from("usuarios")
        .select("papel, paginas_permitidas")
        .eq("id", user.id)
        .single();

      const ehAdmin = usuario?.papel === "admin";

      if (!ehAdmin) {
        const paginasPermitidas: string[] = usuario?.paginas_permitidas ?? [];
        const permitido = pagina !== "admin" && paginasPermitidas.includes(pagina);

        if (!permitido) {
          const primeiraPaginaPermitida = paginasPermitidas.find((p) => ROTA_DA_PAGINA[p]);
          const url = request.nextUrl.clone();
          url.pathname = primeiraPaginaPermitida
            ? ROTA_DA_PAGINA[primeiraPaginaPermitida]
            : "/sem-acesso";
          return NextResponse.redirect(url);
        }
      }
    }
  }

  return supabaseResponse;
}
