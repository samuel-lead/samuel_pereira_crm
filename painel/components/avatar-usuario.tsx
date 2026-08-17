function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function AvatarUsuario({
  nome,
  fotoUrl,
  tamanho = "h-10 w-10 text-sm",
}: {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: string;
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
      className={`flex ${tamanho} shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-sky-500 font-bold text-white`}
    >
      {iniciais(nome)}
    </span>
  );
}
