// Público imobiliário usa "Visita" onde o resto do sistema fala "Reunião"
// ou "Call" — no mercado de imóveis não existe esse vocabulário, só visita.
// Mentoria/serviço continua exatamente como sempre foi.
// Monta o "público" com os sufixos de vocabulário próprio da empresa (":of",
// ":vend", ":solo", ":sf", ":com", ":fb", ":gond") — mesma conta que o
// middleware faz pro resto do app. Usado onde só se tem os dados crus da
// empresa (ex.: o card do lead, que busca pela server action).
export function montarPublicoOrg(
  publico: string,
  org: {
    nome_oportunidades_futuras?: boolean | null;
    chama_sdr_de_vendedor?: boolean | null;
    sem_closer?: boolean | null;
    sem_farming?: boolean | null;
    chama_receita_de_comissao?: boolean | null;
    dashboard_em_barras?: boolean | null;
    mercado_gondolas?: boolean | null;
    metas_so_taxas?: boolean | null;
  } | null
): string {
  let resultado = publico;
  if (org?.nome_oportunidades_futuras) resultado += ":of";
  if (org?.chama_sdr_de_vendedor) resultado += ":vend";
  if (org?.sem_closer) resultado += ":solo";
  if (org?.sem_farming) resultado += ":sf";
  if (org?.chama_receita_de_comissao) resultado += ":com";
  if (org?.dashboard_em_barras) resultado += ":fb";
  if (org?.mercado_gondolas) resultado += ":gond";
  if (org?.metas_so_taxas) resultado += ":mt";
  return resultado;
}

export function ehImobiliario(publicoOrg: string) {
  return publicoOrg === "imobiliario";
}

export function Reuniao(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Visita" : "Reunião";
}

export function reuniao(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "visita" : "reunião";
}

export function Reunioes(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Visitas" : "Reuniões";
}

export function reunioes(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "visitas" : "reuniões";
}

export function Call(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Visita" : "Call";
}

export function call(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "visita" : "call";
}

export function Calls(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Visitas" : "Calls";
}

export function calls(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "visitas" : "calls";
}

// Imobiliário não fala "SDR" — quem faz esse papel (qualifica e agenda
// visita) é chamado de "Corretor" no mercado de imóveis. Não confundir com
// o valor interno `usuarios.funcao = 'sdr'`, que continua igual no banco
// pros dois públicos — só o texto que aparece pra pessoa muda.
// Empresas com vocabulário próprio (ex.: Banker - Consorcio): o público vem
// com sufixos (":of", ":vend") — ver lib/supabase/middleware.ts.
function temVariante(publicoOrg: string, variante: string) {
  return publicoOrg.split(":").slice(1).includes(variante);
}

// Empresa sem Closer: só existe o SDR (aqui "Vendedor"), que qualifica,
// marca e faz a reunião. Imobiliário também não tem Closer, mas ele já é
// tratado à parte em vários lugares — por isso `semCloserNaoImobiliario`
// existe pra quem só quer pegar o caso de mentoria/serviço sem Closer.
export function semCloser(publicoOrg: string) {
  return ehImobiliario(publicoOrg) || temVariante(publicoOrg, "solo");
}

// Vendedor com comissão própria: o CRM calcula sozinho a comissão de cada
// venda a partir do % (ou valor fixo) que ele configurou em Meu perfil.
// Imobiliário sempre usou; a Banker - Consorcio (":com") passou a usar.
export function usaComissaoDoVendedor(publicoOrg: string) {
  return ehImobiliario(publicoOrg) || temVariante(publicoOrg, "com");
}

// A Visão geral com o funil em barras vale pra TODAS as empresas (Samuel,
// 15/10/26). A função fica pra o código que já pergunta por ela.
export function dashboardEmBarras(publicoOrg: string) {
  void publicoOrg;
  return true;
}

// Empresa do mercado de gôndolas (Inove Gôndolas): o card do lead usa
// perguntas de perfil/urgência/capacidade próprias desse mercado.
export function ehGondolas(publicoOrg: string) {
  return temVariante(publicoOrg, "gond");
}

// Empresa sem piso de LEADS por dia e sem meta de taxa de agendamento — ficam
// o piso de reuniões por dia e as taxas de comparecimento e de venda
// (Inove Gôndolas, Samuel 21/10/26).
export function metasSoTaxas(publicoOrg: string) {
  return temVariante(publicoOrg, "mt");
}

// Empresa que não usa "Farming" na Base de leads (ex.: Banker - Consorcio).
export function semFarming(publicoOrg: string) {
  return temVariante(publicoOrg, "sf");
}

// Relatório copiado pelos vendedores sem as linhas de "calls marcadas" e
// "reagendadas" — não faz sentido pra Banker - Consorcio (vende por ligação,
// sem call). Identifica a empresa pelos sufixos ":com" + ":sf", que só ela
// tem (Samuel pediu em 16/10/26).
export function relatorioSemCalls(publicoOrg: string) {
  return temVariante(publicoOrg, "com") && temVariante(publicoOrg, "sf");
}

// Funil de consórcio (Banker - Consorcio, Samuel 27/10/26): vende por
// ligação, não existe reunião. Os níveis 4 e 7 viram "Proposta iniciada" e
// "Aguardando assinatura" (só o nome muda no banco), e as colunas de
// reunião (No-show, Precisa reagendar, Oportunidades) somem. Mesma
// identificação do relatório sem calls (sufixos ":com" + ":sf").
export function funilConsorcio(publicoOrg: string) {
  return relatorioSemCalls(publicoOrg);
}

export function semCloserNaoImobiliario(publicoOrg: string) {
  return !ehImobiliario(publicoOrg) && temVariante(publicoOrg, "solo");
}

export function Sdr(publicoOrg: string) {
  if (ehImobiliario(publicoOrg)) return "Corretor";
  return temVariante(publicoOrg, "vend") ? "Vendedor" : "SDR";
}

export function sdr(publicoOrg: string) {
  if (ehImobiliario(publicoOrg)) return "corretor";
  return temVariante(publicoOrg, "vend") ? "vendedor" : "SDR";
}

export function Sdrs(publicoOrg: string) {
  if (ehImobiliario(publicoOrg)) return "Corretores";
  return temVariante(publicoOrg, "vend") ? "Vendedores" : "SDRs";
}

export function sdrs(publicoOrg: string) {
  if (ehImobiliario(publicoOrg)) return "corretores";
  return temVariante(publicoOrg, "vend") ? "vendedores" : "SDRs";
}

// Imobiliário usa o termo do mercado, "VGV" (Valor Geral de Vendas), no
// lugar de "Faturamento" — é sempre maiúsculo (sigla), tanto no meio quanto
// no início de frase.
export function Faturamento(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "VGV" : "Faturamento";
}

export function faturamento(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "VGV" : "faturamento";
}

// "Repescagem futura de ICP" é jargão de vendas que corretor não usa —
// pediu pra ficar "Oportunidades futuras", mais simples de entender.
export function RepescagemFutura(publicoOrg: string) {
  if (ehImobiliario(publicoOrg)) return "Oportunidades futuras";
  // Sufixo ":of" = empresa que escolheu esse nome (orgs.nome_oportunidades_futuras,
  // ex.: Banker - Consorcio) — ver lib/supabase/middleware.ts.
  if (temVariante(publicoOrg, "of")) return "Oportunidades Futuras";
  return "Repescagem futura de ICP";
}

// Título do gráfico de evolução mensal no dashboard — imobiliário fala
// "vendas" (de imóvel), não "comercial".
export function TituloEvolucao(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Evolução das vendas" : "Evolução comercial";
}

// Rótulo da coluna de valor no gráfico de evolução mensal — igual à ideia
// de Faturamento()/VGV, mas preserva a palavra "Receita" pra mentoria (em
// vez de "Faturamento"), que é como esse gráfico específico sempre falou.
export function RotuloReceitaEvolucao(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "VGV" : Receita(publicoOrg);
}

// Empresa que chama "Receita" de "Comissão" (ex.: Banker - Consorcio, onde
// o que entra é a comissão da venda) — sufixo ":com", ver middleware.
export function Receita(publicoOrg: string) {
  return temVariante(publicoOrg, "com") ? "Comissão" : "Receita";
}

export function receita(publicoOrg: string) {
  return temVariante(publicoOrg, "com") ? "comissão" : "receita";
}
