import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Apex Admin",
  description: "Club management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[var(--color-background)]">
      <body className={`${inter.variable} min-h-screen bg-[var(--color-background)] text-navy-900`}>
        {children}
      </body>
    </html>
  );
}
