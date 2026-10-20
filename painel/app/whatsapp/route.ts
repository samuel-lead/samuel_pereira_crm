import { NextResponse, type NextRequest } from "next/server";

// Link único das campanhas: sousamuelpereira.com.br/whatsapp
// Cada visitante cai direto no WhatsApp de UM dos vendedores, sorteado na
// hora — ninguém precisa distribuir lead na mão. É sorteio (não fila), então
// com poucos leads um vendedor pode receber dois seguidos; com volume a
// divisão fica praticamente igual entre todos.
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

export function GET(request: NextRequest) {
  const ativos = VENDEDORES.filter((v) => v.ativo);
  const escolhido = ativos[Math.floor(Math.random() * ativos.length)];

  // ?c=reels vira "(reels)" no fim da mensagem — o vendedor sabe de qual
  // campanha o lead veio.
  const campanha = request.nextUrl.searchParams.get("c")?.trim().slice(0, 40);
  const texto = campanha ? `${MENSAGEM} (${campanha})` : MENSAGEM;

  const destino = `https://wa.me/${escolhido.numero}?text=${encodeURIComponent(texto)}`;

  // Em vez de mandar direto pro WhatsApp, mostra uma tela rápida
  // ("Abrindo o WhatsApp…") que avisa o Pixel do Meta antes de sair — sem
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
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${PIXEL_ID}');
fbq('track', 'PageView');
fbq('track', 'Contact');
// Sai assim que o aviso de "Contact" chega no Meta (celular rápido: menos
// de meio segundo). Se a internet estiver lenta, sai em 1,5s de qualquer
// jeito — o lead nunca fica preso esperando o pixel.
(function () {
  var foi = false;
  function ir() { if (foi) return; foi = true; window.location.replace(${destinoJs}); }
  setTimeout(ir, 1500);
  try {
    new PerformanceObserver(function (lista) {
      lista.getEntries().forEach(function (e) {
        if (e.name.indexOf('facebook.com/tr') !== -1 && e.name.indexOf('ev=Contact') !== -1) setTimeout(ir, 100);
      });
    }).observe({ type: 'resource', buffered: true });
  } catch (err) {}
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
