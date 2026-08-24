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
