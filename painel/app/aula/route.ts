import { NextResponse } from "next/server";

// Link curto da live do Samuel: sousamuelpereira.com.br/aula
// Abre direto a conversa no WhatsApp dele, com a mensagem já escrita.
// Número sempre com 55 + DDD + número, só dígitos.
const NUMERO = "5562936180437";
const MENSAGEM = "Acabei de assistir à aula e quero saber mais sobre a implementação.";

export const dynamic = "force-dynamic";

export function GET() {
  const destino = `https://wa.me/${NUMERO}?text=${encodeURIComponent(MENSAGEM)}`;
  return NextResponse.redirect(destino, 302);
}
