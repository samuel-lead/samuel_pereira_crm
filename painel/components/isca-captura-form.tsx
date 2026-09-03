"use client";

import { useEffect, useState, useTransition } from "react";
import Script from "next/script";
import { registrarLeadIsca, type RespostasIsca } from "@/lib/iscas/actions";
import { normalizarTelefone, telefoneValido } from "@/lib/telefone";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

type Passo =
  | {
      tipo: "escolha";
      chave: "tempoMercado" | "atuacao" | "disponibilidadeFinanceira";
      pergunta: string;
      opcoes: string[];
    }
  | { tipo: "simNao"; chave: "prioridade"; pergunta: string }
  | {
      tipo: "texto";
      chave: "maiorDesafio" | "nome" | "telefone" | "instagram";
      pergunta: string;
      placeholder: string;
      tipoInput?: string;
    };

const PASSOS: Passo[] = [
  {
    tipo: "escolha",
    chave: "tempoMercado",
    pergunta: "Há quanto tempo você está no mercado imobiliário?",
    opcoes: ["Comecei agora", "6 meses", "Mais de 1 ano", "Mais de 2 anos"],
  },
  {
    tipo: "escolha",
    chave: "atuacao",
    pergunta: "Hoje você é...",
    opcoes: ["Corretor", "Gerente", "Dono de imobiliária"],
  },
  {
    tipo: "texto",
    chave: "maiorDesafio",
    pergunta: "Qual tem sido o seu maior desafio?",
    placeholder: "Escreve aqui...",
  },
  {
    tipo: "simNao",
    chave: "prioridade",
    pergunta: "Resolver esse desafio para você hoje é uma prioridade?",
  },
  {
    tipo: "escolha",
    chave: "disponibilidadeFinanceira",
    pergunta: "Hoje você tem disponibilidade financeira pra estar investindo na solução desse desafio?",
    opcoes: ["Sim, posso investir", "Não, não consigo investir nada", "Depende do valor do investimento"],
  },
  {
    tipo: "texto",
    chave: "nome",
    pergunta: "Qual o seu nome?",
    placeholder: "Seu nome",
  },
  {
    tipo: "texto",
    chave: "telefone",
    pergunta: "Qual o seu WhatsApp?",
    placeholder: "(11) 99999-9999",
    tipoInput: "tel",
  },
  {
    tipo: "texto",
    chave: "instagram",
    pergunta: "Qual o @ do seu Instagram?",
    placeholder: "@seuusuario",
  },
];

const RESPOSTAS_INICIAIS: RespostasIsca = {
  nome: "",
  telefone: "",
  instagram: "",
  tempoMercado: "",
  maiorDesafio: "",
  prioridade: null,
  disponibilidadeFinanceira: "",
  atuacao: "",
};

export function IscaCapturaForm({
  slug,
  nomeIsca,
  soCadastro = false,
  metaPixelId,
  googleTagId,
  instagramUrl,
}: {
  slug: string;
  nomeIsca: string;
  // Isca "só cadastro" não tem material pra liberar — a tela inicial
  // ("Em 2 minutos você se cadastra...") só faz sentido prometendo um
  // acesso que essa isca não entrega, então pula direto pra primeira
  // pergunta.
  soCadastro?: boolean;
  metaPixelId?: string | null;
  googleTagId?: string | null;
  instagramUrl?: string | null;
}) {
  const [mostrarIntro, setMostrarIntro] = useState(!soCadastro);
  const [passoAtual, setPassoAtual] = useState(0);
  const [respostas, setRespostas] = useState<RespostasIsca>(RESPOSTAS_INICIAIS);
  const [textoAtual, setTextoAtual] = useState("");
  const [enviando, iniciarEnvio] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    materialUrl: string | null;
    whatsappContatoE164: string | null;
    whatsappMensagem: string | null;
  } | null>(null);
  const [statusWhats, setStatusWhats] = useState<
    "idle" | "checando" | "existe" | "nao_existe" | "indefinido"
  >("idle");

  const passo = PASSOS[passoAtual];
  const ultimoPasso = passoAtual === PASSOS.length - 1;
  const progresso = Math.round(((passoAtual + (resultado ? 1 : 0)) / PASSOS.length) * 100);

  // Enquanto a pessoa digita o WhatsApp, confere com o Z-API se o número
  // existe de verdade — avisa na hora, sem travar o preenchimento (se o
  // Z-API não responder ou não estiver configurado, some o aviso e segue
  // o jogo normal).
  useEffect(() => {
    if (passo.tipo !== "texto" || passo.chave !== "telefone") return;

    const numero = normalizarTelefone(textoAtual);
    if (numero.length < 12) {
      setStatusWhats("idle");
      return;
    }

    setStatusWhats("checando");
    const controlador = new AbortController();
    const espera = setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/checar-whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: numero }),
        signal: controlador.signal,
      })
        .then((r) => r.json())
        .then((dados: { existe: boolean | null }) => {
          setStatusWhats(dados.existe === true ? "existe" : dados.existe === false ? "nao_existe" : "indefinido");
        })
        .catch(() => setStatusWhats("indefinido"));
    }, 700);

    return () => {
      clearTimeout(espera);
      controlador.abort();
    };
  }, [textoAtual, passo]);

  const valorEscolhido =
    passo.tipo === "escolha" || passo.tipo === "simNao" ? (respostas as Record<string, unknown>)[passo.chave] : undefined;
  const podeAvancarEscolha =
    passo.tipo === "escolha" ? Boolean(valorEscolhido) : passo.tipo === "simNao" ? valorEscolhido !== null : false;

  // Botão "Próximo" do WhatsApp já nasce desligado se o número digitado
  // não bate com o formato — não adianta deixar parecendo que vai
  // avançar pra só travar depois que a pessoa clicar.
  const telefoneInvalido =
    passo.tipo === "texto" &&
    passo.chave === "telefone" &&
    (!textoAtual.trim() || !telefoneValido(normalizarTelefone(textoAtual)) || statusWhats === "nao_existe");

  // Carrega o Pixel do Meta e a tag do Google só se a empresa tiver
  // configurado (Configurações → Pixels de rastreamento). Só inicializa
  // aqui — o disparo do evento "Lead" acontece só quando o cadastro é
  // concluído com sucesso, nunca ao abrir a página.
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

  function selecionar(valorParcial: Partial<RespostasIsca>) {
    setRespostas((atual) => ({ ...atual, ...valorParcial }));
    setErro(null);
  }

  function confirmarPasso(valorParcial: Partial<RespostasIsca> = {}) {
    const novasRespostas = { ...respostas, ...valorParcial };
    setRespostas(novasRespostas);
    setErro(null);
    setTextoAtual("");

    if (!ultimoPasso) {
      setPassoAtual((atual) => atual + 1);
      return;
    }

    iniciarEnvio(async () => {
      const resposta = await registrarLeadIsca(slug, novasRespostas);
      if (resposta.erro) {
        setErro(resposta.erro);
        return;
      }
      window.fbq?.("track", "Lead");
      window.gtag?.("event", "generate_lead");
      setResultado({
        materialUrl: resposta.materialUrl,
        whatsappContatoE164: resposta.whatsappContatoE164,
        whatsappMensagem: resposta.whatsappMensagem,
      });
    });
  }

  function voltar() {
    if (passoAtual === 0) return;
    setErro(null);
    setTextoAtual("");
    setPassoAtual((atual) => atual - 1);
  }

  if (mostrarIntro) {
    return (
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center space-y-6 px-6 py-16">
        {scripts}
        <h1 className="break-words text-2xl font-bold leading-snug text-[#eef1f6]">
          {nomeIsca}
        </h1>
        <p className="text-base text-[#c4cad3]">
          Em 2 minutos você se cadastra e consegue o acesso ao material.
        </p>
        <button
          type="button"
          onClick={() => setMostrarIntro(false)}
          className="inline-flex w-full items-center justify-center rounded-md bg-[#22c55e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16a34a]"
        >
          Ok, vamos começar
        </button>
      </div>
    );
  }

  if (resultado) {
    // Isca "entregar material": mostra o botão de acesso + convite pra
    // compartilhar com um amigo. Isca "só cadastro": não tem material
    // nenhum — só agradece, e só mostra botão de WhatsApp se a isca tiver
    // um número de contato configurado (aí não faz sentido oferecer
    // "compartilhar com amigo", já que aqui é a pessoa falando direto com
    // a equipe do Samuel).
    if (resultado.materialUrl) {
      const linkDaIsca = typeof window !== "undefined" ? window.location.href : "";
      const mensagemCompartilhar = `Olha esse material que eu recebi, acredito que vai te ajudar muito no seu dia a dia como corretor(a). 👇\n\n${linkDaIsca}`;
      const linkCompartilhar = `https://wa.me/?text=${encodeURIComponent(mensagemCompartilhar)}`;

      return (
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center space-y-4 px-6 py-16">
          {scripts}
          <div className="h-1 w-16 rounded-full bg-[#4ade80]" />
          <p className="text-lg text-[#c4cad3]">Obrigado, seu cadastro foi concluído.</p>
          <p className="text-2xl font-bold leading-tight text-[#eef1f6]">
            Clique no botão abaixo para acessar o seu material 👇
          </p>
          <a
            href={resultado.materialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="!mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#22c55e] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#16a34a]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
            </svg>
            Clique aqui para acessar seu material
          </a>
          <a
            href={linkCompartilhar}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#262f3d] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[#4ade80] transition hover:bg-[#10141b]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.12h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.24-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.42.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.11-.23-.17-.48-.29Z" />
            </svg>
            Compartilhe com um amigo(a)
          </a>
        </div>
      );
    }

    const linkFalarComEquipe = resultado.whatsappContatoE164
      ? `https://wa.me/${resultado.whatsappContatoE164}${
          resultado.whatsappMensagem ? `?text=${encodeURIComponent(resultado.whatsappMensagem)}` : ""
        }`
      : null;

    if (instagramUrl) {
      return (
        <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center space-y-4 px-6 py-16">
          {scripts}
          <p className="text-2xl font-extrabold uppercase leading-tight text-[#eef1f6]">
            Obrigado, recebemos o seu cadastro para conhecer a nossa
            metodologia.
          </p>
          <p className="text-base text-[#c4cad3]">
            Nossa equipe vai entrar em contato com você por{" "}
            <span className="underline decoration-2 underline-offset-4">
              ligação e WhatsApp
            </span>
            . Fique atento.
          </p>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background:
                "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            }}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
            </svg>
            Seguir no Instagram
          </a>
          {linkFalarComEquipe && (
            <a
              href={linkFalarComEquipe}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#22c55e] px-4 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#16a34a]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.12h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.36c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.21-8.24 8.21Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.81-.78.97-.14.17-.29.19-.53.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.24-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.24.25-.41.08-.16.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.42.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.17 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.07-.11-.23-.17-.48-.29Z" />
              </svg>
              Quero falar no WhatsApp
            </a>
          )}
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-md flex-col justify-center space-y-4 px-6 py-16 text-center">
        {scripts}
        <p className="text-lg font-semibold text-[#eef1f6]">
          {linkFalarComEquipe
            ? "Obrigado por preencher seus dados. Clique no botão abaixo para falar agora mesmo com nossa equipe no WhatsApp."
            : "Obrigado por preencher seus dados. Logo logo alguém da nossa equipe vai entrar em contato com você."}
        </p>
        {linkFalarComEquipe && (
          <>
            <p className="text-3xl">👇</p>
            <a
              href={linkFalarComEquipe}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#22c55e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16a34a]"
            >
              Quero falar no WhatsApp
            </a>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {scripts}
      <div className="fixed left-0 right-0 top-0 z-20 h-1 bg-[#1a2029]">
        <div
          className="h-full bg-[#4ade80] transition-all duration-300"
          style={{ width: `${Math.max(progresso, 6)}%` }}
        />
      </div>

      <div className="mx-auto flex w-full min-w-0 max-w-md flex-col px-6 pt-10 pb-10">
        <p className="mb-5 text-3xl font-bold leading-snug text-[#eef1f6]">{passo.pergunta}</p>

        {passo.tipo === "escolha" && (
          <div className="space-y-2">
            {passo.opcoes.map((opcao) => {
              const selecionado = valorEscolhido === opcao;
              return (
                <button
                  key={opcao}
                  type="button"
                  disabled={enviando}
                  onClick={() => selecionar({ [passo.chave]: opcao } as Partial<RespostasIsca>)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition disabled:opacity-50 ${
                    selecionado
                      ? "border-[#4ade80] bg-[#132018] text-[#eef1f6]"
                      : "border-[#262f3d] bg-[#10141b] text-[#c4cad3] hover:border-[#3a4454]"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                      selecionado ? "border-[#4ade80] bg-[#4ade80]" : "border-[#3a4454]"
                    }`}
                  >
                    {selecionado && <span className="h-1.5 w-1.5 rounded-full bg-[#0b0e13]" />}
                  </span>
                  {opcao}
                </button>
              );
            })}
          </div>
        )}

        {passo.tipo === "simNao" && (
          <div className="space-y-2">
            {(
              [
                { valor: true, emoji: "✅", texto: "Sim" },
                { valor: false, emoji: "❌", texto: "Não" },
              ] as const
            ).map((opcao) => {
              const selecionado = respostas.prioridade === opcao.valor;
              return (
                <button
                  key={opcao.texto}
                  type="button"
                  disabled={enviando}
                  onClick={() => selecionar({ prioridade: opcao.valor })}
                  className={`flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition disabled:opacity-50 ${
                    selecionado
                      ? "border-[#4ade80] bg-[#132018] text-[#eef1f6]"
                      : "border-[#262f3d] bg-[#10141b] text-[#c4cad3] hover:border-[#3a4454]"
                  }`}
                >
                  <span className="text-base">{opcao.emoji}</span>
                  {opcao.texto}
                </button>
              );
            })}
          </div>
        )}

        {passo.tipo === "texto" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!textoAtual.trim()) return;

              if (passo.chave === "telefone") {
                if (!telefoneValido(normalizarTelefone(textoAtual))) {
                  setErro("Digita um WhatsApp válido, com DDD (ex.: (11) 99999-9999).");
                  return;
                }
                if (statusWhats === "nao_existe") {
                  setErro("Esse número não tem WhatsApp — confere e digita de novo.");
                  return;
                }
              }

              confirmarPasso({ [passo.chave]: textoAtual } as Partial<RespostasIsca>);
            }}
            className="space-y-3"
          >
            {passo.chave === "maiorDesafio" ? (
              <textarea
                autoFocus
                required
                rows={3}
                value={textoAtual}
                onChange={(e) => setTextoAtual(e.target.value)}
                placeholder={passo.placeholder}
                className="w-full rounded-lg border border-[#262f3d] bg-[#10141b] px-3 py-2 text-base text-[#eef1f6] placeholder:text-[#5b6472] outline-none focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80]"
              />
            ) : (
              <input
                autoFocus
                required
                type={passo.tipoInput ?? "text"}
                value={textoAtual}
                onChange={(e) => setTextoAtual(e.target.value)}
                placeholder={passo.placeholder}
                className="w-full rounded-lg border border-[#262f3d] bg-[#10141b] px-3 py-2 text-base text-[#eef1f6] placeholder:text-[#5b6472] outline-none focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80]"
              />
            )}

            {passo.chave === "telefone" && textoAtual.trim() && !telefoneValido(normalizarTelefone(textoAtual)) && (
              <p className="text-xs text-[#f87171]">
                Digita um WhatsApp válido, com DDD (ex.: (11) 99999-9999).
              </p>
            )}
            {passo.chave === "telefone" &&
              telefoneValido(normalizarTelefone(textoAtual)) &&
              statusWhats === "checando" && (
                <p className="text-xs text-[#8b93a1]">Conferindo o número...</p>
              )}
            {passo.chave === "telefone" &&
              telefoneValido(normalizarTelefone(textoAtual)) &&
              statusWhats === "existe" && (
                <p className="text-xs text-[#4ade80]">✅ Esse número tem WhatsApp</p>
              )}
            {passo.chave === "telefone" &&
              telefoneValido(normalizarTelefone(textoAtual)) &&
              statusWhats === "nao_existe" && (
                <p className="text-xs text-[#f87171]">❌ Esse número não tem WhatsApp — confere de novo</p>
              )}

            {erro && <p className="text-sm text-[#f87171]">{erro}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={voltar}
                disabled={enviando || passoAtual === 0}
                className="rounded-lg border border-[#262f3d] px-4 py-3 text-sm font-medium text-[#8b93a1] transition hover:border-[#3a4454] hover:text-[#c4cad3] disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                type="submit"
                disabled={enviando || telefoneInvalido}
                className="flex-1 rounded-lg bg-[#22c55e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviando ? "Enviando..." : ultimoPasso ? "Concluir" : "Próximo"}
              </button>
            </div>
          </form>
        )}

        {passo.tipo !== "texto" && (
          <>
            {erro && <p className="mt-3 text-sm text-[#f87171]">{erro}</p>}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={voltar}
                disabled={enviando || passoAtual === 0}
                className="rounded-lg border border-[#262f3d] px-4 py-3 text-sm font-medium text-[#8b93a1] transition hover:border-[#3a4454] hover:text-[#c4cad3] disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => confirmarPasso()}
                disabled={enviando || !podeAvancarEscolha}
                className="flex-1 rounded-lg bg-[#22c55e] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#16a34a] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviando ? "Enviando..." : ultimoPasso ? "Concluir" : "Próximo"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
