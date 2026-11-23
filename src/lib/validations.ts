import { CATEGORIES } from "@/lib/categories";

export function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateListing(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const sellerEmail =
    typeof input.seller_email === "string" ? input.seller_email.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const imageUrl =
    typeof input.image_url === "string" ? input.image_url.trim() : "";
  const price = Number(input.price);

  if (!title || title.length > 255)
    return "Title is required and must be 255 characters or fewer.";
  if (!description || description.length > 5000)
    return "Description is required and must be 5,000 characters or fewer.";
  if (!Number.isFinite(price) || price < 0)
    return "Price must be a valid non-negative number.";
  if (!validateEmail(sellerEmail)) return "Enter a valid seller email.";
  if (!(CATEGORIES as readonly string[]).includes(category))
    return "Select a valid category.";
  if (!imageUrl) return "A listing photo is required.";

  return null;
}
