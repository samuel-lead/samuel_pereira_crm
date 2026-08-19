import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = true;
  let paginasPermitidas: string[] = [];
  let nomeUsuario = "";
  let fotoUsuario: string | null = null;
  let cargo = "Membro";

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("papel, funcao, paginas_permitidas, nome, foto_url")
      .eq("id", user.id)
      .single();

    isAdmin = usuario?.papel === "admin";
    paginasPermitidas = usuario?.paginas_permitidas ?? [];
    nomeUsuario = usuario?.nome ?? "";
    fotoUsuario = usuario?.foto_url ?? null;
    cargo = isAdmin
      ? "Admin"
      : usuario?.funcao === "sdr"
        ? "SDR"
        : usuario?.funcao === "closer"
          ? "Closer"
          : "Membro";
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
      <Sidebar
        isAdmin={isAdmin}
        paginasPermitidas={paginasPermitidas}
        nomeUsuario={nomeUsuario}
        fotoUsuario={fotoUsuario}
        cargo={cargo}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
