export function linkWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");
  const comDDI = digitos.length <= 11 ? `55${digitos}` : digitos;
  // Vai direto pro WhatsApp Web com a conversa aberta — o wa.me mostra uma
  // tela de propaganda/download antes, o que a gente não quer aqui.
  return `https://web.whatsapp.com/send?phone=${comDDI}`;
}
