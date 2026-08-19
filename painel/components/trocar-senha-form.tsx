"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export function TrocarSenhaForm() {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: "erro" | "sucesso"; texto: string } | null>(
    null
  );

  async function aoSubmeter(evento: React.FormEvent) {
    evento.preventDefault();
    setMensagem(null);

    if (novaSenha.length < 6) {
      setMensagem({ tipo: "erro", texto: "A senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setMensagem({ tipo: "erro", texto: "As senhas não são iguais." });
      return;
    }

    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setEnviando(false);

    if (error) {
      setMensagem({ tipo: "erro", texto: "Não deu pra trocar a senha. Tenta de novo." });
      return;
    }

    setNovaSenha("");
    setConfirmarSenha("");
    setMensagem({ tipo: "sucesso", texto: "Senha trocada." });
  }

  return (
    <form onSubmit={aoSubmeter} className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="nova_senha">
          Nova senha
        </label>
        <input
          id="nova_senha"
          type="password"
          required
          minLength={6}
          value={novaSenha}
          onChange={(evento) => setNovaSenha(evento.target.value)}
          className={campoClasse}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-neutral-700" htmlFor="confirmar_senha">
          Confirmar nova senha
        </label>
        <input
          id="confirmar_senha"
          type="password"
          required
          minLength={6}
          value={confirmarSenha}
          onChange={(evento) => setConfirmarSenha(evento.target.value)}
          className={campoClasse}
        />
      </div>

      {mensagem && (
        <p className={`text-xs ${mensagem.tipo === "erro" ? "text-red-600" : "text-green-600"}`}>
          {mensagem.texto}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
      >
        {enviando ? "Salvando..." : "Trocar senha"}
      </button>
    </form>
  );
}
