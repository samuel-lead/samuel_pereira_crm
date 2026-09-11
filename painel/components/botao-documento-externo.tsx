"use client";

import { useRef, useState } from "react";
import { IconeX } from "@/components/icons";

// Google Docs só embeda via /preview (o link de /edit recusa rodar num
// iframe) — extrai o ID do documento de qualquer formato de link e monta
// a URL certa.
function urlPreviewGoogleDocs(url: string) {
  const id = url.match(/\/document\/d\/([^/]+)/)?.[1];
  return id ? `https://docs.google.com/document/d/${id}/preview` : url;
}

const LARGURA_PADRAO = 400;
const LARGURA_MINIMA = 320;
const LARGURA_MAXIMA = 1000;

// Botão que abre um Google Doc num popupzinho flutuando do lado direito,
// por cima de tudo — usado tanto em "Minha rotina" quanto no card do lead
// (Samuel pediu pra dar pro SDR ver o script sem sair da tela enquanto
// liga). Não mexe no tamanho nem posição do que já está aberto atrás —
// só flutua por cima, com margem da borda da tela. Tem uma alça na borda
// esquerda pra Samuel redimensionar do jeito que quiser (pediu isso
// depois de ver o tamanho fixo não servir em toda tela).
export function BotaoDocumentoExterno({
  url,
  label,
  Icone,
  // "cartao" = badge com ícone destacado (usado em "Minha rotina").
  // "botao" = botão de linha só, no mesmo estilo dos outros botões do
  // card do lead (Registrar ligação, etc.).
  variante = "botao",
}: {
  url: string;
  label: string;
  Icone: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  variante?: "cartao" | "botao";
}) {
  const [aberto, setAberto] = useState(false);
  const [largura, setLargura] = useState(LARGURA_PADRAO);
  const redimensionandoRef = useRef(false);

  function aoComecarRedimensionar(e: React.PointerEvent) {
    e.preventDefault();
    redimensionandoRef.current = true;
    const larguraInicial = largura;
    const xInicial = e.clientX;

    function aoMover(evento: PointerEvent) {
      if (!redimensionandoRef.current) return;
      // Alça fica na borda esquerda — arrastar pra esquerda aumenta,
      // pra direita diminui (o popup cresce/encolhe pela esquerda,
      // porque o lado direito fica fixo na borda da tela).
      const delta = xInicial - evento.clientX;
      const nova = Math.min(LARGURA_MAXIMA, Math.max(LARGURA_MINIMA, larguraInicial + delta));
      setLargura(nova);
    }

    function aoSoltar() {
      redimensionandoRef.current = false;
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    }

    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }

  return (
    <>
      {variante === "cartao" ? (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 text-left transition hover:border-blue-300 hover:shadow-md"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Icone className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 whitespace-nowrap text-[13px] font-semibold text-neutral-800">
            {label}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        >
          <Icone className="h-4 w-4 shrink-0" />
          {label}
        </button>
      )}

      {aberto && (
        // Sem overlay/fundo escuro de propósito, e com margem em volta
        // (não cola nas bordas) — um popupzinho flutuando por cima do que
        // já está aberto, não um painel que disputa espaço com ele. A
        // pessoa continua digitando no card do lead atrás enquanto lê o
        // documento. Só fecha clicando em "Fechar", nunca clicando fora.
        <div
          className="fixed bottom-6 right-6 top-6 z-[60] flex max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10"
          style={{ width: largura }}
        >
          <div
            onPointerDown={aoComecarRedimensionar}
            title="Arraste pra redimensionar"
            className="group absolute bottom-0 left-0 top-0 z-10 flex w-2.5 cursor-ew-resize items-center justify-center"
          >
            <span className="h-10 w-1 rounded-full bg-neutral-200 transition group-hover:bg-blue-400" />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 py-3 pl-6 pr-4">
            <h2 className="min-w-0 truncate text-sm font-bold text-neutral-900">{label}</h2>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden text-xs font-medium text-blue-600 hover:underline sm:inline"
              >
                Abrir no Google Docs
              </a>
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700"
              >
                <IconeX className="h-4 w-4" />
                Fechar
              </button>
            </div>
          </div>
          {/* Dá pra dar zoom no conteúdo de um iframe de outro site (mesmo
              sem acesso ao HTML de dentro): desenha ele menor (75% do
              espaço) e depois estica com escala 1.33x — o texto sai bem
              maior, mais fácil de ler numa ligação (Samuel pediu). */}
          <div className="min-h-0 flex-1 overflow-hidden pl-2">
            <iframe
              src={urlPreviewGoogleDocs(url)}
              title={label}
              className="h-[75%] w-[75%] origin-top-left border-0"
              style={{ transform: "scale(1.3333)" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
