"use client";

import { useState } from "react";
import { IconeX } from "@/components/icons";

// Google Docs só embeda via /preview (o link de /edit recusa rodar num
// iframe) — extrai o ID do documento de qualquer formato de link e monta
// a URL certa.
function urlPreviewGoogleDocs(url: string) {
  const id = url.match(/\/document\/d\/([^/]+)/)?.[1];
  return id ? `https://docs.google.com/document/d/${id}/preview` : url;
}

// Botão que abre um Google Doc num painel deslizando da direita, embutido
// no CRM — usado tanto em "Minha rotina" quanto no card do lead (Samuel
// pediu pra dar pro SDR ver o script sem sair da tela enquanto liga).
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
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/50"
          onClick={() => setAberto(false)}
        >
          <div
            className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-4">
              <h2 className="truncate text-base font-bold text-neutral-900">{label}</h2>
              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  Abrir no Google Docs
                </a>
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                >
                  <IconeX className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={urlPreviewGoogleDocs(url)}
              title={label}
              className="min-h-0 flex-1 border-0"
            />
          </div>
        </div>
      )}
    </>
  );
}
