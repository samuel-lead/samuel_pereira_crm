// Service worker — deixa o site instalável como app (Chrome/Android) e
// escuta as notificações push de verdade que chegam mesmo com o app
// fechado. Não guarda nada em cache de propósito — assim toda
// atualização do site chega na hora, sem versão antiga presa no
// celular de ninguém.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let dados = { titulo: "Meu Vendedor", corpo: "Você tem uma novidade no CRM.", url: "/leads" };
  try {
    if (event.data) dados = { ...dados, ...event.data.json() };
  } catch {
    // corpo do push não veio em JSON — usa o texto puro como mensagem
    if (event.data) dados.corpo = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: dados.url },
    })
  );
});

// Clica na notificação: se já tem uma aba do CRM aberta, foca nela;
// senão abre uma nova, direto na tela do lead (ou onde o aviso mandar).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/leads";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if ("focus" in janela) {
          janela.navigate(url);
          return janela.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
