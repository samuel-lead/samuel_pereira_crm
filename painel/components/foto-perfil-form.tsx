"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const [estado, acaoFormulario, pendente] = useActionState(atualizarFotoPerfil, estadoInicial);
  const [preview, setPreview] = useState<string | null>(null);
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
        disabled={pendente}
        className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium text-white shadow-sm transition disabled:opacity-60 ${
          salvo ? "bg-green-600 hover:bg-green-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {pendente ? "Salvando..." : salvo ? "Salvo ✓" : "Salvar foto"}
      </button>
    </form>
  );
}
