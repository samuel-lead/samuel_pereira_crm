"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconeBusca } from "@/components/icons";

const ATRASO_MS = 350;

export function BuscaLeads() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [valor, setValor] = useState(searchParams.get("busca") ?? "");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function aoDigitar(novoValor: string) {
    setValor(novoValor);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (novoValor.trim()) {
        params.set("busca", novoValor.trim());
      } else {
        params.delete("busca");
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    }, ATRASO_MS);
  }

  return (
    <div className="relative w-full sm:w-96">
      <IconeBusca className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="search"
        value={valor}
        onChange={(e) => aoDigitar(e.target.value)}
        placeholder="Buscar lead..."
        className="busca-lead-input w-full rounded-xl border border-blue-300 bg-white py-2.5 pl-10 pr-4 text-sm text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />
    </div>
  );
}
