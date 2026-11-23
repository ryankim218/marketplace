import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { validateEmail } from "@/lib/validations";

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const sellerEmail =
    typeof body.seller_email === "string"
      ? body.seller_email.trim().toLowerCase()
      : "";
  if (sellerEmail.length > 254 || !validateEmail(sellerEmail)) {
    return NextResponse.json({ error: "Enter a valid seller email." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin configuration is missing." },
      { status: 500 },
    );
  }

  let step = "initialize";
  try {
    const stripe = getStripe();
    step = "look up seller association";
    const { data: existing, error: lookupError } = await supabase
      .from("seller_accounts")
      .select("stripe_account_id")
      .eq("seller_email", sellerEmail)
      .maybeSingle();
    if (lookupError) throw lookupError;

    let accountId: string | undefined = existing?.stripe_account_id;
    if (!accountId) {
      step = "create connected account";
      const account = await stripe.v2.core.accounts.create({
        contact_email: sellerEmail,
        dashboard: "full",
        identity: { country: "US" },
        configuration: { merchant: {} },
        defaults: {
          responsibilities: {
            fees_collector: "stripe",
            losses_collector: "stripe",
          },
        },
        include: ["configuration.merchant", "requirements"],
      });
      accountId = account.id;

      step = "save seller association";
      const { data: inserted, error: insertError } = await supabase
        .from("seller_accounts")
        .insert({
          seller_email: sellerEmail,
          stripe_account_id: accountId,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
          onboarding_completed: false,
          readiness_status: "not_started",
        })
        .select("stripe_account_id")
        .single();

      if (insertError) {
        const { data: raced, error: racedLookupError } = await supabase
          .from("seller_accounts")
          .select("stripe_account_id")
          .eq("seller_email", sellerEmail)
          .maybeSingle();
        if (racedLookupError) throw racedLookupError;
        if (!raced?.stripe_account_id) throw insertError;
        accountId = raced.stripe_account_id;
      } else if (inserted?.stripe_account_id) {
        accountId = inserted.stripe_account_id;
      }
    }

    if (!accountId) {
      throw new Error("A connected account ID was not available.");
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
    if (!appUrl) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_APP_URL is not configured." },
        { status: 500 },
      );
    }

    step = "create onboarding link";
    const accountLink = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          refresh_url: `${appUrl}/connect-stripe/refresh`,
          return_url: `${appUrl}/connect-stripe/return`,
        },
      },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const details: Record<string, string | number> = { step };
    if (error instanceof Error) {
      details.name = error.name;
      details.message = error.message;
    }
    if (error && typeof error === "object") {
      const errorFields = error as Record<string, unknown>;
      for (const field of ["type", "code", "statusCode", "requestId"]) {
        const value = errorFields[field];
        if (typeof value === "string" || typeof value === "number") {
          details[field] = value;
        }
      }
    }
    console.error("Could not start Stripe onboarding.", details);
    return NextResponse.json(
      { error: "Could not start Stripe onboarding." },
      { status: 500 },
    );
  }
}
