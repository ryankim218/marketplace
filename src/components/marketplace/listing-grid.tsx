import type { Listing } from "@/types/marketplace";
import { ListingCard } from "./listing-card";

export function ListingGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading listings"
      aria-busy="true"
      className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      <span className="sr-only">Loading listings…</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden="true" className="space-y-2">
          <div className="skeleton-shimmer aspect-square rounded-[18px] border-2 border-slate-300" />
          <div className="space-y-2 px-1 pt-1">
            <div className="skeleton-shimmer h-5 w-[34%] rounded" />
            <div className="skeleton-shimmer h-3.5 w-[86%] rounded" />
            <div className="skeleton-shimmer h-3 w-[57%] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListingGrid({ listings }: { listings: Listing[] }) {
  if (!listings.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <h2 className="font-semibold text-slate-800">No listings found</h2>
        <p className="mt-1 text-sm text-slate-500">
          Try another category or search term.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
