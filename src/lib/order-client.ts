export interface OrderLineItem {
  slug: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  image?: string;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  notes?: string;
}

export interface OrderPayload {
  domain: string;
  currency: string;
  items: OrderLineItem[];
  subtotal: number;
  customer: OrderCustomer;
  turnstileToken: string;
}

export interface OrderResult {
  ok: boolean;
  ref?: string;
  error?: string;
}

export async function submitOrder(
  workerUrl: string,
  payload: OrderPayload,
): Promise<OrderResult> {
  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, "")}/order`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "omit",
      mode: "cors",
    });
    const data = (await res.json().catch(() => ({}))) as Partial<OrderResult>;
    if (!res.ok) {
      return { ok: false, error: data.error || `http_${res.status}` };
    }
    return { ok: true, ref: data.ref };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network_error" };
  }
}

export function buildMailtoFallback(to: string, payload: OrderPayload): string {
  const lines: string[] = [];
  lines.push(`Order from ${payload.domain}`);
  lines.push("");
  lines.push("Items:");
  for (const it of payload.items) {
    lines.push(`- ${it.qty} x ${it.name} (${it.sku}) @ ${it.price} ${payload.currency}`);
  }
  lines.push("");
  lines.push(`Subtotal: ${payload.subtotal} ${payload.currency}`);
  lines.push("");
  lines.push("Customer:");
  lines.push(`Name: ${payload.customer.name}`);
  lines.push(`Email: ${payload.customer.email}`);
  lines.push(`Phone: ${payload.customer.phone}`);
  lines.push(
    `Address: ${payload.customer.address1}${payload.customer.address2 ? ", " + payload.customer.address2 : ""}, ${payload.customer.city}, ${payload.customer.region} ${payload.customer.postalCode}, ${payload.customer.country}`,
  );
  if (payload.customer.notes) lines.push(`Notes: ${payload.customer.notes}`);
  const subject = `Order from ${payload.domain}`;
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}
