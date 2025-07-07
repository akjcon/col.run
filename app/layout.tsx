import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Mountain } from "lucide-react";

export const metadata: Metadata = {
  title: "50K Trail Training Plan",
  description: "12-week training plan for September 14th race",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center px-4">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Mountain className="h-6 w-6" />
              <span className="hidden font-bold sm:inline-block">
                50K Training Plan
              </span>
            </Link>
            <div className="flex flex-1 items-center justify-end space-x-4 text-sm">
              <Link
                href="/overview"
                className="text-foreground hover:text-primary transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/phase/base"
                className="text-foreground hover:text-primary transition-colors"
              >
                Phases
              </Link>
              <Link
                href="/strength"
                className="text-foreground hover:text-primary transition-colors"
              >
                Strength
              </Link>
              <Link
                href="/nutrition-recovery"
                className="text-foreground hover:text-primary transition-colors"
              >
                Nutrition
              </Link>
              <Link
                href="/training-log"
                className="text-foreground hover:text-primary transition-colors"
              >
                Log
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
