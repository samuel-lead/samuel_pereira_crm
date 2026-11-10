"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

// Samuel (10/11/26): clicar na foto do lead no card dá um zoom na foto; clicar
// fora (ou apertar Esc) fecha. Só liga com `ampliavel` — nas listas pequenas
// (responsável, avatar do usuário) a foto continua sendo só um enfeite.
function FotoAmpliada({ nome, fotoUrl, aoFechar }: { nome: string; fotoUrl: string; aoFechar: () => void }) {
  useEffect(() => {
    function aoApertar(e: KeyboardEvent) {
      if (e.key === "Escape") aoFechar();
    }
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  }, [aoFechar]);

  // Vai pro <body> (portal) porque o card tem efeito de "subir" no hover, e um
  // elemento fixo dentro de algo transformado não cobre a tela inteira. Os
  // eventos de clique ainda "sobem" pelo React até o card, então travamos eles
  // aqui pra clicar fora não abrir o lead por trás.
  return createPortal(
    <div
      role="dialog"
      aria-label={`Foto de ${nome}`}
      onClick={(e) => {
        e.stopPropagation();
        aoFechar();
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[100] flex cursor-zoom-out items-center justify-center bg-black/70 p-6"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={fotoUrl}
        alt={nome}
        className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
      />
    </div>,
    document.body
  );
}

export function AvatarLead({
  nome,
  fotoUrl,
  tamanho = "h-9 w-9 text-xs",
  classeBadge = "bg-neutral-200 text-neutral-700",
  ampliavel = false,
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: string;
  classeBadge?: string;
  ampliavel?: boolean;
}) {
  const [aberta, setAberta] = useState(false);

  if (fotoUrl) {
    if (!ampliavel) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fotoUrl}
          alt={nome}
          className={`${tamanho} shrink-0 rounded-full object-cover`}
        />
      );
    }
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fotoUrl}
          alt={nome}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            setAberta(true);
          }}
          className={`${tamanho} shrink-0 cursor-zoom-in rounded-full object-cover`}
        />
        {aberta && <FotoAmpliada nome={nome} fotoUrl={fotoUrl} aoFechar={() => setAberta(false)} />}
      </>
    );
  }

  return (
    <span
      className={`flex ${tamanho} shrink-0 items-center justify-center rounded-full font-bold ${classeBadge}`}
    >
      {iniciais(nome)}
    </span>
  );
}
