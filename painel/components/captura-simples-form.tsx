"use client";

import { useState, useTransition } from "react";
import Script from "next/script";
import { registrarLeadIsca } from "@/lib/iscas/actions";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const RESPOSTAS_VAZIAS = {
  instagram: "",
  tempoMercado: "",
  maiorDesafio: "",
  prioridade: null,
  disponibilidadeFinanceira: "",
  atuacao: "",
};

// Formulário público de 2 perguntas (nome e WhatsApp) pra inscritos e leads
// de tráfego — Samuel pediu em 27/10/26 pra Ketlyn. O botão do WhatsApp no
// final é o próprio "enviar": grava o lead no CRM e, em seguida, abre a
// conversa direto no WhatsApp dela. Sem questionário de qualificação.
export function CapturaSimplesForm({
  slug,
  titulo,
  whatsappContatoE164,
  whatsappMensagem,
  metaPixelId,
  googleTagId,
}: {
  slug: string;
  titulo: string;
  whatsappContatoE164: string | null;
  whatsappMensagem: string | null;
  metaPixelId?: string | null;
  googleTagId?: string | null;
}) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [enviando, iniciarEnvio] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (!nome.trim()) return setErro("Preenche seu nome");
    const numero = normalizarTelefone(telefone);
    if (!telefone.trim() || !telefoneValido(numero)) {
      return setErro("Confere seu WhatsApp — precisa ser um número com DDD, tipo (62) 99999-9999");
    }

    iniciarEnvio(async () => {
      const resposta = await registrarLeadIsca(slug, { nome, telefone, ...RESPOSTAS_VAZIAS });
      if (resposta.erro) {
        setErro(resposta.erro);
        return;
      }
      window.fbq?.("track", "Lead");
      window.gtag?.("event", "generate_lead");

      const destino = resposta.whatsappContatoE164 ?? whatsappContatoE164;
      const mensagem = resposta.whatsappMensagem ?? whatsappMensagem;
      if (!destino) {
        setConcluido(true);
        return;
      }
      window.location.href = `https://wa.me/${destino}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ""}`;
    });
  }

  const scripts = (
    <>
      {metaPixelId && (
        <Script id="meta-pixel-base" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${metaPixelId}');
          `}
        </Script>
      )}
      {googleTagId && (
        <>
          <Script
            id="google-tag-src"
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${googleTagId}`}
          />
          <Script id="google-tag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${googleTagId}', { send_page_view: false });
            `}
          </Script>
        </>
      )}
    </>
  );

  if (concluido) {
    return (
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center space-y-4 px-6 py-16">
        {scripts}
        <div className="h-1 w-16 rounded-full bg-[#4ade80]" />
        <p className="text-2xl font-bold leading-tight text-[#eef1f6]">Obrigado, seu cadastro foi concluído.</p>
        <p className="text-base text-[#c4cad3]">Em breve entramos em contato com você.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center px-6 py-16">
      {scripts}
      <div className="mb-6 h-1 w-16 rounded-full bg-[#4ade80]" />
      <h1 className="break-words text-2xl font-bold leading-snug text-[#eef1f6]">{titulo}</h1>
      <p className="mt-2 text-base text-[#c4cad3]">
        Preencha seus dados e fale direto comigo no WhatsApp.
      </p>

      <form onSubmit={enviar} className="mt-8 space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="nome" className="text-sm font-medium text-[#c4cad3]">
            Qual o seu nome?
          </label>
          <input
            id="nome"
            type="text"
            autoComplete="name"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Seu nome"
            className="w-full rounded-lg border border-[#262f3d] bg-[#10141b] px-4 py-3 text-base text-[#eef1f6] outline-none transition placeholder:text-[#6b7280] focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]/30"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="telefone" className="text-sm font-medium text-[#c4cad3]">
            Qual o seu WhatsApp?
          </label>
          <input
            id="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(62) 99999-9999"
            className="w-full rounded-lg border border-[#262f3d] bg-[#10141b] px-4 py-3 text-base text-[#eef1f6] outline-none transition placeholder:text-[#6b7280] focus:border-[#22c55e] focus:ring-2 focus:ring-[#22c55e]/30"
          />
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg bg-[#22c55e] px-4 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#16a34a] disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.12h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.24-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.42.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.11-.23-.17-.48-.29Z" />
          </svg>
          {enviando ? "Abrindo o WhatsApp..." : "Falar no WhatsApp"}
        </button>
      </form>
    </div>
  );
}
