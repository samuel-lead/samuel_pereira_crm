import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = true;
  let paginasPermitidas: string[] = [];

  if (user) {
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("papel, paginas_permitidas")
      .eq("id", user.id)
      .single();

    isAdmin = usuario?.papel === "admin";
    paginasPermitidas = usuario?.paginas_permitidas ?? [];
  }

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <Sidebar isAdmin={isAdmin} paginasPermitidas={paginasPermitidas} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
