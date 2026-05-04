import type { Metadata, Viewport } from "next";
import "./globals.css";
import { UserProvider } from "@/lib/user-context-rtk";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { DevToolPanel } from "@/components/DevToolPanel";

export const metadata: Metadata = {
  title: "col",
  description: "simply training",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Runs before React hydration to apply persisted UI preferences (sidebar
// expanded/collapsed). Without this, the SideNav briefly renders in its
// default state and then snaps to the user's saved state — visible CLS.
const noFlashScript = `
try {
  var v = localStorage.getItem('sideNavExpanded');
  if (v !== null) {
    document.documentElement.dataset.sideNav = JSON.parse(v) ? 'expanded' : 'collapsed';
  }
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="overflow-x-hidden">
        <head>
          <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
        </head>
        <body className="min-h-screen bg-background font-sans antialiased overflow-x-hidden">
          <UserProvider>
            {children}
            <DevToolPanel />
          </UserProvider>
          <Toaster position="top-right" richColors closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
