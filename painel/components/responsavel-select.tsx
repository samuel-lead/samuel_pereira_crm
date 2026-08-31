"use client";

import { MenuSelect } from "@/components/menu-select";

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
    <MenuSelect
      id={name}
      name={name}
      defaultValue={valorInicial ?? ""}
      placeholder={placeholder}
      options={opcoes.map((usuario) => ({ value: usuario.id, label: usuario.nome }))}
    />
  );
}
