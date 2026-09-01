"use client";

import { useEffect, useState } from "react";
import {
  salvarInscricaoPush,
  enviarPushTeste,
} from "@/lib/notificacoes/actions";

// A chave pública do navegador vem em base64url — o navegador só aceita
// como Uint8Array, então converte antes de usar.
function paraUint8Array(base64url: string) {
  const preenchimento = "=".repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + preenchimento).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(base64);
  return Uint8Array.from([...bruto].map((c) => c.charCodeAt(0)));
}

type Status = "verificando" | "indisponivel" | "negado" | "pode_ativar" | "ativado";

export function NotificacoesPushForm({ jaInscrito }: { jaInscrito: boolean }) {
  const [status, setStatus] = useState<Status>("verificando");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("indisponivel");
      return;
    }
    if (jaInscrito && Notification.permission === "granted") {
      setStatus("ativado");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("negado");
      return;
    }
    setStatus("pode_ativar");
  }, [jaInscrito]);

  async function ativar() {
    setMensagem(null);
    const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!chavePublica) {
      setMensagem("Chave de notificação não configurada.");
      return;
    }

    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      setStatus("negado");
      return;
    }

    setEnviando(true);
    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricaoAtual = await registro.pushManager.getSubscription();
      const inscricao =
        inscricaoAtual ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: paraUint8Array(chavePublica),
        }));

      const dados = inscricao.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const resposta = await salvarInscricaoPush(dados);
      if (resposta.erro) {
        setMensagem(resposta.erro);
        return;
      }

      setStatus("ativado");
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : "Não deu pra ativar as notificações.");
    } finally {
      setEnviando(false);
    }
  }

  async function testar() {
    setEnviando(true);
    setMensagem(null);
    const resposta = await enviarPushTeste();
    setMensagem(resposta.erro ?? "Notificação de teste enviada — confere seu celular.");
    setEnviando(false);
  }

  if (status === "verificando") return null;

  if (status === "indisponivel") {
    return (
      <p className="text-sm text-neutral-500">
        Seu navegador não tem suporte a notificações. No iPhone, precisa abrir pelo ícone
        instalado na tela de início (não pelo Safari direto).
      </p>
    );
  }

  if (status === "negado") {
    return (
      <p className="text-sm text-amber-700">
        Você bloqueou as notificações desse site antes. Pra ativar, precisa liberar
        manualmente nas configurações do navegador/celular.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status === "pode_ativar" && (
        <button
          type="button"
          onClick={ativar}
          disabled={enviando}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {enviando ? "Ativando..." : "Ativar notificações no celular"}
        </button>
      )}

      {status === "ativado" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
            ✓ Notificações ativadas
          </span>
          <button
            type="button"
            onClick={testar}
            disabled={enviando}
            className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:opacity-50"
          >
            {enviando ? "Enviando..." : "Mandar notificação de teste"}
          </button>
        </div>
      )}

      {mensagem && <p className="text-sm text-neutral-600">{mensagem}</p>}
    </div>
  );
}
