"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, usuarioAutenticado } from "@/lib/supabase/server";

export type EstadoExclusao = { erro: string | null; precisaTransferir?: boolean };
export type EstadoFormulario = { erro: string | null };

export async function excluirUsuario(
  usuarioId: string,
  _estadoAnterior: EstadoExclusao,
  formData: FormData
): Promise<EstadoExclusao> {
  const supabase = await createClient();

  const transferirPara = String(formData.get("transferir_para") ?? "").trim() || null;

  const { error } = await supabase.rpc("excluir_usuario", {
    usuario_id_alvo: usuarioId,
    transferir_para: transferirPara,
  });

  if (error) {
    return {
      erro: error.message,
      precisaTransferir: error.message.includes("vinculadas"),
    };
  }

  revalidatePath("/usuarios");
  return { erro: null };
}

export async function criarUsuario(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const wppComercial = String(formData.get("wpp_comercial") ?? "").trim() || null;
  const papel = String(formData.get("papel") ?? "membro");
  const funcao = String(formData.get("funcao") ?? "").trim() || null;
  const paginasPermitidas = formData.getAll("paginas_permitidas").map(String);

  if (!nome || !email || senha.length < 6 || !wppComercial) {
    return {
      erro: "Nome, e-mail, WhatsApp e senha (mínimo 6 caracteres) são obrigatórios",
    };
  }

  const { error } = await supabase.functions.invoke("criar-usuario", {
    body: {
      nome,
      email,
      senha,
      papel,
      funcao,
      paginas_permitidas: paginasPermitidas,
      wpp_comercial_e164: wppComercial,
    },
  });

  if (error) {
    let mensagem = error.message ?? "Não deu pra criar o usuário";
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

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

export async function atualizarPermissoes(
  usuarioId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const supabase = await createClient();

  const papel = String(formData.get("papel") ?? "membro");
  const funcao = String(formData.get("funcao") ?? "").trim() || null;
  const paginasPermitidas = formData.getAll("paginas_permitidas").map(String);

  const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
    usuario_id_alvo: usuarioId,
    novo_papel: papel,
    novas_paginas: paginasPermitidas,
    nova_funcao: funcao,
  });

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

// Admin escolhendo a própria função (SDR/Closer) pra aparecer certo nos
// seletores filtrados por função (ex.: Closer da reunião) — continua admin,
// só isso muda. Não usa atualizarPermissoes porque aquele formulário fica
// escondido pra você mesmo (pra não se autoexcluir do admin sem querer);
// aqui mantém o papel e as páginas exatamente como estão, só troca a função.
export async function atualizarPropriaFuncao(formData: FormData) {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.papel !== "admin") {
    throw new Error("Só administradores podem fazer isso");
  }

  const novaFuncao = String(formData.get("funcao") ?? "").trim() || null;
  const supabase = await createClient();

  const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
    usuario_id_alvo: usuario.id,
    novo_papel: usuario.papel,
    novas_paginas: usuario.paginas_permitidas,
    nova_funcao: novaFuncao,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

// Admin trocando a função de QUALQUER usuário da equipe, direto na lista —
// mantém o papel e as páginas do alvo como estão, só troca a função. A
// checagem de "é admin?" já é feita dentro do RPC também, mas falha aqui
// primeiro com uma mensagem melhor.
export async function atualizarFuncaoDoUsuario(formData: FormData) {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.papel !== "admin") {
    throw new Error("Só administradores podem fazer isso");
  }

  const usuarioIdAlvo = String(formData.get("usuario_id") ?? "");
  const papelAtual = String(formData.get("papel_atual") ?? "membro");
  const paginasAtuais = formData.getAll("paginas_atuais").map(String);
  const novaFuncao = String(formData.get("funcao") ?? "").trim() || null;

  if (!usuarioIdAlvo) {
    throw new Error("Usuário inválido");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
    usuario_id_alvo: usuarioIdAlvo,
    novo_papel: papelAtual,
    novas_paginas: paginasAtuais,
    nova_funcao: novaFuncao,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

// Promove um membro a admin com um clique. Só nessa direção (membro →
// admin) — a volta (admin → membro) continua exigindo passar pela tela de
// Permissões, porque ali dá pra escolher as páginas que ele mantém; virar
// membro sem escolher página nenhuma deixaria a pessoa sem acesso a nada.
export async function tornarAdmin(usuarioId: string) {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.papel !== "admin") {
    throw new Error("Só administradores podem fazer isso");
  }

  const supabase = await createClient();
  const { data: alvo } = await supabase
    .from("usuarios")
    .select("funcao")
    .eq("id", usuarioId)
    .single();

  const { error } = await supabase.rpc("atualizar_permissoes_usuario", {
    usuario_id_alvo: usuarioId,
    novo_papel: "admin",
    novas_paginas: [],
    nova_funcao: alvo?.funcao ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/usuarios");
}

// Admin edita nome e WhatsApp de QUALQUER usuário da equipe direto na
// lista — antes só dava pra cada um trocar o próprio WhatsApp em "Meu
// perfil" (atualizarMeuTelefone, abaixo). Samuel pediu porque não tinha
// como editar ninguém além de si mesmo, e vários usuários ficaram sem
// WhatsApp cadastrado sem ninguém perceber.
export async function atualizarUsuarioAdmin(
  usuarioId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { usuario } = await usuarioAutenticado();
  if (!usuario || usuario.papel !== "admin") {
    return { erro: "Só administradores podem fazer isso" };
  }

  const nome = String(formData.get("nome") ?? "").trim();
  const wppComercial = String(formData.get("wpp_comercial") ?? "").trim() || null;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ nome, wpp_comercial_e164: wppComercial })
    .eq("id", usuarioId)
    .eq("org_id", usuario.org_id);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

// Cada usuário troca o próprio WhatsApp — não precisa ser admin, só logado.
// Igual atualizarPropriaFuncao: o id vem de usuarioAutenticado(), nunca do
// formulário, então a pessoa só consegue mexer no próprio número.
export async function atualizarMeuTelefone(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { usuario } = await usuarioAutenticado();
  if (!usuario) {
    return { erro: "Não autenticado" };
  }

  const telefone = String(formData.get("wpp_comercial") ?? "").trim();
  if (!telefone) {
    return { erro: "WhatsApp é obrigatório" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({ wpp_comercial_e164: telefone })
    .eq("id", usuario.id);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/perfil");
  return { erro: null };
}

// Só existe no público imobiliário (ver app/(app)/perfil/page.tsx) — o
// corretor configura a própria % de comissão aqui, e o CRM usa esse
// número pra calcular a "receita" dele sozinho quando marca uma venda
// (valor da venda × essa %), em vez de pedir pra digitar a receita à
// mão (não faz sentido pro corretor, que só sabe o preço do imóvel).
export async function atualizarMinhaComissao(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { usuario } = await usuarioAutenticado();
  if (!usuario) {
    return { erro: "Não autenticado" };
  }

  // Dois jeitos de ganhar num imóvel: porcentagem do preço, ou um valor
  // fixo sempre igual, não importa o preço (alguns corretores trabalham
  // assim — Samuel pediu explicitamente essa segunda opção).
  const tipo = String(formData.get("comissao_tipo") ?? "percentual").trim();
  if (tipo !== "percentual" && tipo !== "fixo") {
    return { erro: "Tipo de comissão inválido" };
  }

  let percentual: number | null = null;
  let valorFixo: number | null = null;

  if (tipo === "percentual") {
    const percentualRaw = String(formData.get("comissao_percentual") ?? "").trim();
    percentual = percentualRaw ? Number(percentualRaw.replace(",", ".")) : null;
    if (percentualRaw && (percentual === null || Number.isNaN(percentual) || percentual < 0 || percentual > 100)) {
      return { erro: "Informe uma porcentagem entre 0 e 100" };
    }
  } else {
    const valorFixoRaw = String(formData.get("comissao_valor_fixo") ?? "").trim();
    valorFixo = valorFixoRaw ? Number(valorFixoRaw.replace(",", ".")) : null;
    if (valorFixoRaw && (valorFixo === null || Number.isNaN(valorFixo) || valorFixo < 0)) {
      return { erro: "Informe um valor fixo válido" };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("usuarios")
    .update({
      comissao_tipo: tipo,
      comissao_percentual: percentual,
      comissao_valor_fixo: valorFixo,
    })
    .eq("id", usuario.id);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/perfil");
  return { erro: null };
}
