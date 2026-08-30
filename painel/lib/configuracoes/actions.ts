"use server";

import { revalidatePath } from "next/cache";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";

export type EstadoFoto = { erro: string | null };

const TAMANHO_MAXIMO_FOTO = 2 * 1024 * 1024;

export async function atualizarFotoPerfil(
  _estadoAnterior: EstadoFoto,
  formData: FormData
): Promise<EstadoFoto> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    return { erro: "Não autenticado" };
  }

  const arquivo = formData.get("foto");

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma imagem" };
  }

  if (!arquivo.type.startsWith("image/")) {
    return { erro: "O arquivo precisa ser uma imagem" };
  }

  if (arquivo.size > TAMANHO_MAXIMO_FOTO) {
    return { erro: "Imagem muito grande (máximo 2MB)" };
  }

  const { error: erroUpload } = await supabase.storage
    .from("avatars")
    .upload(user.id, arquivo, { upsert: true, contentType: arquivo.type });

  if (erroUpload) {
    return { erro: erroUpload.message };
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(user.id);
  const fotoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: erroUpdate } = await supabase
    .from("usuarios")
    .update({ foto_url: fotoUrl })
    .eq("id", user.id);

  if (erroUpdate) {
    return { erro: erroUpdate.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/usuarios");
  return { erro: null };
}

export type EstadoMetasConfig = { erro: string | null };

export async function atualizarMetasConfig(
  _estadoAnterior: EstadoMetasConfig,
  formData: FormData
): Promise<EstadoMetasConfig> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    return { erro: "Não autenticado" };
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("org_id, papel")
    .eq("id", user.id)
    .single();

  if (erroUsuario || !usuario) {
    return { erro: "Usuário não encontrado" };
  }

  if (usuario.papel !== "admin") {
    return { erro: "Só admin pode editar metas e taxas do sistema" };
  }

  const pisoLeadsDia = Number(formData.get("piso_leads_dia"));
  const pisoReunioesDia = Number(formData.get("piso_reunioes_dia"));
  const taxaAgendamentoMin = Number(formData.get("taxa_agendamento_min")) / 100;
  const taxaComparecimentoMin = Number(formData.get("taxa_comparecimento_min")) / 100;
  const taxaVendaMin = Number(formData.get("taxa_venda_min")) / 100;

  if (
    !Number.isFinite(pisoLeadsDia) || pisoLeadsDia <= 0 ||
    !Number.isFinite(pisoReunioesDia) || pisoReunioesDia <= 0 ||
    !Number.isFinite(taxaAgendamentoMin) || taxaAgendamentoMin <= 0 || taxaAgendamentoMin > 1 ||
    !Number.isFinite(taxaComparecimentoMin) || taxaComparecimentoMin <= 0 || taxaComparecimentoMin > 1 ||
    !Number.isFinite(taxaVendaMin) || taxaVendaMin <= 0 || taxaVendaMin > 1
  ) {
    return { erro: "Valores inválidos — piso maior que zero, taxas entre 1% e 100%" };
  }

  const { error } = await supabase
    .from("metas_config")
    .update({
      piso_leads_dia: pisoLeadsDia,
      piso_reunioes_dia: pisoReunioesDia,
      taxa_agendamento_min: taxaAgendamentoMin,
      taxa_comparecimento_min: taxaComparecimentoMin,
      taxa_venda_min: taxaVendaMin,
    })
    .eq("org_id", usuario.org_id);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  revalidatePath("/metricas");
  return { erro: null };
}

export type EstadoBonusSdrConfig = { erro: string | null };

export async function atualizarBonusSdrConfig(
  _estadoAnterior: EstadoBonusSdrConfig,
  formData: FormData
): Promise<EstadoBonusSdrConfig> {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    return { erro: "Não autenticado" };
  }

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("org_id, papel")
    .eq("id", user.id)
    .single();

  if (erroUsuario || !usuario) {
    return { erro: "Usuário não encontrado" };
  }

  if (usuario.papel !== "admin") {
    return { erro: "Só admin pode editar os valores do bônus SDR" };
  }

  const campos = [
    "calls_tier1_qtd",
    "calls_tier1_valor",
    "calls_tier2_qtd",
    "calls_tier2_valor",
    "calls_tier3_qtd",
    "calls_tier3_valor",
    "valor_call_fim_semana",
    "faturamento_tier1_valor",
    "faturamento_tier1_bonus",
    "faturamento_tier2_valor",
    "faturamento_tier2_bonus",
    "faturamento_tier3_valor",
    "faturamento_tier3_bonus",
  ] as const;

  const valores: Record<string, number> = {};
  for (const campo of campos) {
    const valor = Number(formData.get(campo));
    if (!Number.isFinite(valor) || valor < 0) {
      return { erro: "Valores inválidos — todos precisam ser números maiores ou iguais a zero" };
    }
    valores[campo] = valor;
  }

  const { error } = await supabase
    .from("bonus_sdr_config")
    .update(valores)
    .eq("org_id", usuario.org_id);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/bonus-sdr");
  return { erro: null };
}

export type EstadoOrigem = { erro: string | null };

async function usuarioAdminOuErro() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("org_id, papel")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  if (usuario.papel !== "admin") {
    throw new Error("Só admin pode gerenciar as origens");
  }

  return { supabase, usuario };
}

export async function criarOrigem(
  _estadoAnterior: EstadoOrigem,
  formData: FormData
): Promise<EstadoOrigem> {
  const { supabase, usuario } = await usuarioAdminOuErro();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return { erro: "Digite o nome da origem" };
  }

  const { error } = await supabase.from("origens").insert({ org_id: usuario.org_id, nome });

  if (error) {
    if (error.code === "23505") {
      return { erro: "Essa origem já existe" };
    }
    return { erro: error.message };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

// renomearOrigem/excluirOrigem/renomearProduto/excluirProduto RETORNAM o
// erro (nunca lançam exceção) de propósito: Server Action do Next.js que
// lança erro tem a mensagem apagada em produção (vira um texto genérico
// tipo "Minified React error #441"), escondendo justamente o aviso útil
// ("essa origem está sendo usada por N leads..."). Retornando o erro como
// valor normal, ele sempre chega certinho na tela.
export async function renomearOrigem(
  origemId: string,
  novoNome: string
): Promise<EstadoOrigem> {
  try {
    const { supabase } = await usuarioAdminOuErro();

    const nome = novoNome.trim();
    if (!nome) {
      return { erro: "O nome da origem não pode ficar em branco" };
    }

    const { error } = await supabase.rpc("renomear_origem", {
      origem_id: origemId,
      novo_nome: nome,
    });

    if (error) {
      return { erro: error.message };
    }

    revalidatePath("/configuracoes");
    revalidatePath("/leads");
    revalidatePath("/leads/novo");
    return { erro: null };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não deu pra renomear" };
  }
}

export type ResultadoExclusaoOrigem = {
  erro: string | null;
  bloqueadoPorUso: boolean;
  quantidadeLeads: number;
};

// Não trava mais a exclusão sozinha — se tem lead usando, devolve a
// contagem pra tela perguntar "excluir mesmo assim?" e, se confirmado,
// chama de novo com forcar=true. O texto da origem nesses leads não é
// tocado (não tem FK com `origens`), só some da lista de cadastradas.
export async function excluirOrigem(
  origemId: string,
  forcar = false
): Promise<ResultadoExclusaoOrigem> {
  try {
    const { supabase } = await usuarioAdminOuErro();

    const { data, error } = await supabase.rpc("excluir_origem", {
      origem_id: origemId,
      forcar,
    });

    if (error) {
      return { erro: error.message, bloqueadoPorUso: false, quantidadeLeads: 0 };
    }

    const resultado = data as { excluido: boolean; quantidade_leads: number };

    if (!resultado.excluido) {
      return {
        erro: null,
        bloqueadoPorUso: true,
        quantidadeLeads: resultado.quantidade_leads,
      };
    }

    revalidatePath("/configuracoes");
    revalidatePath("/leads");
    revalidatePath("/leads/novo");
    return { erro: null, bloqueadoPorUso: false, quantidadeLeads: 0 };
  } catch (e) {
    return {
      erro: e instanceof Error ? e.message : "Não deu pra excluir",
      bloqueadoPorUso: false,
      quantidadeLeads: 0,
    };
  }
}

export type EstadoProduto = { erro: string | null };

export async function criarProduto(
  _estadoAnterior: EstadoProduto,
  formData: FormData
): Promise<EstadoProduto> {
  const { supabase, usuario } = await usuarioAdminOuErro();

  const nome = String(formData.get("nome") ?? "").trim();
  if (!nome) {
    return { erro: "Digite o nome do produto" };
  }

  const { error } = await supabase.from("produtos").insert({ org_id: usuario.org_id, nome });

  if (error) {
    if (error.code === "23505") {
      return { erro: "Esse produto já existe" };
    }
    return { erro: error.message };
  }

  revalidatePath("/configuracoes");
  return { erro: null };
}

export async function renomearProduto(
  produtoId: string,
  novoNome: string
): Promise<EstadoProduto> {
  try {
    const { supabase } = await usuarioAdminOuErro();

    const nome = novoNome.trim();
    if (!nome) {
      return { erro: "O nome do produto não pode ficar em branco" };
    }

    const { error } = await supabase.rpc("renomear_produto", {
      produto_id: produtoId,
      novo_nome: nome,
    });

    if (error) {
      return { erro: error.message };
    }

    revalidatePath("/configuracoes");
    revalidatePath("/leads");
    return { erro: null };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não deu pra renomear" };
  }
}

export async function excluirProduto(produtoId: string): Promise<EstadoProduto> {
  try {
    const { supabase } = await usuarioAdminOuErro();

    const { error } = await supabase.rpc("excluir_produto", { produto_id: produtoId });

    if (error) {
      return { erro: error.message };
    }

    revalidatePath("/configuracoes");
    revalidatePath("/leads");
    return { erro: null };
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não deu pra excluir" };
  }
}
