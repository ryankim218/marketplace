"use client";

import { FormEvent, useState } from "react";
import { validateEmail } from "@/lib/validations";

type Status = {
  connected: boolean;
  ready: boolean;
  status: string;
  charges_enabled?: boolean;
  details_submitted?: boolean;
};

export default function ConnectStripePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Status | null>(null);

  async function checkStatus(normalizedEmail: string) {
    setChecking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/stripe/status?seller_email=${encodeURIComponent(normalizedEmail)}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check Stripe status.");
      setStatus(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not check Stripe status.");
    } finally {
      setChecking(false);
    }
  }

  async function startOnboarding() {
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || !validateEmail(normalizedEmail)) {
      setError("Enter a valid seller email.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seller_email: normalizedEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start onboarding.");
      window.location.assign(data.url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start onboarding.");
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await startOnboarding();
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <section className="rounded-[22px] border-2 border-slate-700 bg-white p-6">
        <h1 className="text-2xl font-black">Connect with Stripe</h1>
        <p className="mt-2 text-sm font-bold text-slate-600">
          Enter the seller email used on your marketplace listings.
        </p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label className="block text-sm font-black" htmlFor="seller-email">
            Seller email
          </label>
          <input
            id="seller-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seller@example.com"
            className="h-12 w-full rounded-xl border-2 border-slate-700 px-3 text-sm font-bold outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-[#1877f2] text-sm font-black text-white disabled:opacity-60"
          >
            {loading ? "Opening Stripe..." : "Connect with Stripe"}
          </button>
        </form>

        {email && (
          <button
            type="button"
            disabled={checking}
            onClick={() => void checkStatus(email.trim().toLowerCase())}
            className="mt-3 h-10 w-full rounded-xl border-2 border-slate-700 text-sm font-black"
          >
            {checking ? "Checking..." : "Check connection status"}
          </button>
        )}

        {status && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            {status.ready ? (
              <p className="text-sm font-black text-green-700">Stripe account ready</p>
            ) : status.connected ? (
              <div>
                <p className="text-sm font-black text-amber-700">
                  Onboarding incomplete
                </p>
                <button
                  type="button"
                  onClick={() => void startOnboarding()}
                  className="mt-3 h-10 w-full rounded-xl border-2 border-slate-700 text-sm font-black"
                >
                  Continue onboarding
                </button>
              </div>
            ) : (
              <p className="text-sm font-black text-slate-700">Not connected</p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
