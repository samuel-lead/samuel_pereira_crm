// Só completa com o 55 (Brasil) quando o número claramente não tem
// código de país nenhum (DDD + número solto, o jeito mais comum de
// cadastrar por aqui). Número que já vem com código de país diferente
// (ex.: Portugal +351) passa direto, sem o Brasil "grudado" na frente —
// antes isso quebrava o link pra qualquer lead de fora do Brasil.
function digitosWhatsApp(telefone: string) {
  const digitos = telefone.replace(/\D/g, "");

  // Já vem com o 55 na frente (DDD + 8 ou 9 dígitos) — usa como está.
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }

  // DDD + 9 dígitos, sem o 55 — completa com o código do Brasil.
  if (digitos.length === 11) {
    return `55${digitos}`;
  }

  // DDD + 8 dígitos (celular sem o "9" na frente, formato antigo) —
  // completa o "9" que falta e o código do Brasil.
  if (digitos.length === 10) {
    return `55${digitos.slice(0, 2)}9${digitos.slice(2)}`;
  }

  // Qualquer outro tamanho: provavelmente já é um número internacional
  // completo, com o código do próprio país — usa direto.
  return digitos;
}

export function linkWhatsApp(telefone: string) {
  // Vai direto pro WhatsApp Web com a conversa aberta — o wa.me mostra uma
  // tela de propaganda/download antes, o que a gente não quer aqui.
  return `https://web.whatsapp.com/send?phone=${digitosWhatsApp(telefone)}`;
}

// Esquema que o app do WhatsApp instalado no computador (Mac/Windows)
// reconhece e abre a conversa direto nele, sem passar pelo navegador.
function linkWhatsAppApp(telefone: string) {
  return `whatsapp://send?phone=${digitosWhatsApp(telefone)}`;
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
