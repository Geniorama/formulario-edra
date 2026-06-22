import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Joyería Edra · Tailor-Made Love",
  description:
    "Descubre tu estilo EDRA. Joyería especializada en joyas con el mejor diseño, elaboradas a partir de metales preciosos certificados.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${montserrat.variable} h-full antialiased`}>
      <body className="min-h-full bg-edra-bg text-edra-ink">{children}</body>
    </html>
  );
}
