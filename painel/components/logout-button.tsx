"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  compacto = false,
  escuro = false,
}: {
  compacto?: boolean;
  escuro?: boolean;
}) {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const cores = escuro
    ? "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
    : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50";

  return (
    <button
      onClick={sair}
      title="Sair"
      className={
        compacto
          ? `flex w-full items-center justify-center rounded-md border py-2 transition ${cores}`
          : `w-full rounded-md border px-3 py-2 text-sm font-medium transition ${cores}`
      }
    >
      {compacto ? "⏻" : "Sair"}
    </button>
  );
}
