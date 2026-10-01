"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { editarMotivoRepescagem, type EstadoFormulario } from "@/lib/leads/actions";

const estadoInicial: EstadoFormulario = { erro: null };

// Card "Motivo de ir pra repescagem" — era só leitura, Samuel pediu pra
// dar pra editar depois (digitou rápido na hora de mover o lead, quer
// ajustar/detalhar sem precisar mover o lead de novo).
export function EditarMotivoRepescagem({ leadId, motivo }: { leadId: string; motivo: string }) {
  const [editando, setEditando] = useState(false);
  const acaoComId = editarMotivoRepescagem.bind(null, leadId);
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

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-green-800">Motivo de ir pra repescagem</h2>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="shrink-0 text-xs font-medium text-green-700 underline decoration-dotted underline-offset-2 hover:text-green-900"
          >
            Editar
          </button>
        )}
      </div>

      {editando ? (
        <form action={acaoFormulario} className="mt-2 space-y-1.5">
          <textarea
            name="motivo_repescagem_futura"
            defaultValue={motivo}
            rows={3}
            autoFocus
            className="w-full rounded-md border border-green-300 bg-white px-2.5 py-2 text-sm text-neutral-900 outline-none focus:border-green-500"
          />
          {estado.erro && <p className="text-xs text-red-600">{estado.erro}</p>}
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={pendente}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
            >
              {pendente ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="rounded-md border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-1 text-sm text-green-700">{motivo}</p>
      )}
    </div>
  );
}
