import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateEmail } from "@/lib/validations";
import { sendMessageNotification } from "@/lib/email/send-message-notification";

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
  const submissionId =
    typeof body.submission_id === "string" ? body.submission_id : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      listingId,
    )
  )
    return NextResponse.json(
      { error: "A valid listing is required." },
      { status: 400 },
    );
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      submissionId,
    )
  )
    return NextResponse.json(
      { error: "Please retry sending your message." },
      { status: 400 },
    );
  if (buyerEmail.length > 254 || !validateEmail(buyerEmail))
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
    .select("id,title,price,image_url,seller_email")
    .eq("id", listingId)
    .maybeSingle();
  if (listingError) {
    console.error("Could not retrieve listing for a buyer message.", {
      code: listingError.code,
    });
    return NextResponse.json(
      { error: "Could not submit your message. Please try again." },
      { status: 500 },
    );
  }
  if (!listing)
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const messageRow = {
    listing_id: listingId,
    buyer_email: buyerEmail,
    seller_email: listing.seller_email,
    message,
  };
  let { error } = await supabase
    .from("messages")
    .insert({ ...messageRow, submission_id: submissionId });
  if (error?.code === "PGRST204" && error.message.includes("submission_id")) {
    console.warn(
      "messages.submission_id is not in the Supabase schema cache; using legacy message insert.",
    );
    ({ error } = await supabase.from("messages").insert(messageRow));
  }
  if (error?.code === "23505") {
    return NextResponse.json({
      success: true,
      messageSaved: true,
      emailSent: false,
      notificationStatus: "duplicate",
    });
  }
  if (error) {
    console.error("Could not save buyer message.", { code: error.code });
    return NextResponse.json(
      { error: "Could not submit your message. Please try again." },
      { status: 500 },
    );
  }

  const notificationStatus = await sendMessageNotification({
    listing,
    buyerEmail,
    message,
    origin: request.nextUrl.origin,
  });
  return NextResponse.json(
    {
      success: true,
      messageSaved: true,
      emailSent: notificationStatus === "sent",
      notificationStatus,
    },
    { status: 201 },
  );
}
