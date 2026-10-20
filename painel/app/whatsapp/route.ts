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
  { nome: "Vendedor 1", numero: "556296089125", ativo: true },
  { nome: "Vendedor 2", numero: "556291768393", ativo: true },
  { nome: "Vendedor 3", numero: "556293386772", ativo: true },
];

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
  return NextResponse.redirect(destino, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}
