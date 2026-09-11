"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { editarVenda, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

function formatarData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Clicar na data da venda, na tabela de Clientes, edita ela na hora — sem
// precisar abrir o card do lead inteiro só pra corrigir uma data. Manda
// junto (escondido) o valor/receita/produto que já estavam salvos, porque
// a action editarVenda salva tudo de uma vez (ver lib/leads/actions.ts).
export function EditarDataVendaInline({
  leadId,
  vendidoEm,
  valorVenda,
  receitaVenda,
  produto,
}: {
  leadId: string;
  vendidoEm: string | null;
  valorVenda: number | null;
  receitaVenda: number | null;
  produto: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const acaoComId = editarVenda.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const enviandoRef = useRef(false);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) setEditando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => setEditando(true)}
        title="Editar data da venda"
        className="rounded px-1.5 py-0.5 text-neutral-600 underline decoration-dotted underline-offset-2 hover:bg-neutral-100 hover:text-neutral-900"
      >
        {formatarData(vendidoEm)}
      </button>
    );
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <form action={acaoFormulario} className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <input type="hidden" name="valor_venda" value={valorVenda ?? ""} />
        <input type="hidden" name="receita_venda" value={receitaVenda ?? ""} />
        <input type="hidden" name="produto" value={produto ?? ""} />
        <input
          type="date"
          name="vendido_em"
          required
          defaultValue={vendidoEm ? vendidoEm.slice(0, 10) : hoje}
          max={hoje}
          autoFocus
          className="rounded border border-neutral-300 px-1.5 py-1 text-xs text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={pendente}
          className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {pendente ? "..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="text-xs text-neutral-400 hover:text-neutral-600"
        >
          Cancelar
        </button>
      </div>
      {estado.erro && <span className="text-xs text-red-600">{estado.erro}</span>}
    </form>
  );
}
