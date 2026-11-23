import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id")?.trim() || "";
  if (!sessionId || sessionId.length > 255) {
    return NextResponse.json({ error: "A valid checkout session is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin configuration is missing." },
      { status: 500 },
    );
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    const { data: order } = await supabase
      .from("orders")
      .select("id,listing_id,buyer_email,seller_email,amount,currency,payment_status,paid_at")
      .eq("checkout_session_id", sessionId)
      .maybeSingle();

    if (order) {
      return NextResponse.json({
        confirmed: true,
        paid: session.payment_status === "paid",
        order,
      });
    }

    return NextResponse.json({
      confirmed: false,
      paid: session.payment_status === "paid",
      pending: true,
    });
  } catch (error) {
    console.error("Could not retrieve checkout confirmation.", {
      code: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      { error: "Could not verify the checkout." },
      { status: 502 },
    );
  }
}
