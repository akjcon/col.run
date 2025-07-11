import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "./navigation";
import { UserProvider } from "@/lib/user-context";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "col",
  description: "simply training",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-background font-sans antialiased">
          <UserProvider>
            <Navigation />
            <main className="flex-1 container mx-auto">{children}</main>
          </UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
