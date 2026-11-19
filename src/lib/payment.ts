export type PaymentStatus = "UNPAID" | "PARTIAL" | "HALF_PAID" | "PAID";

export function getPaymentStatus(total: number, paid: number): PaymentStatus {
  if (paid >= total) return "PAID";
  if (paid >= total / 2) return "HALF_PAID";
  if (paid > 0) return "PARTIAL";
  return "UNPAID";
}

export function hasPaidAtLeastHalf(total: number, paid: number): boolean {
  return paid >= total / 2;
}
