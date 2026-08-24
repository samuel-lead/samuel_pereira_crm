"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";

export type EstadoFormulario = { erro: string | null };

async function contextoUsuario() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, org_id")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  return { supabase, usuario };
}

function lerCampos(formData: FormData) {
  const numeroOuNull = (valor: FormDataEntryValue | null) => {
    const texto = String(valor ?? "").trim();
    return texto ? Number(texto) : null;
  };

  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    tipo: String(formData.get("tipo") ?? "apartamento"),
    finalidade: String(formData.get("finalidade") ?? "venda"),
    valor_venda: numeroOuNull(formData.get("valor_venda")),
    valor_aluguel: numeroOuNull(formData.get("valor_aluguel")),
    endereco: String(formData.get("endereco") ?? "").trim() || null,
    bairro: String(formData.get("bairro") ?? "").trim() || null,
    cidade: String(formData.get("cidade") ?? "").trim() || null,
    estado: String(formData.get("estado") ?? "").trim() || null,
    cep: String(formData.get("cep") ?? "").trim() || null,
    quartos: numeroOuNull(formData.get("quartos")),
    banheiros: numeroOuNull(formData.get("banheiros")),
    vagas_garagem: numeroOuNull(formData.get("vagas_garagem")),
    area_m2: numeroOuNull(formData.get("area_m2")),
    descricao: String(formData.get("descricao") ?? "").trim() || null,
    status: String(formData.get("status") ?? "disponivel"),
    proprietario_nome: String(formData.get("proprietario_nome") ?? "").trim() || null,
    proprietario_telefone: String(formData.get("proprietario_telefone") ?? "").trim() || null,
  };
}

export async function criarImovel(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();
  const campos = lerCampos(formData);

  if (!campos.titulo) {
    return { erro: "Título é obrigatório" };
  }

  const { data, error } = await supabase
    .from("imoveis")
    .insert({ org_id: usuario.org_id, usuario_id: usuario.id, ...campos })
    .select("id")
    .single();

  if (error || !data) {
    return { erro: error?.message ?? "Não deu pra cadastrar o imóvel" };
  }

  revalidatePath("/imoveis");
  redirect(`/imoveis/${data.id}`);
}

export async function atualizarImovel(
  imovelId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase } = await contextoUsuario();
  const campos = lerCampos(formData);

  if (!campos.titulo) {
    return { erro: "Título é obrigatório" };
  }

  const { error } = await supabase.from("imoveis").update(campos).eq("id", imovelId);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/imoveis");
  revalidatePath(`/imoveis/${imovelId}`);
  return { erro: null };
}

export async function arquivarImovel(
  imovelId: string,
  _estadoAnterior: EstadoFormulario,
  _formData: FormData
): Promise<EstadoFormulario> {
  const { supabase } = await contextoUsuario();

  const { error } = await supabase
    .from("imoveis")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", imovelId);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/imoveis");
  redirect("/imoveis");
}
