// Formatting helpers for HustleCart Kesses

/** Format a number as Kenyan shillings: 180 -> "KSh 180" / 1250 -> "KSh 1,250" */
export function formatKES(amount: number): string {
  const rounded = Math.round(amount);
  return `KSh ${rounded.toLocaleString("en-KE")}`;
}

/** Pretty-print a phone like "+254712000001" -> "+254 712 000001" */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "");
  if (cleaned.startsWith("+254") && cleaned.length >= 13) {
    const rest = cleaned.slice(4);
    return `+254 ${rest.slice(0, 3)} ${rest.slice(3)}`;
  }
  return phone;
}

/** Convert any Kenyan phone input to a normalized +254XXXXXXXXX form. */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (digits.startsWith("+254") && digits.length === 13) return digits;
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) {
    return `+254${digits.slice(1)}`;
  }
  if (digits.startsWith("7") && digits.length === 9) {
    return `+254${digits}`;
  }
  return null;
}

/** WhatsApp deeplink with prefilled text. */
export function whatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** "PLACED" -> "Placed", "OUT_FOR_DELIVERY" -> "Out for delivery" */
export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Short order id for display: last 6 chars uppercased. */
export function shortOrderId(id: string): string {
  return id.slice(-6).toUpperCase();
}

/** ISO date -> "Nov 14, 14:32" */
export function formatDateShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
