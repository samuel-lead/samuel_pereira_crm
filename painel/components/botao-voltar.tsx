"use client";

import { useRouter } from "next/navigation";

// "Voltar" tinha um link fixo (ex.: sempre pra /leads) — abrindo um lead a
// partir de Vendas, Base ou Configurações, "Voltar" sempre te tirava de lá
// e te jogava em Pré-vendas. Usando o histórico do navegador, volta pra
// aba/página de onde a pessoa realmente veio. `fallbackHref` só é usado se
// não tiver histórico (ex.: abriu o link direto, sem navegar antes).
export function BotaoVoltar({
  fallbackHref,
  className,
}: {
  fallbackHref: string;
  className?: string;
}) {
  const router = useRouter();

  function aoClicar() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  }

  return (
    <button type="button" onClick={aoClicar} className={className}>
      Voltar
    </button>
  );
}
