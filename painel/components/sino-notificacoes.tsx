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
const CHAVE_LIDAS_LOCALSTORAGE = "sino-notificacoes-lidas";

function chaveNotificacao(n: Notificacao) {
  // Inclui ocorrido_em na chave: se o mesmo lead disparar essa notificação
  // de novo mais tarde por outro motivo (ex.: reunião remarcada pra outro
  // dia), é um aviso novo — marcar como lida o de ontem não deve esconder
  // o de hoje.
  return `${n.tipo}-${n.lead_id}-${n.ocorrido_em}`;
}

function carregarLidas(): Set<string> {
  try {
    const bruto = localStorage.getItem(CHAVE_LIDAS_LOCALSTORAGE);
    return new Set(bruto ? (JSON.parse(bruto) as string[]) : []);
  } catch {
    return new Set();
  }
}

function salvarLidas(lidas: Set<string>) {
  try {
    localStorage.setItem(CHAVE_LIDAS_LOCALSTORAGE, JSON.stringify([...lidas]));
  } catch {
    // localStorage indisponível (modo privado, etc.) — sem problema, só
    // não persiste entre sessões.
  }
}

export function SinoNotificacoes() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [lidas, setLidas] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLidas(carregarLidas());
  }, []);

  function marcarComoLida(chave: string) {
    setLidas((atual) => {
      const nova = new Set(atual).add(chave);
      salvarLidas(nova);
      return nova;
    });
  }

  function marcarTodasComoLidas() {
    setLidas((atual) => {
      const nova = new Set(atual);
      for (const n of notificacoes) nova.add(chaveNotificacao(n));
      salvarLidas(nova);
      return nova;
    });
  }

  const naoLidas = notificacoes.filter((n) => !lidas.has(chaveNotificacao(n)));

  // Começa como conjunto vazio (não null) de propósito: se começasse null,
  // a primeira carga (quando a pessoa abre o CRM) só preenchia essa lista
  // em silêncio, sem disparar nenhuma notificação — quem já estava
  // atrasado ANTES da pessoa abrir o CRM nunca gerava aviso, só aparecia
  // escondido no sininho. Com conjunto vazio, a primeira carga já conta
  // tudo que existe como "novo" e avisa.
  const jaNotificadasRef = useRef<Set<string>>(new Set());

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

      const novas = lista.filter(
        (n) => !jaNotificadasRef.current.has(`${n.tipo}-${n.lead_id}`)
      );
      if (novas.length > 0 && typeof Notification !== "undefined" && Notification.permission === "granted") {
        for (const n of novas) {
          new Notification("Meu Vendedor", { body: n.mensagem });
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
        className={`relative flex h-9 w-9 items-center justify-center rounded-md border shadow-sm transition ${
          naoLidas.length > 0
            ? "animate-pulse border-red-400 bg-red-500 text-white hover:bg-red-600"
            : "border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
        }`}
      >
        <IconeSino className="h-4 w-4" />
        {naoLidas.length > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-semibold text-white">
            {naoLidas.length > 9 ? "9+" : naoLidas.length}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute bottom-full left-0 z-20 mb-2 max-h-80 w-72 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Notificações
            </p>
            {naoLidas.length > 0 && (
              <button
                type="button"
                onClick={marcarTodasComoLidas}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>
          {notificacoes.length === 0 ? (
            <p className="px-2 py-3 text-sm text-neutral-500">Nada por aqui.</p>
          ) : (
            notificacoes.map((n, i) => {
              const chave = chaveNotificacao(n);
              const lida = lidas.has(chave);
              return (
                <div
                  key={`${chave}-${i}`}
                  className={`flex items-start gap-1 rounded-md px-2 py-2 text-sm transition ${
                    lida ? "text-neutral-400" : "text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <Link
                    href={`/leads/lista?busca=${encodeURIComponent(n.lead_nome)}`}
                    onClick={() => setAberto(false)}
                    className="min-w-0 flex-1"
                  >
                    {n.mensagem}
                  </Link>
                  {!lida && (
                    <button
                      type="button"
                      onClick={() => marcarComoLida(chave)}
                      title="Marcar como lida"
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    >
                      ✓
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
