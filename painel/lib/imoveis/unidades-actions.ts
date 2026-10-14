"use server";

import { revalidatePath } from "next/cache";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";

export type UnidadeLinha = {
  numero: string;
  andar: number | null;
  area_m2: number | null;
  quartos: number | null;
  vagas: string | null;
  tipologia: string | null;
  posicao: string | null;
  status: "disponivel" | "reservada" | "vendida" | null;
  valor: number | null;
  parcela_entrada: number | null;
  parcela_mensal: number | null;
  parcela_semestral: number | null;
  parcela_chaves: number | null;
};

export type ResultadoUnidades = {
  erro: string | null;
  criadas: number;
  atualizadas: number;
  ignoradas: number;
};

async function contextoUsuario() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);
  if (!user) throw new Error("Não autenticado");

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, org_id, papel")
    .eq("id", user.id)
    .single();
  if (error || !usuario) throw new Error("Usuário não encontrado");

  return { supabase, usuario };
}

function textoOuNull(valor: unknown) {
  const texto = String(valor ?? "").trim();
  return texto ? texto : null;
}

function numeroOuNull(valor: unknown) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

// Importa as unidades de um empreendimento a partir das linhas da planilha
// (já convertidas no navegador). Unidade com o mesmo número é ATUALIZADA
// (preço, andar, metragem...), sem mexer na situação dela (disponível,
// reservada, vendida); número novo cria unidade nova. Nada é apagado.
export async function importarUnidades(
  imovelId: string,
  linhas: UnidadeLinha[]
): Promise<ResultadoUnidades> {
  const { supabase, usuario } = await contextoUsuario();

  if (!Array.isArray(linhas) || linhas.length === 0) {
    return { erro: "Nenhuma unidade pra importar.", criadas: 0, atualizadas: 0, ignoradas: 0 };
  }
  if (linhas.length > 2000) {
    return { erro: "Máximo de 2.000 unidades por importação.", criadas: 0, atualizadas: 0, ignoradas: 0 };
  }

  const { data: imovel } = await supabase
    .from("imoveis")
    .select("id")
    .eq("id", imovelId)
    .is("arquivado_em", null)
    .maybeSingle();
  if (!imovel) {
    return { erro: "Empreendimento não encontrado.", criadas: 0, atualizadas: 0, ignoradas: 0 };
  }

  const { data: existentes } = await supabase
    .from("unidades_imovel")
    .select("id, numero, status")
    .eq("imovel_id", imovelId)
    .is("arquivado_em", null);
  const existentePorNumero = new Map((existentes ?? []).map((u) => [u.numero, u]));

  const vistos = new Set<string>();
  const novas: Record<string, unknown>[] = [];
  let atualizadas = 0;
  let ignoradas = 0;

  for (const linha of linhas) {
    const numero = String(linha.numero ?? "").trim();
    if (!numero || vistos.has(numero)) {
      ignoradas++;
      continue;
    }
    vistos.add(numero);

    const campos = {
      andar: numeroOuNull(linha.andar),
      area_m2: numeroOuNull(linha.area_m2),
      quartos: numeroOuNull(linha.quartos),
      vagas: textoOuNull(linha.vagas),
      tipologia: textoOuNull(linha.tipologia),
      posicao: textoOuNull(linha.posicao),
      valor: numeroOuNull(linha.valor),
      parcela_entrada: numeroOuNull(linha.parcela_entrada),
      parcela_mensal: numeroOuNull(linha.parcela_mensal),
      parcela_semestral: numeroOuNull(linha.parcela_semestral),
      parcela_chaves: numeroOuNull(linha.parcela_chaves),
    };
    const statusPlanilha =
      linha.status && ["disponivel", "reservada", "vendida"].includes(linha.status) ? linha.status : null;

    const existente = existentePorNumero.get(numero);
    if (existente) {
      // A situação da planilha atualiza a da unidade, mas uma unidade que o
      // CRM já marcou como vendida nunca volta pra disponível por causa de
      // uma tabela desatualizada.
      const mudarStatus = statusPlanilha && existente.status !== "vendida";
      const { error } = await supabase
        .from("unidades_imovel")
        .update(mudarStatus ? { ...campos, status: statusPlanilha } : campos)
        .eq("id", existente.id);
      if (error) {
        ignoradas++;
      } else {
        atualizadas++;
      }
    } else {
      novas.push({
        org_id: usuario.org_id,
        usuario_id: usuario.id,
        imovel_id: imovelId,
        numero,
        ...campos,
        status: statusPlanilha ?? "disponivel",
      });
    }
  }

  let criadas = 0;
  if (novas.length > 0) {
    const { error } = await supabase.from("unidades_imovel").insert(novas);
    if (error) {
      return { erro: error.message, criadas: 0, atualizadas, ignoradas };
    }
    criadas = novas.length;
  }

  revalidatePath(`/imoveis/${imovelId}/unidades`);
  return { erro: null, criadas, atualizadas, ignoradas };
}

// Remove (arquiva) uma unidade — some das listas, mas o registro fica no
// banco. Unidade já vendida não pode ser removida.
export async function removerUnidade(imovelId: string, unidadeId: string) {
  const { supabase } = await contextoUsuario();

  const { data: unidade } = await supabase
    .from("unidades_imovel")
    .select("status")
    .eq("id", unidadeId)
    .eq("imovel_id", imovelId)
    .is("arquivado_em", null)
    .maybeSingle();
  if (!unidade) throw new Error("Unidade não encontrada.");
  if (unidade.status === "vendida") throw new Error("Essa unidade já foi vendida, não dá pra remover.");

  const { data, error } = await supabase
    .from("unidades_imovel")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", unidadeId)
    .eq("imovel_id", imovelId)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Não consegui remover essa unidade.");

  revalidatePath(`/imoveis/${imovelId}/unidades`);
}

// Troca a situação de uma unidade na mão (disponível / reservada / vendida).
export async function mudarStatusUnidade(imovelId: string, unidadeId: string, status: string) {
  const { supabase } = await contextoUsuario();

  if (!["disponivel", "reservada", "vendida"].includes(status)) {
    throw new Error("Situação inválida.");
  }

  const { data, error } = await supabase
    .from("unidades_imovel")
    .update({ status })
    .eq("id", unidadeId)
    .eq("imovel_id", imovelId)
    .is("arquivado_em", null)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("Não consegui mudar essa unidade.");

  revalidatePath(`/imoveis/${imovelId}/unidades`);
}

export type UnidadeParaVenda = {
  id: string;
  numero: string;
  andar: number | null;
  area_m2: number | null;
  tipologia: string | null;
  posicao: string | null;
  status: string;
  valor: number | null;
};

// Unidades que ainda podem ser vendidas (disponíveis e reservadas) de um
// empreendimento — alimenta a lista "Unidade" na hora de registrar a venda.
export async function buscarUnidadesParaVenda(imovelId: string): Promise<UnidadeParaVenda[]> {
  const { supabase } = await contextoUsuario();

  const { data } = await supabase
    .from("unidades_imovel")
    .select("id, numero, andar, area_m2, tipologia, posicao, status, valor")
    .eq("imovel_id", imovelId)
    .is("arquivado_em", null)
    .in("status", ["disponivel", "reservada"])
    .order("andar", { ascending: true, nullsFirst: false })
    .order("numero", { ascending: true });

  return (data ?? []) as UnidadeParaVenda[];
}
