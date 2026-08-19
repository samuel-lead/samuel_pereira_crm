"use client";

import { useTransition } from "react";
import { alternarStatusOrg } from "@/lib/plataforma/actions";

export function AlternarStatusOrgButton({
  orgId,
  status,
  nome,
}: {
  orgId: string;
  status: string;
  nome: string;
}) {
  const [emTransicao, iniciarTransicao] = useTransition();
  const vaiSuspender = status === "ativo";

  function aoClicar() {
    const mensagem = vaiSuspender
      ? `Suspender o acesso de "${nome}"? Ninguém dessa empresa vai conseguir entrar no CRM até você reativar.`
      : `Reativar o acesso de "${nome}"?`;

    if (!confirm(mensagem)) return;

    iniciarTransicao(() => {
      alternarStatusOrg(orgId, status).catch((erro: unknown) => {
        alert(erro instanceof Error ? erro.message : "Não deu pra mudar o status");
      });
    });
  }

  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={emTransicao}
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
        vaiSuspender
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-green-200 text-green-700 hover:bg-green-50"
      }`}
    >
      {emTransicao ? "..." : vaiSuspender ? "Suspender" : "Reativar"}
    </button>
  );
}
