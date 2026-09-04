// Mesma normalização que a coluna gerada `nome_busca` faz no banco (ver
// migration leads_busca_sem_acento) — usada aqui pra preparar o termo
// digitado antes de comparar, senão buscar "Junior" nunca acha "Júnior".
// Filtra por código numérico (marcas de acentuação ficam entre 0x0300 e
// 0x036f depois do normalize) em vez de regex com caractere literal, pra
// não depender de como o editor/terminal exibe um acento solto.
export function removerAcento(texto: string) {
  return Array.from(texto.normalize("NFD"))
    .filter((c) => {
      const codigo = c.codePointAt(0) ?? 0;
      return codigo < 0x0300 || codigo > 0x036f;
    })
    .join("")
    .toLowerCase();
}

// Vira um pedaço de URL: sem acento, minúsculo, espaço e símbolo viram
// hífen. Usado pra sugerir o link público de uma isca a partir do nome.
export function slugificar(texto: string): string {
  return removerAcento(texto)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "5562993237085" (formato salvo, telefone_e164 sem o "+") vira
// "(62) 99323-7085" pra exibir nos cards — separa DDD e quebra o número
// em dois grupos, igual todo mundo já lê um telefone no Brasil. Quando
// falta o DDD no cadastro (9 ou 8 dígitos só), formata mesmo assim sem o
// parênteses — não dá pra adivinhar o DDD, mas dá pra separar o número.
export function formatarTelefone(telefone: string): string {
  let digitos = telefone.replace(/\D/g, "");

  // "0" sobrando na frente do DDD — mesmo erro de digitação tratado em
  // normalizarTelefone/lib/whatsapp.ts, tratado aqui também pra exibir
  // certo mesmo um telefone salvo antes dessa correção existir.
  if (digitos.startsWith("0") && (digitos.length === 11 || digitos.length === 12)) {
    digitos = digitos.slice(1);
  }

  if (digitos.length >= 12 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  if (digitos.length === 9) {
    return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
  }
  if (digitos.length === 8) {
    return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
  }
  return telefone;
}

// O campo instagram do lead aceita "@usuario" ou o link do perfil (ver
// editar-lead-form.tsx) — essas duas funções tiram o @ pra exibir e
// montam o link certo pra abrir o perfil, não importa em qual formato
// foi salvo.
export function handleInstagram(valor: string): string {
  const semEspacos = valor.trim();
  const doLink = semEspacos.match(/instagram\.com\/([^/?]+)/i);
  return (doLink ? doLink[1] : semEspacos).replace(/^@/, "");
}

export function linkInstagram(valor: string): string {
  return `https://instagram.com/${handleInstagram(valor)}`;
}
