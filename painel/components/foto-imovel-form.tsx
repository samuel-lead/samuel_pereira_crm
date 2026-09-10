"use client";

import { useActionState, useRef, useState } from "react";
import { atualizarFotoImovel, type EstadoFoto } from "@/lib/imoveis/actions";

const estadoInicial: EstadoFoto = { erro: null };

export function FotoImovelForm({
  imovelId,
  fotoUrl,
}: {
  imovelId: string;
  fotoUrl: string | null;
}) {
  const acaoComId = atualizarFotoImovel.bind(null, imovelId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setPreview(URL.createObjectURL(arquivo));
    formRef.current?.requestSubmit();
  }

  const fotoAtual = preview ?? fotoUrl;

  return (
    <form ref={formRef} action={acaoFormulario} className="flex items-center gap-4">
      <div className="h-24 w-32 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
        {fotoAtual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fotoAtual} alt="Foto do imóvel" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-center text-xs text-neutral-400">
            Sem foto
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <label className="text-sm font-medium text-neutral-700">Foto do imóvel</label>
        <input
          type="file"
          name="foto"
          accept="image/*"
          onChange={aoEscolherArquivo}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-neutral-400">JPG ou PNG, até 4MB.</p>
        {pendente && <p className="text-xs text-blue-600">Enviando...</p>}
        {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
      </div>
    </form>
  );
}
