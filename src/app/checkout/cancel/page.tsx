import Link from "next/link";

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ listing_id?: string }>;
}) {
  const { listing_id: listingId } = await searchParams;
  const backHref = listingId ? `/listing/${listingId}` : "/";

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <section className="rounded-[22px] border-2 border-slate-700 bg-white p-6">
        <h1 className="text-2xl font-black">Checkout canceled</h1>
        <p className="mt-2 text-sm font-bold text-slate-600">
          No confirmed payment was recorded. The listing remains available unless another buyer completed it.
        </p>
        <Link
          href={backHref}
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#1877f2] px-4 text-sm font-black text-white"
        >
          Return to listing
        </Link>
      </section>
    </main>
  );
}
