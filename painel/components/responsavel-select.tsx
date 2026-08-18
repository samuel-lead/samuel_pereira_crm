const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";

export function ResponsavelSelect({
  usuarios,
  valorInicial,
  name = "responsavel_id",
  placeholder = "Sem responsável definido",
  funcaoFiltro,
}: {
  usuarios: { id: string; nome: string; funcao?: string | null }[];
  valorInicial?: string | null;
  name?: string;
  placeholder?: string;
  funcaoFiltro?: "sdr" | "closer";
}) {
  // Filtra pela função (SDR/Closer), mas sempre mantém quem já tava
  // escolhido na lista — pra não sumir a seleção de quem não tem função
  // definida ainda.
  const opcoes = funcaoFiltro
    ? usuarios.filter((u) => u.funcao === funcaoFiltro || u.id === valorInicial)
    : usuarios;

  return (
    <select
      id={name}
      name={name}
      defaultValue={valorInicial ?? ""}
      className={campoClasse}
    >
      <option value="">{placeholder}</option>
      {opcoes.map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.nome}
        </option>
      ))}
    </select>
  );
}
