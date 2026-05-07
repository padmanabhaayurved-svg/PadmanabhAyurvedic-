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

  function convertDriveLink(url) {
    if (!url) return url;
    if (url.includes('lh3.googleusercontent.com')) return url;
    if (url.includes('drive.google.com/thumbnail')) return url;
    if (url.includes('drive.usercontent.google.com')) return url;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}=s800`;
    }
    return url;
  }

  function imgOnError(img, fallback) {
    if (!fallback || img.src === fallback) {
      img.onerror = null;
      img.src = 'https://via.placeholder.com/400x400?text=Image+Unavailable';
      img.parentElement?.classList?.remove('loading-skeleton');
      return;
    }
    img.onerror = null;
    img.src = fallback;
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
        <img src="${Store.convertDriveLink(p.images?.[0]) || 'https://via.placeholder.com/400x400?text=Padmanabh+Ayurvedics'}" alt="${p.name}" referrerpolicy="no-referrer" loading="lazy" onload="this.parentElement.classList.remove('loading-skeleton')" onerror="this.parentElement.classList.remove('loading-skeleton')"/>
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
