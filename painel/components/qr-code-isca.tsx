"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Gera o QR code inteiro no navegador (sem mandar o link pra nenhum
// serviço de fora) — clica pra mostrar/esconder, e dá pra baixar a
// imagem pra colocar num panfleto, story, slide de palestra etc.
export function QrCodeIsca({ link, nomeArquivo }: { link: string; nomeArquivo: string }) {
  const [aberto, setAberto] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || dataUrl) return;
    QRCode.toDataURL(link, { width: 320, margin: 1 })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [aberto, dataUrl, link]);

  return (
    <div className="inline-block">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
      >
        {aberto ? "Esconder QR code" : "QR code"}
      </button>

      {aberto && (
        <div className="mt-2 flex flex-col items-center gap-2 rounded-md border border-neutral-200 bg-white p-3 shadow-sm">
          {dataUrl ? (
            <>
              <img src={dataUrl} alt={`QR code de ${nomeArquivo}`} className="h-40 w-40" />
              <a
                href={dataUrl}
                download={`qrcode-${nomeArquivo}.png`}
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                Baixar imagem
              </a>
            </>
          ) : (
            <p className="text-xs text-neutral-400">Gerando...</p>
          )}
        </div>
      )}
    </div>
  );
}
