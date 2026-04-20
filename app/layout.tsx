import type { Metadata } from "next";
import { Inter, Heebo, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/features/auth/auth-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  display: "swap",
  variable: "--font-heebo",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "FrameForge — AI Creative Studio",
  description: "Canvas-first AI ad creative studio. Generate, chain, ship.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${heebo.variable} ${jetbrains.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans bg-canvas text-text-primary antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
