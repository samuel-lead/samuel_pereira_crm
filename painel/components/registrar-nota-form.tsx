"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { registrarNota, type EstadoFormulario } from "@/lib/leads/actions";
import { useLeadModalAtivo } from "@/components/contexto-lead-modal";
import { registrarNotaPendente } from "@/lib/nota-pendente";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
const estadoInicial: EstadoFormulario = { erro: null };

export function RegistrarNotaForm({ leadId }: { leadId: string }) {
  const modalAtivo = useLeadModalAtivo();
  const acaoComId = registrarNota.bind(null, leadId);
  const [estado, acaoFormulario, pendente] = useActionState(acaoComId, estadoInicial);
  const [adicionado, setAdicionado] = useState(false);
  // Texto digitado que AINDA NÃO foi adicionado à linha do tempo: só entra no histórico
  // quando clica no botão (o "Salvar" do card não grava a nota). Enquanto isso, o
  // botão pisca em destaque e aparece um aviso (Samuel, 18/11/26).
  const [rascunho, setRascunho] = useState("");
  const temRascunho = rascunho.trim().length > 0 && !adicionado;
  const enviandoRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [erroPendente, setErroPendente] = useState<string | null>(null);

  // Deixa o "Salvar alterações" do card salvar esta nota junto, se ela tiver texto
  // ainda não adicionado (ver lib/nota-pendente.ts).
  useEffect(() => {
    return registrarNotaPendente(leadId, {
      tem: () => (textareaRef.current?.value ?? "").trim().length > 0,
      salvar: async () => {
        const texto = (textareaRef.current?.value ?? "").trim();
        if (!texto) return null;
        const dados = new FormData();
        dados.set("conteudo", texto);
        const r = await registrarNota(leadId, estadoInicial, dados);
        if (r.erro) {
          setErroPendente(`A nota não foi salva: ${r.erro}`);
          return r.erro;
        }
        setErroPendente(null);
        formRef.current?.reset();
        setRascunho("");
        return null;
      },
    });
  }, [leadId]);

  useEffect(() => {
    if (pendente) {
      enviandoRef.current = true;
      return;
    }
    if (enviandoRef.current) {
      enviandoRef.current = false;
      if (estado.erro === null) {
        formRef.current?.reset();
        setRascunho("");
        setAdicionado(true);
        modalAtivo?.recarregar();
        const timeout = setTimeout(() => setAdicionado(false), 2000);
        return () => clearTimeout(timeout);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendente, estado]);

  return (
    <form ref={formRef} action={acaoFormulario} className="space-y-2">
      <textarea
        ref={textareaRef}
        name="conteudo"
        required
        rows={3}
        placeholder="Ex.: liguei, ficou de ver a agenda e responder amanhã..."
        className={`${campoClasse} ${temRascunho ? "border-amber-400 ring-2 ring-amber-300/70" : ""}`}
        onChange={(e) => setRascunho(e.target.value)}
        // Ctrl/Cmd+Enter envia sem precisar pegar o mouse — quem registra
        // nota toda hora durante ligação agradece.
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
      />

      {temRascunho && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
          ⚠️ Essa nota ainda NÃO foi salva. Clique em &quot;Salvar nota&quot;.
        </p>
      )}

      {(estado.erro || erroPendente) && (
        <p className="text-xs font-semibold text-red-600">{estado.erro ?? erroPendente}</p>
      )}

      {!temRascunho && (
        <p className="text-xs text-neutral-500">
          ℹ️ Escreveu? Clique em <b>Salvar nota</b> pra guardar na linha do tempo.
        </p>
      )}

      <button
        type="submit"
        disabled={pendente}
        className={`w-full rounded-lg px-4 py-3 text-sm font-extrabold uppercase tracking-wide shadow-md transition disabled:opacity-60 ${
          adicionado
            ? "bg-green-600 text-white"
            : temRascunho
              ? "animate-pulse bg-amber-500 text-white ring-4 ring-amber-300/60 hover:bg-amber-600"
              : "bg-teal-600 text-white ring-2 ring-teal-300/50 hover:bg-teal-700"
        }`}
      >
        {pendente ? "Salvando..." : adicionado ? "Nota salva ✓" : "💾 Salvar nota"}
      </button>
    </form>
  );
}
