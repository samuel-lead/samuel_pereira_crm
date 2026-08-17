export function PageHeader({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">{titulo}</h1>
        {acao}
      </div>
    </header>
  );
}
