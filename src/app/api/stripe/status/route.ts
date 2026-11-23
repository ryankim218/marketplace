import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getConnectedAccountStatus } from "@/lib/stripe-account-status";
import { validateEmail } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const sellerEmail =
    request.nextUrl.searchParams.get("seller_email")?.trim().toLowerCase() || "";
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

  const { data: row, error } = await supabase
    .from("seller_accounts")
    .select("*")
    .eq("seller_email", sellerEmail)
    .maybeSingle();
  if (error) {
    console.error("Could not retrieve seller status from Supabase.", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "Could not retrieve seller status." }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ connected: false, ready: false, status: "not_started" });
  }

  try {
    const accountStatus = await getConnectedAccountStatus(row.stripe_account_id);

    const { error: updateError } = await supabase
      .from("seller_accounts")
      .update({
        charges_enabled: accountStatus.chargesEnabled,
        payouts_enabled: accountStatus.payoutsEnabled,
        details_submitted: accountStatus.detailsSubmitted,
        onboarding_completed: accountStatus.detailsSubmitted,
        readiness_status: accountStatus.readinessStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_account_id", row.stripe_account_id);
    if (updateError) {
      console.error("Could not save Stripe readiness status.", {
        code: updateError.code,
      });
      return NextResponse.json(
        { error: "Could not save Stripe account status." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      connected: true,
      ready: accountStatus.ready,
      status: accountStatus.readinessStatus,
      charges_enabled: accountStatus.chargesEnabled,
      payouts_enabled: accountStatus.payoutsEnabled,
      details_submitted: accountStatus.detailsSubmitted,
    });
  } catch (error) {
    console.error("Could not retrieve Stripe account readiness.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Could not verify Stripe account readiness." },
      { status: 502 },
    );
  }
}
