import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold">Listing not found</h1>
      <p className="mt-2 text-slate-500">
        This listing may have been removed or the link is invalid.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-[#1877f2] px-5 py-3 text-sm font-semibold text-white"
      >
        Browse listings
      </Link>
    </main>
  );
}
