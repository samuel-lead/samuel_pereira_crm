"use client";

import { IconeWhatsapp } from "@/components/icons";
import { linkWhatsApp, abrirWhatsApp } from "@/lib/whatsapp";

// Versão do botão de WhatsApp usável a partir de Server Component (ex.:
// dentro de uma tabela renderizada no servidor) — respeita a preferência
// "Abrir os dois/Só o aplicativo/Só o navegador" do Meu Perfil, igual ao
// botão já usado no Kanban.
export function BotaoWhatsapp({ telefone }: { telefone: string }) {
  return (
    <a
      href={linkWhatsApp(telefone)}
      onClick={(e) => {
        e.preventDefault();
        abrirWhatsApp(telefone);
      }}
      title="Chamar no WhatsApp"
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white transition hover:bg-green-600"
    >
      <IconeWhatsapp className="h-3 w-3" />
    </a>
  );
}
