// Lista única das atividades da rotina do SDR — usada pela tela
// "Minha rotina" (com ícones) e pelo acompanhamento do admin (sem ícones).
// Fica fora do componente porque aquele é "use client" e um componente de
// servidor não consegue ler uma constante exportada de lá.
// Horários batem com o que o Samuel pediu direto no chat em 30/09/26 e
// 01/10/26: tirou a atividade "Ligações para leads quentes" (não fazia
// mais sentido), dividiu o Follow com níveis 1 e 2 em dois blocos de
// meia hora (um antes da Prospecção, outro depois), e depois juntou
// "Retomar conversas" com o 1º bloco de Follow num bloco só (9:30–10:30,
// uma hora) porque é quase a mesma coisa — só o 2º bloco de Follow
// (depois da Prospecção) continua separado. "Confirmar reuniões de
// amanhã" é 16:30–17:00 (meia hora), porque o 2º bloco de Follow ocupa
// só até as 16:30. Antes disso, batiam com o documento "Rotina do SDR"
// (ajustado por ele em 22/09/26) — não arredondar pra bater com versão
// nenhuma de antes se ele atualizar de novo.
export const ATIVIDADES_ROTINA_PADRAO = [
  {
    id: "confirmar_reunioes",
    hora: "09:00–09:30",
    titulo: "Confirmar e reagendar reuniões",
    desc: "Reuniões do dia, reagendar as do dia anterior (processo anti-no-show) e fazer follow com os leads do nível 3.",
    cor: "blue",
  },
  {
    id: "retomar_conversas_follow_bloco1",
    hora: "09:30–10:30",
    titulo: "Retomar conversas e 1º bloco de Follow Up com níveis 1 e 2",
    desc: "Leads que responderam no dia anterior no WhatsApp e Instagram, parados ou atrasados no CRM, seguindo a matriz de follow-up — pausa e atende na hora quem responder ou lead de tráfego que chegar, e depois volte conforme a rotina.",
    cor: "violet",
  },
  {
    id: "prospeccao",
    hora: "10:30–16:00",
    titulo: "Prospecção",
    desc: "Instagram, base ou tráfego — lead de tráfego é sempre prioridade. Pausa assim que qualquer lead responder, e depois volte conforme a rotina.",
    cor: "pink",
  },
  {
    id: "follow_niveis_1_2_bloco2",
    hora: "16:00–16:30",
    titulo: "2º bloco de Follow Up com níveis 1 e 2",
    desc: "Sequência seguindo a matriz de follow-up — pausa e atende na hora quem responder ou lead de tráfego que chegar, e depois volte conforme a rotina.",
    cor: "indigo",
  },
  {
    id: "confirmar_amanha",
    hora: "16:30–17:00",
    titulo: "Confirmar reuniões de amanhã",
    desc: "Seguir o processo de anti-no-show e enviar o relatório diário no grupo do comercial até as 18h.",
    cor: "emerald",
  },
] as const;


// Rotina da Banker - Consorcio (14/10/26): igual à padrão, só que a 1ª
// atividade é ligar pros leads quentes (níveis 2 e 3, só isso) e a última é
// enviar os relatórios (no lugar de confirmar reuniões). Os horários das
// outras continuam os mesmos.
export const ATIVIDADES_ROTINA_BANKER = [
  {
    id: "ligar_leads_quentes",
    hora: "09:00–09:30",
    titulo: "Ligar para leads quentes",
    desc: "Ligar para os leads quentes: os que estão em qualificação (nível 2) e os que toparam a reunião (nível 3).",
    cor: "blue",
  },
  ATIVIDADES_ROTINA_PADRAO[1],
  ATIVIDADES_ROTINA_PADRAO[2],
  ATIVIDADES_ROTINA_PADRAO[3],
  {
    id: "enviar_relatorios",
    hora: "16:30–17:00",
    titulo: "Enviar relatórios",
    desc: "Enviar os relatórios do dia.",
    cor: "emerald",
  },
] as const;

export type AtividadeRotina = {
  id: string;
  hora: string;
  titulo: string;
  desc: string;
  cor: string;
};

// Rotina de cada empresa (orgs.rotina_modelo): 'padrao' ou 'banker'.
export function atividadesDaRotina(modelo: string | null | undefined): readonly AtividadeRotina[] {
  return modelo === "banker" ? ATIVIDADES_ROTINA_BANKER : ATIVIDADES_ROTINA_PADRAO;
}

// Mantido por compatibilidade com quem ainda importa a lista padrão.
export const ATIVIDADES_ROTINA = ATIVIDADES_ROTINA_PADRAO;
