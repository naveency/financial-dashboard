import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Financial Dashboard - Stock Analysis & Trading Tools",
  description: "Advanced financial dashboard for stock analysis featuring candlestick charts, EMA indicators, watchlists, and real-time market data visualization.",
  keywords: ["financial dashboard", "stock analysis", "trading tools", "candlestick charts", "EMA indicators", "market data"],
  authors: [{ name: "Financial Dashboard Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
