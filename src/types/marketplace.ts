export type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  seller_email: string;
  image_url: string | null;
  location: string | null;
  created_at: string;
  status?: "available" | "sold";
  sold_at?: string | null;
  purchase_eligible?: boolean;
};
