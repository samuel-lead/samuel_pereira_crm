"use client";

import { useState } from "react";
import { IconeX } from "@/components/icons";
import { usePainelDocumento } from "@/components/contexto-painel-documento";

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
  const painelDocumento = usePainelDocumento();

  function abrir() {
    setAberto(true);
    painelDocumento?.setDocumentoAberto(true);
  }

  function fechar() {
    setAberto(false);
    painelDocumento?.setDocumentoAberto(false);
  }

  return (
    <>
      {variante === "cartao" ? (
        <button
          type="button"
          onClick={abrir}
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
          onClick={abrir}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        >
          <Icone className="h-4 w-4 shrink-0" />
          {label}
        </button>
      )}

      {aberto && (
        // Sem overlay/fundo escuro cobrindo a tela de propósito — a
        // pessoa precisa continuar digitando no card do lead (atrás,
        // à esquerda) enquanto está numa ligação com o script aberto do
        // lado. Só fecha clicando no botão "Fechar" aqui em cima, nunca
        // clicando fora — divide a tela meio a meio com o popup do lead
        // (ver modal-lead.tsx), os dois grandes, nenhum espremido.
        <div className="fixed inset-y-0 right-0 z-[60] flex w-full flex-col bg-white shadow-2xl lg:w-[420px]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
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
                onClick={fechar}
                className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700"
              >
                <IconeX className="h-4 w-4" />
                Fechar
              </button>
            </div>
          </div>
          <iframe
            src={urlPreviewGoogleDocs(url)}
            title={label}
            className="min-h-0 flex-1 border-0"
          />
        </div>
      )}
    </>
  );
}
