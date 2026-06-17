import type { Metadata } from "next";
import { Spectral, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Editorial type system, self-hosted via next/font (no layout shift, no
// external font request at runtime). Spectral = display/headings, Inter = UI,
// JetBrains Mono = the Data/Rules authoring surfaces. Exposed as CSS variables
// that globals.css maps onto Tailwind's font-serif / font-sans / font-mono.
const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-spectral",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GenUI Studio — Daily Tool",
  description:
    "Your daily pile of text, rendered as an interface by an agent — within design rules you write.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spectral.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased">{children}</body>
    </html>
  );
}
