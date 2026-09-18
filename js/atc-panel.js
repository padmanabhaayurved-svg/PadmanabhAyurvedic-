/* ============================================================
   PADMANABH AYURVEDICS — ADD TO CART FLASH PANEL
   Slides up from bottom when user adds any item to cart.
   Shows: product added, cart count, subtotal, CTA buttons.
   ============================================================ */

(function () {
  'use strict';

  // ── Inject HTML ────────────────────────────────────────────
  function injectHTML() {
    if (document.getElementById('atc-panel')) return;
    document.body.insertAdjacentHTML('beforeend', `
      <div id="atc-backdrop" onclick="ATC.dismiss()"></div>
      <div id="atc-panel" role="dialog" aria-modal="true" aria-label="Added to cart">
        <div id="atc-header">
          <span id="atc-check">✓</span>
          <span id="atc-headline">Added to Cart</span>
          <button id="atc-close" onclick="ATC.dismiss()" aria-label="Close">✕</button>
        </div>
        <div id="atc-product">
          <div id="atc-img-wrap">
            <img id="atc-img" src="" alt="" loading="lazy"/>
          </div>
          <div id="atc-details">
            <div id="atc-name"></div>
            <div id="atc-meta">
              <span id="atc-qty-badge"></span>
              <span id="atc-price"></span>
            </div>
          </div>
        </div>
        <div id="atc-summary">
          <div id="atc-summary-left">
            <span id="atc-count-label"></span>
          </div>
          <div id="atc-subtotal-wrap">
            Subtotal: <strong id="atc-subtotal"></strong>
          </div>
        </div>
        <div id="atc-actions">
          <button id="atc-btn-continue" onclick="ATC.dismiss()">Continue Shopping</button>
          <button id="atc-btn-cart" onclick="ATC.goCart()">View Cart &amp; Checkout →</button>
        </div>
        <div id="atc-progress-bar"><div id="atc-progress-fill"></div></div>
      </div>
    `);
  }

  // ── Inject CSS ─────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('atc-styles')) return;
    const style = document.createElement('style');
    style.id = 'atc-styles';
    style.textContent = `
      /* Backdrop */
      #atc-backdrop {
        display: none;
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.45);
        z-index: 3100;
        backdrop-filter: blur(2px);
        animation: atcFadeIn 0.2s ease;
      }
      #atc-backdrop.visible { display: block; }

      /* Panel */
      #atc-panel {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        background: #121a10;
        border-top: 1px solid rgba(201,168,76,0.3);
        border-radius: 20px 20px 0 0;
        z-index: 3101;
        padding: 0 0 env(safe-area-inset-bottom, 12px);
        box-shadow: 0 -8px 40px rgba(0,0,0,0.6);
        transform: translateY(100%);
        transition: transform 0.38s cubic-bezier(0.34,1.56,0.64,1);
        overflow: hidden;
        max-width: 520px;
        margin: 0 auto;
      }
      #atc-panel.open { transform: translateY(0); }

      /* Progress bar auto-dismiss */
      #atc-progress-bar {
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: rgba(255,255,255,0.07);
      }
      #atc-progress-fill {
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, #c9a84c, #f0d080);
        transform-origin: left;
        transform: scaleX(1);
        transition: transform linear;
      }

      /* Header */
      #atc-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 16px 18px 12px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      #atc-check {
        width: 22px; height: 22px;
        background: #22c55e;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.75rem;
        color: #fff;
        font-weight: 700;
        flex-shrink: 0;
      }
      #atc-headline {
        flex: 1;
        font-family: var(--font-serif, Georgia, serif);
        font-size: 1rem;
        color: #f5f0e8;
        font-weight: 600;
      }
      #atc-close {
        background: none; border: none;
        color: rgba(255,255,255,0.4);
        font-size: 1rem;
        cursor: pointer;
        padding: 4px 6px;
        line-height: 1;
        transition: color 0.2s;
      }
      #atc-close:hover { color: #fff; }

      /* Product row */
      #atc-product {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 18px;
      }
      #atc-img-wrap {
        width: 64px; height: 64px;
        border-radius: 10px;
        overflow: hidden;
        background: rgba(255,255,255,0.05);
        flex-shrink: 0;
        border: 1px solid rgba(201,168,76,0.2);
      }
      #atc-img { width: 100%; height: 100%; object-fit: cover; }
      #atc-details { flex: 1; min-width: 0; }
      #atc-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #f5f0e8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        margin-bottom: 6px;
      }
      #atc-meta { display: flex; align-items: center; gap: 8px; }
      #atc-qty-badge {
        background: rgba(201,168,76,0.15);
        border: 1px solid rgba(201,168,76,0.3);
        color: #c9a84c;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 20px;
      }
      #atc-price {
        font-size: 0.9rem;
        color: #c9a84c;
        font-weight: 700;
      }

      /* Cart summary bar */
      #atc-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 18px;
        background: rgba(255,255,255,0.03);
        border-top: 1px solid rgba(255,255,255,0.05);
        border-bottom: 1px solid rgba(255,255,255,0.05);
        font-size: 0.82rem;
        color: rgba(255,255,255,0.5);
      }
      #atc-subtotal-wrap strong { color: #f5f0e8; }

      /* Action buttons */
      #atc-actions {
        display: grid;
        grid-template-columns: 1fr 1.4fr;
        gap: 10px;
        padding: 14px 18px;
      }
      #atc-btn-continue {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.6);
        border-radius: 12px;
        padding: 12px;
        font-size: 0.82rem;
        cursor: pointer;
        transition: all 0.2s;
        font-weight: 500;
      }
      #atc-btn-continue:hover {
        border-color: rgba(255,255,255,0.3);
        color: #fff;
      }
      #atc-btn-cart {
        background: linear-gradient(135deg, #c9a84c, #a8893e);
        border: none;
        color: #0d120a;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 0.87rem;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.15s;
        letter-spacing: 0.01em;
      }
      #atc-btn-cart:hover { opacity: 0.9; transform: scale(1.01); }
      #atc-btn-cart:active { transform: scale(0.98); }

      @keyframes atcFadeIn { from{opacity:0} to{opacity:1} }

      @media (min-width: 600px) {
        #atc-panel {
          bottom: 24px;
          left: 50%;
          right: auto;
          transform: translateX(-50%) translateY(calc(100% + 40px));
          border-radius: 20px;
          border: 1px solid rgba(201,168,76,0.25);
          width: 420px;
        }
        #atc-panel.open {
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── State ──────────────────────────────────────────────────
  let _timer = null;
  const AUTO_DISMISS_MS = 5000;

  // ── Core ───────────────────────────────────────────────────
  window.ATC = {
    show(product) {
      const panel    = document.getElementById('atc-panel');
      const backdrop = document.getElementById('atc-backdrop');
      if (!panel) return;

      // Populate product info
      const img   = document.getElementById('atc-img');
      const name  = document.getElementById('atc-name');
      const price = document.getElementById('atc-price');
      const qty   = document.getElementById('atc-qty-badge');
      const count = document.getElementById('atc-count-label');
      const sub   = document.getElementById('atc-subtotal');

      // Image — convert Drive link if needed
      const imgUrl = product.image
        ? (typeof Store !== 'undefined' && Store.convertDriveLink
            ? Store.convertDriveLink(product.image)
            : product.image)
        : '';
      img.src = imgUrl || 'assets/logo.png';
      img.alt = product.name;

      name.textContent  = product.name || '';
      price.textContent = typeof Store !== 'undefined'
        ? Store.formatPrice(product.price)
        : '₹' + product.price;

      // Cart info
      const cart      = typeof Store !== 'undefined' ? Store.getCart() : [];
      const cartItem  = cart.find(i => i.id === product.id);
      const cartCount = typeof Store !== 'undefined' ? Store.getCartCount() : cart.reduce((s,i) => s + i.qty, 0);
      const subtotal  = typeof Store !== 'undefined' ? Store.getCartTotal() : 0;

      qty.textContent   = 'Qty: ' + (cartItem ? cartItem.qty : 1);
      count.textContent = cartCount + (cartCount === 1 ? ' item in cart' : ' items in cart');
      sub.textContent   = typeof Store !== 'undefined'
        ? Store.formatPrice(subtotal)
        : '₹' + subtotal;

      // Show
      backdrop.classList.add('visible');
      panel.classList.add('open');

      // Progress bar animation
      const fill = document.getElementById('atc-progress-fill');
      if (fill) {
        fill.style.transition = 'none';
        fill.style.transform = 'scaleX(1)';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            fill.style.transition = `transform ${AUTO_DISMISS_MS}ms linear`;
            fill.style.transform = 'scaleX(0)';
          });
        });
      }

      // Auto-dismiss
      clearTimeout(_timer);
      _timer = setTimeout(() => this.dismiss(), AUTO_DISMISS_MS);
    },

    dismiss() {
      clearTimeout(_timer);
      const panel    = document.getElementById('atc-panel');
      const backdrop = document.getElementById('atc-backdrop');
      if (panel)    panel.classList.remove('open');
      if (backdrop) backdrop.classList.remove('visible');
    },

    goCart() {
      this.dismiss();
      setTimeout(() => {
        if (typeof openCartDrawer === 'function') openCartDrawer();
      }, 300);
    }
  };

  // ── Patch Store.addToCart to trigger panel ─────────────────
  function patchStore() {
    if (typeof Store === 'undefined' || !Store.addToCart) return false;
    const _original = Store.addToCart.bind(Store);
    Store.addToCart = function(product, qty = 1) {
      _original(product, qty);
      // Show flash panel instead of auto-opening full drawer
      setTimeout(() => window.ATC.show(product), 50);
    };
    return true;
  }

  // ── Patch addToCartFromCard (store.js global) ───────────────
  function patchGlobal() {
    const _origCard = window.addToCartFromCard;
    if (_origCard) {
      window.addToCartFromCard = async function(id) {
        const products = typeof Store !== 'undefined' ? Store.getCachedProducts() : [];
        let p = products.find(x => x.id === id);
        if (!p && typeof Store !== 'undefined') {
          const prods = await Store.loadProducts();
          p = prods.find(x => x.id === id);
        }
        if (p) {
          if (typeof Store !== 'undefined') Store.addToCart(p);
          // ATC.show already called by patched addToCart above
        }
      };
    }
  }

  // ── Also suppress the old auto-open of full drawer on add ──
  // (Store.addToCart previously called openCartDrawer after 200ms)
  // Our patch already replaces addToCart, so drawer won't auto-open.
  // User can reach full drawer via "View Cart & Checkout" CTA.

  // ── Init ───────────────────────────────────────────────────
  function init() {
    injectCSS();
    injectHTML();

    // Try to patch immediately, retry if Store not ready yet
    if (!patchStore()) {
      const interval = setInterval(() => {
        if (patchStore()) {
          patchGlobal();
          clearInterval(interval);
        }
      }, 100);
      setTimeout(() => clearInterval(interval), 5000);
    } else {
      patchGlobal();
    }

    // Dismiss on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') window.ATC.dismiss();
    });

    console.log('[ATC Panel] Initialized ✓');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
