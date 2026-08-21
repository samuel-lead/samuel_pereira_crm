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
    <div className="relative">
      <IconeBusca className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
      <input
        type="search"
        value={valor}
        onChange={(e) => aoDigitar(e.target.value)}
        placeholder="Buscar lead..."
        className="busca-lead-input w-52 rounded-lg border-2 border-blue-500 py-2.5 pl-9 pr-3 text-sm font-medium shadow-md outline-none transition focus:w-64 focus:ring-2 focus:ring-blue-400/40"
      />
    </div>
  );
}
