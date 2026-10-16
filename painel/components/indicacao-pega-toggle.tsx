"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarIndicacaoPega } from "@/lib/leads/actions";

// Sim/Não clicável na lista de Clientes (só o dono da plataforma vê).
// Troca na hora na tela e desfaz se o servidor recusar.
export function IndicacaoPegaToggle({
  leadId,
  jaPegou,
}: {
  leadId: string;
  jaPegou: boolean;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(jaPegou);
  const [pendente, iniciarTransicao] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function aoClicar() {
    const novo = !valor;
    setErro(null);
    setValor(novo);
    iniciarTransicao(async () => {
      const resultado = await marcarIndicacaoPega(leadId, novo);
      if (resultado) {
        setValor(!novo);
        setErro(resultado);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={aoClicar}
        disabled={pendente}
        title="Clique para trocar entre Sim e Não"
        className={`rounded-md px-2.5 py-1 text-xs font-semibold transition disabled:opacity-60 ${
          valor
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
        }`}
      >
        {valor ? "Sim" : "Não"}
      </button>
      {erro && <p className="text-xs text-red-600">{erro}</p>}
    </div>
  );
}
