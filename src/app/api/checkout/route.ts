import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import {
  calculateApplicationFeeCents,
  decimalPriceToCents,
} from "@/lib/money";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConnectedAccountStatus } from "@/lib/stripe-account-status";
import { validateEmail } from "@/lib/validations";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const listingId =
    typeof body.listing_id === "string" ? body.listing_id.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(listingId)) {
    return NextResponse.json({ error: "A valid listing is required." }, { status: 400 });
  }

  const buyerEmail =
    typeof body.buyer_email === "string"
      ? body.buyer_email.trim().toLowerCase()
      : "";
  if (buyerEmail && (buyerEmail.length > 254 || !validateEmail(buyerEmail))) {
    return NextResponse.json({ error: "Enter a valid buyer email." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin configuration is missing." },
      { status: 500 },
    );
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,title,price,seller_email,status")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError) {
    return NextResponse.json({ error: "Could not retrieve the listing." }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.status === "sold") {
    return NextResponse.json({ error: "This listing is already sold." }, { status: 409 });
  }
  if (buyerEmail && buyerEmail === String(listing.seller_email).trim().toLowerCase()) {
    return NextResponse.json(
      { error: "You cannot purchase your own listing." },
      { status: 400 },
    );
  }

  const sellerEmail = String(listing.seller_email).trim().toLowerCase();
  const { data: seller, error: sellerError } = await supabase
    .from("seller_accounts")
    .select("stripe_account_id")
    .eq("seller_email", sellerEmail)
    .maybeSingle();
  if (sellerError) {
    return NextResponse.json({ error: "Could not verify the seller." }, { status: 500 });
  }
  if (!seller?.stripe_account_id) {
    return NextResponse.json(
      { error: "The seller is not connected to Stripe." },
      { status: 409 },
    );
  }

  try {
    const stripe = getStripe();
    const accountStatus = await getConnectedAccountStatus(seller.stripe_account_id);
    if (!accountStatus.ready) {
      return NextResponse.json(
        { error: "The seller's Stripe account is not ready." },
        { status: 409 },
      );
    }

    let amountCents: number;
    try {
      amountCents = decimalPriceToCents(String(listing.price));
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "The listing price is invalid.",
        },
        { status: 409 },
      );
    }
    const applicationFee = calculateApplicationFeeCents(amountCents);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is not configured." },
        { status: 500 },
      );
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amountCents,
              product_data: { name: listing.title },
            },
          },
        ],
        customer_email: buyerEmail || undefined,
        payment_intent_data: { application_fee_amount: applicationFee },
        metadata: {
          listing_id: listing.id,
          seller_email: sellerEmail,
          stripe_account_id: seller.stripe_account_id,
        },
        success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/checkout/cancel?listing_id=${encodeURIComponent(listing.id)}`,
      },
      { stripeAccount: seller.stripe_account_id },
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Could not create Stripe Checkout session.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Could not create Stripe Checkout." },
      { status: 500 },
    );
  }
}
