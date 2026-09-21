"use client";

import { useState } from "react";

type Tipo = "percentual" | "fixo";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Imobiliário escolhe, venda a venda, como a receita (comissão) é
// calculada: % do preço do imóvel ou valor fixo. Já vem preenchido com o
// que está em Meu perfil (ou com o que a venda já tinha, ao editar), mas
// dá pra trocar só naquela venda sem mexer no perfil.
export function CampoComissaoVenda({
  valorVendaReais,
  tipoInicial,
  percentualInicial,
  valorFixoInicial,
  variante = "cartao",
}: {
  valorVendaReais: number;
  tipoInicial: Tipo;
  percentualInicial: number | null;
  valorFixoInicial: number | null;
  variante?: "cartao" | "simples";
}) {
  const [tipo, setTipo] = useState<Tipo>(tipoInicial);
  const [percentual, setPercentual] = useState(percentualInicial != null ? String(percentualInicial) : "");
  const [valorFixo, setValorFixo] = useState(valorFixoInicial != null ? String(valorFixoInicial) : "");

  const numero = Number((tipo === "fixo" ? valorFixo : percentual).replace(",", "."));
  const previa =
    !numero || Number.isNaN(numero) ? null : tipo === "fixo" ? numero : valorVendaReais * (numero / 100);

  const envelope =
    variante === "cartao" ? "rounded-lg bg-white p-3 shadow-sm" : "space-y-0";
  const rotulo =
    variante === "cartao"
      ? "mb-1.5 block text-sm font-bold text-green-900"
      : "mb-1 block text-xs font-medium text-green-800";
  const campo =
    "w-full rounded-md border border-green-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500";

  return (
    <div className={envelope}>
      <label className={rotulo}>Receita (comissão)</label>
      <input type="hidden" name="comissao_tipo" value={tipo} />
      <div className="mb-2 inline-flex w-full rounded-md border border-green-300 bg-green-50 p-0.5">
        {(
          [
            ["percentual", "% da venda"],
            ["fixo", "Valor fixo"],
          ] as const
        ).map(([valor, texto]) => (
          <button
            key={valor}
            type="button"
            onClick={() => setTipo(valor)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition ${
              tipo === valor ? "bg-white text-green-800 shadow-sm" : "text-green-700"
            }`}
          >
            {texto}
          </button>
        ))}
      </div>
      {tipo === "percentual" ? (
        <div className="relative">
          <input
            name="comissao_percentual"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.01}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            placeholder="Ex.: 1,5"
            className={`${campo} pr-8`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            %
          </span>
        </div>
      ) : (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
            R$
          </span>
          <input
            name="comissao_valor_fixo"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.01}
            value={valorFixo}
            onChange={(e) => setValorFixo(e.target.value)}
            placeholder="Ex.: 500"
            className={`${campo} pl-9`}
          />
        </div>
      )}
      <p className="mt-1.5 text-sm font-semibold text-green-800">
        {previa !== null ? moeda(previa) : "—"}
      </p>
      <p className="mt-0.5 text-[10px] text-neutral-400">
        {tipo === "fixo"
          ? "Valor fixo, igual em qualquer preço de imóvel."
          : "Calculado sobre o preço do imóvel."}{" "}
        Vale só pra esta venda.
      </p>
    </div>
  );
}
