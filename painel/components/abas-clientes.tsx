import Link from "next/link";

// Abas da área de Clientes: lista de vendas e o acompanhamento de pós-venda.
export function AbasClientes({ ativa }: { ativa: "clientes" | "pos-venda" }) {
  const base = "rounded-lg px-4 py-2 text-sm font-semibold transition";
  const on = "bg-blue-600 text-white shadow-sm";
  const off = "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50";
  return (
    <div className="mb-4 flex gap-2">
      <Link href="/leads/vendas" className={`${base} ${ativa === "clientes" ? on : off}`}>
        Clientes
      </Link>
      <Link href="/leads/vendas/pos-venda" className={`${base} ${ativa === "pos-venda" ? on : off}`}>
        Pós-venda
      </Link>
    </div>
  );
}
