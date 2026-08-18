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

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("papel, paginas_permitidas, nome, foto_url")
      .eq("id", user.id)
      .single();

    isAdmin = usuario?.papel === "admin";
    paginasPermitidas = usuario?.paginas_permitidas ?? [];
    nomeUsuario = usuario?.nome ?? "";
    fotoUsuario = usuario?.foto_url ?? null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
      <Sidebar
        isAdmin={isAdmin}
        paginasPermitidas={paginasPermitidas}
        nomeUsuario={nomeUsuario}
        fotoUsuario={fotoUsuario}
      />
      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
