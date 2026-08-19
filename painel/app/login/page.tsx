"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha errados.");
      return;
    }

    router.push("/leads");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-900 p-6">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl" />

      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 text-lg font-bold text-white shadow-lg shadow-blue-900/40">
          MV
        </span>
        <span className="text-2xl font-bold text-white">Meu Vendedor</span>
        <span className="text-sm text-slate-400">Entre para gerenciar seus leads</span>
      </div>

      <form
        onSubmit={entrar}
        className="relative z-10 w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-[#ffffff] p-8 shadow-2xl"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium text-[#404040]" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 py-2.5 text-sm text-[#171717] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[#404040]" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-lg border border-[#d4d4d4] bg-[#ffffff] px-3 py-2.5 text-sm text-[#171717] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:brightness-110 disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
