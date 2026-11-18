import Link from "next/link";
import { IconeClientePagante, IconeTelefone } from "@/components/icons";

// Abas da área de Clientes: lista de vendas e o acompanhamento de pós-venda.
// Visual de "controle segmentado" (Samuel, 18/11/26): um trilho único com a
// aba ativa em azul degradê e com sombra — bem diferente dos filtros brancos
// logo abaixo, e legível tanto no modo claro quanto no escuro (só usa cores
// que já têm ajuste pro escuro em globals.css, ou que funcionam nos dois).
export function AbasClientes({ ativa }: { ativa: "clientes" | "pos-venda" }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold tracking-tight transition-all duration-200";
  const on =
    "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30 ring-1 ring-white/20";
  const off = "text-neutral-500 hover:bg-blue-500/10 hover:text-blue-600";
  return (
    <nav
      aria-label="Área de clientes"
      className="mb-5 inline-flex gap-1.5 rounded-2xl border border-neutral-200 bg-neutral-100 p-1.5 shadow-inner"
    >
      <Link
        href="/leads/vendas"
        aria-current={ativa === "clientes" ? "page" : undefined}
        className={`${base} ${ativa === "clientes" ? on : off}`}
      >
        <IconeClientePagante className="h-4 w-4" />
        Clientes
      </Link>
      <Link
        href="/leads/vendas/pos-venda"
        aria-current={ativa === "pos-venda" ? "page" : undefined}
        className={`${base} ${ativa === "pos-venda" ? on : off}`}
      >
        <IconeTelefone className="h-4 w-4" />
        Pós-venda
      </Link>
    </nav>
  );
}
