import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Touchline · Premier League Prediction Market",
  description: "A virtual portfolio for Premier League predictions. Back match outcomes with odds-weighted shares.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
