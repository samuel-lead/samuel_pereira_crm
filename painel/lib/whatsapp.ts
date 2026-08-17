export function linkWhatsApp(telefone: string) {
  let digitos = telefone.replace(/\D/g, "");

  // Se já veio com o 55 (código do Brasil) na frente, tira pra recalcular
  // do zero — evita duplicar ou faltar dígito.
  if (digitos.length >= 12 && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }

  // Celular brasileiro sem o "9" na frente (DDD + 8 dígitos, formato antigo)
  // — completa, senão o WhatsApp não reconhece o número.
  if (digitos.length === 10) {
    digitos = `${digitos.slice(0, 2)}9${digitos.slice(2)}`;
  }

  // Vai direto pro WhatsApp Web com a conversa aberta — o wa.me mostra uma
  // tela de propaganda/download antes, o que a gente não quer aqui.
  return `https://web.whatsapp.com/send?phone=55${digitos}`;
}
