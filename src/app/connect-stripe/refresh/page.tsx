import Link from "next/link";

export default function ConnectStripeRefreshPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <section className="rounded-[22px] border-2 border-slate-700 bg-white p-6">
        <h1 className="text-2xl font-black">Continue Stripe onboarding</h1>
        <p className="mt-2 text-sm font-bold text-slate-600">
          The previous onboarding link expired. Start a new hosted onboarding session.
        </p>
        <Link
          href="/connect-stripe"
          className="mt-5 inline-flex h-11 items-center rounded-lg bg-[#1877f2] px-4 text-sm font-black text-white"
        >
          Continue
        </Link>
      </section>
    </main>
  );
}
