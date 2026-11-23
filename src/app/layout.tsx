import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Buy and sell items in your community",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#f4f6f8] text-slate-950">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
