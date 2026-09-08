import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { BotaoVoltar } from "@/components/botao-voltar";
import { AlternarStatusOrgButton } from "@/components/alternar-status-org-button";
import { RedefinirSenhaOrgButton } from "@/components/redefinir-senha-org-button";
import { AlterarEmailOrgButton } from "@/components/alterar-email-org-button";
import { CopiarLinkLoginButton } from "@/components/copiar-link-login-button";

type Org = {
  id: string;
  nome: string;
  status: string;
  publico: string;
  criado_em: string;
};

type UsuarioOrg = {
  id: string;
  nome: string;
  email: string;
  papel: string;
  funcao: string | null;
  criado_em: string;
};

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export default async function DetalheEmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: orgData }, { data: usuariosData }] = await Promise.all([
    supabase.rpc("detalhe_org_super_admin", { p_org_id: id }),
    supabase.rpc("listar_usuarios_org_super_admin", { p_org_id: id }),
  ]);

  const org = ((orgData as Org[] | null) ?? [])[0];
  if (!org) notFound();

  const usuarios = (usuariosData ?? []) as UsuarioOrg[];
  const admin = usuarios.find((u) => u.papel === "admin");

  return (
    <>
      <PageHeader
        titulo={org.nome}
        acao={
          <BotaoVoltar
            fallbackHref="/empresas"
            className="text-sm text-neutral-500 hover:text-neutral-700"
          />
        }
      />

      <main className="mx-auto max-w-2xl space-y-4 px-6 py-6">
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                org.status === "ativo"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {org.status === "ativo" ? "Ativo" : "Suspenso"}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                org.publico === "imobiliario"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {org.publico === "imobiliario" ? "Imobiliário" : "Serviço/Mentoria/Consultoria"}
            </span>
            <span className="text-xs text-neutral-400">
              Cliente desde {formatarData(org.criado_em)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <CopiarLinkLoginButton />
            <AlternarStatusOrgButton orgId={org.id} status={org.status} nome={org.nome} />
            {admin && (
              <>
                <RedefinirSenhaOrgButton orgId={org.id} nome={admin.nome} />
                <AlterarEmailOrgButton orgId={org.id} emailAtual={admin.email} />
              </>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-800">
            Pessoas dessa empresa ({usuarios.length})
          </h2>

          {usuarios.length === 0 ? (
            <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-400">
              Nenhum usuário cadastrado ainda nessa empresa
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {usuarios.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">{u.nome}</p>
                    <p className="truncate text-xs text-neutral-500">{u.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                      {u.papel === "admin" ? "Admin" : u.funcao === "sdr" ? "SDR" : u.funcao === "closer" ? "Closer" : "Membro"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
