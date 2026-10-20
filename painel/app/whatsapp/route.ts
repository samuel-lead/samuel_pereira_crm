import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Link único das campanhas: sousamuelpereira.com.br/whatsapp
// Cada visitante cai direto no WhatsApp de UM dos vendedores, em fila exata
// (1, 2, 3, 1, 2, 3…) — ninguém precisa distribuir lead na mão. Quem é o
// próximo da vez fica guardado no banco (tabela rodizio_links).
//
// Pra tirar alguém do sorteio (férias, lotado), mude "ativo" pra false.
// Número sempre com 55 + DDD + número, só dígitos.
const VENDEDORES = [
  { nome: "Vendedor 1", numero: "556291838526", ativo: true },
  { nome: "Vendedor 2", numero: "556291768393", ativo: true },
  { nome: "Vendedor 3", numero: "556293386772", ativo: true },
];

// Pixel do Meta (Facebook/Instagram) — registra quem chegou até o WhatsApp.
const PIXEL_ID = "1415200980194891";

const MENSAGEM = "Oi, vim pelo anúncio. Quero saber mais sobre o consórcio.";

// Nunca guarda em cache — senão todo mundo cairia no mesmo vendedor sorteado
// uma vez só.
export const dynamic = "force-dynamic";

// Pede pro banco o próximo número da fila. Espera no máximo 1,5s — se o
// banco estiver fora ou lento, devolve null e o link cai pro sorteio.
async function proximoDaVez(): Promise<number | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    const { data, error } = await supabase
      .rpc("proximo_rodizio", { p_chave: "whatsapp" })
      .abortSignal(AbortSignal.timeout(1500));
    if (error || typeof data !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const ativos = VENDEDORES.filter((v) => v.ativo);
  const vez = await proximoDaVez();
  // Se o banco não respondeu, sorteia — o lead nunca fica sem vendedor.
  const indice = vez === null ? Math.floor(Math.random() * ativos.length) : vez % ativos.length;
  const escolhido = ativos[indice];

  // ?c=reels vira "(reels)" no fim da mensagem — o vendedor sabe de qual
  // campanha o lead veio.
  const campanha = request.nextUrl.searchParams.get("c")?.trim().slice(0, 40);
  const texto = campanha ? `${MENSAGEM} (${campanha})` : MENSAGEM;

  const destino = `https://wa.me/${escolhido.numero}?text=${encodeURIComponent(texto)}`;

  // Em vez de mandar direto pro WhatsApp, mostra uma tela de frações de
  // segundo ("Abrindo o WhatsApp…") que avisa o Pixel do Meta antes de sair — sem
  // isso o Meta não sabe quem chegou até aqui e não consegue otimizar o
  // anúncio. O JSON.stringify + troca do "<" impede que o texto da campanha
  // (?c=...) quebre o script da página.
  const destinoJs = JSON.stringify(destino).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Abrindo o WhatsApp…</title>
<noscript><meta http-equiv="refresh" content="0;url=${destino.replace(/"/g, "&quot;")}"></noscript>
<script>
// Pixel "leve": em vez de baixar o código inteiro do Meta (100KB+, lento
// no 4G), manda só os dois avisos (PageView e Contact) direto pro Meta —
// uma requisição pequena cada. O fbclid que o Meta põe no link do anúncio
// vai junto (fbc), pra ele saber de qual anúncio a pessoa veio.
(function () {
  var foi = false;
  function ir() { if (foi) return; foi = true; window.location.replace(${destinoJs}); }
  // Nunca espera mais que 0,4s — se o Meta demorar, o lead sai igual.
  setTimeout(ir, 400);
  try {
    var agora = Date.now();
    var fbclid = new URLSearchParams(location.search).get('fbclid');
    var base = 'https://www.facebook.com/tr?id=${PIXEL_ID}' +
      '&dl=' + encodeURIComponent(location.href) +
      '&rl=' + encodeURIComponent(document.referrer) +
      '&ts=' + agora +
      '&fbp=' + encodeURIComponent('fb.1.' + agora + '.' + Math.floor(Math.random() * 1e10)) +
      (fbclid ? '&fbc=' + encodeURIComponent('fb.1.' + agora + '.' + fbclid) : '');
    new Image().src = base + '&ev=PageView';
    var contato = new Image();
    contato.onload = contato.onerror = function () { setTimeout(ir, 30); };
    contato.src = base + '&ev=Contact';
  } catch (err) { ir(); }
})();
</script>
<style>
body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#111}
a{color:#128c7e;font-size:14px}
</style>
</head>
<body>
<p>Abrindo o WhatsApp…</p>
<a href="${destino.replace(/"/g, "&quot;")}">Se não abrir, toque aqui</a>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
