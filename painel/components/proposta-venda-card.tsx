"use client";

import { useState } from "react";
import { RegistrarPropostaForm } from "@/components/registrar-proposta-form";
import { MarcarVendidoForm } from "@/components/marcar-vendido-form";

// Proposta e venda não são passos obrigatórios em sequência — às vezes a
// reunião já fecha na hora, sem proposta nenhuma registrada antes (Samuel
// pediu explicitamente pra tirar essa cara de "1 depois 2"). Vira uma
// escolha: a pessoa decide qual dos dois aconteceu e só esse formulário
// aparece. Os dois ficam montados o tempo todo (só escondidos com CSS),
// pra não perder o que já foi digitado ao trocar de aba.
export function PropostaVendaCard({
  leadId,
  propostaAtual,
  produtos,
}: {
  leadId: string;
  propostaAtual: {
    valor: number | null;
    enviadaEm: string | null;
    observacao: string | null;
  };
  produtos: string[];
}) {
  const [aba, setAba] = useState<"proposta" | "venda">("proposta");
  const temProposta = propostaAtual.valor != null;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white shadow-sm">
      <div className="flex border-b border-neutral-100">
        <button
          type="button"
          onClick={() => setAba("proposta")}
          className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
            aba === "proposta"
              ? "border-b-2 border-amber-600 text-amber-700"
              : "border-b-2 border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Proposta
        </button>
        <button
          type="button"
          onClick={() => setAba("venda")}
          className={`flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition ${
            aba === "venda"
              ? "border-b-2 border-green-600 text-green-700"
              : "border-b-2 border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Venda
        </button>
      </div>

      <div className="p-4">
        <div className={aba === "proposta" ? "" : "hidden"}>
          <RegistrarPropostaForm leadId={leadId} propostaAtual={propostaAtual} />
        </div>
        <div className={aba === "venda" ? "" : "hidden"}>
          <MarcarVendidoForm leadId={leadId} temProposta={temProposta} produtos={produtos} />
        </div>
      </div>
    </div>
  );
}
