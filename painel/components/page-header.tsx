export function PageHeader({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: React.ReactNode;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur md:sticky md:top-0 md:z-10 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1.5 shrink-0 rounded-full bg-[#2563eb]" />
          <h1 className="min-w-0 break-words text-xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            {titulo}
          </h1>
        </div>
        {acao && <div className="min-w-0">{acao}</div>}
      </div>
    </header>
  );
}
