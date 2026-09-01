// Service worker mínimo — por enquanto só existe pra deixar o site
// instalável como app (é exigido pelo Chrome/Android; no iPhone a Apple
// nem exige isso, mas já deixamos pronto pra quando ligarmos as
// notificações de verdade na próxima etapa). Não guarda nada em cache
// de propósito — assim toda atualização do site chega na hora, sem
// versão antiga presa no celular de ninguém.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
