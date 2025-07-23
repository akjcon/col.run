import type { Metadata } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context-rtk";
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
      <html lang="en" className="overflow-x-hidden">
        <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
          <UserProvider>{children}</UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
