import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const fonte = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meu Vendedor",
  description: "Sistema de gestão de clientes",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meu Vendedor",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

// O banco (Supabase) fica em São Paulo. Sem isso, a Vercel roda as
// funções nos EUA por padrão — toda consulta ao banco cruzava o
// continente e voltava, e isso sozinho já custava a maior parte do
// tempo de carregamento de cada página.
export const preferredRegion = "gru1";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Tag antiga do iPhone — alguns iOS só reconhecem essa versão
            pra deixar o site virar app de verdade na tela de início. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem("tema") === "escuro") {
                document.documentElement.classList.add("dark");
              }
            } catch (e) {}`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `if ("serviceWorker" in navigator) {
              window.addEventListener("load", function () {
                navigator.serviceWorker.register("/sw.js").catch(function () {});
              });
            }`,
          }}
        />
      </head>
      <body className={fonte.className}>{children}</body>
    </html>
  );
}
