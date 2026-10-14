"use client";

import { useState } from "react";
import { ImovelSelect } from "@/components/imovel-select";
import { UnidadeSelect } from "@/components/unidade-select";
import type { UnidadeParaVenda } from "@/lib/imoveis/unidades-actions";

type Imovel = { id: string; titulo: string; bairro: string | null; cidade: string | null };

// "Imóvel vendido" na venda do imobiliário: empreendimento próprio (já
// cadastrado, com unidade) ou captação (imóvel de outra construtora ou
// proprietário, só uma descrição). Usado ao registrar e ao editar a venda.
export function SeletorImovelVenda({
  imoveis,
  imovelIdAtual,
  unidadeIdAtual,
  captacaoAtual = false,
  descricaoCaptacaoAtual,
  aoEscolherUnidade,
}: {
  imoveis: Imovel[];
  imovelIdAtual?: string | null;
  unidadeIdAtual?: string | null;
  captacaoAtual?: boolean;
  descricaoCaptacaoAtual?: string | null;
  aoEscolherUnidade: (unidade: UnidadeParaVenda | null) => void;
}) {
  const [tipo, setTipo] = useState<"proprio" | "captacao">(captacaoAtual ? "captacao" : "proprio");
  const [imovelId, setImovelId] = useState(imovelIdAtual ?? "");

  function opcao(valor: "proprio" | "captacao", titulo: string, subtitulo: string) {
    const ativa = tipo === valor;
    return (
      <button
        type="button"
        onClick={() => setTipo(valor)}
        className={`flex-1 rounded-lg border px-3 py-2 text-left transition ${
          ativa ? "border-green-500 bg-green-50" : "border-neutral-200 bg-white hover:border-green-300"
        }`}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
              ativa ? "border-green-600" : "border-neutral-300"
            }`}
          >
            {ativa && <span className="h-2 w-2 rounded-full bg-green-600" />}
          </span>
          {titulo}
        </span>
        <span className="mt-0.5 block text-[11px] text-neutral-500">{subtitulo}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="tipo_imovel" value={tipo} />
      <div className="flex gap-2">
        {opcao("proprio", "Empreendimento próprio", "Já cadastrado no sistema")}
        {opcao("captacao", "Captação (terceiros)", "Imóvel de outra construtora/proprietário")}
      </div>

      {tipo === "proprio" ? (
        <>
          <ImovelSelect imoveis={imoveis} valorInicial={imovelIdAtual} aoMudar={setImovelId} />
          <UnidadeSelect imovelId={imovelId} unidadeInicial={unidadeIdAtual} aoEscolher={aoEscolherUnidade} />
        </>
      ) : (
        <input
          type="text"
          name="captacao_descricao"
          defaultValue={descricaoCaptacaoAtual ?? ""}
          maxLength={160}
          placeholder="Qual imóvel? (ex.: Apto 302, Ed. Solar, Manaíra)"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      )}
    </div>
  );
}
