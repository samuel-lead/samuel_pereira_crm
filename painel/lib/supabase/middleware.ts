import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

const ROTA_DA_PAGINA: Record<string, string> = {
  funil: "/leads",
  lista: "/leads/lista",
  atividades: "/atividades",
  reunioes: "/reunioes",
  metricas: "/dashboard",
  imoveis: "/imoveis",
  cartas_contempladas: "/cartas-contempladas",
};

function paginaDaRota(pathname: string): string | null {
  if (pathname === "/leads/lista" || pathname.startsWith("/leads/lista/")) return "lista";
  if (pathname === "/leads/excluidos" || pathname.startsWith("/leads/excluidos/")) return "admin";
  if (pathname === "/leads" || pathname.startsWith("/leads/")) return "funil";
  if (pathname === "/atividades" || pathname.startsWith("/atividades/")) return "atividades";
  if (pathname === "/reunioes" || pathname.startsWith("/reunioes/")) return "reunioes";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "metricas";
  if (pathname === "/usuarios" || pathname.startsWith("/usuarios/")) return "admin";
  if (pathname === "/configuracoes" || pathname.startsWith("/configuracoes/")) return "admin";
  if (pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/")) return "admin";
  if (pathname === "/integracoes" || pathname.startsWith("/integracoes/")) return "admin";
  if (pathname === "/imoveis" || pathname.startsWith("/imoveis/")) return "imoveis";
  if (pathname === "/cartas-contempladas" || pathname.startsWith("/cartas-contempladas/")) return "cartas_contempladas";
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

  // getUser() tenta renovar o login sozinho quando o token de acesso venceu
  // — usando o refresh token. Se duas requisições disputarem essa renovação
  // ao mesmo tempo (ex.: uma navegação de verdade e um pré-carregamento de
  // link em segundo plano), uma "aposenta" o token antes da outra terminar
  // de usá-lo, e a segunda recebe um erro (AuthApiError). Sem tratar isso,
  // a tela quebrava com um erro cru. Trata como "não logado" — manda pro
  // login, que na prática resolve sozinho (o cookie já foi renovado pela
  // primeira requisição).
  let user: User | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

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

  if (
    user &&
    !isLoginPage &&
    pathname !== "/sem-acesso" &&
    pathname !== "/conta-suspensa"
  ) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("org_id, nome, papel, funcao, paginas_permitidas, foto_url, super_admin, orgs(status, publico)")
      .eq("id", user.id)
      .single();

    const ehSuperAdmin = usuario?.super_admin === true;
    const orgInfo = usuario?.orgs as
      | { status?: string; publico?: string }
      | { status?: string; publico?: string }[]
      | null;
    const statusOrg = Array.isArray(orgInfo) ? orgInfo[0]?.status : orgInfo?.status;
    const publicoOrg = Array.isArray(orgInfo) ? orgInfo[0]?.publico : orgInfo?.publico;

    // Empresa suspensa não entra em nada — exceto o dono da plataforma,
    // que nunca fica trancado pra fora por acidente.
    if (!ehSuperAdmin && statusOrg === "suspenso") {
      const url = request.nextUrl.clone();
      url.pathname = "/conta-suspensa";
      return NextResponse.redirect(url);
    }

    // /empresas é onde o dono da plataforma cadastra/suspende clientes —
    // não é uma página "admin" comum, é restrita a quem é super_admin.
    // Manda pro próprio painel (não pra /sem-acesso — essa mensagem é pra
    // quem não tem NENHUMA página liberada, o que não é o caso aqui).
    const ehPaginaDaPlataforma = pathname === "/empresas" || pathname.startsWith("/empresas/");
    if (ehPaginaDaPlataforma && !ehSuperAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/leads";
      return NextResponse.redirect(url);
    }

    // Imóveis e Cartas contempladas são exclusivos do público imobiliário
    // — mesmo admin não entra se a empresa for de mentoria/serviço.
    // Diferente das outras páginas, isso não passa pela checagem de
    // "página permitida" (que só vale pra quem não é admin) — precisa
    // bloquear todo mundo da org errada.
    const ehPaginaDeImoveis = pathname === "/imoveis" || pathname.startsWith("/imoveis/");
    const ehPaginaDeCartasContempladas =
      pathname === "/cartas-contempladas" || pathname.startsWith("/cartas-contempladas/");
    if ((ehPaginaDeImoveis || ehPaginaDeCartasContempladas) && publicoOrg !== "imobiliario") {
      const url = request.nextUrl.clone();
      url.pathname = "/leads";
      return NextResponse.redirect(url);
    }

    const pagina = paginaDaRota(pathname);

    if (pagina) {
      const ehAdmin = usuario?.papel === "admin";
      // Bônus SDR não é liberado por checkbox de permissão — é automático
      // pra quem tem função SDR, mesmo sem ser admin. Closer não entra.
      const ehBonusSdr = pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/");
      const podeVerBonusSdr = ehBonusSdr && usuario?.funcao === "sdr";

      if (!ehAdmin && !podeVerBonusSdr) {
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

    // O middleware já buscou o usuário aqui — manda pro resto da
    // requisição via header em vez de layout e página consultarem o
    // Supabase de novo pra achar a mesma coisa (isso dobrava o tempo de
    // toda navegação: duas idas no banco no middleware + duas de novo
    // na página).
    if (usuario) {
      supabaseResponse.headers.set("x-user-id", user.id);
      supabaseResponse.headers.set("x-user-email", encodeURIComponent(user.email ?? ""));
      supabaseResponse.headers.set("x-user-org-id", usuario.org_id ?? "");
      supabaseResponse.headers.set("x-user-nome", encodeURIComponent(usuario.nome ?? ""));
      supabaseResponse.headers.set("x-user-papel", usuario.papel ?? "");
      supabaseResponse.headers.set("x-user-funcao", usuario.funcao ?? "");
      supabaseResponse.headers.set(
        "x-user-paginas-permitidas",
        encodeURIComponent(JSON.stringify(usuario.paginas_permitidas ?? []))
      );
      supabaseResponse.headers.set(
        "x-user-foto-url",
        encodeURIComponent(usuario.foto_url ?? "")
      );
      supabaseResponse.headers.set("x-user-super-admin", usuario.super_admin ? "1" : "0");
      supabaseResponse.headers.set("x-user-org-publico", publicoOrg ?? "mentoria");
    }
  }

  return supabaseResponse;
}
