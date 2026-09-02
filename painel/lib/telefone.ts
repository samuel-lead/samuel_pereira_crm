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

// Confere se um telefone já normalizado (com o 55 na frente) tem o
// tamanho certo de um número brasileiro de verdade — 55 + DDD (2) +
// número (8 pro fixo, 9 pro celular). Pega na hora números digitados
// errado de propósito ou por engano (ex.: "9999999999999999").
export function telefoneValido(numeroNormalizado: string): boolean {
  return (
    numeroNormalizado.startsWith("55") &&
    (numeroNormalizado.length === 12 || numeroNormalizado.length === 13)
  );
}
