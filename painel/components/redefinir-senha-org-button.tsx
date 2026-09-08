"use client";

import { useRef, useState, useTransition } from "react";
import { redefinirSenhaOrg } from "@/lib/plataforma/actions";

// A senha de login de um cliente não fica guardada em lugar nenhum de um
// jeito recuperável (só um hash) — isso é assim em qualquer sistema
// seguro, não uma falha daqui. Em vez de "ver" a senha antiga, esse botão
// troca por uma nova, escolhida na hora (Samuel pediu uma forma de voltar
// a entrar numa empresa cliente sem precisar saber a senha original).
export function RedefinirSenhaOrgButton({ orgId, nome }: { orgId: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [pendente, iniciarTransicao] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  function aoConfirmar() {
    if (senha.length < 6) {
      setErro("Mínimo 6 caracteres");
      return;
    }
    setErro(null);
    iniciarTransicao(async () => {
      try {
        await redefinirSenhaOrg(orgId, senha);
        setSucesso(true);
        setSenha("");
        setTimeout(() => {
          setSucesso(false);
          setAberto(false);
        }, 2500);
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu pra redefinir");
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
        Redefinir senha
      </button>
    );
  }

  return (
    <div ref={containerRef} className="flex items-center gap-1.5">
      {sucesso ? (
        <span className="text-xs font-medium text-green-600">Senha redefinida ✓</span>
      ) : (
        <>
          <input
            type="text"
            autoFocus
            placeholder={`Nova senha p/ ${nome}`}
            value={senha}
            onChange={(e) => {
              setSenha(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && aoConfirmar()}
            className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
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
              setSenha("");
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
