import Image from "next/image";
import Link from "next/link";
import type { Listing } from "@/types/marketplace";

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link href={`/listing/${listing.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-[18px] border-2 border-slate-700 bg-[#eaf3f8] transition group-hover:border-[#1877f2]">
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400"></div>
        )}
      </div>
      <div className="px-1 pt-2">
        <p className="text-[17px] font-black leading-tight">
          $
          {Number(listing.price).toLocaleString(undefined, {
            maximumFractionDigits: 2,
          })}
        </p>
        <h2 className="mt-1 line-clamp-2 text-[13px] font-bold leading-tight text-slate-900">
          {listing.title}
        </h2>
        {listing.location && (
          <p className="mt-1 text-[12px] font-bold text-slate-600">
            {listing.location}
          </p>
        )}
      </div>
    </Link>
  );
}
