export function toWhatsAppPhoneNumber(contact: string): string | null {
  let digits = contact.replace(/\D/g, "");
  const hasInternationalPrefix = /^\s*\+/.test(contact) || digits.startsWith("00");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 10 || digits.length > 15) return null;

  if (hasInternationalPrefix || digits.length > 11) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}
