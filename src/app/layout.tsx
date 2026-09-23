import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bagnus Smart Tech",
  description: "Sistema de gestión del taller Bagnus",
  icons: {
    icon: [
      { url: "/brand/bagnus_favicon_32px.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/bagnus_favicon_64px.png", sizes: "64x64", type: "image/png" },
      { url: "/brand/bagnus_favicon_192px.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/bagnus_favicon_512px.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/brand/bagnus_favicon_32px.png",
    apple: "/brand/bagnus_favicon_192px.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
