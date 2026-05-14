/* ============================================================
   PADMANABH AYURVEDICS — STORE (Cart State + Product Helpers)
   ============================================================ */

const Store = (() => {
  // ── Cart State (localStorage persisted) ──────────────────────
  let _cart = [];

  function _loadCart() {
    try {
      _cart = JSON.parse(localStorage.getItem('pa_cart') || '[]');
    } catch (e) {
      _cart = [];
    }
  }

  function _saveCart() {
    localStorage.setItem('pa_cart', JSON.stringify(_cart));
    _notifyCartChange();
  }

  function _notifyCartChange() {
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: _cart }));
    _updateCartBadge();
  }

  function _updateCartBadge() {
    const total = _cart.reduce((s, i) => s + i.qty, 0);
    
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent = total;
      badge.style.display = total > 0 ? 'flex' : 'none';
    }

    const floatingBadge = document.getElementById('floating-cart-badge');
    if (floatingBadge) {
      floatingBadge.textContent = total;
      floatingBadge.style.display = total > 0 ? 'flex' : 'none';
    }
  }

  // ── Cart Public API ───────────────────────────────────────────

  function addToCart(product, qty = 1) {
    _loadCart();
    const existing = _cart.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      _cart.push({
        id:    product.id,
        name:  product.name,
        nameHi: product.nameHi || product.name,
        nameMr: product.nameMr || product.name,
        price: product.price,
        mrp:   product.mrp,
        image: product.images?.[0] || '',
        weight: product.weight || 0.5,
        qty
      });
    }
    _saveCart();
    showToast(`"${product.name}" added to cart`, 'success');
    trackCartAdd(product.id).catch(() => {});
  }

  function removeFromCart(productId) {
    _loadCart();
    _cart = _cart.filter(i => i.id !== productId);
    _saveCart();
  }

  function updateQty(productId, qty) {
    _loadCart();
    const item = _cart.find(i => i.id === productId);
    if (item) {
      if (qty <= 0) {
        removeFromCart(productId);
        return;
      }
      item.qty = qty;
      _saveCart();
    }
  }

  function clearCart() {
    _cart = [];
    _saveCart();
  }

  function getCart() {
    _loadCart();
    return [..._cart];
  }

  function getCartTotal() {
    _loadCart();
    return _cart.reduce((s, i) => s + i.price * i.qty, 0);
  }

  function getCartCount() {
    _loadCart();
    return _cart.reduce((s, i) => s + i.qty, 0);
  }

  function getCartWeight() {
    _loadCart();
    return _cart.reduce((s, i) => s + (i.weight || 0.5) * i.qty, 0);
  }

  // ── Product Helpers ───────────────────────────────────────────

  let _cachedProducts = [];

  async function loadProducts() {
    try {
      _cachedProducts = await getProducts();
    } catch (e) {
      _cachedProducts = getSampleProducts();
    }
    return _cachedProducts;
  }

  function getCachedProducts() {
    return _cachedProducts;
  }

  function filterProducts(products, { category = 'all', search = '', sort = 'newest' } = {}) {
    let list = [...products];

    if (category !== 'all') {
      list = list.filter(p => p.category === category);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.nameHi || '').includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'price_asc':  list.sort((a, b) => a.price - b.price); break;
      case 'price_desc': list.sort((a, b) => b.price - a.price); break;
      case 'newest':
      default:           list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); break;
    }

    return list;
  }

  function getRelatedProducts(product, count = 4) {
    return _cachedProducts
      .filter(p => p.id !== product.id && p.category === product.category)
      .slice(0, count);
  }

  // ── Price Formatting ──────────────────────────────────────────

  // Inline SVG fallback — zero network dependency, always works
  const STORE_FALLBACK_IMG = `data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="#1a1a1a"/><g fill="#c9a84c" opacity="0.5"><circle cx="200" cy="160" r="50"/><path d="M130 270 Q200 220 270 270 Q200 310 130 270"/><path d="M170 130 Q200 100 230 130"/></g><text x="200" y="330" text-anchor="middle" fill="#c9a84c" font-size="14" font-family="serif">Padmanabh Ayurvedics</text></svg>')}`;

  function convertDriveLink(url) {
    if (!url) return STORE_FALLBACK_IMG;
    // Already a data URI or Firebase Storage URL — use as-is
    if (url.startsWith('data:')) return url;
    if (url.includes('firebasestorage.googleapis.com')) return url;
    // Already a working thumbnail URL — use as-is
    if (url.includes('drive.google.com/thumbnail')) return url;
    if (url.includes('drive.usercontent.google.com/download')) return url;

    // Extract Google Drive file ID from various link formats
    const driveRegex = [
      /\/d\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /file\/d\/([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{25,})$/  // Raw ID
    ];

    for (let reg of driveRegex) {
      const match = url.match(reg);
      if (match && match[1]) {
        // Use thumbnail API — more reliable than lh3.googleusercontent.com
        // sz=800 gives good quality without CORS/hotlink blocks
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=800`;
      }
    }

    // lh3.googleusercontent.com (old format) — keep as fallback try
    if (url.includes('lh3.googleusercontent.com')) return url;

    return url;
  }

  function imgOnError(img, fallback) {
    if (img.dataset.fixing === 'done') return;
    img.dataset.fixing = 'true';
    img.onerror = null;
    // Use inline SVG — guaranteed to always render regardless of network
    img.src = fallback || STORE_FALLBACK_IMG;
    img.parentElement?.classList?.remove('loading-skeleton');
    img.dataset.fixing = 'done';
  }

  function formatPrice(amount) {
    return '₹' + Math.round(amount).toLocaleString('en-IN');
  }

  function getSavings(price, mrp) {
    if (!mrp || mrp <= price) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  }

  // ── Order Helpers ─────────────────────────────────────────────

  function buildOrderPayload({ address, userId }) {
    const cart   = getCart();
    const items  = cart.map(i => ({
      productId: i.id,
      name:      i.name,
      price:     i.price,
      qty:       i.qty,
      image:     i.image
    }));
    const subtotal = getCartTotal();
    const shipping = subtotal >= 499 ? 0 : 60;
    const tax      = Math.round(subtotal * 0.18);
    const total    = subtotal + shipping + tax;

    return {
      userId: userId || 'guest',
      items,
      address,
      subtotal,
      shipping,
      tax,
      total,
      currency: 'INR'
    };
  }

  // Initialize
  _loadCart();
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(_updateCartBadge, 500);
  });

  return {
    addToCart,
    removeFromCart,
    updateQty,
    clearCart,
    getCart,
    getCartTotal,
    getCartCount,
    getCartWeight,
    loadProducts,
    getCachedProducts,
    filterProducts,
    getRelatedProducts,
    formatPrice,
    getSavings,
    buildOrderPayload,
    convertDriveLink
  };
})();

window.renderProductCard = function(p) {
  const savings = Store.getSavings(p.price, p.mrp);
  const lang = localStorage.getItem('pa_lang') || 'en';
  const name = lang === 'hi' ? (p.nameHi || p.name) : lang === 'mr' ? (p.nameMr || p.name) : p.name;
  return `
    <div class="product-card" onclick="navigate('product/${p.id}')" style="opacity:1;transform:none">
      <div class="product-card-image loading-skeleton">
        <img src="${Store.convertDriveLink(p.images?.[0])}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" onload="this.parentElement.classList.remove('loading-skeleton')" onerror="this.dataset.fixing!='done'&&(this.dataset.fixing='done',this.parentElement.classList.remove('loading-skeleton'),this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc0MDAnIGhlaWdodD0nNDAwJyB2aWV3Qm94PScwIDAgNDAwIDQwMCc+PHJlY3Qgd2lkdGg9JzQwMCcgaGVpZ2h0PSc0MDAnIGZpbGw9JyMxYTFhMWEnLz48ZyBmaWxsPScjYzlhODRjJyBvcGFjaXR5PScwLjUnPjxjaXJjbGUgY3g9JzIwMCcgY3k9JzE2MCcgcj0nNTAnLz48cGF0aCBkPSdNMTMwIDI3MCBRMjAwIDIyMCAyNzAgMjcwIFEyMDAgMzEwIDEzMCAyNzAnLz48L2c+PHRleHQgeD0nMjAwJyB5PSczMzAnIHRleHQtYW5jaG9yPSdtaWRkbGUnIGZpbGw9JyNjOWE4NGMnIGZvbnQtc2l6ZT0nMTQnIGZvbnQtZmFtaWx5PSdzZXJpZic+UGFkbWFuYWJoIEF5dXJ2ZWRpY3M8L3RleHQ+PC9zdmc+')"/>
        ${savings > 0 ? `<span class="product-card-badge badge-sale">${savings}% OFF</span>` : '<span class="product-card-badge badge-new">New</span>'}
        <div class="product-card-quick-add">
          <button class="btn btn-primary btn-sm btn-full" onclick="event.stopPropagation();addToCartFromCard('${p.id}')">Add to Cart</button>
        </div>
      </div>
      <div class="product-card-body">
        <span class="product-card-category">${p.category}</span>
        <div class="product-card-name">${name}</div>
        <div class="product-card-price">
          <span class="price-current">${Store.formatPrice(p.price)}</span>
          ${p.mrp ? `<span class="price-mrp">${Store.formatPrice(p.mrp)}</span>` : ''}
          ${savings > 0 ? `<span class="price-save">Save ${savings}%</span>` : ''}
        </div>
      </div>
    </div>`;
};

window.addToCartFromCard = async function(id) {
  const products = Store.getCachedProducts();
  let p = products.find(x => x.id === id);
  if (!p) {
    const prods = await Store.loadProducts();
    p = prods.find(x => x.id === id);
  }
  if (p) Store.addToCart(p);
};
