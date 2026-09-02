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

export type PreferenciaWhatsapp = "ambos" | "app" | "web";
const CHAVE_PREFERENCIA_WHATSAPP = "preferenciaAbrirWhatsapp";

// Preferência é por dispositivo, não por conta — por isso fica no
// localStorage do navegador, não no banco. Cada computador sabe se tem
// o app instalado ou não; a conta de usuário não sabe disso.
export function lerPreferenciaWhatsapp(): PreferenciaWhatsapp {
  if (typeof window === "undefined") return "ambos";
  const salva = window.localStorage.getItem(CHAVE_PREFERENCIA_WHATSAPP);
  return salva === "app" || salva === "web" ? salva : "ambos";
}

export function salvarPreferenciaWhatsapp(preferencia: PreferenciaWhatsapp) {
  window.localStorage.setItem(CHAVE_PREFERENCIA_WHATSAPP, preferencia);
}

// Sem preferência definida, dispara o app E o Web ao mesmo tempo, sem
// tentar adivinhar antes se o app está instalado — não dá pra saber isso
// de forma confiável (o navegador não avisa a tempo, então uma tentativa
// anterior de "tenta o app, e só abre o Web se não abriu" acabava abrindo
// os dois de qualquer jeito, só que atrasado e confuso). Com preferência
// definida (ver components/preferencia-whatsapp-form.tsx), abre só aquele.
export function abrirWhatsApp(telefone: string) {
  const preferencia = lerPreferenciaWhatsapp();

  if (preferencia === "app") {
    window.location.href = linkWhatsAppApp(telefone);
    return;
  }

  if (preferencia === "web") {
    // Sem tamanho fixo e sem noopener de propósito: com esses dois, o
    // navegador não reaproveita a aba já aberta do WhatsApp Web e ficava
    // abrindo uma nova a cada clique. Só o nome "whatsapp" já basta pro
    // navegador levar de volta a essa mesma aba nos cliques seguintes —
    // se ela estiver fechada, abre uma nova, normal.
    window.open(linkWhatsApp(telefone), "whatsapp");
    return;
  }

  window.open(linkWhatsApp(telefone), "whatsapp");
  window.location.href = linkWhatsAppApp(telefone);
}
