"use client";

import { useState, useTransition } from "react";
import { reagendarReuniao } from "@/lib/leads/actions";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReagendarReuniaoForm({
  leadId,
  reuniaoId,
  agendadaPara,
  rotulo,
}: {
  leadId: string;
  reuniaoId: string;
  agendadaPara: string;
  rotulo: string;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const formData = new FormData(evento.currentTarget);
    iniciarTransicao(async () => {
      try {
        await reagendarReuniao(leadId, reuniaoId, formData);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra reagendar");
      }
    });
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-amber-800">{rotulo} marcada pra</h2>
      <p className="mb-3 text-sm font-medium text-amber-900">{formatarData(agendadaPara)}</p>

      <form onSubmit={aoSubmeter} className="space-y-2">
        <label className="block text-xs font-medium text-amber-700" htmlFor="nova-data-reuniao">
          Mudar pra outro dia/horário
        </label>
        <input
          id="nova-data-reuniao"
          type="datetime-local"
          name="agendada_para"
          required
          onClick={(e) => e.currentTarget.showPicker?.()}
          className="w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          Salvar novo horário
        </button>
      </form>
    </div>
  );
}
