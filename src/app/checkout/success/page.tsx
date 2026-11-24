import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  let order: Record<string, unknown> | null = null;

  if (sessionId) {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      console.error("Supabase admin configuration is missing for checkout confirmation.");
    } else {
      const { data, error } = await supabase
        .from("orders")
        .select("id,listing_id,amount,currency,payment_status,paid_at")
        .eq("checkout_session_id", sessionId)
        .maybeSingle();
      if (error) {
        console.error("Could not retrieve checkout order.", { code: error.code });
      } else {
        order = data;
      }
    }
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <section className="rounded-[22px] border-2 border-slate-700 bg-white p-6">
        {order ? (
          <>
            <h1 className="text-2xl font-black">Purchase confirmed</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Your payment is confirmed. This listing is now sold.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black">Payment confirmation pending</h1>
            <p className="mt-2 text-sm font-bold text-slate-600">
              Stripe received the checkout. The order confirmation may take a moment to arrive.
            </p>
          </>
        )}
        <Link
          href="/"
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#1877f2] px-4 text-sm font-black text-white"
        >
          Back to Marketplace
        </Link>
      </section>
    </main>
  );
}
