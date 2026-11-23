"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageSellerForm({ listingId }: { listingId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    const buyerEmail = String(form.get("buyer_email") || "").trim();
    const message = String(form.get("message") || "").trim();
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_email: buyerEmail,
          message,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not send message.");
      setSuccess(true);
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send message.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        setSubmitting(true);
        submit(event);
      }}
      className="mt-2 space-y-3"
    >
      <div>
        <label htmlFor="buyer_email" className="sr-only">
          Your email
        </label>
        <Input
          id="buyer_email"
          name="buyer_email"
          type="email"
          required
          placeholder="Your email"
          className="h-10 rounded-lg border-2 border-slate-400"
        />
      </div>
      <div>
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={2000}
          rows={5}
          className="w-full rounded-[16px] border-2 border-slate-700 px-3 py-3 text-sm font-bold outline-none focus:border-[#1877f2]"
          placeholder="I want to buy this!"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          Message sent successfully.
        </p>
      )}
      <Button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-[10px] text-base"
      >
        {submitting ? "Sending..." : "Send"}
      </Button>
    </form>
  );
}
