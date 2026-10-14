// Público imobiliário usa "Visita" onde o resto do sistema fala "Reunião"
// ou "Call" — no mercado de imóveis não existe esse vocabulário, só visita.
// Mentoria/serviço continua exatamente como sempre foi.
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
  return ehImobiliario(publicoOrg) ? "VGV" : "Receita";
}
