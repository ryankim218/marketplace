"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import type { Listing } from "@/types/marketplace";
import { ListingGrid, ListingGridSkeleton } from "./listing-grid";
import { Input } from "@/components/ui/input";

export function BrowseListings() {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedQuery(query.trim().replace(/\s+/g, " ")),
      300,
    );
    return () => window.clearTimeout(timeout);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category !== "All") params.set("category", category);
      if (debouncedQuery) params.set("q", debouncedQuery);
      const response = await fetch(`/api/listings?${params}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load listings.");
      setListings(data.listings || []);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not load listings.",
      );
    } finally {
      setLoading(false);
    }
  }, [category, debouncedQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  function searchField(className = "") {
    return (
      <div className={`relative ${className}`}>
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search listings"
          aria-label="Search listings by title or description"
          className={`h-9 rounded-full pl-9 ${query ? "pr-9" : ""}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-500 hover:bg-slate-200"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1">
      <aside className="hidden w-[190px] shrink-0 border-r border-slate-200/60 px-4 py-7 md:block">
        {searchField()}
        <h2 className="mt-7 text-[17px] font-black">Categories</h2>
        <nav className="mt-3 space-y-0.5" aria-label="Listing categories">
          {["All", ...CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`block w-full rounded-md px-2 py-1 text-left text-[13px] font-bold leading-4 ${category === item ? "bg-[#d9ecfb] text-slate-950" : "text-slate-800 hover:bg-slate-100"}`}
            >
              {item === "All" ? "Today's picks" : item}
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6">
        <h1 className="mb-5 text-[21px] font-black">
          {category === "All" ? "Today's picks" : category}
        </h1>
        <div className="mb-4 md:hidden">{searchField()}</div>
        <nav
          className="mb-5 flex gap-2 overflow-x-auto md:hidden"
          aria-label="Listing categories"
        >
          {["All", ...CATEGORIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full border-2 px-3 py-1.5 text-xs font-bold ${category === item ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}
            >
              {item === "All" ? "All" : item}
            </button>
          ))}
        </nav>
        {loading ? (
          <ListingGridSkeleton />
        ) : error ? (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 text-sm font-black underline"
            >
              Try again
            </button>
          </div>
        ) : listings.length ? (
          <>
            <p
              className="mb-3 text-xs font-semibold text-slate-500"
              aria-live="polite"
            >
              {listings.length} {listings.length === 1 ? "listing" : "listings"}{" "}
              found
            </p>
            <ListingGrid listings={listings} />
          </>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <h2 className="font-black">No matching items found</h2>
            <p className="mt-1 text-sm text-slate-600">
              {debouncedQuery
                ? `No listings match “${debouncedQuery}”${category !== "All" ? ` in ${category}` : ""}.`
                : `There are no listings in ${category} yet.`}
            </p>
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
