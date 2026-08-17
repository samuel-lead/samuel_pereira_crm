"use client";

import { useState } from "react";

export const ORIGENS = [
  "Indicação Closer",
  "Networking",
  "SS IG",
  "Treinamento presencial",
  "Tráfego pago",
  "Indicação base",
  "Base de leads",
  "Base de clientes",
  "HUNTER IG SAMUEL",
  "Parceria (aula semanal)",
  "Renovação",
  "Meu grupo do Wpp",
];

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";

export function OrigemSelect({ valorInicial }: { valorInicial?: string }) {
  const ehConhecida = valorInicial ? ORIGENS.includes(valorInicial) : false;
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
        {ORIGENS.map((origem) => (
          <option key={origem} value={origem}>
            {origem}
          </option>
        ))}
        <option value="Outro">Outro...</option>
      </select>

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
        name="origem"
        value={selecionado === "Outro" ? outro : selecionado}
      />
    </div>
  );
}
