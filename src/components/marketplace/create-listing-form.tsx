"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Upload } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateListingForm() {
  const router = useRouter();
  const submissionInProgress = useRef(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("Palo Alto, CA");
  const [sellerEmail, setSellerEmail] = useState("");

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] || null;
    if (!next) return;
    if (!next.type.startsWith("image/"))
      return setError("Choose an image file.");
    if (next.size > 5 * 1024 * 1024)
      return setError("Image must be 5 MB or smaller.");
    setError("");
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionInProgress.current) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const sellerEmail = String(form.get("seller_email") || "").trim();
    const price = String(form.get("price") || "").trim();
    const category = String(form.get("category") || "");
    const location = String(form.get("location") || "").trim();
    if (!file) return setError("A photo is required.");
    if (!title || title.length > 255)
      return setError("Enter a title of 255 characters or fewer.");
    if (!description) return setError("Enter a description.");
    if (!validateEmail(sellerEmail))
      return setError("Enter a valid seller email.");
    if (!category) return setError("Select a category.");
    if (!price || !Number.isFinite(Number(price)) || Number(price) < 0)
      return setError("Enter a valid non-negative price.");

    const supabase = getBrowserSupabase();
    if (!supabase)
      return setError(
        "Supabase is not configured. Add the environment variables and try again.",
      );
    submissionInProgress.current = true;
    setSubmitting(true);
    let listingId: string;
    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(uploadError.message);
      const { data: publicData } = supabase.storage
        .from("listing-images")
        .getPublicUrl(path);
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price,
          seller_email: sellerEmail,
          category,
          location,
          image_url: publicData.publicUrl,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not create listing.");
      listingId = result.listing.id;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not create listing.",
      );
      submissionInProgress.current = false;
      setSubmitting(false);
      return;
    }
    router.push(`/listing/${listingId}`);
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-5 lg:grid-cols-[280px_minmax(280px,1fr)]"
    >
      <div className="space-y-4">
        <label className="relative flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border-2 border-slate-700 bg-slate-50">
          {preview ? (
            <Image
              src={preview}
              alt="Listing preview"
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-[18px] font-black text-slate-700">
              <Camera className="h-7 w-7" />
              Add photos
            </span>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={selectFile}
            className="sr-only"
          />
        </label>
        <div>
          <label className="sr-only" htmlFor="title">
            Title
          </label>
          <Input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={255}
            placeholder="Title"
            className="h-14 rounded-[18px] border-2 border-slate-700"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="price">
            Price
          </label>
          <Input
            id="price"
            name="price"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            min="0"
            step="0.01"
            placeholder="Price"
            className="h-14 rounded-[18px] border-2 border-slate-700"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="seller_email">
            Seller email
          </label>
          <Input
            id="seller_email"
            name="seller_email"
            value={sellerEmail}
            onChange={(event) => setSellerEmail(event.target.value)}
            type="email"
            placeholder="Email"
            className="h-14 rounded-[18px] border-2 border-slate-700"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            maxLength={5000}
            rows={4}
            className="w-full rounded-[18px] border-2 border-slate-700 bg-white px-3 py-3 text-sm font-bold outline-none"
            placeholder="Description"
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            name="category"
            className="h-11 w-full rounded-[12px] border-2 border-slate-700 bg-white px-3 text-sm font-bold"
          >
            <option value="">Category</option>
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="sr-only" htmlFor="location">
            Location
          </label>
          <Input
            id="location"
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Location"
            className="h-11 rounded-[12px] border-2 border-slate-700"
          />
        </div>
        {error && (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={submitting}
          className="h-14 w-full rounded-[12px] text-base"
        >
          <Upload className="mr-2 h-4 w-4" />
          {submitting ? "Publishing..." : "Next"}
        </Button>
      </div>
      <section className="h-fit overflow-hidden rounded-[22px] border-2 border-slate-700 bg-white">
        <div className="relative aspect-[4/3] bg-[#eaf3f8]">
          {preview ? (
            <Image
              src={preview}
              alt="Listing preview"
              fill
              unoptimized
              className="object-contain"
            />
          ) : (
            <span className="absolute left-1/2 top-6 -translate-x-1/2 text-sm font-black">
              Preview
            </span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <h2 className="min-w-0 text-[19px] font-black leading-tight">
              {title || "Title"}
            </h2>
            <p className="shrink-0 text-[19px] font-black">
              {price ? `$${price}` : "Price"}
            </p>
          </div>
          <p className="mt-3 text-sm font-bold leading-5">
            Listed 1 hour ago
            <br />
            in {location || "Palo Alto, CA"}
          </p>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <p className="text-[15px] font-black">Seller Information</p>
            <p className="mt-2 break-all text-sm font-bold">
              {sellerEmail || "Seller email"}
            </p>
          </div>
        </div>
      </section>
    </form>
  );
}
