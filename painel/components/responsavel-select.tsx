"use client";

import { MenuSelect } from "@/components/menu-select";

export function ResponsavelSelect({
  usuarios,
  valorInicial,
  name = "responsavel_id",
  placeholder = "Sem responsável definido",
  funcaoFiltro,
  // "Transferir, trocar, tirar" — pra um lead que já tem responsável,
  // sem essa opção explícita na lista não tinha como voltar pra "sem
  // responsável" (o placeholder só aparece quando nunca teve ninguém
  // escolhido). Samuel pediu que isso ficasse fácil pro admin.
  permiteVazio = false,
  abrirAoMontar = false,
  // Admin não tem função de SDR/Closer (funcao fica null), então sumia da
  // lista de "quem pode ser responsável pelo lead" — Samuel pediu
  // explicitamente pra poder se colocar como responsável também, não só
  // escolher entre os SDRs. Só usado onde faz sentido (responsável pelo
  // lead) — os seletores de "quem vai fazer a reunião" continuam só com
  // SDR/Closer, sem mudar.
  incluirAdmins = false,
}: {
  usuarios: { id: string; nome: string; funcao?: string | null; papel?: string | null }[];
  valorInicial?: string | null;
  name?: string;
  placeholder?: string;
  funcaoFiltro?: "sdr" | "closer";
  permiteVazio?: boolean;
  abrirAoMontar?: boolean;
  incluirAdmins?: boolean;
}) {
  // Filtra pela função (SDR/Closer), mas sempre mantém quem já tava
  // escolhido na lista — pra não sumir a seleção de quem não tem função
  // definida ainda — e, quando pedido, mantém também quem é admin.
  const opcoes = funcaoFiltro
    ? usuarios.filter(
        (u) => u.funcao === funcaoFiltro || u.id === valorInicial || (incluirAdmins && u.papel === "admin")
      )
    : usuarios;

  return (
    <MenuSelect
      id={name}
      name={name}
      defaultValue={valorInicial ?? ""}
      placeholder={placeholder}
      abrirAoMontar={abrirAoMontar}
      options={[
        ...(permiteVazio ? [{ value: "", label: "— Sem responsável —" }] : []),
        ...opcoes.map((usuario) => ({ value: usuario.id, label: usuario.nome })),
      ]}
    />
  );
}
