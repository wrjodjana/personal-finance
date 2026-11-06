import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { RefreshButton } from "@/components/RefreshButton";
import { Sidebar } from "@/components/Sidebar";
import { plaidConfigured } from "@/lib/plaid";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend" });

export const metadata: Metadata = {
  title: "Personal Finance",
  description: "Where your money goes, from your own Plaid connections.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const configured = plaidConfigured();
  return (
    <html lang="en" className={lexend.variable}>
      <body className="min-h-screen font-sans">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar footer={configured ? <RefreshButton /> : null} />
          <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 md:py-10">
            <div className="mx-auto max-w-4xl has-[.page-wide]:max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
