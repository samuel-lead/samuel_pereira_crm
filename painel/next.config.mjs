/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  agentRules: false,
  // Bolinha preta com "N" que aparece no canto da tela durante o
  // desenvolvimento (só na prévia que a gente usa pra testar, nunca no
  // site publicado) — Samuel achou confuso, tira daqui.
  devIndicators: false,
};

export default nextConfig;
