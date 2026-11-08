import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import { RefreshButton } from "@/components/RefreshButton";
import { Sidebar } from "@/components/Sidebar";
import { plaidConfigured } from "@/lib/plaid";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "Where your money goes, from your own Plaid connections.",
  applicationName: "Finance",
  appleWebApp: { capable: true, title: "Finance", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#fefdfc",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = plaidConfigured();
  return (
    <html lang="en" className={lexend.variable}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
      </head>
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:flex-row">
          <Sidebar footer={configured ? <RefreshButton /> : null} />
          <main className="min-w-0 flex-1 px-4 pt-6 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-8 md:py-10">
            <div className="mx-auto max-w-4xl has-[.page-wide]:max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
