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
    .select("id, org_id, papel")
    .eq("id", user.id)
    .single();

  if (error || !usuario) throw new Error("Usuário não encontrado");
  if (usuario.papel !== "admin") throw new Error("Só admin pode mexer em iscas.");

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
  const materialUrl = String(formData.get("material_url") ?? "").trim();
  const slugDigitado = String(formData.get("slug") ?? "").trim();
  const arquivo = formData.get("material_arquivo") as File | null;
  const temArquivo = arquivo && arquivo.size > 0;

  if (!nome) return { erro: "Dá um nome pra essa isca" };
  if (!materialUrl && !temArquivo) {
    return { erro: "Cola o link do material ou anexa um arquivo" };
  }

  const slug = slugificar(slugDigitado || nome);
  if (!slug) return { erro: "Esse nome não dá pra virar um link válido — tenta outro" };
  if (SLUGS_RESERVADOS.has(slug)) {
    return { erro: `"${slug}" já é uma página do sistema — escolhe outro link` };
  }

  // Insere primeiro com o link (ou um valor provisório, se for só arquivo)
  // pra ter o id da isca — o arquivo sobe pro Storage usando esse id no
  // caminho, então precisa da isca já existir antes de enviar.
  const { data: iscaCriada, error } = await supabase
    .from("iscas")
    .insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      nome,
      slug,
      material_url: materialUrl || "pendente",
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
  const materialUrl = String(formData.get("material_url") ?? "").trim();
  const ativo = formData.get("ativo") === "on";
  const arquivo = formData.get("material_arquivo") as File | null;
  const temArquivo = arquivo && arquivo.size > 0;

  if (!nome) return { erro: "Dá um nome pra essa isca" };

  // Nem link novo nem arquivo novo: mantém o material que já estava —
  // "deixa em branco pra manter o atual", como o formulário avisa.
  const { data: iscaAtual } = await supabase
    .from("iscas")
    .select("material_url")
    .eq("id", iscaId)
    .single();

  let urlFinal = materialUrl || iscaAtual?.material_url || "";
  if (temArquivo) {
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
    .update({ nome, material_url: urlFinal, ativo, updated_at: new Date().toISOString() })
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
};

// Chamada pela página pública (sem login) — passa direto pela função do
// banco (criar_lead_via_isca), que é a única porta controlada pra um
// visitante anônimo conseguir gravar um lead.
export async function registrarLeadIsca(
  slug: string,
  _estadoAnterior: EstadoCaptura,
  formData: FormData
): Promise<EstadoCaptura> {
  const supabase = await createClient();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefoneDigitado = String(formData.get("telefone") ?? "").trim();

  if (!nome) return { erro: "Preenche seu nome", sucesso: false, materialUrl: null };
  if (!telefoneDigitado) {
    return { erro: "Preenche seu WhatsApp", sucesso: false, materialUrl: null };
  }

  const telefone = normalizarTelefone(telefoneDigitado);

  const { data, error } = await supabase.rpc("criar_lead_via_isca", {
    p_slug: slug,
    p_nome: nome,
    p_telefone_e164: telefone,
  });

  if (error) {
    return { erro: "Não deu pra concluir seu cadastro — confere os dados e tenta de novo.", sucesso: false, materialUrl: null };
  }

  const resultado = Array.isArray(data) ? data[0] : data;
  return { erro: null, sucesso: true, materialUrl: resultado?.material_url ?? null };
}
