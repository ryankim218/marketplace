import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { MessageSellerForm } from "@/components/marketplace/message-seller-form";
import { BuyNowButton } from "@/components/marketplace/buy-now-button";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = getServerSupabase();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          Supabase is not configured.
        </p>
      </main>
    );
  }
  const { data: listing } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!listing) notFound();

  const admin = getSupabaseAdmin();
  let purchaseEligible = false;
  if (admin) {
    const { data: seller } = await admin
      .from("seller_accounts")
      .select("charges_enabled,details_submitted")
      .eq("seller_email", String(listing.seller_email).trim().toLowerCase())
      .maybeSingle();
    purchaseEligible =
      listing.status !== "sold" &&
      seller?.charges_enabled === true &&
      seller?.details_submitted === true;
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-5 sm:px-6">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Link>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px]">
        <section className="overflow-hidden rounded-[22px] border-2 border-slate-700 bg-[#eef4f7]">
          <div className="relative min-h-[420px] aspect-[4/3] lg:min-h-[620px]">
            {listing.image_url ? (
              <Image
                src={listing.image_url}
                alt={listing.title}
                fill
                sizes="(max-width: 768px) 100vw, 70vw"
                className="object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-slate-400"></div>
            )}
          </div>
        </section>
        <aside className="h-fit px-2 py-4">
          <h1 className="text-[22px] font-black leading-tight">
            {listing.title}
          </h1>
          <p className="mt-1 text-[22px] font-black">
            $
            {Number(listing.price).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </p>
          <p className="mt-1 text-[14px] leading-6">{listing.description}</p>
          <p className="mt-5 text-[15px] font-bold leading-6">
            Listed {new Date(listing.created_at).toLocaleDateString()}
            <br />
            in {listing.location || "Palo Alto, CA"}
          </p>
          <p className="mt-7 text-[15px] font-black">Seller Information</p>
          <p className="mt-1 break-all text-[14px] font-bold">
            {listing.seller_email}
          </p>
          <BuyNowButton
            listingId={listing.id}
            eligible={purchaseEligible}
            sold={listing.status === "sold"}
          />
          <p className="mt-7 text-[15px] font-black">Send seller a message</p>
          <MessageSellerForm listingId={listing.id} />
        </aside>
      </div>
    </main>
  );
}
