import { CreateListingForm } from "@/components/marketplace/create-listing-form";

export default function CreatePage() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-1">
      <aside className="hidden w-[250px] shrink-0 border-r border-slate-200 px-5 py-6 md:block">
        <h1 className="text-[17px] font-black">Create new listing</h1>
        <nav className="mt-5 space-y-3 text-sm font-bold">
          <p className="rounded-lg bg-slate-100 px-3 py-2">Your listings</p>
          <p className="px-3 py-2">Seller help</p>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-7 sm:px-6"><CreateListingForm /></div>
    </main>
  );
}
