import { NextRequest, NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/categories";
import { getServerSupabase } from "@/lib/supabase/server";
import { validateListing } from "@/lib/validations";

export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase)
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 },
    );
  const category = request.nextUrl.searchParams.get("category");
  const query = request.nextUrl.searchParams
    .get("q")
    ?.trim()
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const hasCategory =
    category && (CATEGORIES as readonly string[]).includes(category);

  if (query) {
    const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
    const searchColumn = async (column: "title" | "description") => {
      const listings = [];
      for (let offset = 0; ; offset += 1000) {
        let pageQuery = supabase
          .from("listings")
          .select("*")
          .ilike(column, pattern)
          .order("created_at", { ascending: false })
          .range(offset, offset + 999);
        if (hasCategory) pageQuery = pageQuery.eq("category", category);
        const { data, error } = await pageQuery;
        if (error) return { listings: [], error };
        const page = data || [];
        listings.push(...page);
        if (page.length < 1000) break;
      }
      return { listings, error: null };
    };

    const [titleMatches, descriptionMatches] = await Promise.all([
      searchColumn("title"),
      searchColumn("description"),
    ]);
    const error = titleMatches.error || descriptionMatches.error;
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    const listings = new Map(
      [...titleMatches.listings, ...descriptionMatches.listings].map(
        (listing) => [listing.id, listing],
      ),
    );
    return NextResponse.json({
      listings: [...listings.values()].sort(
        (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at),
      ),
    });
  }

  let requestQuery = supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (hasCategory) requestQuery = requestQuery.eq("category", category);
  const { data, error } = await requestQuery;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data || [] });
}

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
  const validationError = validateListing(body);
  if (validationError)
    return NextResponse.json({ error: validationError }, { status: 400 });
  const row = {
    title: String(body.title).trim(),
    description: String(body.description).trim(),
    price: Number(body.price),
    category: String(body.category),
    seller_email: String(body.seller_email).trim(),
    image_url: String(body.image_url).trim(),
    location:
      typeof body.location === "string" && body.location.trim()
        ? body.location.trim()
        : "Palo Alto, CA",
  };
  const { data, error } = await supabase
    .from("listings")
    .insert(row)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listing: data }, { status: 201 });
}
