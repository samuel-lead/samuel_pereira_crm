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
  return `https://web.whatsapp.com/send?phone=55${digitosWhatsApp(telefone)}`;
}

// O app do WhatsApp instalado no computador (Mac/Windows) reconhece esse
// esquema de link e abre a conversa direto nele, sem passar pelo navegador.
export function linkWhatsAppApp(telefone: string) {
  return `whatsapp://send?phone=55${digitosWhatsApp(telefone)}`;
}

// Tenta abrir o app do WhatsApp instalado no computador; se em meio segundo
// a aba não perdeu o foco (sinal de que o app não abriu), cai pro WhatsApp
// Web via `aoAbrirWeb`.
export function abrirWhatsApp(telefone: string, aoAbrirWeb: () => void) {
  let appAbriu = false;

  function aoEsconder() {
    if (document.hidden) appAbriu = true;
  }

  document.addEventListener("visibilitychange", aoEsconder);
  window.location.href = linkWhatsAppApp(telefone);

  setTimeout(() => {
    document.removeEventListener("visibilitychange", aoEsconder);
    if (!appAbriu) aoAbrirWeb();
  }, 500);
}
