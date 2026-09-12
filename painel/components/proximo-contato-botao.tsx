"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { marcarProximoContato, cancelarProximoContato } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { CampoDataHora } from "@/components/campo-data-hora";

function formatarData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Versão compacta do "Próximo contato" pro cabeçalho do card do lead
// (Samuel pediu): sem contato marcado, é só um botão. Marcado, vira um
// resumo ("Próximo contato: dd/mm HH:MM") com um botão "Editar" do lado
// — clicar em qualquer um dos dois abre o mesmo formulário num
// popover, em vez do card grande sempre aberto de antes.
export function ProximoContatoBotao({
  leadId,
  proximoContatoEm,
}: {
  leadId: string;
  proximoContatoEm: string | null;
}) {
  const modalAtivo = useLeadModalAtivo();
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  function aoSubmeter(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro(null);
    const formData = new FormData(evento.currentTarget);
    iniciarTransicao(async () => {
      try {
        await marcarProximoContato(leadId, formData);
        modalAtivo?.recarregar();
        setAberto(false);
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
        modalAtivo?.recarregar();
        setAberto(false);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra cancelar");
      }
    });
  }

  const atrasado = proximoContatoEm ? new Date(proximoContatoEm).getTime() < Date.now() : false;

  return (
    <div ref={containerRef} className="relative">
      {proximoContatoEm ? (
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium shadow-sm ${
            atrasado ? "border-red-200 bg-red-50 text-red-700" : "border-teal-200 bg-teal-50 text-teal-800"
          }`}
        >
          <span className="whitespace-nowrap">
            {atrasado ? "Contato atrasado: " : "Próximo contato: "}
            {formatarData(proximoContatoEm)}
          </span>
          <button
            type="button"
            onClick={() => setAberto((atual) => !atual)}
            className="shrink-0 rounded border border-current px-1.5 py-0.5 text-[11px] hover:opacity-70"
          >
            Editar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50"
        >
          📅 Marcar próximo contato
        </button>
      )}

      {aberto && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <form onSubmit={aoSubmeter} className="space-y-2">
            <CampoDataHora
              name="proximo_follow_em"
              required
              defaultValue={proximoContatoEm ?? undefined}
              autoFocus
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            {erro && <p className="text-xs text-red-600">{erro}</p>}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pendente}
                className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {proximoContatoEm ? "Atualizar" : "Marcar"}
              </button>
              {proximoContatoEm && (
                <button
                  type="button"
                  onClick={aoCancelar}
                  disabled={pendente}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
