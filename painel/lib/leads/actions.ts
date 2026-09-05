"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, usuarioDoToken } from "@/lib/supabase/server";
import { ORDEM_OPORTUNIDADE_FUTURA, numerarNiveis, NIVEIS_REATIVACAO, type NivelResumo } from "@/lib/niveis";
import { garantirOrigem } from "@/lib/origens/actions";
import { normalizarTelefone } from "@/lib/telefone";
import { reuniao, Reuniao } from "@/lib/terminologia";

export type EstadoFormulario = { erro: string | null };

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const NIVEL_REUNIAO_MARCADA = 4;
const NIVEL_NO_SHOW = 5;
const NIVEL_REAGENDAMENTO = 6;
const NIVEL_FOLLOW_POS_REUNIAO = 7;
const NIVEL_REUNIAO_FEITA = 8;
const NIVEL_BASE = 9;

// <input type="datetime-local"> manda um horário "solto", sem fuso (ex.:
// "2026-08-25T14:30"). O servidor roda em UTC — sem isso, "new Date(...)"
// direto interpretava esse horário como UTC e a hora salva saía errada
// (3h a menos do que a pessoa digitou). Todo usuário aqui é do Brasil
// (America/Sao_Paulo, UTC-3, sem horário de verão), então fixamos o fuso.
function parseDataHoraLocal(valor: string): Date {
  const comSegundos = valor.length === 16 ? `${valor}:00` : valor;
  return new Date(`${comSegundos}-03:00`);
}

async function contextoUsuario() {
  const supabase = await createClient();
  const user = await usuarioDoToken(supabase);

  if (!user) {
    throw new Error("Não autenticado");
  }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, org_id, papel, orgs(publico)")
    .eq("id", user.id)
    .single();

  if (error || !usuario) {
    throw new Error("Usuário não encontrado");
  }

  const orgInfo = usuario.orgs as { publico?: string } | { publico?: string }[] | null;
  const publicoOrg = (Array.isArray(orgInfo) ? orgInfo[0]?.publico : orgInfo?.publico) ?? "mentoria";

  return { supabase, usuario: { ...usuario, publico_org: publicoOrg } };
}

type UsuarioContexto = { id: string; org_id: string; papel: string };

const ERRO_SEM_PERMISSAO = "Você só pode mexer em leads que são seus.";

// O Closer de uma reunião marcada pode ser outra pessoa, diferente do SDR
// responsável pelo lead — ele também pode editar esse lead (ex.: fechar a
// venda), sem virar o dono. Lead continua sendo do SDR.
async function souCloserAtivo(
  supabase: SupabaseServerClient,
  leadId: string,
  usuarioId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("reunioes")
    .select("id")
    .eq("lead_id", leadId)
    .eq("closer_id", usuarioId)
    .eq("status", "marcada")
    .limit(1)
    .maybeSingle();

  return !!data;
}

// Admin, o responsável pelo lead, ou o Closer da reunião marcada dele
// podem alterar/arquivar/anotar. Todo mundo com acesso ao Funil continua
// enxergando o lead (visão de equipe).
async function garantirPodeEditar(
  supabase: SupabaseServerClient,
  usuario: UsuarioContexto,
  leadId: string
): Promise<string | null> {
  if (usuario.papel === "admin") return null;

  const { data: lead, error } = await supabase
    .from("leads")
    .select("responsavel_id")
    .eq("id", leadId)
    .single();

  if (error || !lead) return "Lead não encontrado";
  if (lead.responsavel_id === usuario.id) return null;
  if (await souCloserAtivo(supabase, leadId, usuario.id)) return null;
  return ERRO_SEM_PERMISSAO;
}

function mensagemAmigavel(codigo: string | undefined, mensagemOriginal: string) {
  if (codigo === "23505") {
    return "Já existe um lead com esse telefone.";
  }
  return mensagemOriginal;
}

// Mantém a tabela `reunioes` em sincronia com a mudança de nível.
// Entrando em "Reunião marcada": cria a reunião (data de agendamento = o
// que a pessoa informou, default agora — data da reunião = o que a pessoa
// informou). Saindo de "Reunião marcada" pra "No Show", "Follow após
// reunião" ou "Oportunidades": atualiza o status da reunião mais recente.
async function sincronizarReuniao(
  supabase: SupabaseServerClient,
  params: {
    orgId: string;
    usuarioId: string;
    leadId: string;
    deOrdem: number;
    paraOrdem: number;
    agendadaPara?: string | null;
    marcadaEm?: string | null;
    closerId?: string | null;
    // Só é perguntado saindo de "Reunião marcada" pra "Follow após reunião"
    // ou "Oportunidades" — indica se a reunião realmente aconteceu. Se
    // false, não conta como "realizada" (mesmo efeito de um No-show na
    // taxa de comparecimento), mesmo o lead seguindo pro nível escolhido.
    reuniaoAconteceu?: boolean;
    // Só perguntado quando existe uma reunião anterior "esquecida" (ainda
    // "marcada", data já passada) — true = sumiu sem avisar (conta como
    // no-show), false = avisou antes que precisava remarcar (não conta).
    // undefined = ainda não perguntou, então nem tenta marcar a nova.
    reuniaoAnteriorSumiu?: boolean;
    publicoOrg?: string;
    // "Oportunidades futuras" (repescagem de ICP) é a mesma coluna
    // 8 por baixo, mas não exige reunião registrada — só a "Oportunidades"
    // normal exige (Samuel pediu essa distinção explicitamente).
    querFutura?: boolean;
  }
): Promise<{ erro: string | null; transferirParaCloserId?: string | null }> {
  const {
    orgId,
    usuarioId,
    leadId,
    deOrdem,
    paraOrdem,
    agendadaPara,
    marcadaEm,
    closerId,
    reuniaoAconteceu,
    reuniaoAnteriorSumiu,
    publicoOrg = "mentoria",
    querFutura = false,
  } = params;

  // Trava 1: sair de "Reunião marcada" só pode ir pra No-show, Precisa
  // reagendar, Follow ou Oportunidades — são os únicos caminhos que fecham
  // a reunião certinho (ver bloco abaixo). Voltar direto pra um nível
  // anterior (ou pular pra Base) deixava a reunião "marcada" pra sempre,
  // esquecida, sem ninguém saber que ela existe (foi o que aconteceu com a
  // Camila Flora).
  if (
    deOrdem === NIVEL_REUNIAO_MARCADA &&
    paraOrdem !== NIVEL_NO_SHOW &&
    paraOrdem !== NIVEL_REAGENDAMENTO &&
    paraOrdem !== NIVEL_FOLLOW_POS_REUNIAO &&
    paraOrdem !== NIVEL_REUNIAO_FEITA
  ) {
    return {
      erro: `Não dá pra sair de "${Reuniao(publicoOrg)} marcada" direto pra esse nível — a ${reuniao(publicoOrg)} ficaria perdida no sistema. Se ela não aconteceu, mova pra "No-show" ou "Precisa reagendar"; se aconteceu, mova pra "Follow após reunião" ou "Oportunidades".`,
    };
  }

  // Trava 2: não dá pra pular direto pra Follow/Oportunidades sem o lead
  // nunca ter tido nenhuma reunião registrada — foi o que aconteceu com o
  // Igor Basílio (foi parar em "Oportunidades" sem reunião nenhuma).
  // Base NÃO entra aqui (Samuel pediu explicitamente): é o balde de "não
  // virou nada", e a maioria dos motivos de ir pra lá (sumiu, não
  // qualificou, não teve interesse) nem chega perto de uma reunião — travar
  // isso deixava lead de pré-venda preso sem conseguir arquivar.
  // "Oportunidades futuras" (repescagem de ICP) também fica fora — Samuel
  // foi explícito que ela não precisa ser só pra quem já teve reunião.
  if (
    paraOrdem === NIVEL_FOLLOW_POS_REUNIAO ||
    (paraOrdem === NIVEL_REUNIAO_FEITA && !querFutura)
  ) {
    const { count: totalReunioes } = await supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    if (!totalReunioes) {
      return {
        erro: `Esse lead nunca teve uma ${reuniao(publicoOrg)} registrada — não dá pra pular direto pra esse nível. Marque a ${reuniao(publicoOrg)} primeiro.`,
      };
    }
  }

  if (paraOrdem === NIVEL_REUNIAO_MARCADA && deOrdem !== NIVEL_REUNIAO_MARCADA) {
    if (!agendadaPara) {
      return { erro: `Informe a data e hora da ${reuniao(publicoOrg)}.` };
    }

    const data = parseDataHoraLocal(agendadaPara);
    if (Number.isNaN(data.getTime())) {
      return { erro: `Data da ${reuniao(publicoOrg)} inválida.` };
    }

    let dataMarcada = new Date();
    if (marcadaEm) {
      const parsed = parseDataHoraLocal(marcadaEm);
      if (Number.isNaN(parsed.getTime())) {
        return { erro: "Data de agendamento inválida." };
      }
      dataMarcada = parsed;
    }

    // Reunião anterior "esquecida" (ainda "marcada", com a data já
    // passada) precisa ser resolvida antes de marcar a nova — sem isso
    // ela ficava pra sempre sem status definido, derrubando a taxa de
    // comparecimento sem nunca aparecer como no-show em lugar nenhum.
    // NUNCA adivinha pela data — só quem confirma explicitamente que a
    // pessoa sumiu sem avisar conta como no-show; quem avisou antes que
    // precisava remarcar não conta (regra explícita do Samuel).
    const { data: reunioesPendentes } = await supabase
      .from("reunioes")
      .select("id")
      .eq("lead_id", leadId)
      .eq("status", "marcada")
      .lt("agendada_para", new Date().toISOString());

    if (reunioesPendentes && reunioesPendentes.length > 0) {
      if (reuniaoAnteriorSumiu === undefined) {
        return {
          erro: `Antes de marcar essa nova ${reuniao(publicoOrg)}, confirme: na ${reuniao(publicoOrg)} anterior (que já passou da data), a pessoa sumiu sem avisar ou avisou antes que precisava remarcar?`,
        };
      }

      const { error: erroAnterior } = await supabase
        .from("reunioes")
        .update({ status: reuniaoAnteriorSumiu ? "nao_compareceu" : "cancelada" })
        .in(
          "id",
          reunioesPendentes.map((r) => r.id)
        );
      if (erroAnterior) return { erro: erroAnterior.message };
    }

    // Se o lead já teve alguma reunião antes, essa aqui é um reagendamento
    // (ex.: veio de um No-show), não uma call nova — não pode contar como
    // "call marcada" nova na métrica do dia.
    const { count: reunioesAnteriores } = await supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    const { error } = await supabase.from("reunioes").insert({
      org_id: orgId,
      usuario_id: usuarioId,
      lead_id: leadId,
      agendada_para: data.toISOString(),
      marcada_em: dataMarcada.toISOString(),
      closer_id: closerId || null,
      status: "marcada",
      reagendada: !!reunioesAnteriores && reunioesAnteriores > 0,
    });

    if (error) return { erro: error.message };
    return { erro: null };
  }

  if (
    deOrdem === NIVEL_REUNIAO_MARCADA &&
    (paraOrdem === NIVEL_NO_SHOW ||
      paraOrdem === NIVEL_REAGENDAMENTO ||
      paraOrdem === NIVEL_FOLLOW_POS_REUNIAO ||
      paraOrdem === NIVEL_REUNIAO_FEITA)
  ) {
    const { data: reuniaoAtiva } = await supabase
      .from("reunioes")
      .select("id, closer_id, agendada_para")
      .eq("lead_id", leadId)
      .eq("status", "marcada")
      .order("marcada_em", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (reuniaoAtiva) {
      // No Show = sumiu sem avisar. Reagendamento = avisou antes que ia
      // precisar remarcar. Nenhum dos dois é "realizada" — só conta como
      // realizada quem seguiu pra Follow/Oportunidades com a call feita.
      const novoStatus =
        paraOrdem === NIVEL_NO_SHOW
          ? "nao_compareceu"
          : paraOrdem === NIVEL_REAGENDAMENTO
            ? "cancelada"
            : reuniaoAconteceu === false
              ? "nao_compareceu"
              : "realizada";

      // Trava 3: não dá pra marcar como realizada uma reunião cuja data
      // ainda não chegou — foi o que aconteceu com o Jardel Alves (data
      // errada, 31/08, marcada como realizada antes mesmo de chegar lá).
      if (novoStatus === "realizada" && new Date(reuniaoAtiva.agendada_para) > new Date()) {
        return {
          erro: `Essa ${reuniao(publicoOrg)} está marcada pra uma data que ainda não chegou (${new Date(
            reuniaoAtiva.agendada_para
          ).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}) — confira se a data está certa antes de marcar como realizada.`,
        };
      }

      const { error } = await supabase
        .from("reunioes")
        .update({ status: novoStatus })
        .eq("id", reuniaoAtiva.id);
      if (error) return { erro: error.message };

      // Reunião realizada de verdade (foi pra Follow ou já virou
      // Oportunidade E a reunião de fato aconteceu): o lead passa a ser
      // 100% do Closer que fez a call. A transferência em si só acontece
      // DEPOIS que quem chamou essa função já salvou tudo que precisava
      // salvar como o dono atual do lead (nivel_ordem, histórico) — se
      // ela rodasse aqui, o responsavel_id mudava no meio do caminho e o
      // resto das escritas (feitas pela pessoa que ainda não é a dona
      // nova) era barrado pela política de segurança do banco, sem erro
      // nenhum aparecer pra avisar (foi o que aconteceu com um lead do
      // Rafael Torres — reunião marcada como realizada, mas o card nunca
      // saiu de "Reunião marcada").
      if (novoStatus === "realizada" && reuniaoAtiva.closer_id) {
        return { erro: null, transferirParaCloserId: reuniaoAtiva.closer_id };
      }
    }
    return { erro: null };
  }

  return { erro: null };
}

export async function criarLead(
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefoneDigitado = String(formData.get("telefone") ?? "").trim();
  const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const origem = String(formData.get("origem") ?? "").trim() || null;
  const quemIndicou = String(formData.get("quem_indicou") ?? "").trim();
  const responsavelId =
    usuario.papel === "admin"
      ? String(formData.get("responsavel_id") ?? "").trim() || null
      : usuario.id;

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { data: novoLead, error } = await supabase
    .from("leads")
    .insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      nome,
      telefone_e164: telefone,
      instagram,
      origem,
      responsavel_id: responsavelId,
    })
    .select("id")
    .single();

  if (error) {
    return { erro: mensagemAmigavel(error.code, error.message) };
  }

  await garantirOrigem(supabase, usuario.org_id, origem);

  // Origem "Indicação" (qualquer variante) + campo preenchido: grava quem
  // indicou direto nas notas do lead, pra não perder esse contexto solto
  // numa conversa por fora — mesma regra que já existe em atualizarLead.
  if (origem && origem.toLowerCase().includes("indica") && quemIndicou) {
    await supabase.from("interacoes").insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      lead_id: novoLead.id,
      tipo: "nota",
      canal: "manual",
      conteudo: `Indicação — quem indicou: ${quemIndicou}`,
      ocorreu_em: new Date().toISOString(),
      origem: "declarado",
    });
  }

  revalidatePath("/leads");
  redirect("/leads");
}

const NIVEL_LEADS = 0;

export type ResultadoImportacao = {
  erro: string | null;
  criados: number;
  duplicados: number;
  invalidos: number;
  total: number;
};

// Cola de planilha (Excel/Sheets) manda TAB entre colunas — prioriza isso,
// e cai pra vírgula/ponto-e-vírgula/pipe se a pessoa digitou a lista à mão.
function dividirLinhaImportacao(linha: string): string[] {
  if (linha.includes("\t")) return linha.split("\t");
  if (linha.includes("|")) return linha.split("|");
  if (linha.includes(";")) return linha.split(";");
  return linha.split(",");
}

// Importação em massa pro SDR prospectar (ex.: lista de prospecção fria) —
// cada linha "Nome, Telefone" vira um lead direto na coluna "Leads"
// (nivel_ordem 0), sem responsável, pronto pra alguém reivindicar e
// começar a abordar. Insere um por um (não em lote só) porque precisa
// contar quantos foram criados/ignorados por telefone duplicado, pra dar
// o resumo pra quem importou.
export async function importarLeads(
  _estadoAnterior: ResultadoImportacao,
  formData: FormData
): Promise<ResultadoImportacao> {
  const { supabase, usuario } = await contextoUsuario();

  const lista = String(formData.get("lista") ?? "");
  const origemPadrao =
    String(formData.get("origem") ?? "").trim() || "Prospecção fria";

  const linhas = lista
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);

  let criados = 0;
  let duplicados = 0;
  let invalidos = 0;

  for (const linha of linhas) {
    const partes = dividirLinhaImportacao(linha)
      .map((parte) => parte.trim())
      .filter(Boolean);
    const nome = partes[0];
    const telefoneDigitado = partes[1];
    const origemLinha = partes[2] || origemPadrao;

    if (!nome) {
      invalidos++;
      continue;
    }

    const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;

    const { error } = await supabase.from("leads").insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      nome,
      telefone_e164: telefone,
      origem: origemLinha,
      nivel_ordem: NIVEL_LEADS,
      responsavel_id: null,
    });

    if (error) {
      if (error.code === "23505") {
        duplicados++;
      } else {
        invalidos++;
      }
      continue;
    }

    criados++;
    await garantirOrigem(supabase, usuario.org_id, origemLinha);
  }

  revalidatePath("/leads");

  return { erro: null, criados, duplicados, invalidos, total: linhas.length };
}

// redirecionar=true (página cheia) volta pra /leads como sempre foi.
// redirecionar=false (dentro do pop-up) não pode fazer isso — a pessoa
// pode estar em qualquer tela; quem atualiza a tela nesse caso é o
// próprio formulário no cliente, chamando recarregar() (ver
// components/editar-lead-form.tsx e components/contexto-lead-modal.tsx).
export async function atualizarLead(
  leadId: string,
  redirecionar: boolean,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const nome = String(formData.get("nome") ?? "").trim();
  const telefoneDigitado = String(formData.get("telefone") ?? "").trim();
  const telefone = telefoneDigitado ? normalizarTelefone(telefoneDigitado) : null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const origem = String(formData.get("origem") ?? "").trim() || null;
  const quemIndicou = String(formData.get("quem_indicou") ?? "").trim();
  const criterioProblema =
    String(formData.get("criterio_problema") ?? "").trim() || null;
  const criterioUrgencia = String(
    formData.get("criterio_urgencia") ?? "desconhecida"
  );
  const criterioCapacidade = String(
    formData.get("criterio_capacidade") ?? "desconhecida"
  );
  const novoNivel = Number(formData.get("nivel_ordem"));
  const reuniaoData = String(formData.get("reuniao_data") ?? "").trim() || null;
  const reuniaoMarcadaEm = String(formData.get("marcada_em") ?? "").trim() || null;
  const closerId = String(formData.get("closer_id") ?? "").trim() || null;
  const motivoBaseForm = String(formData.get("motivo_base") ?? "").trim() || null;
  const motivoBaseDetalheForm = String(formData.get("motivo_base_detalhe") ?? "").trim() || null;
  const reuniaoAconteceuForm = String(formData.get("reuniao_aconteceu") ?? "").trim();
  const reuniaoAnteriorSumiuForm = String(formData.get("reuniao_anterior_sumiu") ?? "").trim();
  // Só faz sentido em Oportunidades (nível 6) — fora dele, fica sempre false.
  const oportunidadeFutura =
    novoNivel === NIVEL_REUNIAO_FEITA && formData.get("oportunidade_futura") === "on";

  if (!nome) {
    return { erro: "Nome é obrigatório" };
  }

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem, responsavel_id, motivo_base, proposta_valor")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    return { erro: "Lead não encontrado" };
  }

  if (
    usuario.papel !== "admin" &&
    leadAtual.responsavel_id !== usuario.id &&
    !(await souCloserAtivo(supabase, leadId, usuario.id))
  ) {
    return { erro: ERRO_SEM_PERMISSAO };
  }

  // Só admin pode trocar quem é o responsável; o "dono" do lead mantém o
  // valor atual (o formulário nem mostra o campo editável pra ele).
  const responsavelId =
    usuario.papel === "admin"
      ? String(formData.get("responsavel_id") ?? "").trim() || null
      : leadAtual.responsavel_id;

  const nivelMudou = novoNivel !== leadAtual.nivel_ordem;

  // Nenhuma reunião pode ser marcada sem os 3 critérios de qualificação
  // preenchidos (regra do CLAUDE.md) — checa só quando o lead está
  // entrando em "Reunião marcada" agora, não em quem já estava lá.
  if (nivelMudou && novoNivel === NIVEL_REUNIAO_MARCADA) {
    const faltando: string[] = [];
    if (!criterioProblema) faltando.push("o perfil do lead");
    if (criterioUrgencia === "desconhecida") faltando.push("se tem urgência");
    if (criterioCapacidade === "desconhecida") faltando.push("se consegue pagar");

    if (faltando.length > 0) {
      return {
        erro: `Antes de marcar a ${reuniao(usuario.publico_org)}, preencha: ${faltando.join(", ")}.`,
      };
    }
  }

  // Igual à reunião: ninguém move pra Base sem dizer o motivo — precisa pra
  // separar certo nas colunas de "por que não virou venda".
  if (nivelMudou && novoNivel === NIVEL_BASE && !motivoBaseForm) {
    return { erro: "Escolha o motivo pelo qual esse lead está indo pra Base." };
  }

  // "Desqualificado" exige dizer por quê — sem isso, a coluna vira um
  // monte de lead sem perfil nenhum registrado, e ninguém sabe depois o
  // que exatamente tirou esse lead do perfil ideal (Samuel pediu que
  // fosse obrigatório).
  if (
    nivelMudou &&
    novoNivel === NIVEL_BASE &&
    motivoBaseForm === "desqualificado" &&
    !motivoBaseDetalheForm
  ) {
    return {
      erro: 'Descreva por que esse lead está desqualificado antes de mover pra "Base".',
    };
  }

  // No Show só existe se teve reunião marcada antes — sem isso não tem o
  // que sincronizar em `reunioes` e a taxa de no-show fica sempre zerada,
  // mesmo com lead "parado" ali na coluna (Samuel pediu essa trava).
  if (
    nivelMudou &&
    novoNivel === NIVEL_NO_SHOW &&
    leadAtual.nivel_ordem !== NIVEL_REUNIAO_MARCADA
  ) {
    return {
      erro: `Só dá pra marcar "No-show" a partir de "${Reuniao(usuario.publico_org)} marcada" — esse lead nunca teve uma marcada.`,
    };
  }

  // Mesma trava do No Show: Reagendamento só existe se veio de "Reunião
  // marcada" — é a pessoa avisando antes que ia precisar remarcar.
  if (
    nivelMudou &&
    novoNivel === NIVEL_REAGENDAMENTO &&
    leadAtual.nivel_ordem !== NIVEL_REUNIAO_MARCADA
  ) {
    return {
      erro: `Só dá pra marcar "Precisa reagendar" a partir de "${Reuniao(usuario.publico_org)} marcada" — esse lead nunca teve uma marcada.`,
    };
  }

  // Depois de já ter tido uma reunião, não dá pra voltar pros níveis de
  // antes dela (Novos Leads até Topou reunião sem horário) — isso já
  // aconteceu, não tem como desfazer, e voltar pra trás corrompe as
  // taxas de agendamento/comparecimento que já foram contadas com base
  // nessa reunião. Mesma trava do menu (ver deveApareceNoMenu em
  // editar-lead-form.tsx), agora no servidor pra não dar pra burlar.
  if (nivelMudou && (novoNivel === 0 || novoNivel === 1 || novoNivel === 2 || novoNivel === 3)) {
    const { count: totalReunioes } = await supabase
      .from("reunioes")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId);

    if (totalReunioes && totalReunioes > 0) {
      return {
        erro: `Esse lead já teve uma ${reuniao(usuario.publico_org)} registrada — não dá pra voltar pra um nível de antes dela.`,
      };
    }
  }

  // "Fiz proposta e não comprou" só faz sentido se a proposta e o perfil
  // do lead já estiverem registrados — senão fica um lead na Base sem
  // nenhum contexto de por que não fechou.
  if (
    nivelMudou &&
    novoNivel === NIVEL_BASE &&
    motivoBaseForm === "proposta_nao_comprou"
  ) {
    const faltando: string[] = [];
    if (!criterioProblema) faltando.push("o perfil do lead");
    if (leadAtual.proposta_valor == null) faltando.push("a proposta (registre acima antes de mover)");

    if (faltando.length > 0) {
      return {
        erro: `Antes de mover pra Base como "Fiz proposta e não comprou", preencha: ${faltando.join(", ")}.`,
      };
    }
  }

  // Saindo de "Reunião marcada" pra "Follow após reunião" ou
  // "Oportunidades": só faz sentido se a reunião realmente aconteceu.
  // "Não" cancela o movimento inteiro — o lead continua em "Reunião
  // marcada" (mesma regra do drag-and-drop no Kanban); só "Sim" deixa
  // seguir. Sem isso a taxa de comparecimento contava reunião que nunca
  // rolou.
  if (
    nivelMudou &&
    leadAtual.nivel_ordem === NIVEL_REUNIAO_MARCADA &&
    (novoNivel === NIVEL_FOLLOW_POS_REUNIAO || novoNivel === NIVEL_REUNIAO_FEITA)
  ) {
    if (reuniaoAconteceuForm !== "sim" && reuniaoAconteceuForm !== "nao") {
      return { erro: `Confirme se essa ${reuniao(usuario.publico_org)} realmente aconteceu.` };
    }
    if (reuniaoAconteceuForm === "nao") {
      return {
        erro: `Como a ${reuniao(usuario.publico_org)} não aconteceu, o lead continua em "${Reuniao(usuario.publico_org)} marcada". Mova pra "No-show" ou "Precisa reagendar" se for o caso.`,
      };
    }
  }

  const motivoBase = novoNivel === NIVEL_BASE ? motivoBaseForm ?? leadAtual.motivo_base : null;
  const motivoBaseDetalhe = motivoBase === "desqualificado" ? motivoBaseDetalheForm : null;

  let transferirParaCloserId: string | null | undefined;
  if (nivelMudou) {
    const resultadoSincronizacao = await sincronizarReuniao(supabase, {
      orgId: usuario.org_id,
      usuarioId: usuario.id,
      leadId,
      deOrdem: leadAtual.nivel_ordem,
      paraOrdem: novoNivel,
      agendadaPara: reuniaoData,
      marcadaEm: reuniaoMarcadaEm,
      closerId,
      reuniaoAconteceu: reuniaoAconteceuForm === "sim",
      reuniaoAnteriorSumiu:
        reuniaoAnteriorSumiuForm === "sim"
          ? true
          : reuniaoAnteriorSumiuForm === "nao"
            ? false
            : undefined,
      publicoOrg: usuario.publico_org,
      querFutura: oportunidadeFutura,
    });
    if (resultadoSincronizacao.erro) {
      return { erro: resultadoSincronizacao.erro };
    }
    transferirParaCloserId = resultadoSincronizacao.transferirParaCloserId;
  } else if (novoNivel === NIVEL_REUNIAO_MARCADA && leadAtual.nivel_ordem === NIVEL_REUNIAO_MARCADA) {
    // Lead já estava em "Reunião marcada" (não mudou de nível agora) —
    // o campo de Closer só aparece na hora da transição por padrão, então
    // isso aqui é o que permite definir/trocar o closer depois que a
    // reunião já foi marcada (ver bloco novo em editar-lead-form.tsx).
    const { error: erroCloser } = await supabase
      .from("reunioes")
      .update({ closer_id: closerId })
      .eq("lead_id", leadId)
      .eq("status", "marcada");
    if (erroCloser) {
      return { erro: erroCloser.message };
    }
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nome,
      telefone_e164: telefone,
      email,
      instagram,
      origem,
      criterio_problema: criterioProblema,
      criterio_urgencia: criterioUrgencia,
      criterio_capacidade: criterioCapacidade,
      nivel_ordem: novoNivel,
      oportunidade_futura: oportunidadeFutura,
      motivo_base: motivoBase,
      ...(motivoBase === "desqualificado" ? { motivo_base_detalhe: motivoBaseDetalhe } : {}),
      // Quando a reunião realizada tem Closer definido, o responsável
      // final é transferido depois (ver bloco após o histórico) — não
      // sobrescreve aqui com o valor antigo do formulário.
      ...(transferirParaCloserId ? {} : { responsavel_id: responsavelId }),
      // Mudar de nível NÃO apaga mais o "próximo contato" (Samuel pediu
      // que o lembrete sobrevivesse à movimentação — só registrar
      // nota/ligação ou cancelar manualmente é que cumpre ele de verdade).
      ...(nivelMudou ? { entrou_nivel_em: new Date().toISOString() } : {}),
    })
    .eq("id", leadId);

  if (error) {
    return { erro: mensagemAmigavel(error.code, error.message) };
  }

  await garantirOrigem(supabase, usuario.org_id, origem);

  // Origem "Indicação" (qualquer variante) + campo preenchido: grava quem
  // indicou direto nas notas do lead, pra não perder esse contexto solto
  // numa conversa por fora.
  if (origem && origem.toLowerCase().includes("indica") && quemIndicou) {
    await supabase.from("interacoes").insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      lead_id: leadId,
      tipo: "nota",
      canal: "manual",
      conteudo: `Indicação — quem indicou: ${quemIndicou}`,
      ocorreu_em: new Date().toISOString(),
      origem: "declarado",
    });
  }

  if (nivelMudou) {
    const { error: erroHistorico } = await supabase
      .from("nivel_historico")
      .insert({
        org_id: usuario.org_id,
        lead_id: leadId,
        de_ordem: leadAtual.nivel_ordem,
        para_ordem: novoNivel,
        motivo: "Editado manualmente no painel",
        automatico: false,
        usuario_id: usuario.id,
      });

    if (erroHistorico) {
      return { erro: erroHistorico.message };
    }
  }

  // Só transfere o lead pro Closer por último, depois de já ter salvo
  // tudo que precisava salvar como o dono atual — ver comentário em
  // sincronizarReuniao sobre por que a ordem importa.
  if (transferirParaCloserId) {
    const { error: erroTransferencia } = await supabase.rpc("transferir_lead_para_closer", {
      p_lead_id: leadId,
      p_closer_id: transferirParaCloserId,
    });
    if (erroTransferencia) {
      return { erro: erroTransferencia.message };
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);

  if (!redirecionar) {
    return { erro: null };
  }

  redirect("/leads");
}

// Retorna a mensagem de erro (string) em vez de lançar exceção — uma
// exceção lançada direto de uma Server Action chamada assim (fora de
// useActionState) é escondida pelo Next.js em produção, virando um
// "Minified React error #441" genérico e inútil pra quem está usando o
// sistema. Devolvendo a mensagem como valor normal, o Next não mexe nela e
// o alerta em kanban-board.tsx mostra o motivo certinho pra pessoa.
export async function moverLeadNivel(
  leadId: string,
  novoNivel: number,
  agendadaPara?: string | null,
  reuniaoAconteceu?: boolean
): Promise<string | null> {
  const { supabase, usuario } = await contextoUsuario();

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem, responsavel_id, oportunidade_futura")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    return "Lead não encontrado";
  }

  if (
    usuario.papel !== "admin" &&
    leadAtual.responsavel_id !== usuario.id &&
    !(await souCloserAtivo(supabase, leadId, usuario.id))
  ) {
    return ERRO_SEM_PERMISSAO;
  }

  // "Oportunidades futuras" é uma coluna sintética (divisão visual dentro
  // do nível 8, não um nível de verdade) — arrastar pra ela só liga a
  // marcação `oportunidade_futura`, o nivel_ordem continua 8.
  const querFutura = novoNivel === ORDEM_OPORTUNIDADE_FUTURA;
  const nivelReal = querFutura ? NIVEL_REUNIAO_FEITA : novoNivel;

  if (leadAtual.nivel_ordem === nivelReal && leadAtual.oportunidade_futura === querFutura) {
    return null;
  }

  // No Show e Reagendamento só existem se teve reunião marcada antes —
  // mesma trava de atualizarLead, pra não deixar arrastar o card direto de
  // qualquer coluna e ficar sem reunião pra sincronizar (Samuel pediu essa
  // regra pro No Show, e ela vale igualzinho pro Reagendamento).
  if (
    (nivelReal === NIVEL_NO_SHOW || nivelReal === NIVEL_REAGENDAMENTO) &&
    leadAtual.nivel_ordem !== NIVEL_REUNIAO_MARCADA
  ) {
    const nomeNivel = nivelReal === NIVEL_NO_SHOW ? "No-show" : "Precisa reagendar";
    return `Só dá pra marcar "${nomeNivel}" a partir de "${Reuniao(usuario.publico_org)} marcada" — esse lead nunca teve uma marcada.`;
  }

  const { erro: erroReuniao, transferirParaCloserId } = await sincronizarReuniao(supabase, {
    orgId: usuario.org_id,
    usuarioId: usuario.id,
    leadId,
    deOrdem: leadAtual.nivel_ordem,
    paraOrdem: nivelReal,
    agendadaPara,
    reuniaoAconteceu,
    publicoOrg: usuario.publico_org,
    querFutura,
  });
  if (erroReuniao) {
    return erroReuniao;
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nivel_ordem: nivelReal,
      oportunidade_futura: querFutura,
      entrou_nivel_em: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    return mensagemAmigavel(error.code, error.message);
  }

  const { error: erroHistorico } = await supabase.from("nivel_historico").insert({
    org_id: usuario.org_id,
    lead_id: leadId,
    de_ordem: leadAtual.nivel_ordem,
    para_ordem: nivelReal,
    motivo: "Arrastado no Kanban",
    automatico: false,
    usuario_id: usuario.id,
  });

  if (erroHistorico) {
    return erroHistorico.message;
  }

  // Só transfere o lead pro Closer por último, depois de já ter salvo
  // tudo que precisava salvar como o dono atual — ver comentário em
  // sincronizarReuniao sobre por que a ordem importa.
  if (transferirParaCloserId) {
    const { error: erroTransferencia } = await supabase.rpc("transferir_lead_para_closer", {
      p_lead_id: leadId,
      p_closer_id: transferirParaCloserId,
    });
    if (erroTransferencia) {
      return erroTransferencia.message;
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return null;
}

export async function reativarLead(
  leadId: string,
  novoNivel: number,
  // Só admin escolhe o responsável na reativação — mesma regra de sempre
  // (ver ResponsavelSelect em editar-lead-form.tsx). Pra quem não é
  // admin, esse valor é ignorado e o responsável não muda.
  novoResponsavelId?: string | null
): Promise<string | null> {
  const { supabase, usuario } = await contextoUsuario();

  if (!NIVEIS_REATIVACAO.includes(novoNivel)) {
    return "Nível inválido pra reativação.";
  }

  const { data: leadAtual, error: erroAtual } = await supabase
    .from("leads")
    .select("nivel_ordem, responsavel_id")
    .eq("id", leadId)
    .single();

  if (erroAtual || !leadAtual) {
    return "Lead não encontrado";
  }

  if (
    usuario.papel !== "admin" &&
    leadAtual.responsavel_id !== usuario.id &&
    !(await souCloserAtivo(supabase, leadId, usuario.id))
  ) {
    return ERRO_SEM_PERMISSAO;
  }

  const { error } = await supabase
    .from("leads")
    .update({
      nivel_ordem: novoNivel,
      motivo_base: null,
      motivo_base_detalhe: null,
      entrou_nivel_em: new Date().toISOString(),
      // Fica marcado pra sempre — Samuel quer isso visível direto no
      // card, não só escondido na linha do tempo do lead.
      reativado_da_base_em: new Date().toISOString(),
      ...(usuario.papel === "admin" ? { responsavel_id: novoResponsavelId || null } : {}),
    })
    .eq("id", leadId);

  if (error) {
    return mensagemAmigavel(error.code, error.message);
  }

  const { error: erroHistorico } = await supabase.from("nivel_historico").insert({
    org_id: usuario.org_id,
    lead_id: leadId,
    de_ordem: leadAtual.nivel_ordem,
    para_ordem: novoNivel,
    motivo: "Reativado da Base",
    automatico: false,
    usuario_id: usuario.id,
  });

  if (erroHistorico) {
    return erroHistorico.message;
  }

  revalidatePath("/leads/base");
  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return null;
}

export async function marcarVendido(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const { data: leadAtual } = await supabase
    .from("leads")
    .select("criterio_problema, responsavel_id")
    .eq("id", leadId)
    .single();

  // Sem responsável, a venda não entra na conta de ninguém (some do Bônus
  // SDR, mesmo contando no total geral) — trava aqui pra não deixar passar.
  if (!leadAtual?.responsavel_id) {
    return {
      erro: "Esse lead está sem responsável definido — atribua alguém antes de marcar como vendido.",
    };
  }

  if (!leadAtual?.criterio_problema) {
    return {
      erro: "Preencha o perfil do lead (acima, em \"Sobre o lead\") antes de marcar como vendido.",
    };
  }

  const valorRaw = String(formData.get("valor_venda") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe o valor da venda" };
  }

  // Data em que a venda REALMENTE aconteceu — sem isso, o sistema contava
  // a venda como se tivesse sido feita na hora em que alguém lembrou de
  // registrar no CRM, mesmo horas ou dias depois. Isso distorcia os
  // relatórios por dia.
  const dataVendaRaw = String(formData.get("vendido_em") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVendaRaw)) {
    return { erro: "Informe a data em que a venda aconteceu" };
  }
  const vendidoEm = new Date(`${dataVendaRaw}T12:00:00Z`);
  if (Number.isNaN(vendidoEm.getTime()) || vendidoEm.getTime() > Date.now()) {
    return { erro: "Data da venda inválida — não pode ser uma data futura" };
  }

  // Receita é opcional: tem venda que fecha (contrato assinado, valor
  // combinado) mas o dinheiro só entra depois — fica em branco até lá.
  const receitaRaw = String(formData.get("receita_venda") ?? "").trim();
  const receita = receitaRaw ? Number(receitaRaw) : null;

  const produto = String(formData.get("produto") ?? "").trim() || null;

  // Busca a reunião ANTES de gravar a venda — se a data dela ainda não
  // chegou, é sinal de data errada (bloqueia antes de mexer em qualquer
  // coisa, pra não deixar o lead marcado como vendido com um erro no meio).
  const { data: reuniaoAtiva } = await supabase
    .from("reunioes")
    .select("id, agendada_para")
    .eq("lead_id", leadId)
    .order("marcada_em", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reuniaoAtiva && new Date(reuniaoAtiva.agendada_para) > new Date()) {
    return {
      erro: `A ${reuniao(usuario.publico_org)} desse lead está marcada pra uma data que ainda não chegou (${new Date(
        reuniaoAtiva.agendada_para
      ).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}) — confira se a data está certa antes de marcar como vendido.`,
    };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      status: "vendido",
      valor_venda: valor,
      receita_venda: receita,
      produto,
      vendido_em: vendidoEm.toISOString(),
    })
    .eq("id", leadId);

  if (error) {
    return { erro: error.message };
  }

  if (reuniaoAtiva) {
    // Vendeu = a reunião aconteceu de verdade. Sem isso, a reunião ficava
    // "marcada" pra sempre mesmo depois de virar venda — some das contas
    // de "reuniões realizadas" (foi assim que a Thaiana Mourao sumiu da
    // métrica da Elizabeth mesmo já sendo cliente).
    await supabase
      .from("reunioes")
      .update({ status: "realizada", resultado: "vendeu", valor })
      .eq("id", reuniaoAtiva.id);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export async function editarVenda(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const valorRaw = String(formData.get("valor_venda") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe o valor da venda" };
  }

  const dataVendaRaw = String(formData.get("vendido_em") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataVendaRaw)) {
    return { erro: "Informe a data em que a venda aconteceu" };
  }
  const vendidoEm = new Date(`${dataVendaRaw}T12:00:00Z`);
  if (Number.isNaN(vendidoEm.getTime()) || vendidoEm.getTime() > Date.now()) {
    return { erro: "Data da venda inválida — não pode ser uma data futura" };
  }

  // Receita é opcional: tem venda que fecha (contrato assinado, valor
  // combinado) mas o dinheiro só entra depois — fica em branco até lá.
  const receitaRaw = String(formData.get("receita_venda") ?? "").trim();
  const receita = receitaRaw ? Number(receitaRaw) : null;

  const produto = String(formData.get("produto") ?? "").trim() || null;

  const { error } = await supabase
    .from("leads")
    .update({ valor_venda: valor, receita_venda: receita, produto, vendido_em: vendidoEm.toISOString() })
    .eq("id", leadId)
    .eq("status", "vendido");

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/leads/vendas");
  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export async function registrarProposta(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const valorRaw = String(formData.get("proposta_valor") ?? "").trim();
  const valor = valorRaw ? Number(valorRaw) : null;

  if (!valor || valor <= 0) {
    return { erro: "Informe o valor da proposta" };
  }

  const observacao = String(formData.get("proposta_observacao") ?? "").trim() || null;

  const { error } = await supabase
    .from("leads")
    .update({
      proposta_valor: valor,
      proposta_enviada_em: new Date().toISOString(),
      proposta_observacao: observacao,
    })
    .eq("id", leadId);

  if (error) {
    return { erro: error.message };
  }

  const valorFormatado = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  await supabase.from("interacoes").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    lead_id: leadId,
    tipo: "nota",
    canal: "manual",
    conteudo: `Proposta enviada: ${valorFormatado}${observacao ? ` — ${observacao}` : ""}`,
    ocorreu_em: new Date().toISOString(),
    origem: "declarado",
  });

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export async function marcarProximoContato(leadId: string, formData: FormData) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  const dataHora = String(formData.get("proximo_follow_em") ?? "").trim();
  if (!dataHora) {
    throw new Error("Escolha data e hora do próximo contato");
  }

  const data = parseDataHoraLocal(dataHora);
  if (Number.isNaN(data.getTime())) {
    throw new Error("Data inválida");
  }

  const { error } = await supabase
    .from("leads")
    .update({ proximo_follow_em: data.toISOString() })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

// Marcador manual de "em que dia do follow-up esse lead está" (1 a 5) —
// não tem regra automática nenhuma atrás, é só a SDR anotando em que
// ponto da sequência de follow ela parou. Clicar de novo no mesmo dia já
// selecionado limpa a marcação (dia = null).
export async function definirDiaFollow(leadId: string, dia: number | null) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  if (dia !== null && (!Number.isInteger(dia) || dia < 1 || dia > 5)) {
    throw new Error("Dia do follow inválido");
  }

  const { error } = await supabase
    .from("leads")
    .update({ dia_follow: dia })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

// Muda só a data/hora de uma reunião/visita que já está marcada — sem
// isso, uma vez marcada não tinha como corrigir o horário (o campo de
// data só aparecia no formulário na hora de marcar pela primeira vez).
// Atualiza a reunião existente, não cria uma nova nem mexe em métrica.
export async function reagendarReuniao(
  leadId: string,
  reuniaoId: string,
  formData: FormData
) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  const dataHora = String(formData.get("agendada_para") ?? "").trim();
  if (!dataHora) {
    throw new Error(`Escolha a nova data e hora da ${reuniao(usuario.publico_org)}.`);
  }

  const data = parseDataHoraLocal(dataHora);
  if (Number.isNaN(data.getTime())) {
    throw new Error(`Data da ${reuniao(usuario.publico_org)} inválida.`);
  }

  // Guarda a data antiga antes de sobrescrever — sem isso, reagendar
  // apagava qualquer rastro de que a reunião já tinha sido marcada pra
  // outro dia (Samuel pediu que ficasse registrado).
  const { data: reuniaoAtual } = await supabase
    .from("reunioes")
    .select("agendada_para")
    .eq("id", reuniaoId)
    .single();

  const { error } = await supabase
    .from("reunioes")
    .update({ agendada_para: data.toISOString() })
    .eq("id", reuniaoId)
    .eq("lead_id", leadId)
    .eq("status", "marcada");

  if (error) {
    throw new Error(error.message);
  }

  if (reuniaoAtual?.agendada_para) {
    const formatarDataHoraBr = (iso: string) =>
      new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

    await supabase.from("interacoes").insert({
      org_id: usuario.org_id,
      usuario_id: usuario.id,
      lead_id: leadId,
      tipo: "nota",
      canal: "manual",
      conteudo: `${Reuniao(usuario.publico_org)} reagendada: de ${formatarDataHoraBr(
        reuniaoAtual.agendada_para
      )} para ${formatarDataHoraBr(data.toISOString())}.`,
      ocorreu_em: new Date().toISOString(),
      origem: "declarado",
    });
  }

  revalidatePath("/leads");
  revalidatePath("/reunioes");
  revalidatePath(`/leads/${leadId}`);
}

export async function cancelarProximoContato(leadId: string) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  const { error } = await supabase
    .from("leads")
    .update({ proximo_follow_em: null })
    .eq("id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
}

export async function registrarNota(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const conteudo = String(formData.get("conteudo") ?? "").trim();

  if (!conteudo) {
    return { erro: "Escreva algo pra registrar" };
  }

  const { error } = await supabase.from("interacoes").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    lead_id: leadId,
    tipo: "nota",
    canal: "manual",
    conteudo,
    ocorreu_em: new Date().toISOString(),
    origem: "declarado",
  });

  if (error) {
    return { erro: error.message };
  }

  // Registrar contato cumpre o lembrete de "próximo contato" — sem isso,
  // ele continuava marcado como atrasado mesmo depois do contato já feito.
  await supabase.from("leads").update({ proximo_follow_em: null }).eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export async function registrarLigacao(leadId: string, atendida: boolean) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  const { error } = await supabase.from("interacoes").insert({
    org_id: usuario.org_id,
    usuario_id: usuario.id,
    lead_id: leadId,
    tipo: "ligacao",
    canal: "manual",
    conteudo: atendida ? "Ligação atendida" : "Ligação não atendida",
    ocorreu_em: new Date().toISOString(),
    origem: "declarado",
  });

  if (error) {
    throw new Error(error.message);
  }

  // Mesma ideia da nota: a ligação cumpre o lembrete de "próximo contato".
  await supabase.from("leads").update({ proximo_follow_em: null }).eq("id", leadId);

  revalidatePath(`/leads/${leadId}`);
}

export async function excluirInteracao(leadId: string, interacaoId: string) {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    throw new Error(erroPermissao);
  }

  const { error } = await supabase
    .from("interacoes")
    .update({ excluido_em: new Date().toISOString() })
    .eq("id", interacaoId)
    .eq("lead_id", leadId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leads/${leadId}`);
}

// redirecionar=true (página cheia, link direto) manda de volta pra /leads
// como sempre foi. redirecionar=false (dentro do pop-up) não pode fazer
// isso — a pessoa pode estar em qualquer tela (Reuniões, Atividades...),
// não só em /leads; quem fecha o pop-up nesse caso é o próprio botão no
// cliente (ver components/excluir-lead-button.tsx).
export async function arquivarLead(
  leadId: string,
  redirecionar: boolean,
  _estadoAnterior: EstadoFormulario,
  _formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const erroPermissao = await garantirPodeEditar(supabase, usuario, leadId);
  if (erroPermissao) {
    return { erro: erroPermissao };
  }

  const { data: leadAtual } = await supabase
    .from("leads")
    .select("status")
    .eq("id", leadId)
    .single();

  // Cliente que já comprou não pode sumir do sistema — excluir ele fazia o
  // faturamento de um mês já fechado encolher sozinho, sem ninguém entender
  // por quê (a conta de métricas sempre ignora lead excluído).
  if (leadAtual?.status === "vendido") {
    return {
      erro: "Esse lead já é cliente (venda registrada) — não dá pra excluir. Se cadastrou errado, corrija os dados em vez de excluir.",
    };
  }

  const { error } = await supabase
    .from("leads")
    .update({ arquivado_em: new Date().toISOString() })
    .eq("id", leadId);

  if (error) {
    return { erro: error.message };
  }

  revalidatePath("/leads");
  revalidatePath("/leads/base");
  revalidatePath("/leads/vendas");

  if (!redirecionar) {
    return { erro: null };
  }

  redirect("/leads");
}

// Lead sem responsável (ex.: chegou de uma campanha, sem dono definido)
// pode ser "pego" por qualquer usuário com acesso ao Funil.
export async function reivindicarLead(
  leadId: string,
  _estadoAnterior: EstadoFormulario,
  _formData: FormData
): Promise<EstadoFormulario> {
  const { supabase, usuario } = await contextoUsuario();

  const { data: lead, error: erroAtual } = await supabase
    .from("leads")
    .select("responsavel_id")
    .eq("id", leadId)
    .single();

  if (erroAtual || !lead) {
    return { erro: "Lead não encontrado" };
  }

  if (lead.responsavel_id !== null) {
    return { erro: "Esse lead já tem responsável." };
  }

  const { error } = await supabase
    .from("leads")
    .update({ responsavel_id: usuario.id })
    .eq("id", leadId);

  if (error) {
    return { erro: mensagemAmigavel(error.code, error.message) };
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${leadId}`);
  return { erro: null };
}

export type DetalhesLead = {
  lead: {
    id: string;
    nome: string;
    telefone_e164: string | null;
    email: string | null;
    instagram: string | null;
    foto_url: string | null;
    origem: string | null;
    produto: string | null;
    nivel_ordem: number;
    criterio_problema: string | null;
    criterio_urgencia: string;
    criterio_capacidade: string;
    status: string;
    valor_venda: number | null;
    receita_venda: number | null;
    vendido_em: string | null;
    declarado_em: string;
    responsavel_id: string | null;
    oportunidade_futura: boolean;
    motivo_base: string | null;
    motivo_base_detalhe: string | null;
    proposta_valor: number | null;
    proposta_enviada_em: string | null;
    proposta_observacao: string | null;
    proximo_follow_em: string | null;
    dia_follow: number | null;
  };
  niveis: NivelResumo[];
  interacoes: {
    id: string;
    tipo: string | null;
    canal: string | null;
    conteudo: string | null;
    ocorreu_em: string;
  }[];
  reunioes: {
    id: string;
    agendada_para: string;
    marcada_em: string;
    status: string;
    resultado: string | null;
    closer_id: string | null;
    usuario_id: string;
    reagendada: boolean;
  }[];
  nivelHistorico: {
    id: string;
    de_ordem: number;
    para_ordem: number;
    motivo: string | null;
    automatico: boolean;
    usuario_id: string | null;
    ocorreu_em: string;
  }[];
  usuarios: { id: string; nome: string; funcao: string | null; foto_url: string | null }[];
  origens: { id: string; nome: string }[];
  produtos: string[];
  souAdmin: boolean;
  publicoOrg: string;
  podeEditar: boolean;
  podeReivindicar: boolean;
  nomeResponsavel: string | undefined;
  fotoResponsavel: string | null | undefined;
  nomeSdrOriginal: string | undefined;
  reuniaoAtiva: { id: string; agendada_para: string; closer_id: string | null } | null;
  reuniaoAnteriorPendente: boolean;
  numerosVisiveis: Record<number, number>;
  iscaResposta: {
    tempo_mercado: string | null;
    maior_desafio: string | null;
    prioridade: boolean | null;
    atuacao: string | null;
  } | null;
};

// Igual aos dados que app/(app)/leads/[id]/page.tsx busca pra montar a
// página cheia — só que devolvidos como dado puro (não JSX), pra dar pra
// chamar do cliente e montar o pop-up sem precisar de rota nova nenhuma
// (ver components/modal-lead.tsx). Rota nova foi o que causou o 404 real
// em produção da vez passada (rota interceptada do Next.js) — esse jeito
// não mexe em rota nenhuma, só busca dado.
export async function buscarDetalhesDoLead(
  leadId: string
): Promise<{ erro: string | null; dados: DetalhesLead | null }> {
  const { supabase, usuario } = await contextoUsuario();

  const [
    { data: lead },
    { data: niveisData },
    { data: interacoesData },
    { data: reunioesData },
    { data: nivelHistoricoData },
    { data: usuariosData },
    { data: origensData },
    { data: produtosData },
    { data: iscaRespostaData },
  ] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, nome, telefone_e164, email, instagram, foto_url, origem, produto, nivel_ordem, criterio_problema, criterio_urgencia, criterio_capacidade, status, valor_venda, receita_venda, vendido_em, declarado_em, responsavel_id, oportunidade_futura, motivo_base, motivo_base_detalhe, proposta_valor, proposta_enviada_em, proposta_observacao, proximo_follow_em, dia_follow"
      )
      .eq("id", leadId)
      .single(),
    supabase.from("niveis").select("ordem, nome, numerado, destacado").order("ordem"),
    supabase
      .from("interacoes")
      .select("id, tipo, canal, conteudo, ocorreu_em")
      .eq("lead_id", leadId)
      .is("excluido_em", null)
      .order("ocorreu_em", { ascending: false }),
    supabase
      .from("reunioes")
      .select("id, agendada_para, marcada_em, status, resultado, closer_id, usuario_id, reagendada")
      .eq("lead_id", leadId)
      .order("agendada_para", { ascending: false }),
    supabase
      .from("nivel_historico")
      .select("id, de_ordem, para_ordem, motivo, automatico, usuario_id, ocorreu_em")
      .eq("lead_id", leadId)
      .order("ocorreu_em", { ascending: false }),
    supabase.from("usuarios").select("id, nome, funcao, foto_url").order("nome"),
    supabase.from("origens").select("id, nome").order("nome"),
    supabase.from("produtos").select("nome").order("nome"),
    supabase
      .from("isca_respostas")
      .select("tempo_mercado, maior_desafio, prioridade, atuacao")
      .eq("lead_id", leadId)
      .maybeSingle(),
  ]);

  if (!lead) {
    return { erro: "Lead não encontrado", dados: null };
  }

  const niveis = (niveisData ?? []) as NivelResumo[];
  const interacoes = interacoesData ?? [];
  const reunioes = reunioesData ?? [];
  const nivelHistorico = nivelHistoricoData ?? [];
  const usuarios = usuariosData ?? [];
  const origens = origensData ?? [];
  const produtos = (produtosData ?? []).map((p) => p.nome);
  const souAdmin = usuario.papel === "admin";
  const souCloser = await souCloserAtivo(supabase, leadId, usuario.id);
  const reuniaoAtiva = reunioes.find((r) => r.status === "marcada") ?? null;
  const reuniaoAnteriorPendente = reunioes.some(
    (r) => r.status === "marcada" && new Date(r.agendada_para).getTime() < Date.now()
  );
  const podeEditar = souAdmin || lead.responsavel_id === usuario.id || souCloser;
  const podeReivindicar = !souAdmin && lead.responsavel_id === null;
  const usuarioResponsavel = usuarios.find((u) => u.id === lead.responsavel_id);
  const nomeResponsavel = usuarioResponsavel?.nome;
  const fotoResponsavel = usuarioResponsavel?.foto_url;
  const sdrOriginalId = reunioes.length
    ? [...reunioes].sort(
        (a, b) => new Date(a.marcada_em).getTime() - new Date(b.marcada_em).getTime()
      )[0].usuario_id
    : null;
  const nomeSdrOriginal = usuarios.find((u) => u.id === sdrOriginalId)?.nome;
  const numerosVisiveis = Object.fromEntries(numerarNiveis(niveis));

  return {
    erro: null,
    dados: {
      lead,
      niveis,
      interacoes,
      reunioes,
      nivelHistorico,
      usuarios,
      origens,
      produtos,
      souAdmin,
      publicoOrg: usuario.publico_org,
      podeEditar,
      podeReivindicar,
      nomeResponsavel,
      fotoResponsavel,
      nomeSdrOriginal,
      reuniaoAtiva,
      reuniaoAnteriorPendente,
      numerosVisiveis,
      iscaResposta: iscaRespostaData ?? null,
    },
  };
}
