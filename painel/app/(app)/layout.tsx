import { Sidebar } from "@/components/sidebar";
import { usuarioAutenticado } from "@/lib/supabase/server";
import { ProvedorLeadModal } from "@/components/provedor-lead-modal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await usuarioAutenticado();

  let isAdmin = true;
  let paginasPermitidas: string[] = [];
  let nomeUsuario = "";
  let fotoUsuario: string | null = null;
  let cargo = "Membro";
  let funcao: string | null = null;
  let publicoOrg = "mentoria";

  if (usuario) {
    isAdmin = usuario.papel === "admin";
    paginasPermitidas = usuario.paginas_permitidas ?? [];
    nomeUsuario = usuario.nome ?? "";
    fotoUsuario = usuario.foto_url ?? null;
    funcao = usuario.funcao ?? null;
    publicoOrg = usuario.publico_org ?? "mentoria";
    cargo = isAdmin
      ? "Admin"
      : usuario?.funcao === "sdr"
        ? "SDR"
        : usuario?.funcao === "closer"
          ? "Closer"
          : "Membro";
  }

  return (
    <ProvedorLeadModal>
      <div className="flex h-screen overflow-hidden bg-[#f4f5f7]">
        <Sidebar
          isAdmin={isAdmin}
          paginasPermitidas={paginasPermitidas}
          nomeUsuario={nomeUsuario}
          fotoUsuario={fotoUsuario}
          cargo={cargo}
          funcao={funcao}
          publicoOrg={publicoOrg}
        />
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </ProvedorLeadModal>
  );
}
