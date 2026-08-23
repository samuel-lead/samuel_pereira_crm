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
