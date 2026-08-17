const campoClasse =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";

export function ResponsavelSelect({
  usuarios,
  valorInicial,
}: {
  usuarios: { id: string; nome: string }[];
  valorInicial?: string | null;
}) {
  return (
    <select
      id="responsavel_id"
      name="responsavel_id"
      defaultValue={valorInicial ?? ""}
      className={campoClasse}
    >
      <option value="">Sem responsável definido</option>
      {usuarios.map((usuario) => (
        <option key={usuario.id} value={usuario.id}>
          {usuario.nome}
        </option>
      ))}
    </select>
  );
}
