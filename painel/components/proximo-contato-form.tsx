"use client";

import { useState, useTransition } from "react";
import {
  marcarProximoContato,
  cancelarProximoContato,
} from "@/lib/leads/actions";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProximoContatoForm({
  leadId,
  proximoContatoEm,
}: {
  leadId: string;
  proximoContatoEm: string | null;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const formData = new FormData(evento.currentTarget);
    iniciarTransicao(async () => {
      try {
        await marcarProximoContato(leadId, formData);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra marcar");
      }
    });
  }

  function aoCancelar() {
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await cancelarProximoContato(leadId);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra cancelar");
      }
    });
  }

  const atrasado = proximoContatoEm ? new Date(proximoContatoEm).getTime() < Date.now() : false;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-blue-800">Próximo contato</h2>

      {proximoContatoEm ? (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-blue-200 bg-white/60 p-2 text-xs">
          <p className={atrasado ? "font-semibold text-red-600" : "font-semibold text-blue-800"}>
            {atrasado ? "Atrasado — era pra " : "Marcado pra "}
            {formatarData(proximoContatoEm)}
          </p>
          <button
            type="button"
            onClick={aoCancelar}
            disabled={pendente}
            className="shrink-0 text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <p className="mb-3 text-xs text-blue-700">
          Marque quando um lead pediu para entrar em contato ou quando será a sua
          próxima atividade com ele.
        </p>
      )}

      <form onSubmit={aoSubmeter} className="space-y-2">
        <input
          type="datetime-local"
          name="proximo_follow_em"
          required
          className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={pendente}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {proximoContatoEm ? "Atualizar" : "Marcar próximo contato"}
        </button>
      </form>
    </div>
  );
}
