import { AppShell } from "@/components/app-shell";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";
import { paginasOcultasDaOrg } from "@/lib/paginas-ocultas";
import { ProvedorLeadModal } from "@/components/provedor-lead-modal";
import { Sdr } from "@/lib/terminologia";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { usuario } = await usuarioAutenticado();

  let isAdmin = true;
  let isSuperAdmin = false;
  let paginasPermitidas: string[] = [];
  let nomeUsuario = "";
  let fotoUsuario: string | null = null;
  let cargo = "Membro";
  let funcao: string | null = null;
  let publicoOrg = "mentoria";
  // Páginas que a empresa não usa (ex.: Banker - Consorcio) — ficam fora do
  // menu. Lista em orgs.paginas_ocultas.
  let paginasOcultas: string[] = [];

  if (usuario) {
    paginasOcultas = await paginasOcultasDaOrg(await createClient(), usuario.org_id);

    isSuperAdmin = usuario.super_admin === true;
    isAdmin = usuario.papel === "admin" || isSuperAdmin;
    paginasPermitidas = usuario.paginas_permitidas ?? [];
    nomeUsuario = usuario.nome ?? "";
    fotoUsuario = usuario.foto_url ?? null;
    funcao = usuario.funcao ?? null;
    publicoOrg = usuario.publico_org ?? "mentoria";
    cargo = isAdmin
      ? "Admin"
      : usuario?.funcao === "sdr"
        ? Sdr(publicoOrg)
        : usuario?.funcao === "closer"
          ? "Closer"
          : "Membro";
  }

  return (
    <ProvedorLeadModal>
      <AppShell
        isAdmin={isAdmin}
        paginasPermitidas={paginasPermitidas}
        nomeUsuario={nomeUsuario}
        fotoUsuario={fotoUsuario}
        cargo={cargo}
        funcao={funcao}
        publicoOrg={publicoOrg}
        paginasOcultas={paginasOcultas}
      >
        {children}
      </AppShell>
    </ProvedorLeadModal>
  );
}
