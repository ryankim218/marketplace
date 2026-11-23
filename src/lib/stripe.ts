import "server-only";

import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-11-18.endive";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (typeof window !== "undefined") {
    throw new Error("Stripe server utilities cannot be used in browser code.");
  }

  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("Stripe must use a test-mode secret key.");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return stripeClient;
}
