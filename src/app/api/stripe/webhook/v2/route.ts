import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConnectedAccountStatus } from "@/lib/stripe-account-status";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_V2_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error("Stripe v2 webhook secret is not configured.");
    return NextResponse.json(
      { error: "Stripe v2 webhook is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  const payload = await request.text();
  const stripe = getStripe();
  let notification: ReturnType<typeof stripe.parseEventNotification>;
  try {
    notification = stripe.parseEventNotification(payload, signature, secret);
  } catch (error) {
    console.error("Stripe v2 webhook signature verification failed.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 },
    );
  }

  if (notification.livemode) {
    return NextResponse.json(
      { error: "Live mode events are not allowed." },
      { status: 400 },
    );
  }

  if (
    !notification.type.startsWith("v2.core.account.") &&
    !notification.type.startsWith("v2.core.account[")
  ) {
    return NextResponse.json({ received: true });
  }

  if (!("related_object" in notification)) {
    return NextResponse.json({ received: true });
  }
  const relatedObject = notification.related_object;
  const accountId =
    relatedObject && "id" in relatedObject ? relatedObject.id : undefined;
  if (!accountId) {
    console.error("Stripe v2 account event did not include an account ID.", {
      eventId: notification.id,
      eventType: notification.type,
    });
    return NextResponse.json({ received: true });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("Supabase admin configuration is missing for Stripe v2 webhook.");
    return NextResponse.json(
      { error: "Webhook database configuration is missing." },
      { status: 500 },
    );
  }

  try {
    const accountStatus = await getConnectedAccountStatus(accountId);
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
      .eq("stripe_account_id", accountId);

    if (error) {
      console.error("Could not update seller status from Stripe v2 event.", {
        code: error.code,
        eventId: notification.id,
      });
      return NextResponse.json(
        { error: "Could not update seller account." },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Could not process Stripe v2 account event.", {
      code: error instanceof Error ? error.name : "unknown",
      eventId: notification.id,
    });
    return NextResponse.json(
      { error: "Could not process seller account update." },
      { status: 500 },
    );
  }
}
