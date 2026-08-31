"use client";

import { useState } from "react";
import { MenuSelect } from "@/components/menu-select";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function ProdutoSelect({
  produtos,
  valorInicial,
}: {
  produtos: string[];
  valorInicial?: string;
}) {
  const ehConhecido = valorInicial ? produtos.includes(valorInicial) : false;
  const [selecionado, setSelecionado] = useState(
    valorInicial ? (ehConhecido ? valorInicial : "Outro") : ""
  );
  const [outro, setOutro] = useState(ehConhecido ? "" : valorInicial ?? "");

  return (
    <div className="space-y-2">
      <MenuSelect
        placeholder="Selecione o produto..."
        value={selecionado}
        onChange={setSelecionado}
        options={[
          ...produtos.map((produto) => ({ value: produto, label: produto })),
          { value: "Outro", label: "Outro..." },
        ]}
      />

      {selecionado === "Outro" && (
        <input
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Qual?"
          className={campoClasse}
        />
      )}

      <input
        type="hidden"
        name="produto"
        value={selecionado === "Outro" ? outro : selecionado}
      />
    </div>
  );
}
