export type StatusIntegracao = "conectado" | "nao_conectado" | "em_breve";

export type Integracao = {
  id: string;
  nome: string;
  descricaoCurta: string;
  status: StatusIntegracao;
  corIcone: string;
  letraIcone: string;
  oQueFaz: string;
  // Preenchido quando status === "conectado".
  infoConexao?: string;
  // Preenchido quando status !== "conectado" — passos pra chegar lá.
  comoConectar?: { titulo: string; descricao: string }[];
};

export const INTEGRACOES: Integracao[] = [
  {
    id: "whatsapp",
    nome: "WhatsApp (Z-API)",
    descricaoCurta:
      "Canal principal do CRM — leads e comandos por voz/texto chegam por aqui.",
    status: "conectado",
    corIcone: "bg-green-100 text-green-700",
    letraIcone: "W",
    oQueFaz:
      "Todo comando de voz ou texto que você manda no WhatsApp passa por aqui — o agente interpreta, executa no banco e responde. É o caminho principal do CRM, por decisão do projeto.",
    infoConexao:
      "Já está funcionando, usando o provedor Z-API (não é a API oficial da Meta, de propósito — evita a burocracia de aprovação da Meta). Não precisa fazer nada aqui.",
  },
  {
    id: "facebook-lead-ads",
    nome: "Facebook / Instagram Lead Ads",
    descricaoCurta:
      "Formulário nativo de anúncio — o lead cai direto em Pré-vendas → Leads.",
    status: "nao_conectado",
    corIcone: "bg-sky-100 text-sky-700",
    letraIcone: "F",
    oQueFaz:
      "Quando alguém preenche o formulário nativo de um anúncio seu no Facebook ou Instagram, o lead entra automaticamente aqui no CRM — Pré-vendas → Leads, sem responsável, pronto pra alguém reivindicar. Sem precisar copiar nada na mão.",
    comoConectar: [
      {
        titulo: "Você",
        descricao:
          "Ter a Página do Facebook ligada à conta de anúncios, criar um App em developers.facebook.com, e gerar um Token de Acesso da Página com permissão de leitura de leads.",
      },
      {
        titulo: "Eu",
        descricao:
          "Construo a porta de entrada (Edge Function) que recebe o aviso do Facebook, busca os dados do lead e grava aqui, sem duplicar.",
      },
    ],
  },
  {
    id: "google-ads",
    nome: "Google Ads (Lead Form)",
    descricaoCurta:
      "Mesma ideia do Facebook, mas pros formulários de anúncio do Google.",
    status: "nao_conectado",
    corIcone: "bg-amber-100 text-amber-700",
    letraIcone: "G",
    oQueFaz:
      "Se você rodar anúncios com formulário nativo no Google (Lead Form Extensions), o lead cai aqui do mesmo jeito que o do Facebook — direto em Pré-vendas → Leads.",
    comoConectar: [
      {
        titulo: "Você",
        descricao:
          "Ter uma conta Google Ads com campanha de formulário de lead, e liberar acesso à API do Google Ads.",
      },
      {
        titulo: "Eu",
        descricao: "Construo a porta de entrada, igual a do Facebook.",
      },
    ],
  },
  {
    id: "google-calendar",
    nome: "Google Calendar",
    descricaoCurta:
      "Sincroniza as reuniões marcadas no CRM com a agenda de verdade.",
    status: "nao_conectado",
    corIcone: "bg-blue-100 text-blue-700",
    letraIcone: "C",
    oQueFaz:
      "Toda vez que uma reunião é marcada aqui no CRM (nível 'Reunião marcada'), cria um evento automático na agenda do Google do Closer responsável — sem precisar lançar duas vezes.",
    comoConectar: [
      {
        titulo: "Você",
        descricao: "Autorizar o CRM a acessar sua conta Google (login OAuth, sem precisar digitar senha em lugar nenhum).",
      },
      {
        titulo: "Eu",
        descricao: "Construo a integração que cria/atualiza o evento sempre que a reunião muda.",
      },
    ],
  },
  {
    id: "google-sheets",
    nome: "Google Sheets",
    descricaoCurta: "Importa uma leva de leads direto de uma planilha.",
    status: "nao_conectado",
    corIcone: "bg-lime-100 text-lime-700",
    letraIcone: "S",
    oQueFaz:
      "Em vez de eu importar manualmente uma planilha toda vez que você me manda uma (como já fizemos várias vezes), essa integração deixa você colar o link de uma planilha e os leads entram direto, formatados certo.",
    comoConectar: [
      {
        titulo: "Você",
        descricao: "Compartilhar a planilha (ou autorizar acesso) e me dizer o formato das colunas.",
      },
      {
        titulo: "Eu",
        descricao: "Construo a tela de importar + a leitura da planilha.",
      },
    ],
  },
];

export function buscarIntegracao(id: string) {
  return INTEGRACOES.find((integracao) => integracao.id === id) ?? null;
}

export const STATUS_LABEL: Record<StatusIntegracao, { texto: string; classe: string }> = {
  conectado: { texto: "Conectado", classe: "bg-green-100 text-green-700" },
  nao_conectado: { texto: "Não conectado", classe: "bg-neutral-200 text-neutral-600" },
  em_breve: { texto: "Em breve", classe: "bg-amber-100 text-amber-700" },
};
