import { NextRequest, NextResponse } from "next/server";
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

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,listing_id,amount,currency,payment_status,paid_at")
    .eq("checkout_session_id", sessionId)
    .maybeSingle();
  if (error) {
    console.error("Could not retrieve checkout confirmation.", {
      code: error.code,
    });
    return NextResponse.json(
      { error: "Could not verify the checkout." },
      { status: 500 },
    );
  }

  if (order) {
    return NextResponse.json({ confirmed: true, paid: true, order });
  }

  return NextResponse.json({ confirmed: false, pending: true });
}
