"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = { erro: string | null };

export async function criarCliente(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const nomeEmpresa = String(formData.get("nome_empresa") ?? "").trim();
  const nomeAdmin = String(formData.get("nome_admin") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const publico = String(formData.get("publico") ?? "");

  if (!nomeEmpresa || !nomeAdmin || !email || senha.length < 6) {
    return { erro: "Nome da empresa, nome do admin, e-mail e senha (mínimo 6 caracteres) são obrigatórios" };
  }

  if (publico !== "mentoria" && publico !== "imobiliario") {
    return { erro: "Escolha o público da empresa" };
  }

  const { error } = await supabase.functions.invoke("criar-cliente", {
    body: { nome_empresa: nomeEmpresa, nome_admin: nomeAdmin, email, senha, publico },
  });

  if (error) {
    let mensagem = error.message ?? "Não deu pra cadastrar o cliente";
    const contexto = (error as { context?: Response }).context;
    if (contexto instanceof Response) {
      try {
        const corpo = (await contexto.clone().json()) as { erro?: string };
        if (corpo?.erro) mensagem = corpo.erro;
      } catch {
        // resposta sem corpo JSON, mantém a mensagem padrão
      }
    }
    return { erro: mensagem };
  }

  revalidatePath("/empresas");
  redirect("/empresas");
}

export async function alternarStatusOrg(orgId: string, statusAtual: string) {
  const supabase = await createClient();
  const novoStatus = statusAtual === "ativo" ? "suspenso" : "ativo";

  const { error } = await supabase.from("orgs").update({ status: novoStatus }).eq("id", orgId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/empresas");
}

// A senha não fica salva em nenhum lugar de um jeito que dê pra "ver" de
// novo (só um hash irreversível) — em vez de recuperar a antiga, troca por
// uma nova escolhida agora. Mesmo desenho de criarCliente/criar-usuario:
// a senha nova é digitada aqui dentro do CRM, nunca sai daqui.
export async function redefinirSenhaOrg(orgId: string, novaSenha: string) {
  const supabase = await createClient();

  if (novaSenha.length < 6) {
    throw new Error("A nova senha precisa ter pelo menos 6 caracteres");
  }

  const { error } = await supabase.functions.invoke("redefinir-senha-org", {
    body: { org_id: orgId, nova_senha: novaSenha },
  });

  if (error) {
    let mensagem = error.message ?? "Não deu pra redefinir a senha";
    const contexto = (error as { context?: Response }).context;
    if (contexto instanceof Response) {
      try {
        const corpo = (await contexto.clone().json()) as { erro?: string };
        if (corpo?.erro) mensagem = corpo.erro;
      } catch {
        // resposta sem corpo JSON, mantém a mensagem padrão
      }
    }
    throw new Error(mensagem);
  }
}
