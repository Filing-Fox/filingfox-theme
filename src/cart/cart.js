// Vanilla cart. No Alpine. No framework. Just DOM + localStorage.
//
// Public API:
//   - Auto-initializes when loaded. Reads config from <html data-domain>.
//   - window.ffCart = { add, remove, setQty, clear, items, count, subtotal, format, openDrawer, closeDrawer, on }
//
// Markup contract (data attributes the script wires up):
//   [data-cart-count]            text content set to current count
//   [data-cart-subtotal]         text content set to formatted subtotal
//   [data-cart-add]              button; reads `data-product` JSON, adds to cart, opens drawer
//   [data-cart-open]             button; opens drawer
//   [data-cart-close]            button or backdrop; closes drawer
//   [data-cart-drawer]           the drawer root (visibility toggled via data-open attr)
//   [data-cart-empty]            element shown when cart has 0 items
//   [data-cart-body]             element shown when cart has >=1 items
//   [data-cart-lines]            <ul>/<ol>/<div> — populated with rendered line items
//   [data-cart-line-template]    <template> with the line HTML
//   [data-cart-clear]            button; empties cart
//   [data-cart-submit]           checkout submit button
//   [data-cart-form]             checkout <form>
//
// Custom events on document:
//   ff-cart:change                fires after any state change
//   ff-cart:drawer-open
//   ff-cart:drawer-close

(function () {
  if (typeof window === "undefined") return;
  if (window.__ffCartInit) return;
  window.__ffCartInit = true;

  const root = document.documentElement;
  const domain = root.dataset.domain || "site";
  const currency = root.dataset.currency || "USD";
  const locale = root.dataset.currencyLocale || "en-US";
  const KEY = "ff:cart:" + domain;
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });

  let items = readStorage();

  function readStorage() {
    try {
      const raw = localStorage.getItem(KEY);
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
  function writeStorage() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }
  function fire(name, detail) {
    document.dispatchEvent(new CustomEvent("ff-cart:" + name, { detail }));
  }
  function count() {
    return items.reduce((n, i) => n + i.qty, 0);
  }
  function subtotal() {
    return items.reduce((s, i) => s + i.price * i.qty, 0);
  }
  function format(n) {
    return formatter.format(n);
  }
  function add(item, qty) {
    qty = qty == null ? 1 : qty;
    const existing = items.find((i) => i.slug === item.slug);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      items.push({
        slug: item.slug,
        name: item.name,
        sku: item.sku,
        price: Number(item.price),
        image: item.image,
        qty: Math.max(1, Math.min(99, qty | 0)),
      });
    }
    writeStorage();
    render();
    fire("change", { items });
    openDrawer();
  }
  function setQty(slug, qty) {
    const it = items.find((i) => i.slug === slug);
    if (!it) return;
    const q = Math.max(0, Math.min(99, qty | 0));
    if (q === 0) return remove(slug);
    it.qty = q;
    writeStorage();
    render();
    fire("change", { items });
  }
  function remove(slug) {
    items = items.filter((i) => i.slug !== slug);
    writeStorage();
    render();
    fire("change", { items });
  }
  function clear() {
    items = [];
    writeStorage();
    render();
    fire("change", { items });
  }
  function openDrawer() {
    document.querySelectorAll("[data-cart-drawer]").forEach((el) => {
      el.setAttribute("data-open", "1");
      el.style.display = "";
    });
    document.body.classList.add("ff-cart-open");
    fire("drawer-open");
  }
  function closeDrawer() {
    document.querySelectorAll("[data-cart-drawer]").forEach((el) => {
      el.removeAttribute("data-open");
      el.style.display = "none";
    });
    document.body.classList.remove("ff-cart-open");
    fire("drawer-close");
  }

  // Renders cart count, subtotal, drawer body, and any /cart page list.
  function render() {
    // Counters
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = String(count());
    });
    // Subtotals
    document.querySelectorAll("[data-cart-subtotal]").forEach((el) => {
      el.textContent = format(subtotal());
    });
    // Lines container(s)
    document.querySelectorAll("[data-cart-lines]").forEach((container) => {
      const tplSel = container.getAttribute("data-cart-line-template");
      const tpl = tplSel ? document.querySelector(tplSel) : null;
      container.textContent = "";
      if (!tpl || !("content" in tpl)) {
        // Fallback minimal render
        for (const it of items) {
          const li = document.createElement("li");
          li.className = "ff-cart-line";
          li.innerHTML =
            "<img src='" + escape(it.image) + "' alt='' width='64' height='64'>" +
            "<div><a class='ff-line-name' href='/products/" + escape(it.slug) + "'>" + escapeHtml(it.name) + "</a><div class='ff-line-meta'>SKU " + escapeHtml(it.sku) + "</div>" +
            "<div class='ff-line-qty'>" +
            "<button data-cart-qty-dec='" + escape(it.slug) + "' aria-label='Decrease'>−</button>" +
            "<span>" + it.qty + "</span>" +
            "<button data-cart-qty-inc='" + escape(it.slug) + "' aria-label='Increase'>+</button>" +
            "</div></div>" +
            "<div class='ff-line-end'>" +
            "<span class='ff-line-price'>" + format(it.price * it.qty) + "</span>" +
            "<button class='ff-line-remove' data-cart-remove='" + escape(it.slug) + "'>Remove</button>" +
            "</div>";
          container.appendChild(li);
        }
      } else {
        for (const it of items) {
          const node = tpl.content.firstElementChild.cloneNode(true);
          fillSlot(node, "image", null, "src", it.image);
          fillSlot(node, "image", null, "alt", it.name);
          fillSlot(node, "name", it.name, "href", "/products/" + it.slug);
          fillSlot(node, "sku", "SKU " + it.sku);
          fillSlot(node, "qty", String(it.qty));
          fillSlot(node, "price", format(it.price * it.qty));
          node.querySelectorAll("[data-cart-slot=dec]").forEach((b) => b.setAttribute("data-cart-qty-dec", it.slug));
          node.querySelectorAll("[data-cart-slot=inc]").forEach((b) => b.setAttribute("data-cart-qty-inc", it.slug));
          node.querySelectorAll("[data-cart-slot=remove]").forEach((b) => b.setAttribute("data-cart-remove", it.slug));
          container.appendChild(node);
        }
      }
    });
    // Empty / body toggle
    const hasItems = items.length > 0;
    document.querySelectorAll("[data-cart-empty]").forEach((el) => {
      el.style.display = hasItems ? "none" : "";
    });
    document.querySelectorAll("[data-cart-body]").forEach((el) => {
      el.style.display = hasItems ? "" : "none";
    });
  }

  function fillSlot(scope, slot, text, attr, attrValue) {
    scope.querySelectorAll('[data-cart-slot="' + slot + '"]').forEach((el) => {
      if (text != null) el.textContent = text;
      if (attr) el.setAttribute(attr, attrValue);
    });
  }
  function escape(s) { return String(s).replace(/'/g, "&#39;"); }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Event delegation
  document.addEventListener("click", (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    const addBtn = t.closest("[data-cart-add]");
    if (addBtn) {
      ev.preventDefault();
      ev.stopPropagation();
      let p;
      try { p = JSON.parse(addBtn.getAttribute("data-product") || "null"); } catch {}
      if (p) {
        const qtyAttr = addBtn.getAttribute("data-qty");
        const qty = qtyAttr ? Math.max(1, parseInt(qtyAttr, 10) || 1) : (document.querySelector("[data-cart-qty-input]")?.value || 1);
        add(p, Number(qty) || 1);
      }
      return;
    }
    if (t.closest("[data-cart-open]")) { ev.preventDefault(); openDrawer(); return; }
    if (t.closest("[data-cart-close]")) { ev.preventDefault(); closeDrawer(); return; }
    if (t.closest("[data-cart-clear]")) { ev.preventDefault(); clear(); return; }
    const dec = t.closest("[data-cart-qty-dec]");
    if (dec) {
      const slug = dec.getAttribute("data-cart-qty-dec");
      const cur = items.find((i) => i.slug === slug);
      if (cur) setQty(slug, cur.qty - 1);
      return;
    }
    const inc = t.closest("[data-cart-qty-inc]");
    if (inc) {
      const slug = inc.getAttribute("data-cart-qty-inc");
      const cur = items.find((i) => i.slug === slug);
      if (cur) setQty(slug, cur.qty + 1);
      return;
    }
    const rm = t.closest("[data-cart-remove]");
    if (rm) {
      remove(rm.getAttribute("data-cart-remove"));
      return;
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target instanceof Element ? ev.target : null;
    if (!t) return;
    const qtyInput = t.closest("[data-cart-qty-input]");
    if (qtyInput) {
      const slug = qtyInput.getAttribute("data-cart-qty-input");
      setQty(slug, parseInt(qtyInput.value, 10) || 0);
    }
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") closeDrawer();
  });

  // Expose for diagnostics + checkout
  window.ffCart = {
    get items() { return items.slice(); },
    count, subtotal, format, add, remove, setQty, clear, openDrawer, closeDrawer,
  };

  // Initial paint
  function boot() {
    closeDrawer(); // hide on load
    render();
    console.log("[ff-cart] vanilla cart ready, items:", items.length);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
