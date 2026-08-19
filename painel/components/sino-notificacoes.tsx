"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { IconeSino } from "@/components/icons";

type Notificacao = {
  tipo: string;
  lead_id: string;
  lead_nome: string;
  mensagem: string;
  ocorrido_em: string;
};

const UM_MINUTO_MS = 60_000;

export function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const jaNotificadasRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let ativo = true;

    async function carregar() {
      const { data } = await supabase.rpc("listar_notificacoes");
      const lista = (data as Notificacao[]) ?? [];
      if (!ativo) return;

      const chaves = new Set(lista.map((n) => `${n.tipo}-${n.lead_id}`));

      if (jaNotificadasRef.current) {
        const novas = lista.filter(
          (n) => !jaNotificadasRef.current!.has(`${n.tipo}-${n.lead_id}`)
        );
        if (novas.length > 0 && typeof Notification !== "undefined" && Notification.permission === "granted") {
          for (const n of novas) {
            new Notification("Meu Vendedor", { body: n.mensagem });
          }
        }
      }
      jaNotificadasRef.current = chaves;

      setNotificacoes(lista);
    }

    carregar();
    const intervalo = setInterval(carregar, UM_MINUTO_MS);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    function aoClicarFora(evento: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(evento.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-md border border-amber-400 bg-amber-400 text-slate-900 shadow-sm transition hover:bg-amber-300"
      >
        <IconeSino className="h-4 w-4" />
        {notificacoes.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {notificacoes.length > 9 ? "9+" : notificacoes.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute bottom-full left-0 z-20 mb-2 max-h-80 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Notificações
          </p>
          {notificacoes.length === 0 ? (
            <p className="px-2 py-3 text-sm text-neutral-500">Nada por aqui.</p>
          ) : (
            notificacoes.map((n, i) => (
              <Link
                key={`${n.tipo}-${n.lead_id}-${i}`}
                href={`/leads/lista?busca=${encodeURIComponent(n.lead_nome)}`}
                onClick={() => setAberto(false)}
                className="block rounded-md px-2 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                {n.mensagem}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
