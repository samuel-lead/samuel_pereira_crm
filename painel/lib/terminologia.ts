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
export function Sdr(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Corretor" : "SDR";
}

export function sdr(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "corretor" : "SDR";
}

export function Sdrs(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "Corretores" : "SDRs";
}

export function sdrs(publicoOrg: string) {
  return ehImobiliario(publicoOrg) ? "corretores" : "SDRs";
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
  return ehImobiliario(publicoOrg) ? "Oportunidades futuras" : "Repescagem futura de ICP";
}
