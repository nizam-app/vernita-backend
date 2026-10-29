/** Canonical plan billing cycles stored on Plan and user.subscription */
export const BILLING_CYCLES = ["free", "one_time", "monthly", "annual"];

/** Legacy values kept for reads until DB migration completes */
export const LEGACY_BILLING_CYCLES = ["Unlimited Materials", "Premium Monthly"];

export const ALL_BILLING_CYCLES = [...BILLING_CYCLES, ...LEGACY_BILLING_CYCLES];

export const normalizeBillingCycle = (value) => {
  if (!value) return value;
  switch (value) {
    case "Premium Monthly":
      return "monthly";
    case "Unlimited Materials":
      return "one_time";
    default:
      return value;
  }
};

export const isRecurringBillingCycle = (billingCycle) => {
  const cycle = normalizeBillingCycle(billingCycle);
  return cycle === "monthly" || cycle === "annual";
};

export const isSubscriptionStripeMode = (billingCycle) =>
  isRecurringBillingCycle(billingCycle);

export const stripeRecurringInterval = (billingCycle) => {
  const cycle = normalizeBillingCycle(billingCycle);
  if (cycle === "monthly") return "month";
  if (cycle === "annual") return "year";
  return null;
};

export const billingCycleDisplay = (billingCycle) => {
  const cycle = normalizeBillingCycle(billingCycle);
  switch (cycle) {
    case "monthly":
      return { cycleLabel: "MONTHLY", priceSuffix: "/mo" };
    case "annual":
      return { cycleLabel: "ANNUAL", priceSuffix: "/yr" };
    case "one_time":
      return { cycleLabel: "ONE-TIME", priceSuffix: "" };
    case "free":
      return { cycleLabel: "FREE", priceSuffix: "" };
    default:
      return {
        cycleLabel: String(billingCycle || "PLAN").toUpperCase(),
        priceSuffix: "",
      };
  }
};
