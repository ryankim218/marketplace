export const MAX_PRICE_CENTS = 99_999_999;
export const PLATFORM_FEE_PERCENT = 10;

export function decimalPriceToCents(price: string | number): number {
  if (typeof price === "number") {
    if (!Number.isFinite(price)) {
      throw new Error("Price must be a valid decimal amount.");
    }
  }

  const raw = typeof price === "string" ? price.trim() : String(price);
  if (!raw) {
    throw new Error("Price is required.");
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("Price must have no more than two decimal places.");
  }

  const [wholePart, fractionPart = ""] = raw.split(".");
  const wholeCents = BigInt(wholePart);
  const cents =
    wholeCents * BigInt(100) +
    BigInt(fractionPart.padEnd(2, "0"));
  if (cents <= BigInt(0)) {
    throw new Error("Price must be greater than zero.");
  }
  if (cents > BigInt(MAX_PRICE_CENTS)) {
    throw new Error("Price is too large.");
  }

  return Number(cents);
}

export function calculateApplicationFeeCents(amountCents: number): number {
  if (
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > MAX_PRICE_CENTS
  ) {
    throw new Error("Amount must be a positive integer number of cents.");
  }

  return Math.floor((amountCents * PLATFORM_FEE_PERCENT) / 100);
}

export const decimalToCents = decimalPriceToCents;
export const calculatePlatformFeeCents = calculateApplicationFeeCents;
