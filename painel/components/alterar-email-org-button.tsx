"use client";

import { useState, useTransition } from "react";
import { alterarEmailOrg } from "@/lib/plataforma/actions";

// Usado quando o cliente perde acesso ao e-mail cadastrado e precisa
// trocar pra outro — o novo já vale na hora, sem link de confirmação.
export function AlterarEmailOrgButton({
  orgId,
  emailAtual,
}: {
  orgId: string;
  emailAtual: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();

  function aoConfirmar() {
    if (!email.trim() || !email.includes("@")) {
      setErro("E-mail inválido");
      return;
    }
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await alterarEmailOrg(orgId, email);
        setSucesso(true);
        setTimeout(() => {
          setSucesso(false);
          setAberto(false);
          setEmail("");
        }, 2500);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra alterar");
      }
    });
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
      >
        Trocar e-mail
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {sucesso ? (
        <span className="text-xs font-medium text-green-600">E-mail alterado ✓</span>
      ) : (
        <>
          <input
            type="email"
            autoFocus
            placeholder={`Novo e-mail (era ${emailAtual})`}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && aoConfirmar()}
            className="w-52 rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
          />
          <button
            type="button"
            onClick={aoConfirmar}
            disabled={pendente}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pendente ? "..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              setEmail("");
              setErro(null);
            }}
            className="rounded-md border border-neutral-200 px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            ✕
          </button>
          {erro && <span className="text-xs text-red-600">{erro}</span>}
        </>
      )}
    </div>
  );
}
