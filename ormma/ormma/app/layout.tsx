import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ormma - Kerala's Own AI",
  description: "Ormma (ഓർമ്മ) is Kerala's own AI assistant. Ask in Malayalam, English or Manglish.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ml">
      <body>{children}</body>
    </html>
  );
}
