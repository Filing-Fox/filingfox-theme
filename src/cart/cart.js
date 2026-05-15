// Cart logic + Alpine init.
//
// Strategy: register the Alpine store synchronously BEFORE Alpine.start(),
// so x-show evaluations see real data on first walk and never race.
// Drawer and any "x-show" elements ship with style="display:none" in their
// markup; Alpine flips the display when bound.

import Alpine from "alpinejs";

const KEY = (domain) => `ff:cart:${domain}`;

function read(domain) {
  try {
    const raw = localStorage.getItem(KEY(domain));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) =>
        x &&
        typeof x.slug === "string" &&
        typeof x.qty === "number" &&
        x.qty > 0 &&
        typeof x.price === "number",
    );
  } catch {
    return [];
  }
}

function write(domain, items) {
  try {
    localStorage.setItem(KEY(domain), JSON.stringify(items));
  } catch {
    // localStorage full / disabled — fail silently, cart is best-effort
  }
}

export function registerCart({ domain, currency, currencyLocale = "en-US" }) {
  if (window.__ffCartStarted) return;
  window.__ffCartStarted = true;

  const formatter = new Intl.NumberFormat(currencyLocale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  const store = {
    items: read(domain),
    open: false,

    get count() {
      return this.items.reduce((n, i) => n + i.qty, 0);
    },
    get subtotal() {
      return this.items.reduce((s, i) => s + i.price * i.qty, 0);
    },
    format(n) {
      return formatter.format(n);
    },
    add(item, qty = 1) {
      const existing = this.items.find((i) => i.slug === item.slug);
      if (existing) {
        existing.qty = Math.min(99, existing.qty + qty);
      } else {
        this.items.push({
          slug: item.slug,
          name: item.name,
          sku: item.sku,
          price: item.price,
          image: item.image,
          qty: Math.max(1, Math.min(99, qty)),
        });
      }
      this.persist();
      this.open = true;
    },
    setQty(slug, qty) {
      const it = this.items.find((i) => i.slug === slug);
      if (!it) return;
      const q = Math.max(0, Math.min(99, qty | 0));
      if (q === 0) {
        this.remove(slug);
        return;
      }
      it.qty = q;
      this.persist();
    },
    remove(slug) {
      this.items = this.items.filter((i) => i.slug !== slug);
      this.persist();
    },
    clear() {
      this.items = [];
      this.persist();
    },
    persist() {
      write(domain, this.items);
    },
  };

  // Register synchronously — works whether Alpine has started or not.
  Alpine.store("cart", store);

  if (!window.Alpine) {
    window.Alpine = Alpine;
    Alpine.start();
  }
}
