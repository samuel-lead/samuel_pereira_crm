export function PageHeader({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-6 py-6 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-blue-600 to-sky-500" />
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">{titulo}</h1>
        </div>
        {acao}
      </div>
    </header>
  );
}
