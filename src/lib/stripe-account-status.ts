import "server-only";

import { getStripe } from "@/lib/stripe";

export async function getConnectedAccountStatus(accountId: string) {
  const account = await getStripe().v2.core.accounts.retrieve(accountId, {
    include: ["configuration.merchant", "requirements"],
  });
  const merchant = account.configuration?.merchant;
  const cardStatus = merchant?.capabilities?.card_payments?.status;
  const payoutStatus = merchant?.capabilities?.stripe_balance?.payouts?.status;
  const detailsSubmitted = !account.requirements?.entries?.some(
    (requirement) => requirement.awaiting_action_from === "user",
  );
  const chargesEnabled = cardStatus === "active";
  const payoutsEnabled = payoutStatus === "active";
  const ready = chargesEnabled && payoutsEnabled && detailsSubmitted;

  return {
    ready,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    readinessStatus: ready
      ? "ready"
      : cardStatus === "rejected" || cardStatus === "restricted"
        ? "restricted"
        : "pending",
  };
}
