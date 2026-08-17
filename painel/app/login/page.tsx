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
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <form
        onSubmit={entrar}
        className="w-full max-w-sm space-y-4 rounded-lg border border-neutral-200 p-6"
      >
        <h1 className="text-xl font-semibold">Meu Vendedor</h1>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded border border-neutral-300 px-3 py-2"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded bg-neutral-900 px-3 py-2 text-white disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
