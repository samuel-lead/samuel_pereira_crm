function digitosWhatsApp(telefone: string) {
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

  return digitos;
}

export function linkWhatsApp(telefone: string) {
  // Vai direto pro WhatsApp Web com a conversa aberta — o wa.me mostra uma
  // tela de propaganda/download antes, o que a gente não quer aqui.
  //
  // Já existiu uma tentativa de abrir o app do WhatsApp instalado no
  // computador (esquema "whatsapp://") antes de cair pro Web. Removida:
  // no Mac o navegador mostra um aviso de permissão pra abrir o app, e
  // como isso não fecha a aba nem esconde a página a tempo, a lógica de
  // fallback também abria o Web ao mesmo tempo — duas telas brigando,
  // o usuário precisava clicar várias vezes pra sair da confusão.
  return `https://web.whatsapp.com/send?phone=55${digitosWhatsApp(telefone)}`;
}
