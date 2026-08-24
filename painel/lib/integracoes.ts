import { Reuniao, reuniao, reunioes } from "@/lib/terminologia";

export type StatusIntegracao = "conectado" | "nao_conectado" | "em_breve";

export type PassoConexao = {
  numero: number;
  // "voce" = ação que só você consegue fazer (login, senha, conta).
  // "eu" = eu construo/configuro, você não precisa fazer nada nesse passo.
  quemFaz: "voce" | "eu";
  titulo: string;
  descricao: string;
};

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
  // Preenchido quando status !== "conectado" — passo a passo pra chegar lá.
  comoConectar?: PassoConexao[];
  // Aviso extra, tipo prazo ou burocracia esperada — some não tem.
  avisoImportante?: string;
};

export function integracoes(publicoOrg: string = "mentoria"): Integracao[] {
  return [
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
      "Já está funcionando, usando o provedor Z-API (não é a API oficial da Meta, de propósito — evita a burocracia de aprovação da Meta). Um único número de WhatsApp conectado atende todo mundo da empresa: cada pessoa manda mensagem do próprio celular pra esse número, e o sistema reconhece quem é quem pelo telefone de quem manda. Não precisa fazer nada aqui.",
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
    avisoImportante:
      "A Meta exige aprovação de app pra liberar leitura de leads em produção — pode levar de alguns dias a duas semanas, dependendo da fila deles.",
    comoConectar: [
      {
        numero: 1,
        quemFaz: "voce",
        titulo: "Ter a Página do Facebook ligada à conta de anúncios",
        descricao:
          "Em business.facebook.com, confirme que a sua Página (Facebook) está vinculada à conta de anúncios que roda as campanhas. Se ainda não está, em Configurações do Negócio → Contas → Páginas, vincule.",
      },
      {
        numero: 2,
        quemFaz: "voce",
        titulo: "Criar um App na Meta for Developers",
        descricao:
          "Entre em developers.facebook.com/apps, clique em \"Criar app\", escolha o tipo \"Negócios\" (Business) e dê um nome (ex.: \"Meu Vendedor - Integração\").",
      },
      {
        numero: 3,
        quemFaz: "voce",
        titulo: "Adicionar os produtos certos ao App",
        descricao:
          "Dentro do App criado, adicione os produtos \"Webhooks\" e \"Marketing API\" (procure em \"Adicionar Produto\" no menu lateral do painel do App).",
      },
      {
        numero: 4,
        quemFaz: "voce",
        titulo: "Gerar o Token de Acesso da Página",
        descricao:
          "No Graph API Explorer (developers.facebook.com/tools/explorer), selecione seu App e sua Página, e gere um token com as permissões leads_retrieval e pages_manage_ads. Esse token é a \"senha\" que autoriza a leitura dos leads.",
      },
      {
        numero: 5,
        quemFaz: "voce",
        titulo: "Me passar o token com segurança",
        descricao:
          "Nunca cole o token aqui no chat. Eu te aviso o campo certo (variável de ambiente) pra você colar direto lá, sem passar por mim.",
      },
      {
        numero: 6,
        quemFaz: "eu",
        titulo: "Construir a porta de entrada",
        descricao:
          "Eu construo a Edge Function que recebe o aviso do Facebook toda vez que um lead novo chega, busca os dados completos via API e grava aqui no CRM — sem duplicar se o Facebook mandar o mesmo aviso duas vezes.",
      },
      {
        numero: 7,
        quemFaz: "eu",
        titulo: "Inscrever a Página nos avisos (webhook)",
        descricao:
          "Eu configuro, do lado do Facebook, pra Página avisar automaticamente esse endereço toda vez que alguém preenche o formulário.",
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
    avisoImportante:
      "O Google exige um \"Developer Token\" pra acessar a API do Google Ads — o pedido é analisado por eles e pode levar alguns dias até ser aprovado.",
    comoConectar: [
      {
        numero: 1,
        quemFaz: "voce",
        titulo: "Ter uma campanha com formulário de lead ativa",
        descricao:
          "Dentro do Google Ads, sua campanha precisa usar a extensão \"Formulário de lead\" (Lead Form Extension) — sem isso não tem leads pra puxar.",
      },
      {
        numero: 2,
        quemFaz: "voce",
        titulo: "Pedir acesso à API do Google Ads",
        descricao:
          "Em ads.google.com/aw/apicenter, solicite um Developer Token pra sua conta. É um formulário rápido, mas a aprovação depende do Google.",
      },
      {
        numero: 3,
        quemFaz: "voce",
        titulo: "Autorizar o acesso (login Google)",
        descricao:
          "Você faz login com a conta Google que administra os anúncios e autoriza o CRM a ler os dados de lead — sem digitar senha em lugar nenhum, é o mesmo tipo de tela de \"Permitir acesso\" que você já viu em outros apps.",
      },
      {
        numero: 4,
        quemFaz: "eu",
        titulo: "Construir a porta de entrada",
        descricao:
          "Eu construo a busca automática dos leads novos e a gravação aqui no CRM, igual a integração do Facebook.",
      },
    ],
  },
  {
    id: "google-calendar",
    nome: "Google Calendar",
    descricaoCurta:
      `Sincroniza as ${reunioes(publicoOrg)} marcadas no CRM com a agenda de verdade.`,
    status: "nao_conectado",
    corIcone: "bg-blue-100 text-blue-700",
    letraIcone: "C",
    oQueFaz:
      `Toda vez que uma ${reuniao(publicoOrg)} é marcada aqui no CRM (nível '${Reuniao(publicoOrg)} marcada'), cria um evento automático na agenda do Google do Closer responsável — sem precisar lançar duas vezes.`,
    comoConectar: [
      {
        numero: 1,
        quemFaz: "voce",
        titulo: "Clicar em \"Conectar com Google\"",
        descricao:
          "Um botão vai aparecer aqui nessa página quando a integração estiver pronta. Clicar nele abre a tela de login do próprio Google.",
      },
      {
        numero: 2,
        quemFaz: "voce",
        titulo: "Escolher a conta e autorizar",
        descricao:
          "Escolha a conta Google (a mesma da sua agenda de trabalho) e clique em \"Permitir\" na tela de permissões. Sua senha do Google nunca passa por mim — isso é feito direto entre você e o Google.",
      },
      {
        numero: 3,
        quemFaz: "eu",
        titulo: "Construir a sincronização",
        descricao:
          `Eu construo a criação/atualização automática do evento na sua agenda sempre que uma ${reuniao(publicoOrg)} for marcada, remarcada ou cancelada aqui no CRM.`,
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
        numero: 1,
        quemFaz: "voce",
        titulo: "Deixar a planilha com \"Qualquer pessoa com o link\"",
        descricao:
          "No Google Sheets, clique em \"Compartilhar\" (canto superior direito) → em \"Acesso geral\", mude pra \"Qualquer pessoa com o link\" → função \"Leitor\". Isso não deixa a planilha pública no Google, só acessível por quem tem o link exato.",
      },
      {
        numero: 2,
        quemFaz: "voce",
        titulo: "Me mandar o link e o formato das colunas",
        descricao:
          "Copie o link da planilha e me diga quais colunas existem (nome, telefone, origem, etc.) — assim eu sei como ler cada uma certinho.",
      },
      {
        numero: 3,
        quemFaz: "eu",
        titulo: "Construir a tela de importar",
        descricao:
          "Eu construo uma tela onde você cola o link de qualquer planilha nova (não precisa ser sempre a mesma) e os leads entram formatados certo, sem duplicar quem já está cadastrado.",
      },
    ],
  },
  {
    id: "zapier-make",
    nome: "Zapier / Make",
    descricaoCurta:
      "O \"conecta com quase tudo\" — liga o CRM a milhares de outras ferramentas.",
    status: "nao_conectado",
    corIcone: "bg-orange-100 text-orange-700",
    letraIcone: "Z",
    oQueFaz:
      "Zapier e Make são plataformas que já têm milhares de ferramentas pré-conectadas (planilhas, e-mail, SMS, outros CRMs, o que for). Em vez de eu construir uma integração pra cada ferramenta do mundo, o CRM manda um aviso pra essas plataformas toda vez que algo acontece aqui (ex.: lead novo, venda fechada), e você decide lá pra onde esse aviso vai — sem precisar de mim pra cada ferramenta nova.",
    comoConectar: [
      {
        numero: 1,
        quemFaz: "voce",
        titulo: "Criar uma conta grátis no Zapier ou no Make",
        descricao:
          "Em zapier.com ou make.com, crie uma conta (o plano grátis já é suficiente pra testar).",
      },
      {
        numero: 2,
        quemFaz: "voce",
        titulo: "Criar um \"Zap\" (ou \"Cenário\", no Make) novo",
        descricao:
          "Escolha como gatilho a opção \"Webhooks by Zapier\" → \"Catch Hook\" (ou \"Webhook\" no Make). A plataforma vai gerar um link único pra você.",
      },
      {
        numero: 3,
        quemFaz: "voce",
        titulo: "Me passar esse link",
        descricao:
          "Copie o link gerado e me manda — eu configuro aqui no CRM pra onde cada evento (lead novo, venda fechada, etc.) deve ser enviado.",
      },
      {
        numero: 4,
        quemFaz: "eu",
        titulo: "Construir o envio automático",
        descricao:
          "Eu construo o aviso automático: toda vez que o evento escolhido acontecer aqui no CRM, mando os dados pra esse link. A partir daí, você mesmo decide dentro do Zapier/Make pra qual outra ferramenta esse dado vai — sem precisar de mim de novo.",
      },
    ],
  },
  ];
}

export function buscarIntegracao(id: string, publicoOrg: string = "mentoria") {
  return integracoes(publicoOrg).find((integracao) => integracao.id === id) ?? null;
}

export const STATUS_LABEL: Record<StatusIntegracao, { texto: string; classe: string }> = {
  conectado: { texto: "Conectado", classe: "bg-green-100 text-green-700" },
  nao_conectado: { texto: "Não conectado", classe: "bg-neutral-200 text-neutral-600" },
  em_breve: { texto: "Em breve", classe: "bg-amber-100 text-amber-700" },
};
