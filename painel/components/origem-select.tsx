"use client";

import { useState } from "react";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function OrigemSelect({
  origens,
  valorInicial,
}: {
  origens: { id: string; nome: string }[];
  valorInicial?: string;
}) {
  const nomes = origens.map((o) => o.nome);
  const ehConhecida = valorInicial ? nomes.includes(valorInicial) : false;
  const [selecionado, setSelecionado] = useState(
    valorInicial ? (ehConhecida ? valorInicial : "Outro") : ""
  );
  const [outro, setOutro] = useState(ehConhecida ? "" : valorInicial ?? "");

  return (
    <div className="space-y-2">
      <select
        aria-label="Origem"
        value={selecionado}
        onChange={(e) => setSelecionado(e.target.value)}
        className={campoClasse}
      >
        <option value="">Selecione a origem...</option>
        {origens.map((origem) => (
          <option key={origem.id} value={origem.nome}>
            {origem.nome}
          </option>
        ))}
        <option value="Outro">Outro...</option>
      </select>

      {selecionado === "Outro" && (
        <input
          value={outro}
          onChange={(e) => setOutro(e.target.value)}
          placeholder="Qual? Fica salva pra próxima vez"
          className={campoClasse}
        />
      )}

      <input
        type="hidden"
        name="origem"
        value={selecionado === "Outro" ? outro : selecionado}
      />
    </div>
  );
}
