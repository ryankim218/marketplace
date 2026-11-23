"use client";

import { FormEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageSellerForm({ listingId }: { listingId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notificationStatus, setNotificationStatus] = useState("");
  const submittingRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setNotificationStatus("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const buyerEmail = String(form.get("buyer_email") || "").trim();
    const message = String(form.get("message") || "").trim();
    submissionIdRef.current ??= crypto.randomUUID();
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          buyer_email: buyerEmail,
          message,
          submission_id: submissionIdRef.current,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not send message.");
      formElement.reset();
      setNotificationStatus(data.notificationStatus || "sent");
      submissionIdRef.current = null;
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not send message.",
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-3">
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
      {notificationStatus && (
        <p
          role="status"
          className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
        >
          {notificationStatus === "sent"
            ? "Your message was saved and the seller has been notified."
            : notificationStatus === "duplicate"
              ? "Your message was already saved. The seller notification may not have been sent."
              : "Your message was saved, but we couldn't deliver an email notification to the seller."}
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
