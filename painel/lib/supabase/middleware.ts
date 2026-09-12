import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

// Cacheia o resultado da consulta em "usuarios" (papel, páginas permitidas,
// etc.) num cookie por até 30s, pra navegação rápida entre páginas não
// pagar uma segunda ida ao banco a cada clique — só a checagem de login
// (getUser) continua rodando toda vez, essa não dá pra pular. Seguro
// porque essa consulta aqui é só pra decidir PRA ONDE redirecionar (UX);
// quem protege os dados de verdade é a RLS no Postgres, que roda em cima
// da sessão real a cada consulta, não desse cache. Pior caso: uma
// permissão mudou agora mesmo e o middleware só percebe até 30s depois —
// aceitável, e nunca dá acesso a dado que a RLS não deixaria de qualquer
// forma.
const CACHE_USUARIO_COOKIE = "mv_usuario_cache";
const CACHE_USUARIO_TTL_MS = 30_000;

type UsuarioCacheado = {
  org_id: string | null;
  nome: string | null;
  papel: string | null;
  funcao: string | null;
  paginas_permitidas: string[];
  foto_url: string | null;
  super_admin: boolean;
  status_org: string | undefined;
  publico_org: string | undefined;
};

const ROTA_DA_PAGINA: Record<string, string> = {
  funil: "/leads",
  atividades: "/atividades",
  reunioes: "/reunioes",
  metricas: "/dashboard",
  imoveis: "/imoveis",
  cartas_contempladas: "/cartas-contempladas",
};

function paginaDaRota(pathname: string): string | null {
  if (pathname === "/leads/excluidos" || pathname.startsWith("/leads/excluidos/")) return "admin";
  if (pathname === "/leads" || pathname.startsWith("/leads/")) return "funil";
  if (pathname === "/atividades" || pathname.startsWith("/atividades/")) return "atividades";
  if (pathname === "/reunioes" || pathname.startsWith("/reunioes/")) return "reunioes";
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return "metricas";
  if (pathname === "/usuarios" || pathname.startsWith("/usuarios/")) return "admin";
  if (pathname === "/iscas" || pathname.startsWith("/iscas/")) return "admin";
  if (pathname === "/configuracoes" || pathname.startsWith("/configuracoes/")) return "admin";
  if (pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/")) return "admin";
  if (pathname === "/rotina" || pathname.startsWith("/rotina/")) return "admin";
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
    // Pode ser o link público de uma isca (dominio.com/<slug>, sem
    // prefixo) — confere antes de mandar pro login. Também libera a
    // imagem de preview dela (dominio.com/<slug>/opengraph-image), senão
    // o robô do WhatsApp/Instagram que busca essa imagem pro card do link
    // cai no login e a isca aparece sem capa nenhuma. Só tenta pra esses
    // dois formatos, pra não gastar consulta à toa em rotas de verdade
    // tipo /leads/vendas quando a pessoa está deslogada.
    const semBarraInicial = pathname.replace(/^\//, "");
    const slugCandidato = semBarraInicial.endsWith("/opengraph-image")
      ? semBarraInicial.slice(0, -"/opengraph-image".length)
      : semBarraInicial;
    if (slugCandidato && !slugCandidato.includes("/")) {
      const { data: isca } = await supabase
        .from("iscas")
        .select("id")
        .eq("slug", slugCandidato)
        .eq("ativo", true)
        .is("arquivado_em", null)
        .maybeSingle();
      if (isca) {
        return supabaseResponse;
      }
    }

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
    let usuarioCache: UsuarioCacheado | null = null;
    const cookieCache = request.cookies.get(CACHE_USUARIO_COOKIE)?.value;
    if (cookieCache) {
      try {
        const parsed = JSON.parse(cookieCache) as { uid: string; t: number; d: UsuarioCacheado };
        if (parsed.uid === user.id && Date.now() - parsed.t < CACHE_USUARIO_TTL_MS) {
          usuarioCache = parsed.d;
        }
      } catch {
        usuarioCache = null;
      }
    }

    let usuario: {
      org_id: string | null;
      nome: string | null;
      papel: string | null;
      funcao: string | null;
      paginas_permitidas: string[] | null;
      foto_url: string | null;
      super_admin: boolean | null;
    } | null = null;
    let statusOrg: string | undefined;
    let publicoOrg: string | undefined;

    if (usuarioCache) {
      usuario = usuarioCache;
      statusOrg = usuarioCache.status_org;
      publicoOrg = usuarioCache.publico_org;
    } else {
      const { data: usuarioDoBanco } = await supabase
        .from("usuarios")
        .select("org_id, nome, papel, funcao, paginas_permitidas, foto_url, super_admin, orgs(status, publico)")
        .eq("id", user.id)
        .single();

      usuario = usuarioDoBanco;
      const orgInfo = usuarioDoBanco?.orgs as
        | { status?: string; publico?: string }
        | { status?: string; publico?: string }[]
        | null;
      statusOrg = Array.isArray(orgInfo) ? orgInfo[0]?.status : orgInfo?.status;
      publicoOrg = Array.isArray(orgInfo) ? orgInfo[0]?.publico : orgInfo?.publico;

      if (usuarioDoBanco) {
        supabaseResponse.cookies.set(
          CACHE_USUARIO_COOKIE,
          JSON.stringify({
            uid: user.id,
            t: Date.now(),
            d: {
              org_id: usuarioDoBanco.org_id,
              nome: usuarioDoBanco.nome,
              papel: usuarioDoBanco.papel,
              funcao: usuarioDoBanco.funcao,
              paginas_permitidas: usuarioDoBanco.paginas_permitidas,
              foto_url: usuarioDoBanco.foto_url,
              super_admin: usuarioDoBanco.super_admin,
              status_org: statusOrg,
              publico_org: publicoOrg,
            },
          }),
          { httpOnly: true, sameSite: "lax", path: "/", maxAge: CACHE_USUARIO_TTL_MS / 1000 }
        );
      }
    }

    const ehSuperAdmin = usuario?.super_admin === true;

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

    // Bônus SDR é o oposto: não existe no imobiliário, essa mecânica é só
    // de mentoria/serviço. "Minha rotina" (checklist diário) segue a mesma
    // regra — imobiliário não separa SDR de Closer.
    const ehPaginaDeBonusSdr = pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/");
    const ehPaginaDeRotina = pathname === "/rotina" || pathname.startsWith("/rotina/");
    if ((ehPaginaDeBonusSdr || ehPaginaDeRotina) && publicoOrg === "imobiliario") {
      const url = request.nextUrl.clone();
      url.pathname = "/leads";
      return NextResponse.redirect(url);
    }

    const pagina = paginaDaRota(pathname);

    if (pagina) {
      const ehAdmin = usuario?.papel === "admin";
      // Bônus SDR e "Minha rotina" não são liberados por checkbox de
      // permissão — são automáticos pra quem tem função SDR, mesmo sem
      // ser admin (admin sempre vê os dois também). Closer não vê nenhum.
      const ehBonusSdr = pathname === "/bonus-sdr" || pathname.startsWith("/bonus-sdr/");
      const podeVerBonusSdr = (ehBonusSdr || ehPaginaDeRotina) && usuario?.funcao === "sdr";

      if (!ehAdmin && !ehSuperAdmin && !podeVerBonusSdr) {
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
