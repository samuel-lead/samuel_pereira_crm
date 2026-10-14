"use client";

import { useState, useTransition } from "react";
import { removerPessoaOrg } from "@/lib/plataforma/actions";

// Remove uma pessoa de uma empresa cliente (tela Gerenciar empresas). Os
// leads e atividades dela vão pra outra pessoa da mesma empresa — escolhida
// aqui — e o acesso dela some de vez.
export function RemoverPessoaOrgButton({
  orgId,
  pessoa,
  outras,
}: {
  orgId: string;
  pessoa: { id: string; nome: string };
  outras: { id: string; nome: string }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [destino, setDestino] = useState(outras[0]?.id ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function confirmar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await removerPessoaOrg(orgId, pessoa.id, destino || null);
        setAberto(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra remover");
      }
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Remover
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-lg border border-red-200 bg-red-50 p-3 text-left">
      <p className="text-xs font-medium text-red-800">
        Remover {pessoa.nome}? O acesso dela some de vez. Os leads e atividades dela não são apagados.
      </p>
      {outras.length > 0 ? (
        <label className="block text-xs text-red-800">
          Passar os leads e atividades para:
          <select
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="mt-1 w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-xs text-neutral-900"
          >
            {outras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="text-xs text-red-800">
          Não há outra pessoa na empresa. Se ela tiver leads, a remoção não vai deixar.
        </p>
      )}
      {erro && <p className="text-xs text-red-700">{erro}</p>}
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={confirmar}
          disabled={pendente}
          className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pendente ? "Removendo..." : "Sim, remover"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAberto(false);
            setErro(null);
          }}
          disabled={pendente}
          className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
