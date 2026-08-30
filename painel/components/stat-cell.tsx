// Célula de estatística — rótulo pequeno em cima, número em negrito embaixo,
// linha extra opcional (contexto ou um link de filtro). Usada em Pré-vendas e
// Vendas pra montar a barra de métricas como um cartão único, em vez de vários
// badges coloridos soltos um do lado do outro.
export function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="min-w-[92px] flex-1 px-3 py-2">
      <p className="text-[10px] leading-tight text-neutral-500">{label}</p>
      <p className="mt-0.5 text-base font-bold leading-tight text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[10px] leading-tight text-neutral-400">{sub}</p>}
    </div>
  );
}
