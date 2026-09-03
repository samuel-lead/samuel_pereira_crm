"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  atualizarPixelsConfig,
  type EstadoPixelsConfig,
} from "@/lib/configuracoes/actions";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const labelClasse = "text-sm font-medium text-neutral-700";
const estadoInicial: EstadoPixelsConfig = { erro: null };

export function PixelsConfigForm({
  metaPixelId,
  googleTagId,
  instagramUrl,
}: {
  metaPixelId: string | null;
  googleTagId: string | null;
  instagramUrl: string | null;
}) {
  const [estado, acaoFormulario, pendente] = useActionState(
    atualizarPixelsConfig,
    estadoInicial
  );
  const [salvo, setSalvo] = useState(false);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        setSalvo(true);
        const timeout = setTimeout(() => setSalvo(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [pendente, estado]);

  return (
    <form action={acaoFormulario} className="space-y-4">
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="meta_pixel_id">
          ID do Pixel do Meta
        </label>
        <input
          id="meta_pixel_id"
          name="meta_pixel_id"
          type="text"
          placeholder="Ex: 123456789012345"
          defaultValue={metaPixelId ?? ""}
          className={campoClasse}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="google_tag_id">
          ID da tag do Google
        </label>
        <input
          id="google_tag_id"
          name="google_tag_id"
          type="text"
          placeholder="Ex: G-XXXXXXXXXX ou AW-XXXXXXXXX"
          defaultValue={googleTagId ?? ""}
          className={campoClasse}
        />
      </div>
      <div className="space-y-1">
        <label className={labelClasse} htmlFor="instagram_url">
          Link do Instagram
        </label>
        <input
          id="instagram_url"
          name="instagram_url"
          type="text"
          placeholder="Ex: https://instagram.com/seu_usuario"
          defaultValue={instagramUrl ?? ""}
          className={campoClasse}
        />
        <p className="text-xs text-neutral-400">
          Usado no botão &quot;Seguir no Instagram&quot; que aparece pro lead
          quando a isca é só de cadastro (sem material pra liberar).
        </p>
      </div>

      {estado.erro && <p className="text-sm text-red-600">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar"}
      </button>
    </form>
  );
}
