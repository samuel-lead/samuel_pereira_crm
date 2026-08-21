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

// Esquema que o app do WhatsApp instalado no computador (Mac/Windows)
// reconhece e abre a conversa direto nele, sem passar pelo navegador.
function linkWhatsAppApp(telefone: string) {
  return `whatsapp://send?phone=55${digitosWhatsApp(telefone)}`;
}

// Dispara o app E o Web ao mesmo tempo, sem tentar adivinhar antes se o
// app está instalado — não dá pra saber isso de forma confiável (o
// navegador não avisa a tempo, então uma tentativa anterior de "tenta o
// app, e só abre o Web se não abriu" acabava abrindo os dois de qualquer
// jeito, só que atrasado e confuso). Disparando junto: se o app existir,
// abre os dois (a aba Web fica sobrando, mas não atrapalha); se não
// existir, só a aba Web abre.
export function abrirWhatsApp(telefone: string) {
  window.open(
    linkWhatsApp(telefone),
    "whatsapp",
    "width=420,height=680,noopener,noreferrer"
  );
  window.location.href = linkWhatsAppApp(telefone);
}

// Pra mandar um texto (ex.: relatório) sem destinatário fixo — a pessoa
// escolhe pra quem manda dentro do próprio WhatsApp. Mesma lógica de
// disparar app + Web juntos que o abrirWhatsApp usa.
export function compartilharNoWhatsApp(texto: string) {
  const textoCodificado = encodeURIComponent(texto);
  window.open(
    `https://wa.me/?text=${textoCodificado}`,
    "whatsapp",
    "width=420,height=680,noopener,noreferrer"
  );
  window.location.href = `whatsapp://send?text=${textoCodificado}`;
}
