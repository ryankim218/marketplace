import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/validations";

export async function POST(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 },
    );
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const listingId = typeof body.listing_id === "string" ? body.listing_id : "";
  const buyerEmail =
    typeof body.buyer_email === "string" ? body.buyer_email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!listingId)
    return NextResponse.json(
      { error: "Listing is required." },
      { status: 400 },
    );
  if (!validateEmail(buyerEmail))
    return NextResponse.json(
      { error: "Enter a valid email." },
      { status: 400 },
    );
  if (!message || message.length > 2000)
    return NextResponse.json(
      { error: "Message is required and must be 2,000 characters or fewer." },
      { status: 400 },
    );

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("seller_email")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError)
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  if (!listing)
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const { error } = await supabase.from("messages").insert({
    listing_id: listingId,
    buyer_email: buyerEmail,
    seller_email: listing.seller_email,
    message,
  });
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
