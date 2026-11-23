"use client";

import { FormEvent, useState } from "react";
import { validateEmail } from "@/lib/validations";

export function BuyNowButton({
  listingId,
  eligible,
  sold,
  compact = false,
}: {
  listingId: string;
  eligible: boolean;
  sold: boolean;
  compact?: boolean;
}) {
  const [buyerEmail, setBuyerEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !eligible || sold) return;

    setError("");
    const normalizedEmail = buyerEmail.trim().toLowerCase();
    if (normalizedEmail && !validateEmail(normalizedEmail)) {
      setError("Enter a valid buyer email.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_email: normalizedEmail || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      if (!data.url) throw new Error("Stripe did not return a checkout URL.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start checkout.");
      setLoading(false);
    }
  }

  if (sold) {
    if (compact) {
      return (
        <p className="mt-2 text-center text-xs font-black text-slate-600">Sold</p>
      );
    }
    return (
      <div className="mt-5 rounded-lg border-2 border-slate-300 bg-slate-100 px-4 py-3 text-center text-sm font-black text-slate-700">
        Sold
      </div>
    );
  }

  if (!eligible) {
    if (compact) return null;
    return (
      <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
        Buy Now unavailable until the seller connects Stripe.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className={compact ? "mt-2" : "mt-5 space-y-2"}>
      {!compact && (
        <>
          <label className="block text-xs font-black" htmlFor={`buyer-email-${listingId}`}>
            Buyer email (optional)
          </label>
          <input
            id={`buyer-email-${listingId}`}
            type="email"
            value={buyerEmail}
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="buyer@example.com"
            className="h-10 w-full rounded-lg border-2 border-slate-700 px-3 text-sm font-bold outline-none"
          />
        </>
      )}
      <button
        type="submit"
        disabled={loading}
        className="h-11 w-full rounded-lg bg-[#1877f2] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Opening Stripe Checkout..." : "Buy Now"}
      </button>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
