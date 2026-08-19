"use client";

import { useActionState, useState } from "react";
import { atualizarFotoPerfil, type EstadoFoto } from "@/lib/configuracoes/actions";
import { AvatarUsuario } from "@/components/avatar-usuario";

const estadoInicial: EstadoFoto = { erro: null };

export function FotoPerfilForm({
  nome,
  fotoUrl,
}: {
  nome: string;
  fotoUrl: string | null;
}) {
  const [estado, acaoFormulario] = useActionState(atualizarFotoPerfil, estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);

  function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (arquivo) {
      setPreview(URL.createObjectURL(arquivo));
    }
  }

  return (
    <form action={acaoFormulario} className="flex items-center gap-4">
      <AvatarUsuario
        nome={nome}
        fotoUrl={preview ?? fotoUrl}
        tamanho="h-16 w-16 text-lg"
      />

      <div className="flex-1 space-y-1">
        <input
          type="file"
          name="foto"
          accept="image/*"
          onChange={aoEscolherArquivo}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="text-xs text-neutral-400">JPG ou PNG, até 2MB.</p>
        {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
      </div>

      <button
        type="submit"
        className="shrink-0 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
      >
        Salvar foto
      </button>
    </form>
  );
}
