// Deixa qualquer telefone digitado (com parênteses, traço, espaço, com ou
// sem o 55 na frente) no mesmo formato — só dígitos, sempre com o código
// do país. Sem isso, "5511933681288" e "(11) 93368-1288" viram dois leads
// diferentes pro banco, mesmo sendo o mesmo número.
export function normalizarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (!digitos) return "";

  // Já tem código do país (Brasil = 55) + DDD + número.
  if (digitos.length >= 12) return digitos;

  // Só DDD + número (10 dígitos = fixo, 11 = celular) — falta o 55.
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;

  return digitos;
}

// DDDs de verdade (lista oficial da Anatel) — rejeita "62" com um número
// de 10 dígitos atrás dele só porque a conta bate, mas também rejeita
// DDD inventado tipo "00" ou "01".
const DDDS_VALIDOS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

// Confere se um telefone já normalizado (com o 55 na frente) é um WhatsApp
// brasileiro de verdade: 55 + DDD válido + número (8 dígitos pro fixo, ou
// 9 dígitos pro celular — e aí o primeiro tem que ser "9", regra do nono
// dígito). Pega na hora números digitados errado de propósito ou por
// engano (ex.: "9999999999999999", ou um DDD certo com número de outro
// tamanho tipo "628322150876").
export function telefoneValido(numeroNormalizado: string): boolean {
  if (!numeroNormalizado.startsWith("55")) return false;
  if (numeroNormalizado.length !== 12 && numeroNormalizado.length !== 13) return false;

  const ddd = Number(numeroNormalizado.slice(2, 4));
  if (!DDDS_VALIDOS.has(ddd)) return false;

  const numeroLocal = numeroNormalizado.slice(4);
  if (numeroLocal.length === 9 && numeroLocal[0] !== "9") return false;

  return true;
}
