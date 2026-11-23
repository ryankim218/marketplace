import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConnectedAccountStatus } from "@/lib/stripe-account-status";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Stripe webhook secret is not configured.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.livemode) {
    return NextResponse.json({ error: "Live mode events are not allowed." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin configuration is missing for Stripe webhook.");
    return NextResponse.json({ error: "Webhook database configuration is missing." }, { status: 500 });
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    try {
      const accountStatus = await getConnectedAccountStatus(account.id);
      const { error } = await supabase
        .from("seller_accounts")
        .update({
          charges_enabled: accountStatus.chargesEnabled,
          payouts_enabled: accountStatus.payoutsEnabled,
          details_submitted: accountStatus.detailsSubmitted,
          onboarding_completed: accountStatus.detailsSubmitted,
          readiness_status: accountStatus.readinessStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);

      if (error) {
        console.error("Could not update seller account status.", { code: error.code });
        return NextResponse.json({ error: "Could not update seller account." }, { status: 500 });
      }
    } catch (error) {
      console.error("Could not retrieve updated Stripe account.", {
        code: error instanceof Error ? error.name : "unknown",
      });
      return NextResponse.json({ error: "Could not update seller account." }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const listingId =
    typeof session.metadata?.listing_id === "string"
      ? session.metadata.listing_id
      : "";
  const sellerEmail =
    typeof session.metadata?.seller_email === "string"
      ? session.metadata.seller_email.trim().toLowerCase()
      : "";
  const accountId =
    typeof session.metadata?.stripe_account_id === "string"
      ? session.metadata.stripe_account_id
      : event.account || "";

  if (!listingId || !sellerEmail || !accountId) {
    console.error("Checkout session is missing required payment metadata.");
    return NextResponse.json({ received: true });
  }

  try {
    const stripe = getStripe();
    let applicationFee = 0;
    let paymentIntentId: string | null = null;
    if (typeof session.payment_intent === "string") {
      paymentIntentId = session.payment_intent;
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          paymentIntentId,
          {},
          { stripeAccount: accountId },
        );
        applicationFee =
          typeof paymentIntent.application_fee_amount === "number"
            ? paymentIntent.application_fee_amount
            : 0;
      } catch (error) {
        console.error("Could not retrieve Payment Intent for webhook.", {
          code: error instanceof Error ? error.name : "unknown",
        });
        return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
      }
    }

    const amount = typeof session.amount_total === "number" ? session.amount_total : 0;
    const currency = (session.currency || "usd").toUpperCase();
    const sellerProceeds = amount - applicationFee;
    const buyerEmail =
      session.customer_details?.email?.trim().toLowerCase() ||
      session.customer_email?.trim().toLowerCase() ||
      null;

    const { data: seller } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id,seller_email")
      .eq("stripe_account_id", accountId)
      .eq("seller_email", sellerEmail)
      .maybeSingle();
    if (!seller) {
      console.error("Checkout payment references an unknown seller account.");
      return NextResponse.json({ received: true });
    }

    const { data: result, error } = await supabase.rpc(
      "complete_paid_listing_order",
      {
        p_event_id: event.id,
        p_listing_id: listingId,
        p_buyer_email: buyerEmail,
        p_seller_email: sellerEmail,
        p_stripe_account_id: accountId,
        p_checkout_session_id: session.id,
        p_payment_intent_id: paymentIntentId,
        p_amount: amount,
        p_currency: currency,
        p_application_fee_amount: applicationFee,
        p_seller_proceeds: sellerProceeds,
      },
    );
    if (error) {
      console.error("Could not create paid order in Supabase.", { code: error.code });
      return NextResponse.json({ error: "Could not save paid order." }, { status: 500 });
    }

    if (result === "missing_listing" || result === "seller_mismatch") {
      console.error("Checkout payment did not match a valid listing.", {
        result,
      });
    }
    return NextResponse.json({ received: true, result });
  } catch (error) {
    console.error("Could not process completed checkout.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json({ error: "Could not process checkout." }, { status: 500 });
  }
}
