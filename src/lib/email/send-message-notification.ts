import { Resend } from "resend";
import { validateEmail } from "@/lib/validations";
import type { Listing } from "@/types/marketplace";

export type NotificationStatus = "sent" | "failed" | "not_configured";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendMessageNotification({
  listing,
  buyerEmail,
  message,
  origin,
}: {
  listing: Pick<
    Listing,
    "id" | "title" | "price" | "image_url" | "seller_email"
  >;
  buyerEmail: string;
  message: string;
  origin: string;
}): Promise<NotificationStatus> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return "not_configured";
  if (!validateEmail(listing.seller_email)) {
    console.error(
      "Resend notification skipped: listing has an invalid seller email.",
    );
    return "failed";
  }

  try {
    const listingUrl = new URL(
      `/listing/${encodeURIComponent(listing.id)}`,
      origin,
    ).toString();
    const safeTitle = escapeHtml(listing.title);
    const safeBuyer = escapeHtml(buyerEmail);
    const safeMessage = escapeHtml(message);
    const safeListingUrl = escapeHtml(listingUrl);
    const price = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(listing.price));
    let allowedImageUrl = false;
    if (listing.image_url) {
      try {
        const image = new URL(listing.image_url);
        const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
          ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL)
          : null;
        allowedImageUrl =
          image.protocol === "https:" &&
          image.hostname === supabase?.hostname &&
          image.pathname.startsWith(
            "/storage/v1/object/public/listing-images/",
          );
      } catch {
        allowedImageUrl = false;
      }
    }
    const imageUrl =
      allowedImageUrl && listing.image_url
        ? `<img src="${escapeHtml(listing.image_url)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px;margin:20px auto;" />`
        : "";
    const subjectTitle = listing.title
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .slice(0, 120);
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from,
      to: listing.seller_email,
      replyTo: buyerEmail,
      subject: `New inquiry about your listing: ${subjectTitle}`,
      text: [
        "Marketplace — New buyer inquiry",
        "",
        `Listing: ${listing.title}`,
        `Price: ${price}`,
        `Buyer: ${buyerEmail}`,
        "",
        "Message:",
        message,
        "",
        `View listing: ${listingUrl}`,
        "Reply directly to this email to contact the buyer.",
      ].join("\n"),
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
      <div style="padding:24px;background:#1877f2;color:#ffffff;font-size:20px;font-weight:700;">Marketplace</div>
      <div style="padding:24px;">
        <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;">You have a new buyer inquiry</h1>
        <p style="margin:0;color:#475569;">A buyer sent you a message about your listing.</p>
        ${imageUrl}
        <div style="margin:20px 0;padding:16px;background:#f8fafc;border-radius:12px;">
          <h2 style="margin:0 0 6px;font-size:18px;">${safeTitle}</h2>
          <p style="margin:0;font-size:16px;font-weight:700;">${escapeHtml(price)}</p>
        </div>
        <p style="margin:0 0 8px;"><strong>Buyer:</strong> <a href="mailto:${safeBuyer}" style="color:#1877f2;">${safeBuyer}</a></p>
        <div style="padding:16px;border:1px solid #e2e8f0;border-radius:12px;line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere;">${safeMessage}</div>
        <p style="margin:20px 0;">
          <a href="${safeListingUrl}" style="display:inline-block;padding:12px 18px;background:#1877f2;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">View listing</a>
        </p>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Reply directly to this email to respond to ${safeBuyer}.</p>
      </div>
    </div>
  </body>
</html>`,
    });

    if (error) {
      console.error("Resend notification failed.", {
        name: error.name,
        statusCode: error.statusCode,
      });
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("Resend notification failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return "failed";
  }
}
