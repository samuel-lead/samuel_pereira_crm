function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function AvatarLead({
  nome,
  fotoUrl,
  tamanho = "h-9 w-9 text-xs",
  classeBadge = "bg-neutral-200 text-neutral-700",
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: string;
  classeBadge?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fotoUrl}
        alt={nome}
        className={`${tamanho} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${tamanho} shrink-0 items-center justify-center rounded-full font-bold ${classeBadge}`}
    >
      {iniciais(nome)}
    </span>
  );
}
