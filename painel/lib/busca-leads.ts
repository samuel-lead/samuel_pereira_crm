import { handleInstagram, removerAcento } from "@/lib/texto";

// Busca de lead por NOME, TELEFONE, E-MAIL, CPF, CNPJ ou INSTAGRAM numa caixa só
// (Samuel, 22/10/26). Só nome não bastava — na importação de lista de
// empresas o que se tem na mão é o CNPJ ou o telefone.
//
// - Nome: compara sem acento e sem maiúscula (coluna gerada nome_busca).
// - E-mail: compara o texto digitado.
// - Telefone e CPF/CNPJ: compara só os DÍGITOS (ignora ( ) - . / e espaço), então
//   "(62) 99999-1111" acha 5562999991111 e "12.345.678/0001-90" acha o CNPJ.
//   Só busca por dígitos se tiver pelo menos 3 (pra "a1" não trazer o CRM inteiro).
// - Instagram (Samuel, 11/11/26): quando o termo começa com "@" ou é um link
//   do Instagram, procura o @ no campo instagram do lead — que pode estar salvo
//   como "@fulano" ou como link do perfil, tanto faz. Só nesses dois formatos
//   (pra um nome comum não trazer lead por causa do @ dele).
//
// `consulta` é uma consulta do Supabase sobre "leads".
// deno-lint-ignore no-explicit-any
export function aplicarBuscaLead<T extends { or: (filtros: string) => any }>(
  consulta: T,
  termoBruto: string
): T {
  // Vírgula, parêntese e aspas quebram o formato do filtro — tiram do termo.
  const termo = termoBruto.replace(/[,()"\\]/g, " ").trim();
  if (!termo) return consulta;

  const filtros = [
    `nome_busca.ilike.%${removerAcento(termo)}%`,
    `email.ilike.%${termo}%`,
  ];

  const digitos = termo.replace(/\D/g, "");
  if (digitos.length >= 3) {
    filtros.push(`telefone_e164.ilike.%${digitos}%`);
    filtros.push(`documento_busca.ilike.%${digitos}%`);
  }

  const ehLinkInstagram = /instagram\.com\//i.test(termo);
  if (termo.startsWith("@") || ehLinkInstagram) {
    const handle = handleInstagram(termo).replace(/[%\s]/g, "");
    if (handle.length >= 2) filtros.push(`instagram.ilike.%${handle}%`);
  }

  return consulta.or(filtros.join(","));
}
