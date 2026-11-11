/** @type {import('next').NextConfig} */

// Segurança (11/11/26): cabeçalhos que o navegador obedece em todas as telas.
// - Frame-Options / frame-ancestors: ninguém consegue embutir o CRM dentro de
//   outro site escondido pra enganar clique (clickjacking).
// - nosniff: o navegador não "adivinha" tipo de arquivo (bloqueia truque de
//   arquivo disfarçado).
// - Strict-Transport-Security: obriga o navegador a só usar https com o site.
// - Referrer-Policy: não vaza o endereço completo das telas pra outros sites.
// - Permissions-Policy: o site não pede câmera, microfone nem localização.
const cabecalhosDeSeguranca = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  // Bolinha preta com "N" que aparece no canto da tela durante o
  // desenvolvimento (só na prévia que a gente usa pra testar, nunca no
  // site publicado) — Samuel achou confuso, tira daqui.
  devIndicators: false,
  // Não avisa qual tecnologia o site usa (menos pista pra quem procura falha).
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabecalhosDeSeguranca }];
  },
};

export default nextConfig;
