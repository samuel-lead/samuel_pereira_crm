"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconeChevronBaixo } from "@/components/icons";

function DropdownFiltro({
  rotulo,
  valorSelecionado,
  opcoes,
  aoSelecionar,
}: {
  rotulo: string;
  valorSelecionado: string;
  opcoes: { valor: string; texto: string }[];
  aoSelecionar: (valor: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  const opcaoAtual = opcoes.find((o) => o.valor === valorSelecionado);
  const ativo = !!valorSelecionado;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium shadow-sm outline-none transition ${
          ativo
            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50"
        }`}
      >
        {opcaoAtual ? opcaoAtual.texto : rotulo}
        <IconeChevronBaixo
          className={`h-3.5 w-3.5 transition-transform ${
            ativo ? "text-blue-500" : "text-neutral-400"
          } ${aberto ? "rotate-180" : ""}`}
        />
      </button>

      {aberto && (
        <div className="absolute left-0 top-full z-20 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg">
          <button
            type="button"
            onClick={() => {
              aoSelecionar("");
              setAberto(false);
            }}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-50 ${
              !valorSelecionado ? "font-medium text-blue-700" : "text-neutral-500"
            }`}
          >
            Todos
          </button>
          {opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => {
                aoSelecionar(opcao.valor);
                setAberto(false);
              }}
              className={`block w-full truncate rounded-md px-3 py-2 text-left text-sm transition hover:bg-neutral-50 ${
                opcao.valor === valorSelecionado ? "font-medium text-blue-700" : "text-neutral-700"
              }`}
            >
              {opcao.texto}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FiltrosLeads({
  usuarios,
  origens,
  usuarioInicial,
  origemInicial,
  baseHref = "/leads",
}: {
  usuarios: { id: string; nome: string }[];
  origens: string[];
  usuarioInicial?: string;
  origemInicial?: string;
  baseHref?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function construirUrl(usuario: string, origem: string) {
    // Preserva outros parâmetros já na URL (ex.: "busca") — sem isso,
    // trocar um filtro apagava o que a pessoa tinha digitado na busca.
    const params = new URLSearchParams(searchParams.toString());
    if (usuario) params.set("usuario", usuario);
    else params.delete("usuario");
    if (origem) params.set("origem", origem);
    else params.delete("origem");
    const query = params.toString();
    return query ? `${baseHref}?${query}` : baseHref;
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownFiltro
        rotulo="Usuários"
        valorSelecionado={usuarioInicial ?? ""}
        opcoes={usuarios.map((usuario) => ({ valor: usuario.id, texto: usuario.nome }))}
        aoSelecionar={(valor) => router.push(construirUrl(valor, origemInicial ?? ""))}
      />
      <DropdownFiltro
        rotulo="Funil"
        valorSelecionado={origemInicial ?? ""}
        opcoes={origens.map((origem) => ({ valor: origem, texto: origem }))}
        aoSelecionar={(valor) => router.push(construirUrl(usuarioInicial ?? "", valor))}
      />
    </div>
  );
}
