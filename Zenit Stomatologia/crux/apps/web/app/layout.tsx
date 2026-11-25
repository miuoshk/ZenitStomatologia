import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "crux · zenit.stomatologia",
  description: "Crux — system wewnętrzny zenit.stomatologia",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = (await cookies()).get("crux.theme")?.value === "dark" ? "dark" : "light";
  return (
    <html lang="pl" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
