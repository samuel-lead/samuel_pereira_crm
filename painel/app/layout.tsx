import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const fonte = Manrope({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM",
  description: "Sistema de gestão de clientes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              if (localStorage.getItem("tema") === "escuro") {
                document.documentElement.classList.add("dark");
              }
            } catch (e) {}`,
          }}
        />
      </head>
      <body className={fonte.className}>{children}</body>
    </html>
  );
}
