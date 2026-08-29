import { APP_NAME, APP_TAGLINE } from "@/lib/brand/constants";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Mono is only used on amounts / code — don't preload on every page.
const geistMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    "Jera te ayuda a registrar gastos al instante, ver tu balance y mantener el control de tu dinero con claridad.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className={`${inter.className} min-h-dvh overflow-x-hidden bg-background text-text`}
      >
        {children}
      </body>
    </html>
  );
}
