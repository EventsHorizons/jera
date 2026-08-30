import { ThemeProvider } from "@/components/providers/theme-provider";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand/constants";
import { THEME_INIT_SCRIPT } from "@/lib/ui/theme";
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
    "Organiza tu dinero con claridad. Registra movimientos, sigue tu progreso y construye estabilidad financiera, paso a paso.",
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
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body
        className={`${inter.className} min-h-dvh overflow-x-hidden bg-background text-text`}
      >
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
