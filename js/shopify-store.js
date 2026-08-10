/* ============================================================
   ACCLIMATE ARCHERY — Shopify Buy SDK integration
   Powers the "Add to Cart" buttons in the Merch section using
   Shopify's JS Buy SDK (loaded just before this file, see index.html).

   ------------------------------------------------------------
   WHAT TO FILL IN BELOW, once the Shopify store exists:
     1. domain                 — "your-store.myshopify.com"
     2. storefrontAccessToken  — Settings → Apps and sales channels
                                  → Headless/Buy Button → Storefront API
                                  access token (NOT the Admin API key)
     3. products.hat.id        — the "Superfly" Snapback product ID
     4. products.tee.id        — the Acclimate Archery Tee product ID
        (Product ID: open the product in Shopify admin, the number in
        the URL — admin.shopify.com/store/xxx/products/1234567890 —
        or the full GID gid://shopify/Product/1234567890, either works)

   Until domain/storefrontAccessToken/product ids are filled in below,
   this file intentionally does nothing — the existing placeholder
   "Add to Cart" buttons keep behaving exactly as they do now (main.js
   flashes the note text). Nothing breaks by leaving this unconfigured.
   ------------------------------------------------------------

   Sizes: each pill's visible label (e.g. "S/M", "L", "XL") is matched
   against that product's Shopify variant option values automatically —
   no per-size variant IDs to hand-enter. Just make sure the size
   option values in Shopify match the pill labels already on the page
   (S/M, L/XL for the hat; M, L, XL for the tee) — if they don't match
   exactly, tell me the real ones and I'll adjust the mapping.
   ============================================================ */
(() => {
  "use strict";

  const SHOPIFY_CONFIG = {
    domain: "kcw3m4-j1.myshopify.com",
    storefrontAccessToken: "",  // Storefront API access token
    products: {
      hat: { id: "" },          // "Superfly" Snapback
      tee: { id: "" },          // Acclimate Archery Tee
    },
  };

  const isConfigured =
    SHOPIFY_CONFIG.domain &&
    SHOPIFY_CONFIG.storefrontAccessToken &&
    SHOPIFY_CONFIG.products.hat.id &&
    SHOPIFY_CONFIG.products.tee.id;

  if (!isConfigured) {
    console.info(
      "[shopify-store] Not configured yet — fill in SHOPIFY_CONFIG in js/shopify-store.js once the Shopify store & products exist. Merch buttons keep using their placeholder behavior until then."
    );
    return;
  }

  if (typeof window.ShopifyBuy === "undefined") {
    console.warn("[shopify-store] Shopify Buy SDK failed to load — merch checkout is disabled.");
    return;
  }

  const client = window.ShopifyBuy.buildClient({
    domain: SHOPIFY_CONFIG.domain,
    storefrontAccessToken: SHOPIFY_CONFIG.storefrontAccessToken,
  });

  const CHECKOUT_KEY = "acclimate_checkout_id";

  async function getCheckout() {
    const existingId = localStorage.getItem(CHECKOUT_KEY);
    if (existingId) {
      try {
        const existing = await client.checkout.fetch(existingId);
        if (existing && !existing.completedAt) return existing;
      } catch (err) {
        // stale/invalid id — fall through and create a new one
      }
    }
    const fresh = await client.checkout.create();
    localStorage.setItem(CHECKOUT_KEY, fresh.id);
    return fresh;
  }

  // finds the variant whose option values include the given size label
  // (case-insensitive), or falls back to the only variant if there's
  // just one (e.g. a true one-size product)
  function resolveVariant(product, sizeLabel) {
    if (product.variants.length === 1) return product.variants[0];
    const wanted = sizeLabel.trim().toLowerCase();
    return product.variants.find((v) =>
      v.selectedOptions.some((o) => o.value.trim().toLowerCase() === wanted)
    );
  }

  function setNote(actionsEl, text, { isLink = false, href = null, isError = false } = {}) {
    const old = actionsEl.querySelector(".merch-card__note");
    if (!old) return;
    let el = old;
    if (isLink && old.tagName !== "A") {
      el = document.createElement("a");
      el.className = old.className;
      old.replaceWith(el);
    } else if (!isLink && old.tagName === "A") {
      el = document.createElement("span");
      el.className = old.className;
      old.replaceWith(el);
    }
    el.classList.toggle("merch-card__note--link", isLink);
    el.classList.toggle("merch-card__note--error", isError);
    el.textContent = text;
    if (isLink && href) {
      el.href = href;
      el.target = "_blank";
      el.rel = "noopener";
    }
  }

  async function init() {
    let checkout;
    try {
      checkout = await getCheckout();
    } catch (err) {
      console.error("[shopify-store] Could not start checkout session:", err);
      return;
    }

    const productEntries = await Promise.all(
      Object.entries(SHOPIFY_CONFIG.products).map(async ([key, cfg]) => {
        try {
          const product = await client.product.fetch(cfg.id);
          return [key, product];
        } catch (err) {
          console.error(`[shopify-store] Could not fetch product "${key}":`, err);
          return [key, null];
        }
      })
    );
    const products = Object.fromEntries(productEntries);

    function updateCartNotes() {
      const count = checkout.lineItems.reduce((n, li) => n + li.quantity, 0);
      document.querySelectorAll(".merch-card__actions").forEach((actionsEl) => {
        if (count > 0) {
          setNote(actionsEl, `${count} item${count === 1 ? "" : "s"} in cart — Checkout →`, {
            isLink: true,
            href: checkout.webUrl,
          });
        } else {
          setNote(actionsEl, "");
        }
      });
    }

    document.querySelectorAll(".merch-card__buy").forEach((oldBtn) => {
      const key = oldBtn.dataset.product;
      const product = products[key];
      // strip main.js's placeholder click listener by replacing the node,
      // then wire up the real add-to-cart behavior on the clone
      const btn = oldBtn.cloneNode(true);
      oldBtn.replaceWith(btn);

      if (!product) {
        btn.disabled = true;
        return;
      }

      btn.addEventListener("click", async () => {
        const card = btn.closest(".merch-card");
        const actionsEl = btn.closest(".merch-card__actions");
        const activeSize = card.querySelector(".merch-card__size.is-active");
        const sizeLabel = activeSize ? activeSize.textContent : "";
        const variant = resolveVariant(product, sizeLabel);

        if (!variant) {
          setNote(actionsEl, "That size isn't available — try another", { isError: true });
          return;
        }
        if (!variant.available) {
          setNote(actionsEl, "Sold out in that size", { isError: true });
          return;
        }

        btn.disabled = true;
        const label = btn.querySelector(".btn__label");
        const prevLabel = label ? label.textContent : null;
        if (label) label.textContent = "Adding…";

        try {
          checkout = await client.checkout.addLineItems(checkout.id, [
            { variantId: variant.id, quantity: 1 },
          ]);
          if (label) label.textContent = "Added ✓";
          updateCartNotes();
        } catch (err) {
          console.error("[shopify-store] Add to cart failed:", err);
          setNote(actionsEl, "Something went wrong — try again", { isError: true });
        } finally {
          setTimeout(() => {
            btn.disabled = false;
            if (label && prevLabel) label.textContent = prevLabel;
          }, 1400);
        }
      });
    });

    updateCartNotes();
  }

  init();
})();
