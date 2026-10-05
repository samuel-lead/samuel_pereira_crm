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
export const ATIVIDADES_ROTINA = [
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

