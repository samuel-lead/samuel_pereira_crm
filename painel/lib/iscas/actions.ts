"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";
import { normalizarTelefone } from "@/lib/telefone";
import { slugificar } from "@/lib/texto";

export type EstadoFormulario = { erro: string | null };

// Slugs que já são página de verdade no sistema — uma isca não pode
// "roubar" nenhum desses, senão o link da isca nunca abriria (o Next.js
// sempre prioriza a rota fixa antes da rota curinga /[slug]).
const SLUGS_RESERVADOS = new Set([
  "login",
  "sem-acesso",
  "conta-suspensa",
  "atividades",
  "bonus-sdr",
  "cartas-contempladas",
  "configuracoes",
  "dashboard",
  "empresas",
  "imoveis",
  "integracoes",
  "leads",
  "perfil",
  "reunioes",
  "usuarios",
  "iscas",
  "api",
]);

async function contextoAdmin() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);
  if (!user) throw new Error("Não autenticado");

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, org_id, papel, super_admin")
    .eq("id", user.id)
    .single();

  if (error || !usuario) throw new Error("Usuário não encontrado");
  if (usuario.papel !== "admin" && !usuario.super_admin) {
    throw new Error("Só admin pode mexer em iscas.");
  }

  return { supabase, usuario };
}

const TAMANHO_MAXIMO_ARQUIVO = 20 * 1024 * 1024; // 20 MB

// Quando a pessoa anexa um arquivo (PDF, normalmente) em vez de colar um
// link pronto, sobe pro Storage e devolve o link público de lá — o
// bucket "materiais-iscas" é público pra leitura (senão quem se cadastra
// na isca não conseguiria abrir o material sem estar logado).
async function subirMaterialSeTiverArquivo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string,
  iscaId: string,
  arquivo: File | null
): Promise<{ url: string | null; erro: string | null }> {
  if (!arquivo || arquivo.size === 0) return { url: null, erro: null };

  if (arquivo.size > TAMANHO_MAXIMO_ARQUIVO) {
    return { url: null, erro: "O arquivo passou de 20MB — usa um link em vez de anexar." };
  }

  const extensao = arquivo.name.includes(".") ? arquivo.name.split(".").pop() : "pdf";
  const caminho = `${orgId}/${iscaId}.${extensao}`;

  const { error } = await supabase.storage
    .from("materiais-iscas")
    .upload(caminho, arquivo, { upsert: true, contentType: arquivo.type || "application/pdf" });

  if (error) return { url: null, erro: error.message };

  const { data } = supabase.storage.from("materiais-iscas").getPublicUrl(caminho);
  return { url: data.publicUrl, erro: null };
}

export async function criarIsca(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "material");
  const materialUrl = String(formData.get("material_url") ?? "").trim();
  const slugDigitado = String(formData.get("slug") ?? "").trim();
  const arquivo = formData.get("material_arquivo") as File | null;
  const temArquivo = arquivo && arquivo.size > 0;
  const whatsappContatoDigitado = String(formData.get("whatsapp_contato") ?? "").trim();
  const whatsappContato = whatsappContatoDigitado ? normalizarTelefone(whatsappContatoDigitado) : null;
  const whatsappMensagem = String(formData.get("whatsapp_mensagem") ?? "").trim() || null;

  if (!nome) return { erro: "Dá um nome pra essa isca" };
  if (tipo === "material" && !materialUrl && !temArquivo) {
    return { erro: "Cola o link do material ou anexa um arquivo" };
  }

  const slug = slugificar(slugDigitado || nome);
  if (!slug) return { erro: "Esse nome não dá pra virar um link válido — tenta outro" };
  if (SLUGS_RESERVADOS.has(slug)) {
    return { erro: `"${slug}" já é uma página do sistema — escolhe outro link` };
  }

  // Insere primeiro com o link (ou um valor provisório, se for só arquivo)
  // pra ter o id da isca — o arquivo sobe pro Storage usando esse id no
  // caminho, então precisa da isca já existir antes de enviar. Isca "só
  // cadastro" não tem material nenhum — fica null mesmo.
  const { data: iscaCriada, error } = await supabase
    .from("iscas")
    .insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      nome,
      slug,
      material_url: tipo === "material" ? materialUrl || "pendente" : null,
      whatsapp_contato_e164: whatsappContato,
      whatsapp_mensagem: whatsappMensagem,
    })
    .select("id")
    .single();

  if (error || !iscaCriada) {
    if (error?.code === "23505") {
      return { erro: `Esse link (${slug}) já está sendo usado por outra isca` };
    }
    return { erro: error?.message ?? "Não deu pra criar a isca" };
  }

  if (temArquivo) {
    const { url, erro: erroUpload } = await subirMaterialSeTiverArquivo(
      supabase,
      usuario.org_id,
      iscaCriada.id,
      arquivo
    );
    if (erroUpload) {
      await supabase.from("iscas").delete().eq("id", iscaCriada.id);
      return { erro: erroUpload };
    }
    await supabase.from("iscas").update({ material_url: url }).eq("id", iscaCriada.id);
  }

  revalidatePath("/iscas");
  redirect("/iscas");
}

export async function atualizarIsca(
  iscaId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "material");
  const materialUrl = String(formData.get("material_url") ?? "").trim();
  const ativo = formData.get("ativo") === "on";
  const arquivo = formData.get("material_arquivo") as File | null;
  const temArquivo = arquivo && arquivo.size > 0;
  const whatsappContatoDigitado = String(formData.get("whatsapp_contato") ?? "").trim();
  const whatsappContato = whatsappContatoDigitado ? normalizarTelefone(whatsappContatoDigitado) : null;
  const whatsappMensagem = String(formData.get("whatsapp_mensagem") ?? "").trim() || null;

  if (!nome) return { erro: "Dá um nome pra essa isca" };

  // Nem link novo nem arquivo novo: mantém o material que já estava —
  // "deixa em branco pra manter o atual", como o formulário avisa. Virando
  // "só cadastro" o material some (fica null), mesmo que já tivesse um.
  const { data: iscaAtual } = await supabase
    .from("iscas")
    .select("material_url")
    .eq("id", iscaId)
    .single();

  let urlFinal: string | null = tipo === "material" ? materialUrl || iscaAtual?.material_url || "" : null;
  if (tipo === "material" && temArquivo) {
    const { url, erro: erroUpload } = await subirMaterialSeTiverArquivo(
      supabase,
      usuario.org_id,
      iscaId,
      arquivo
    );
    if (erroUpload) return { erro: erroUpload };
    if (url) urlFinal = url;
  }

  const { error } = await supabase
    .from("iscas")
    .update({
      nome,
      material_url: urlFinal,
      whatsapp_contato_e164: whatsappContato,
      whatsapp_mensagem: whatsappMensagem,
      ativo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", iscaId)
    .eq("org_id", usuario.org_id);

  if (error) return { erro: error.message };

  revalidatePath("/iscas");
  redirect("/iscas");
}

export async function arquivarIsca(iscaId: string) {
  const { supabase, usuario } = await contextoAdmin();

  const { error } = await supabase
    .from("iscas")
    .update({ arquivado_em: new Date().toISOString(), ativo: false })
    .eq("id", iscaId)
    .eq("org_id", usuario.org_id);

  if (error) throw new Error(error.message);

  revalidatePath("/iscas");
}

export type EstadoCaptura = {
  erro: string | null;
  sucesso: boolean;
  materialUrl: string | null;
  whatsappContatoE164: string | null;
  whatsappMensagem: string | null;
};

export type RespostasIsca = {
  nome: string;
  telefone: string;
  instagram: string;
  tempoMercado: string;
  maiorDesafio: string;
  prioridade: boolean | null;
  disponibilidadeFinanceira: string;
  atuacao: string;
};

// Chamada pela página pública (sem login), direto pelo componente cliente
// (não é um <form action=...> normal — o fluxo é passo a passo, então o
// próprio componente junta as respostas e chama isso no final). Passa
// direto pela função do banco (criar_lead_via_isca), que é a única porta
// controlada pra um visitante anônimo conseguir gravar um lead.
export async function registrarLeadIsca(
  slug: string,
  respostas: RespostasIsca
): Promise<EstadoCaptura> {
  const supabase = await createClient();

  const nome = respostas.nome.trim();
  const telefoneDigitado = respostas.telefone.trim();

  const semRespostaVazia = {
    materialUrl: null,
    whatsappContatoE164: null,
    whatsappMensagem: null,
  };

  if (!nome) return { erro: "Preenche seu nome", sucesso: false, ...semRespostaVazia };
  if (!telefoneDigitado) {
    return { erro: "Preenche seu WhatsApp", sucesso: false, ...semRespostaVazia };
  }

  const telefone = normalizarTelefone(telefoneDigitado);

  const { data, error } = await supabase.rpc("criar_lead_via_isca", {
    p_slug: slug,
    p_nome: nome,
    p_telefone_e164: telefone,
    p_instagram: respostas.instagram.trim() || null,
    p_tempo_mercado: respostas.tempoMercado || null,
    p_maior_desafio: respostas.maiorDesafio.trim() || null,
    p_prioridade: respostas.prioridade,
    p_atuacao: respostas.atuacao || null,
    p_disponibilidade_financeira: respostas.disponibilidadeFinanceira || null,
  });

  if (error) {
    return {
      erro: "Não deu pra concluir seu cadastro — confere os dados e tenta de novo.",
      sucesso: false,
      ...semRespostaVazia,
    };
  }

  const resultado = Array.isArray(data) ? data[0] : data;
  return {
    erro: null,
    sucesso: true,
    materialUrl: resultado?.material_url ?? null,
    whatsappContatoE164: resultado?.whatsapp_contato_e164 ?? null,
    whatsappMensagem: resultado?.whatsapp_mensagem ?? null,
  };
}
