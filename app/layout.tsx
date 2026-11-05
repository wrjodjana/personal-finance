import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/Nav";
import { RefreshButton } from "@/components/RefreshButton";
import { plaidConfigured } from "@/lib/plaid";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "Where your money goes, from your own Plaid connections.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = plaidConfigured();
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-10 border-b border-stone-200/80 bg-[#f7f7f5]/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
            <Nav />
            {configured && (
              <div className="ml-auto">
                <RefreshButton />
              </div>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
