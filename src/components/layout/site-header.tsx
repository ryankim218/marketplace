"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2"
          aria-label="Marketplace home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] text-xl font-black text-white">
            F
          </span>
          <span className="text-[18px] font-black text-slate-950">
            Marketplace
          </span>
        </Link>
        <nav className="ml-auto flex items-center gap-2" aria-label="Marketplace actions">
          <Link
            href="/connect-stripe"
            className="hidden h-9 items-center rounded-lg border-2 border-slate-900 px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-900 hover:text-white sm:inline-flex"
          >
            Connect Stripe
          </Link>
          <Link
            href="/create"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border-2 border-slate-900 px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-900 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create listing</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
